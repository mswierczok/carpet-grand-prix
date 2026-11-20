// Actual field A/B measurements. No physics, pose, timing or RNG test hooks.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { loadArcade } from "../tests/helpers/arcade.js";
const files = ["src/racing/catchup.js", "src/racing/race-gaps.js", "src/racing/race-session.js",
  "src/racing/slipstream.js", "src/racing/opponents.js", "src/racing/opponent-line.js",
  "src/racing/ai-difficulty.js", "src/racing/physics.js", "src/racing/rope-contact.js", "src/racing/bridge-physics.js",
  "src/racing/vehicle-contacts.js", "src/racing/track-surface.js", "src/racing/track-shape.js",
  "src/racing/bridge-surface.js", "src/racing/timing.js", "src/data/arcade-tracks.js",
  "src/data/arcade-boundaries.js", "src/data/race-formats.js", "tests/helpers/arcade.js", "scripts/measure-catchup.js"];
const hashes = () => Object.fromEntries(files.map((file) => [file,
  createHash("sha256").update(readFileSync(file)).digest("hex")]));
export function measureCatchup(id, enabled, { laps = 2, difficulty = "normal" } = {}) {
  const { api } = loadArcade({ race: true }), race = api.RaceSession.create(api.TrackCatalog.get(id),
    { laps, difficulty, catchup: enabled }), p = race.parameters, kmh = p.metersPerUnit * 3.6,
    pilot = api.Opponents.create(race.surface, p, { difficulty }), memory = pilot.memory(0, -6),
    rows = Object.fromEntries(race.snapshot().entries.map((e) => [e.id, { id: e.id, player: e.player,
      lapSeconds: [], peakPace: 0, assistedSeconds: 0, recoverySeconds: 0, duelAssistedSeconds: 0,
      peakKmh: 0, wallFrames: 0, contactFrames: 0, shoulderFrames: 0, positions: [], maxLeaderGapSeconds: 0 }]));
  let snap = race.snapshot();
  race.pause(false);
  for (let frame = 0; frame < 300 * 30; frame++) {
    const traffic = pilot.prepare(snap.entries.map((e) => ({ ...e.car, id: e.id, slipstream: e.slipstream }))),
      car = traffic.find((e) => e.id === snap.race.playerTeam), input = pilot.input(car, traffic, memory),
      limit = p.maxSteer / (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
      target = input.steer * limit;
    input.steer = Math.abs(target) > 0.006 && car.steering * Math.sign(target) < Math.abs(target) - 0.003
      ? Math.sign(target) : 0;
    race.advance(input, 1 / 30); snap = race.snapshot();
    for (const e of snap.entries) {
      const row = rows[e.id], effect = e.catchup;
      row.peakKmh = Math.max(row.peakKmh, e.car.speed * kmh);
      row.wallFrames += Number(!!e.car.hitWall);
      row.contactFrames += Number(!!e.car.hitCar);
      row.shoulderFrames += Number(!!e.car.offroad);
      if (e.timing.completed > row.lapSeconds.length) row.lapSeconds.push(e.timing.lastLap.seconds);
      if (!effect) continue;
      if (effect.pace > 0.0120000001 || ((e.player || effect.position <= 3) && effect.pace > 0))
        throw Error(`Invalid support ${id}:${e.id}:${JSON.stringify(effect)}`);
      row.peakPace = Math.max(row.peakPace, effect.pace);
      row.maxLeaderGapSeconds = Math.max(row.maxLeaderGapSeconds, effect.leaderGapSeconds || 0);
      if (effect.pace > 1e-8) {
        row.assistedSeconds += 1 / 30;
        if (effect.recoveryRemaining > 0) row.recoverySeconds += 1 / 30;
        if (effect.duelFactor < 0.999) row.duelAssistedSeconds += 1 / 30;
        if (!row.positions.includes(effect.position)) row.positions.push(effect.position);
      }
    }
    if (snap.race.phase === "finished") break;
  }
  if (snap.race.finished !== 13) throw Error(`${id}:${enabled}: unfinished ${snap.race.finished}/13`);
  const result = { id, enabled, laps, difficulty, playerContacts: snap.contacts,
    settings: { ...api.Catchup.settings },
    entries: snap.race.standings.map((e) => ({ ...rows[e.id], position: e.position,
      finishSeconds: e.finishTime, gapToWinnerSeconds: e.finishTime - snap.race.standings[0].finishTime })) };
  for (const row of result.entries) for (const [key, value] of Object.entries(row))
    if (typeof value === "number" && !Number.isFinite(value)) throw Error(`${id}: invalid ${key}`);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = process.argv.slice(2), sourceHashes = hashes(), baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), runs = [];
  for (const id of ids.length ? ids : ["bahrain", "france", "portugal", "japan", "korea", "russia"])
    for (const enabled of [false, true]) {
      const run = measureCatchup(id, enabled);
      runs.push(run);
      writeFileSync("/tmp/cgp-catchup-progress.json", JSON.stringify({ hashes: sourceHashes, runs }, null, 2));
      console.log(`${id} ${enabled ? "on" : "off"}: player ${run.entries.find((e) => e.player).finishSeconds.toFixed(3)}s; last ${run.entries.at(-1).finishSeconds.toFixed(3)}s; peak ${(100 * Math.max(...run.entries.map((e) => e.peakPace))).toFixed(4)}%`);
    }
  if (JSON.stringify(sourceHashes) !== JSON.stringify(hashes())) throw Error("Sources changed during measurement");
  mkdirSync("docs/catchup", { recursive: true });
  writeFileSync(ids.length ? `docs/catchup/probe-${ids.join("-")}.json` : "docs/catchup/field-ab.json",
    JSON.stringify({ version: 1, measuredAt: new Date().toISOString(), baseCommit, hashes: sourceHashes,
      protocol: "Actual 120Hz RaceSession, 13 cars, slipstream enabled on both sides, normal difficulty, two laps. Binary keyboard-equivalent player surrogate at 30Hz; no human performance or FPS claim. Observations at 30Hz, contacts/shoulders/walls are vehicle frames, not unique incidents. Assistance rank is the pre-step rank that determined the actual force, not a retroactively changed rank. Finished drivers receive no assistance; outlap contact/peak observations remain included.", runs }, null, 2) + "\n");
}
