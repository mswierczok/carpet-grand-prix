// Development-only measurements. Ordinary controls and the real 120-Hz physics;
// no production test hooks, speed assignments or generated qualifying times.
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadArcade } from "../tests/helpers/arcade.js";
import { measureDriver } from "./measure-ai-balance.js";
export const paceBaseline = "1d94d8f8c8433e891b4f38686d046ae6af2a80e5";
export function installPaceBaseline(api) {
  for (const file of ["ai-difficulty", "opponent-line"])
    runInNewContext(execFileSync("git", ["show", `${paceBaseline}:src/racing/${file}.js`],
      { encoding: "utf8" }), { CGPArcade: api });
}
export function measureQualifying(before = false) {
  const { api } = loadArcade({ race: true });
  if (before) installPaceBaseline(api);
  const session = api.QualifyingSession.create(api.TrackCatalog.get("bahrain"), { difficulty: "expert" });
  session.pause(false);
  for (let tick = 0; tick < 180 * 4; tick++) {
    session.advance({ throttle: 0, brake: 0, steer: 0 }, 0.25);
    if (session.snapshot().entries.filter(e => !e.player).every(e => e.finishTime !== null)) {
      const rows = session.snapshot().qualifying.standings.filter(e => !e.player);
      if (rows.some(e => e.laps.length !== 2 || !Number.isFinite(e.bestLap))) throw Error("Unvollständiges Qualifying");
      return rows.map(e => ({ id: e.id, name: e.name, bestLap: e.bestLap, laps: e.laps }));
    }
  }
  throw Error("Qualifying nicht beendet");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = { baseline: paceBaseline,
    protocol: "Current Bahrain layout; four isolated laps, mean of three flying laps. Qualifying: real isolated 13-car session, player idle, 12 opponents each drive one outlap and two timed laps. Same physics and car limits; no slipstream/catch-up.",
    difficulties: [], qualifying: {} };
  for (const mode of ["beginner", "normal", "hard", "expert"]) {
    const before = measureDriver("bahrain", mode, { bins: false, configure: installPaceBaseline }),
      after = measureDriver("bahrain", mode, { bins: false });
    result.difficulties.push({ mode, before, after });
    console.log(mode, before.referenceSeconds, after.referenceSeconds);
  }
  result.qualifying.before = measureQualifying(true);
  result.qualifying.after = measureQualifying();
  mkdirSync("docs/race-pace-startlights", { recursive: true });
  writeFileSync("docs/race-pace-startlights/pace.json", JSON.stringify(result, null, 2) + "\n");
}
