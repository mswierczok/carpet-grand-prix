// Full-grid validation, separate from the collision-free lap calibration.
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadArcade } from "../tests/helpers/arcade.js";

export function measureField(id, laps) {
  const { api } = loadArcade({ race: true }),
    race = api.RaceSession.create(api.TrackCatalog.get(id), laps ? { laps } : {}),
    p = race.parameters,
    driver = api.Opponents.create(race.surface, p),
    memory = driver.memory(0, -6),
    times = {}, peaks = {}, wallFrames = {};
  let snapshot = race.snapshot();
  race.pause(false);
  for (let frame = 0; frame < 600 * 30; frame++) {
    const traffic = driver.prepare(snapshot.entries.map((e) => ({ ...e.car, id: e.id }))),
      car = traffic.find((e) => e.id === snapshot.race.playerTeam),
      input = driver.input(car, traffic, memory),
      limit = p.maxSteer / (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
      target = input.steer * limit;
    input.steer = Math.abs(target) > 0.006 &&
      car.steering * Math.sign(target) < Math.abs(target) - 0.003
      ? Math.sign(target) : 0;
    race.advance(input, 1 / 30);
    snapshot = race.snapshot();
    for (const entry of snapshot.entries) {
      peaks[entry.id] = Math.max(peaks[entry.id] || 0, entry.car.speed * p.metersPerUnit * 3.6);
      wallFrames[entry.id] = (wallFrames[entry.id] || 0) + Number(entry.car.hitWall);
      const laps = (times[entry.id] ??= []);
      if (entry.timing.completed > laps.length) laps.push(entry.timing.lastLap.seconds);
    }
    if (snapshot.race.phase === "finished") break;
  }
  if (snapshot.race.finished !== 13) throw Error(`${id}: unfinished field`);
  return {
    id, laps: snapshot.race.laps,
    protocol: "Actual RaceSession, 13 cars; player surrogate sends binary steering and pedals at 30Hz using the browser pilot policy. No human performance claim. Finish times exclude the three-second countdown. Traffic/contacts belong to this validation, not the clean reference.",
    playerContacts: snapshot.contacts,
    entries: snapshot.race.standings.map((entry) => ({
      id: entry.id, player: entry.player, position: entry.position,
      finishSeconds: entry.finishTime,
      lapSeconds: times[entry.id], peakKmh: peaks[entry.id],
      observedWallFrames: wallFrames[entry.id],
    })),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = process.argv.slice(2), results = [];
  for (const id of ids.length ? ids : ["bahrain", "france", "russia"]) {
    const result = measureField(id, process.env.CGP_MEASURE_LAPS ? Number(process.env.CGP_MEASURE_LAPS) : undefined);
    results.push(result);
    console.log(`${id}, ${result.laps} laps: player ${result.entries.find((e) => e.player).finishSeconds.toFixed(3)}s; first ${result.entries[0].finishSeconds.toFixed(3)}s; last ${result.entries.at(-1).finishSeconds.toFixed(3)}s`);
  }
  const output = ids.length ? `docs/race-duration/field-probe-${ids.join("-")}.json` : "docs/race-duration/full-grid.json";
  writeFileSync(output, JSON.stringify({
    version: 1,
    baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    runs: results,
  }, null, 2) + "\n");
}
