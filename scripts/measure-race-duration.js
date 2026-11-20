// Development-only calibration. Uses the published physics/checkpoints and
// normal commands, never writes speed, position, gates or the simulation clock.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { loadArcade } from "../tests/helpers/arcade.js";

const round = (n) => Math.round(n * 1e6) / 1e6;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// Independent, conservative center-line test pilot. This is not a proposed
// production AI change: it only supplies ordinary control commands to Physics.
function calibrationInput(car, surface, p) {
  const look = clamp(6 + car.speed * 0.15, 10, 22),
    target = surface.at(car.s + look),
    error = Math.atan2(Math.sin(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
      Math.cos(Math.atan2(target.y - car.y, target.x - car.x) - car.heading)),
    limit = p.maxSteer / (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2);
  let desired = p.maxSpeed;
  for (let ahead = 0; ahead < 100; ahead += 5) {
    const a = surface.at(car.s + ahead), b = surface.at(car.s + ahead + 8),
      curvature = Math.max(0.001, Math.abs(Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang))) / 8);
    desired = Math.min(desired, Math.sqrt(p.maxLateralAcceleration * 0.85 / curvature +
      2 * p.braking * 0.7 * Math.max(0, ahead - 8)));
  }
  return {
    throttle: Number(car.speed < desired), brake: Number(car.speed > desired + 0.8),
    steer: clamp(Math.atan2(2 * p.wheelbase * Math.sin(error), look) / limit, -1, 1),
  };
}
export function measureClean(api, track, { keyboard = false } = {}) {
  const surface = api.Surface.create(track),
    p = api.Physics.parameters,
    driver = api.Opponents.create(surface, p),
    memory = driver.memory(0, 0),
    dt = 1 / 120;
  let car = api.Physics.spawn(surface, -118),
    timing = api.Timing.create(),
    command,
    walls = 0,
    shoulders = 0,
    peak = 0,
    braking = 0,
    throttle = 0,
    launchSeconds = null,
    lapWalls = 0,
    lapShoulders = 0;
  const laps = [], cleanLaps = [], excludedLaps = [];
  for (let tick = 0; tick < 600 / dt; tick++) {
    if (tick % 4 === 0) {
      const traffic = driver.prepare([{ ...car, id: "reference" }]);
      command = keyboard ? calibrationInput(car, surface, p) : driver.input(traffic[0], traffic, memory);
      if (keyboard) {
        const limit = p.maxSteer /
          (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
          target = command.steer * limit;
        command = {
          ...command,
          steer: Math.abs(target) > 0.006 &&
            car.steering * Math.sign(target) < Math.abs(target) - 0.003
            ? Math.sign(target) : 0,
        };
      }
    }
    const next = api.Physics.step(car, command, surface, p, dt),
      clock = api.Timing.step(timing, car, next, surface, dt);
    walls += Number(next.hitWall);
    shoulders += Number(next.offroad);
    lapWalls += Number(next.hitWall);
    lapShoulders += Number(next.offroad);
    peak = Math.max(peak, next.speed * p.metersPerUnit * 3.6);
    braking += Number(command.brake > 0);
    throttle += Number(command.throttle > 0);
    if (!timing.started && clock.started) {
      launchSeconds = clock.lapStart;
      lapWalls = lapShoulders = 0;
    }
    if (clock.completed > timing.completed) {
      laps.push(clock.lastLap.seconds);
      if (laps.length > 1) {
        if (lapWalls || lapShoulders) excludedLaps.push({ lap: laps.length, wallSteps: lapWalls, shoulderSteps: lapShoulders });
        if ((!lapWalls && !lapShoulders) || !keyboard) cleanLaps.push(clock.lastLap.seconds);
      }
      lapWalls = lapShoulders = 0;
      if (cleanLaps.length === 3) {
        return {
          launchSeconds: round(launchSeconds),
          lapSeconds: laps.map(round),
          sampleLapSeconds: cleanLaps.map(round),
          cleanLapSeconds: keyboard || excludedLaps.length === 0 ? cleanLaps.map(round) : [], excludedLaps,
          referenceIsClean: keyboard || excludedLaps.length === 0,
          referenceSeconds: round(cleanLaps.reduce((a, b) => a + b) / 3),
          peakKmh: round(peak),
          brakeFraction: round(braking / (tick + 1)),
          throttleFraction: round(throttle / (tick + 1)),
          wallSteps: walls, shoulderSteps: shoulders,
        };
      }
    }
    car = next;
    timing = clock;
  }
  throw Error(`${track.id}: reference did not produce three clean flying laps within 600s (${laps.length} laps, ${excludedLaps.length} excluded)`);
}

export function measureCatalog(ids) {
  const { api } = loadArcade({ race: true, formats: false });
  if (ids?.some((id) => !api.TrackCatalog.tracks.some((t) => t.id === id)))
    throw Error("Unbekannte Strecke in der Messauswahl.");
  return api.TrackCatalog.tracks.filter((t) => !ids || ids.includes(t.id)).map((track) => {
    const result = {
      id: track.id, name: track.name,
      length: round(api.Surface.create(track).g.len),
      keyboard: measureClean(api, track, { keyboard: true }),
      ai: measureClean(api, track),
    };
    console.log(`${track.id}: keyboard ${result.keyboard.referenceSeconds}s; AI ${result.ai.referenceSeconds}s`);
    return result;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = process.argv.slice(2),
    tracks = measureCatalog(ids.length ? ids : undefined),
    files = ["src/racing/physics.js", "src/racing/rope-contact.js", "src/racing/bridge-physics.js", "src/racing/opponents.js", "src/racing/opponent-line.js", "src/racing/timing.js", "src/racing/track-shape.js", "src/data/arcade-tracks.js", "src/data/arcade-boundaries.js"],
    hashes = Object.fromEntries(files.map((file) => [file, createHash("sha256").update(readFileSync(file)).digest("hex")]));
  mkdirSync("docs/race-duration", { recursive: true });
  const output = ids.length ? `docs/race-duration/probe-${ids.join("-")}.json` : "docs/race-duration/clean-reference.json";
  writeFileSync(output, JSON.stringify({
    version: 1,
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    protocol: "Isolated car, center lane, start -118 units at rest; 120Hz physics, 30Hz commands. Calibration: independent conservative center-line keyboard pilot, 100-unit braking preview, lateral planning margin 0.85, normal binary commands and unchanged vehicle. Discard first full lap; mean of first three subsequent laps with zero wall/shoulder steps. Contaminated laps excluded/listed. Baseline AI: unchanged pace 1, first three flying laps even if shoulders touched, flagged referenceIsClean=false and never used for lap counts. No human performance claim.",
    hashes, tracks,
  }, null, 2) + "\n");
}
