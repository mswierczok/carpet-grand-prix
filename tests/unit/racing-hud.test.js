import { it, expect } from "vitest";
import { loadArcade } from "../helpers/arcade.js";
const copy = (v) => JSON.parse(JSON.stringify(v));
function setup(position = 6) {
  const { api: A } = loadArcade({ race: true }),
    w = A.RaceWeekend.create(A.TrackCatalog.get("bahrain"), {
      playerTeam: "t13",
    }),
    base = w.snapshot(),
    surface = w.surface,
    order = [...base.race.standings.filter((e) => !e.player)];
  order.splice(
    position - 1,
    0,
    base.race.standings.find((e) => e.player),
  );
  base.race.standings = order.map((e, i) => ({
    ...e,
    position: i + 1,
    progress: 300 - i * 10,
    completed: 0,
  }));
  base.race.position = position;
  base.race.phase = "racing";
  const P = A.RacePresentation.create({ track: () => surface });
  const snapshot = (time, offset = 0) => {
    const s = copy(base);
    s.race.elapsed = time;
    s.race.standings.forEach((e) => (e.progress += offset));
    return s;
  };
  return { A, P, snapshot, surface };
}
for (const [pos, expected] of [
  [1, [1, 2, 3]],
  [6, [5, 6, 7]],
  [13, [11, 12, 13]],
])
  it(`zeigt bei P${pos} die richtigen drei unveränderten Rangpositionen`, () => {
    const { P, snapshot } = setup(pos),
      s = snapshot(0),
      before = JSON.stringify(s),
      m = P.update(s);
    expect(m.relative.map((e) => e.position)).toEqual(expected);
    expect(m.relative.find((e) => e.player).position).toBe(pos);
    expect(m.rows).toHaveLength(13);
    expect(m.rows.every((e) => e.driverName && e.teamName)).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
  });
it("misst Abstände aus realen Passagezeiten und zeigt vor ausreichend Historie keinen erfundenen Wert", () => {
  const { P, snapshot } = setup(6);
  let m = P.update(snapshot(0, -40));
  expect(
    m.relative.filter((e) => !e.player).every((e) => e.relativeGap === "—"),
  ).toBe(true);
  P.update(snapshot(10, -20));
  m = P.update(snapshot(20));
  expect(m.relative.map((e) => e.relativeGap)).toEqual([
    "+5.0 s",
    "DU",
    "−5.0 s",
  ]);
  expect(m.rows[0].gap).toBe("Führend");
});
it("verwendet Rundendifferenzen bei Überrundungen und offizielle Zeitabstände nach Ziel", () => {
  const { P, snapshot, surface } = setup(13);
  const s = snapshot(40);
  s.race.standings[0].progress =
    s.race.standings.at(-1).progress + surface.g.len + 5;
  const m = P.update(s);
  expect(m.own.gapData.laps).toBe(1);
  expect(m.own.gap).toBe("+1 Runde");
  expect(m.own.status).toBe("Überrundet");
  const done = snapshot(50);
  done.race.phase = "finished";
  done.race.standings.forEach((e, i) => (e.finishTime = 40 + i * 0.25));
  const final = P.update(done);
  expect(final.rows[0].gap).toBe("0:40.000");
  expect(final.rows[5].gap).toBe("+1.250 s");
  expect(final.own.gap).toBe("+3.000 s");
});
it("zeigt Qualifying-Bestzeiten und Differenzen statt Rennabständen; fehlende Zeiten bleiben unbekannt", () => {
  const { P, snapshot } = setup(6),
    s = snapshot(50);
  s.qualifying = {
    timedLaps: 2,
    finished: false,
    standings: s.race.standings.map((e, i) => ({
      ...e,
      bestLap: 30 + i * 0.2,
      laps: [30 + i * 0.2],
    })),
  };
  s.qualifying.player = s.qualifying.standings.find((e) => e.player);
  s.timing.completed = 1;
  const m = P.update(s);
  expect(m.lap).toBe("Schnelle Runde 1/2");
  expect(m.relative.map((e) => e.relativeGap)).toEqual([
    "+0.200 s",
    "DU",
    "−0.200 s",
  ]);
  s.qualifying.player.bestLap = null;
  const missing = P.update(s);
  expect(
    missing.relative
      .filter((e) => !e.player)
      .every((e) => e.relativeGap === "—"),
  ).toBe(true);
});
it("setzt nur die Anzeigehistorie beim Sessionwechsel zurück und erfindet keine Lücken beim Fortsetzen", () => {
  const { P, snapshot } = setup(6);
  P.update(snapshot(0, -40));
  P.update(snapshot(20));
  const resumed = P.update(snapshot(0));
  expect(
    resumed.relative
      .filter((e) => !e.player)
      .every((e) => e.relativeGap === "—"),
  ).toBe(true);
});
