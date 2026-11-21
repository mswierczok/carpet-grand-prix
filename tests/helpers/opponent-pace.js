import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { ROOT } from "./project.js";
import { loadArcade } from "./arcade.js";

export const paceBaseline = "3cba63b997218d2d2e55988bcd76048d5c40cf75";

export function publishedOpponents(api) {
  const scope = { CGPArcade: { VehicleContacts: api.VehicleContacts } };
  runInNewContext(
    execFileSync("git", ["show", `${paceBaseline}:src/racing/opponents.js`], {
      cwd: ROOT,
      encoding: "utf8",
    }),
    scope,
  );
  return scope.CGPArcade.Opponents;
}

// Real RaceSession, normal commands and shared Physics, no pose/timing writes.
// The same published feedback driver controls the player in both comparisons.
// It reads traffic and sends normal inputs; this is not a human skill estimate.
export function measureField(published = false) {
  const { api, data } = loadArcade({ race: true, historicalBahrain: true });
  const reference = publishedOpponents(api);
  if (published) api.Opponents = reference;
  // This historical test isolates the AI competence improvement against a
  // controller that predates aerodynamic headroom. Do not mix the newly
  // authorized wind mechanic into either side; its A/B races live separately.
  const race = api.RaceSession.create(data.tracks.bahrain, { laps: 3, slipstream: false, catchup: false }),
    playerDriver = reference.create(race.surface, race.parameters),
    memory = playerDriver.memory(0, -6),
    peaks = {},
    wall = {},
    laps = {};
  race.pause(false);
  let snapshot = race.snapshot();
  for (let frame = 0; frame < 180 * 30; frame++) {
    const traffic = playerDriver.prepare(
        snapshot.entries.map((e) => ({ ...e.car, id: e.id })),
      ),
      player = traffic.find((e) => e.id === snapshot.race.playerTeam);
    race.advance(playerDriver.input(player, traffic, memory), 1 / 30);
    snapshot = race.snapshot();
    for (const entry of snapshot.entries.filter((e) => !e.player)) {
      peaks[entry.id] = Math.max(
        peaks[entry.id] || 0,
        entry.car.speed * race.parameters.metersPerUnit * 3.6,
      );
      wall[entry.id] = (wall[entry.id] || 0) + Number(entry.car.hitWall);
      const times = (laps[entry.id] ??= []);
      if (entry.timing.completed > times.length)
        times.push(entry.timing.lastLap.seconds);
    }
    if (
      snapshot.entries
        .filter((e) => !e.player)
        .every((e) => e.finishTime !== null)
    )
      break;
  }
  if (snapshot.entries.some((e) => !e.player && e.finishTime === null))
    throw Error("Die zwölf Gegner beenden den Tempovergleich nicht.");
  const entries = snapshot.entries
    .filter((e) => !e.player)
    .map((e) => ({
      id: e.id,
      finishSeconds: e.finishTime,
      peakKmh: peaks[e.id],
      observedWallFrames: wall[e.id],
      lapSeconds: laps[e.id],
    }));
  const times = entries.map((e) => e.finishSeconds).sort((a, b) => a - b);
  return {
    winnerSeconds: times[0],
    medianSeconds: (times[5] + times[6]) / 2,
    lastSeconds: times.at(-1),
    spreadSeconds: times.at(-1) - times[0],
    entries,
  };
}
