// Offline development telemetry: real Physics, ordinary inputs, frozen reference
// controller from Phase 2.1. No positions, velocities, gates or clocks are assigned.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { loadArcade } from "../tests/helpers/arcade.js";

export const baseline = "49cf167ac25b7d7c75eed38fe45db00adcb8da76";
const rounded = (n) => Math.round(n * 1e6) / 1e6;
export function installBaseline(api) {
  for (const name of ["opponent-line", "opponents"])
    runInNewContext(execFileSync("git", ["show", `${baseline}:src/racing/${name}.js`],
      { encoding: "utf8" }), { CGPArcade: api });
}
export function measureDriver(id, mode = "normal", { bins = true, historicalBahrain = false, configure = () => {} } = {}) {
  const { api } = loadArcade({ race: true, historicalBahrain });
  configure(api);
  const track = api.TrackCatalog.get(id), surface = api.Surface.create(track),
    p = api.Physics.parameters, keyboard = mode === "keyboard-reference";
  if (keyboard || mode === "published-ai") installBaseline(api);
  const driver = api.Opponents.create(surface, p, { difficulty: mode, diagnostics: true }),
    state = driver.memory(0, 0), dt = 1 / 120,
    sectors = [], laps = [], reasons = {},
    buckets = Array.from({ length: 128 }, (_, i) => {
      const s = (i + 0.5) / 128 * surface.g.len,
        a = surface.at(s - 5), b = surface.at(s + 5);
      return { s: rounded(s), curvature: rounded(Math.abs(Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang))) / 10),
        samples: 0, speedSum: 0, minKmh: Infinity, brakeSteps: 0, throttleSteps: 0 };
    });
  let car = api.Physics.spawn(surface, -118), timing = api.Timing.create(), input,
    wallSteps = 0, shoulderSteps = 0, peakKmh = 0, flyingSteps = 0,
    brakingSteps = 0, throttleSteps = 0, cornerSteps = 0, cornerSpeed = 0;
  for (let tick = 0; tick < 600 * 120; tick++) {
    if (tick % 4 === 0) {
      const traffic = driver.prepare([{ ...car, id: "reference" }]);
      input = driver.input(traffic[0], traffic, state);
      if (keyboard) {
        const limit = p.maxSteer / (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
          target = input.steer * limit;
        input = { ...input, steer: Math.abs(target) > 0.006 &&
          car.steering * Math.sign(target) < Math.abs(target) - 0.003 ? Math.sign(target) : 0 };
      }
    }
    if (Object.values(input).some((v) => !Number.isFinite(v)) ||
      input.throttle < 0 || input.throttle > 1 || input.brake < 0 || input.brake > 1 || Math.abs(input.steer) > 1)
      throw Error(`${id}/${mode}: invalid ordinary control`);
    const next = api.Physics.step(car, input, surface, p, dt),
      clock = api.Timing.step(timing, car, next, surface, dt),
      speed = next.speed * p.metersPerUnit * 3.6;
    wallSteps += Number(next.hitWall);
    shoulderSteps += Number(next.offroad);
    peakKmh = Math.max(peakKmh, speed);
    if (clock.nextGate !== timing.nextGate) sectors.push({
      lap: timing.completed, gate: timing.nextGate, seconds: rounded(clock.elapsed), kmh: rounded(speed),
    });
    if (timing.completed >= 1) {
      flyingSteps++;
      brakingSteps += Number(input.brake > 0);
      throttleSteps += Number(input.throttle > 0);
      const index = Math.floor((((next.s % surface.g.len) + surface.g.len) % surface.g.len) / surface.g.len * 128),
        bucket = buckets[index], info = driver.diagnostics?.(state);
      bucket.samples++;
      bucket.speedSum += speed;
      bucket.minKmh = Math.min(bucket.minKmh, speed);
      bucket.brakeSteps += Number(input.brake > 0);
      bucket.throttleSteps += Number(input.throttle > 0);
      if (bucket.curvature > 0.004) { cornerSteps++; cornerSpeed += speed; }
      if (info) reasons[info.reason] = (reasons[info.reason] || 0) + 1;
    }
    if (clock.completed > timing.completed) {
      laps.push(clock.lastLap.seconds);
      if (laps.length === 4) return {
        mode, referenceSeconds: rounded(laps.slice(1).reduce((a, b) => a + b) / 3),
        profile: keyboard || mode === "published-ai" ? null : api.AIDifficulty.forTrack(mode, id),
        lapSeconds: laps.map(rounded), wallSteps, shoulderSteps,
        clean: wallSteps === 0 && shoulderSteps === 0,
        peakKmh: rounded(peakKmh), brakeFraction: rounded(brakingSteps / flyingSteps),
        throttleFraction: rounded(throttleSteps / flyingSteps),
        averageCornerKmh: cornerSteps ? rounded(cornerSpeed / cornerSteps) : null,
        reasons, sectors,
        ...(bins ? { bins: buckets.map((b) => ({ s: b.s, curvature: b.curvature,
          meanKmh: b.samples ? rounded(b.speedSum / b.samples) : null,
          minKmh: b.samples ? rounded(b.minKmh) : null,
          brakeFraction: b.samples ? rounded(b.brakeSteps / b.samples) : null,
          throttleFraction: b.samples ? rounded(b.throttleSteps / b.samples) : null })) } : {}),
      };
    }
    car = next; timing = clock;
  }
  throw Error(`${id}/${mode}: no four complete laps within 600 simulated seconds`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const catalog = process.argv.includes("--catalog"),
    all = loadArcade().api.TrackCatalog.tracks,
    ids = catalog ? all.map((t) => t.id) : process.argv.slice(2).length ? process.argv.slice(2) : ["bahrain", "france", "portugal", "japan", "russia"],
    modes = catalog ? ["normal", "hard", "expert"] : ["keyboard-reference", "published-ai", "beginner", "normal", "hard", "expert"],
    files = ["scripts/measure-ai-balance.js", "tests/helpers/arcade.js", "src/racing/ai-difficulty.js", "src/racing/opponents.js", "src/racing/opponent-line.js", "src/racing/physics.js", "src/racing/rope-contact.js", "src/racing/bridge-physics.js", "src/racing/vehicle-contacts.js", "src/racing/timing.js", "src/racing/boundary-field.js", "src/racing/track-surface.js", "src/racing/bridge-surface.js", "src/racing/track-shape.js", "src/racing/track-catalog.js", "src/data/arcade-tracks.js", "src/data/arcade-boundaries.js"],
    hashes = Object.fromEntries(files.map((file) => [file, createHash("sha256").update(readFileSync(file)).digest("hex")])),
    results = [];
  for (const id of ids) {
    const runs = [];
    for (const mode of modes) {
      const result = measureDriver(id, mode, { bins: !catalog });
      runs.push(result);
      console.log(`${id}/${mode}: ${result.referenceSeconds.toFixed(3)}s, wall ${result.wallSteps}, shoulder ${result.shoulderSteps}`);
    }
    results.push({ id, runs });
  }
  mkdirSync("docs/ai-balance", { recursive: true });
  for (const [file, hash] of Object.entries(hashes))
    if (createHash("sha256").update(readFileSync(file)).digest("hex") !== hash)
      throw Error(`Source changed during calibration: ${file}`);
  writeFileSync(`docs/ai-balance/${catalog ? "catalog" : ids.length === 1 ? ids[0] : "representative"}.json`, JSON.stringify({
    version: 1, baseline, hashes,
    protocol: "Four isolated laps at 120Hz physics / 30Hz normal commands; mean of three flying laps after warm-up; standing launch at -118 center lane. Published controller and keyboard reference pinned to Phase 2.1. Keyboard reference is automated, not a human skill measurement. Telemetry bins share center-line track coordinates. Clean flag covers the whole run; dirty runs are reported, never hidden. No windshadow, catch-up, vehicle scaling or speed writes.",
    results,
  }, null, 2) + "\n");
}
