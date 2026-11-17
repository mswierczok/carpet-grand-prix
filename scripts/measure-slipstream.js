// Reproducible A/B field validation. All cars use the actual RaceSession,
// timing, contacts and shared physics. The player surrogate sends binary
// keyboard-equivalent inputs; this is not a human skill or device-FPS claim.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { dirname } from "node:path";
import { loadArcade } from "../tests/helpers/arcade.js";

const files = ["src/racing/slipstream.js", "src/racing/race-session.js", "src/racing/opponents.js",
  "src/racing/opponent-line.js", "src/racing/ai-difficulty.js", "src/racing/physics.js",
  "src/racing/bridge-physics.js", "src/racing/vehicle-contacts.js", "src/racing/track-surface.js",
  "src/racing/bridge-surface.js", "src/racing/timing.js", "src/data/arcade-tracks.js",
  "src/data/arcade-boundaries.js", "src/data/race-formats.js", "src/racing/track-shape.js",
  "src/racing/catchup.js", "src/racing/race-gaps.js", "tests/helpers/arcade.js",
  "scripts/measure-slipstream.js"];
const hashes = () => Object.fromEntries(files.map((file) =>
  [file, createHash("sha256").update(readFileSync(file)).digest("hex")]));

export function measureSlipstream(id, enabled, { laps = 2, difficulty = "normal" } = {}) {
  const { api } = loadArcade({ race: true }),
    session = api.RaceSession.create(api.TrackCatalog.get(id), { laps, difficulty, slipstream: enabled, catchup: false }),
    p = session.parameters, kmh = p.metersPerUnit * 3.6,
    driver = api.Opponents.create(session.surface, p, { difficulty }), memory = driver.memory(0, -6),
    stats = Object.fromEntries(session.snapshot().entries.map((e) => [e.id, {
      id: e.id, player: e.player, activeSeconds: 0, peakStrength: 0,
      peakLongitudinalKmh: 0, peakKmh: 0, positionChanges: 0,
      observedWallFrames: 0, observedContactFrames: 0, observedShoulderFrames: 0,
      lapSeconds: [],
    }]));
  let snap = session.snapshot(), prior = Object.fromEntries(snap.entries.map((e) => [e.id, e.position])), maxBridgeMismatch = 0;
  session.pause(false);
  for (let frame = 0; frame < 300 * 30; frame++) {
    const traffic = driver.prepare(snap.entries.map((e) => ({ ...e.car, id: e.id,
      ...(enabled ? { slipstream: e.slipstream } : {}) }))),
      car = traffic.find((e) => e.id === snap.race.playerTeam), input = driver.input(car, traffic, memory),
      limit = p.maxSteer / (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
      target = input.steer * limit;
    input.steer = Math.abs(target) > 0.006 && car.steering * Math.sign(target) < Math.abs(target) - 0.003
      ? Math.sign(target) : 0;
    session.advance(input, 1 / 30);
    snap = session.snapshot();
    for (const e of snap.entries) {
      const row = stats[e.id];
      if (e.finishTime !== null) {
        row.finishSeconds = e.finishTime;
        row.position = e.position;
      }
      row.peakKmh = Math.max(row.peakKmh, e.car.speed * kmh);
      row.peakLongitudinalKmh = Math.max(row.peakLongitudinalKmh, e.car.longitudinalSpeed * kmh);
      row.observedWallFrames += Number(e.car.hitWall);
      row.observedContactFrames += Number(!!e.car.hitCar);
      row.observedShoulderFrames += Number(e.car.offroad);
      row.positionChanges += Number(prior[e.id] !== e.position);
      prior[e.id] = e.position;
      if (e.timing.completed > row.lapSeconds.length) row.lapSeconds.push(e.timing.lastLap.seconds);
      if (e.slipstream?.strength > 0) {
        row.activeSeconds += 1 / 30;
        row.peakStrength = Math.max(row.peakStrength, e.slipstream.strength);
        const source = snap.entries.find((other) => other.id === e.slipstream.sourceId);
        maxBridgeMismatch = Math.max(maxBridgeMismatch,
          Math.abs((e.car.elevation || 0) - (source?.car.elevation || 0)));
      }
    }
    if (snap.race.phase === "finished") break;
  }
  if (snap.race.finished !== 13) throw Error(`${id}: ${enabled}: unfinished field ${snap.race.finished}/13`);
  const result = { id, enabled, difficulty, laps, settings: { ...api.Slipstream.settings },
    finished: snap.race.finished, playerContacts: snap.contacts, maxObservedBridgeHeightDifference: maxBridgeMismatch,
    entries: snap.race.standings.map((e) => ({ ...stats[e.id], position: e.position,
      finishSeconds: e.finishTime, gapToWinnerSeconds: e.finishTime - snap.race.standings[0].finishTime })) };
  for (const row of result.entries) for (const [key, value] of Object.entries(row))
    if (typeof value === "number" && !Number.isFinite(value)) throw Error(`${id}: invalid ${key}`);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9),
    ids = process.argv.slice(2).filter((arg) => !arg.startsWith("--output=")), sourceHashes = hashes(), runs = [],
    baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  for (const id of ids.length ? ids : ["bahrain", "france", "portugal", "japan", "korea", "russia"])
    for (const enabled of [false, true]) {
      const run = measureSlipstream(id, enabled);
      runs.push(run);
      writeFileSync("/tmp/cgp-slipstream-measure-progress.json", JSON.stringify({ hashes: sourceHashes, runs }, null, 2));
      console.log(`${id} ${enabled ? "on" : "off"}: ${run.finished}/13; player ${run.entries.find((e) => e.player).finishSeconds.toFixed(3)}s; wake ${run.entries.reduce((s, e) => s + e.activeSeconds, 0).toFixed(2)} car-seconds`);
    }
  if (JSON.stringify(hashes()) !== JSON.stringify(sourceHashes)) throw Error("Sources changed during measurement");
  const file = output || (ids.length ? `docs/slipstream/probe-${ids.join("-")}.json` : "docs/slipstream/field-ab.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ version: 1, measuredAt: new Date().toISOString(),
    baseCommit,
    protocol: "Actual 120Hz physics and 30Hz ordinary inputs; observations at 30Hz. Deterministic binary player surrogate, no human or FPS claim. Two-lap A/B field probes do not replace full default-length regression tests. Contacts and shoulders are observed frames, not unique incidents. Outlaps are included in peak/contact observations, but finished cars neither emit nor receive wake. Position changes are rank transitions, not certified overtakes.",
    hashes: sourceHashes, runs,
  }, null, 2) + "\n");
}
