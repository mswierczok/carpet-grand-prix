// Actual solo laps with a parked player; its time is deliberately excluded.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import { loadArcade } from "../tests/helpers/arcade.js";

const baseline = "0344fcc3bd89c2174c50803e110ff1221204065f",
  legacyFiles = ["opponents", "race-session", "qualifying-session"],
  old = Object.fromEntries(legacyFiles.map((name) => [name, execFileSync("git",
    ["show", `${baseline}:src/racing/${name}.js`], { encoding: "utf8" })])),
  files = ["src/racing/qualifying-drivers.js", "src/racing/qualifying-session.js",
    "src/racing/race-session.js", "src/racing/opponents.js", "src/racing/opponent-line.js",
    "src/racing/ai-difficulty.js", "src/racing/physics.js", "src/racing/rope-contact.js", "src/racing/bridge-physics.js",
    "src/racing/timing.js", "src/racing/track-surface.js", "src/racing/bridge-surface.js",
    "src/racing/track-shape.js", "src/data/arcade-tracks.js", "src/data/arcade-boundaries.js",
    "src/data/arcade-roster.js", "tests/helpers/arcade.js", "scripts/measure-qualifying-drivers.js"],
  hash = (s) => createHash("sha256").update(s).digest("hex"),
  hashes = () => Object.fromEntries(files.map((f) => [f, hash(readFileSync(f))])),
  before = hashes(), runs = [];

function measure(trackId, difficulty, legacy) {
  const { api, data } = loadArcade({ race: true });
  if (legacy) for (const file of legacyFiles)
    runInNewContext(old[file], { CGPArcade: api, CGPArcadeData: data });
  const q = api.QualifyingSession.create(api.TrackCatalog.get(trackId), { difficulty, diagnostics: true }),
    kmh = q.parameters.metersPerUnit * 3.6,
    stats = new Map(q.snapshot().entries.filter((e) => !e.player).map((e) => [e.id,
      { observedWallFrames: 0, observedShoulderFrames: 0, peakLongitudinalKmh: 0,
        inputFrames: 0, brakeFrames: 0, throttleFrames: 0, reasons: {} }]));
  q.pause(false);
  let snapshot;
  for (let frame = 0; frame < 240 * 30; frame++) {
    q.advance({ throttle: 0, brake: 0, steer: 0 }, 1 / 30);
    snapshot = q.snapshot();
    for (const e of snapshot.entries.filter((e) => !e.player)) {
      const row = stats.get(e.id);
      if (e.finishTime !== null) continue;
      row.observedWallFrames += Number(e.car.hitWall);
      row.observedShoulderFrames += Number(e.car.offroad);
      row.peakLongitudinalKmh = Math.max(row.peakLongitudinalKmh, e.car.longitudinalSpeed * kmh);
      if (e.telemetry) {
        row.inputFrames++;
        row.brakeFrames += e.telemetry.brake;
        row.throttleFrames += e.telemetry.throttle;
        row.reasons[e.telemetry.reason] = (row.reasons[e.telemetry.reason] || 0) + 1;
      }
    }
    if (snapshot.race.finished === 12) break;
  }
  if (snapshot.race.finished !== 12) throw Error(`Unfinished ${trackId}/${difficulty}/${legacy}`);
  const profiles = legacy ? null : api.QualifyingDrivers.create(data.roster.teams),
    entries = snapshot.qualifying.standings.filter((e) => !e.player).map((e) => ({
      id: e.id, name: e.name, laps: [...e.laps], bestLap: e.bestLap,
      profile: profiles?.[e.id] || null, ...stats.get(e.id),
    })), times = entries.map((e) => e.bestLap);
  if (entries.some((e) => e.laps.length !== 2 || !Number.isFinite(e.bestLap) || e.bestLap <= 0 ||
    e.bestLap !== Math.min(...e.laps))) throw Error("Invalid measured times");
  return { trackId, difficulty, legacy, finishedOpponents: 12, playerExcluded: true,
    fastestSeconds: Math.min(...times), slowestSeconds: Math.max(...times),
    spreadSeconds: Math.max(...times) - Math.min(...times),
    distinctMilliseconds: new Set(times.map((t) => t.toFixed(3))).size, entries };
}
for (const [track, difficulty] of [["bahrain", "normal"], ["bahrain", "expert"],
  ["france", "expert"], ["russia", "expert"]]) for (const legacy of [true, false]) {
  const run = measure(track, difficulty, legacy);
  runs.push(run);
  console.log(`${track}/${difficulty}/${legacy ? "before" : "after"}: ${run.fastestSeconds.toFixed(3)}–${run.slowestSeconds.toFixed(3)}; spread ${run.spreadSeconds.toFixed(3)}; distinct ${run.distinctMilliseconds}/12`);
  writeFileSync("/tmp/cgp-qualifying-drivers-progress.json", JSON.stringify(runs, null, 2));
}
if (JSON.stringify(before) !== JSON.stringify(hashes())) throw Error("Sources changed during measurement");
mkdirSync("docs/qualifying-drivers", { recursive: true });
writeFileSync("docs/qualifying-drivers/field.json", JSON.stringify({
  version: 1, measuredAt: new Date().toISOString(), baseline, hashes: before,
  baselineHashes: Object.fromEntries(legacyFiles.map((f) => [`src/racing/${f}.js`, hash(old[f])])),
  protocol: "Actual 120-Hz physics and 30-Hz commands/observations. Parked player excluded. Twelve independent AI runs, one discarded outlap and two timed laps, no traffic/slipstream/catch-up. Baseline uses the published three simulation modules with unchanged track/physics data. Diagnostic command samples and observed contact/shoulder frames include outlaps, stop after each AI finishes, and are not unique-event counts or device-FPS/human-skill measurements.",
  runs,
}, null, 2) + "\n");
