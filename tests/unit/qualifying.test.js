import { it, expect } from "vitest";
import { loadArcade } from "../helpers/arcade.js";
import { plain } from "../helpers/project.js";

it("validiert und kopiert Startlisten, hält Teams und KI-Profile stabil und stellt auch auf Brückenstrecken kollisionsfrei auf", () => {
  const { api, data } = loadArcade({ race: true }), ids = data.roster.teams.map((t) => t.id),
    order = [...ids].reverse(), seedCalls = [], opponents = api.Opponents;
  api.Opponents = { ...opponents, create(...args) {
    const driver = opponents.create(...args);
    return { ...driver, memory(index, lane) { seedCalls.push(index); return driver.memory(index, lane); } };
  } };
  for (const gridOrder of [[], ids.slice(1), [...ids.slice(1), ids[1]], [...ids.slice(1), "missing"], "bad"])
    expect(() => api.RaceSession.create(api.TrackCatalog.get("bahrain"), { gridOrder })).toThrow(/Startaufstellung/);
  for (const id of ["bahrain", "korea", "russia"]) {
    seedCalls.length = 0;
    const race = api.RaceSession.create(api.TrackCatalog.get(id), { gridOrder: order, playerTeam: order[0] }),
      s = race.snapshot(), p = race.parameters;
    expect(s.entries.map((e) => e.id)).toEqual(order);
    expect(s.race.position).toBe(1);
    const defaultIds = [...ids.filter((team) => team !== order[0]), order[0]];
    expect(seedCalls).toEqual(order.map((team) => defaultIds.indexOf(team)));
    expect(s.entries.every((e) => e.car.speed === 0 && e.timing.completed === 0)).toBe(true);
    for (let i = 0; i < 13; i++) {
      expect(race.surface.boundary.blocksFootprint(api.VehicleContacts.footprint(s.entries[i].car, p))).toBe(false);
      for (let j = i + 1; j < 13; j++) expect(api.VehicleContacts.overlap(s.entries[i].car, s.entries[j].car, p)).toBeNull();
    }
    const copy = [...order];
    const detached = api.RaceSession.create(api.TrackCatalog.get(id), { gridOrder: copy });
    copy.reverse(); detached.restart();
    expect(detached.snapshot().entries.map((e) => e.id)).toEqual(order);
  }
});

it("erhält den Direktstart samt Physik, Windschatten, Aufholhilfe und Neustart exakt", () => {
  const { api } = loadArcade({ race: true }), track = api.TrackCatalog.get("bahrain"),
    weekend = api.RaceWeekend.create(track), direct = api.RaceSession.create(track);
  expect(plain(weekend.snapshot())).toEqual(plain(direct.snapshot()));
  weekend.pause(false); direct.pause(false);
  for (let i = 0; i < 30 * 12; i++) {
    const input = { throttle: Number(i % 100 < 90), brake: 0, steer: Math.sin(i / 30) * 0.2 };
    weekend.advance(input, 1 / 30); direct.advance(input, 1 / 30);
    if (i % 30 === 0) expect(plain(weekend.snapshot())).toEqual(plain(direct.snapshot()));
  }
  weekend.restart(); direct.restart();
  expect(plain(weekend.snapshot())).toEqual(plain(direct.snapshot()));
});

it("verwirft die Auslaufrunde, wertet nur echte positive schnelle Runden und ordnet Gleichstand/fehlende Zeiten stabil", () => {
  const { api } = loadArcade({ race: true });
  let completed = 0, seconds = 1, options;
  const entries = () => Array.from({ length: 13 }, (_, i) => ({ id: "t" + i, name: "Team " + i,
    player: i === 12, timing: { completed, lastLap: { seconds: i === 0 ? NaN : seconds, valid: true } } }));
  api.RaceSession = { create(track, config) {
    options = config;
    return { surface: {}, parameters: {}, pause() {}, recover() {}, restart() { completed = 0; },
      advance() { completed++; }, snapshot: () => ({ entries: entries(), race: { phase: completed >= 3 ? "finished" : "racing" } }) };
  } };
  const q = api.QualifyingSession.create({});
  expect(options).toMatchObject({ laps: 3, isolated: true, slipstream: false, catchup: false });
  q.advance({}, 1 / 30);
  expect(q.snapshot().qualifying.standings.every((e) => e.bestLap === null)).toBe(true);
  seconds = 30; q.advance({}, 1 / 30);
  seconds = 28; q.advance({}, 1 / 30);
  const s = q.snapshot().qualifying;
  expect(s.finished).toBe(true);
  expect(s.standings.map((e) => e.id)).toEqual([...Array.from({ length: 12 }, (_, i) => "t" + (i + 1)), "t0"]);
  expect(s.player.laps).toEqual([30, 28]);
  expect(s.player.bestLap).toBe(28);
  s.player.laps[0] = -1;
  expect(q.snapshot().qualifying.player.laps).toEqual([30, 28]);
  q.restart();
  expect(q.snapshot().qualifying.standings.every((e) => e.bestLap === null)).toBe(true);
});

it("fährt Qualifying und Rennen mit echten Sektoren, übernimmt die Bestzeitenreihenfolge und verwirft sie bei neuer Auswahl", () => {
  const { api } = loadArcade({ race: true }), track = api.TrackCatalog.get("bahrain"),
    weekend = api.RaceWeekend.create(track, { laps: 1, playerTeam: "t05", difficulty: "normal" });
  const drive = () => {
    const driver = api.Opponents.create(weekend.surface, weekend.parameters), memory = driver.memory(0, -6),
      recorded = new Map();
    for (let frame = 0; frame < 200 * 30; frame++) {
      const s = weekend.snapshot(), traffic = driver.prepare((s.visibleEntries || s.entries).map((e) => ({ ...e.car, id: e.id,
        ...(e.slipstream ? { slipstream: e.slipstream } : {}) }))),
        car = traffic.find((e) => e.id === s.race.playerTeam);
      weekend.advance(driver.input(car, traffic, memory), 1 / 30);
      const after = weekend.snapshot();
      for (const e of after.entries) {
        const row = recorded.get(e.id) || [];
        if (e.timing.completed > row.length) row.push(e.timing.lastLap.seconds);
        recorded.set(e.id, row);
      }
      if (after.race.phase === "finished") return { snapshot: after, recorded };
    }
    throw Error("Session did not finish");
  };
  expect(weekend.acceptQualifying()).toBe(false);
  expect(weekend.startQualifying()).toBe(true);
  expect(weekend.selectDifficulty("expert")).toBe(false);
  expect(weekend.startQualifying()).toBe(false);
  const { snapshot: q, recorded } = drive();
  expect(q.visibleEntries).toHaveLength(1);
  expect(q.visibleEntries[0].player).toBe(true);
  expect(q.race.finished).toBe(13);
  expect(q.entries.every((e) => !e.slipstream && !e.catchup && e.timing.completed === 3)).toBe(true);
  for (const row of q.qualifying.standings) {
    expect(row.laps).toEqual(recorded.get(row.id).slice(1));
    expect(row.bestLap).toBe(Math.min(...recorded.get(row.id).slice(1)));
  }
  const grid = q.qualifying.standings.map((e) => e.id);
  expect(weekend.acceptQualifying()).toBe(true);
  const start = weekend.snapshot();
  expect(start.race).toMatchObject({ phase: "grid", elapsed: 0, laps: 1, playerTeam: "t05" });
  expect(start.race.position).toBe(q.qualifying.player.position);
  expect(start.entries.map((e) => e.id)).toEqual(grid);
  expect(start.visibleEntries).toBeUndefined();
  expect(start.entries.every((e) => e.timing.completed === 0 && e.car.speed === 0)).toBe(true);
  start.qualifyingResult[0].laps[0] = -100;
  expect(weekend.snapshot().qualifyingResult[0].laps[0]).toBeGreaterThan(0);
  weekend.pause(false);
  expect(drive().snapshot.race.finished).toBe(13);
  weekend.restart();
  expect(weekend.snapshot().entries.map((e) => e.id)).toEqual(grid);
  expect(weekend.selectDifficulty("expert")).toBe(true);
  expect(weekend.snapshot().qualifyingResult).toBeUndefined();
  expect(weekend.snapshot().race.position).toBe(13);
  expect(weekend.startQualifying()).toBe(true);
  weekend.restart();
  expect(weekend.snapshot().qualifying.player.laps).toHaveLength(0);
  expect(weekend.selectTeam("t03")).toBe(true);
  expect(weekend.snapshot().qualifying.player.id).toBe("t03");
  expect(weekend.cancelQualifying()).toBe(true);
  expect(weekend.snapshot().qualifying).toBeUndefined();
  expect(weekend.snapshot().race.difficulty).toBe("expert");
}, 120000);

it("simuliert Gegner unabhängig von Spielerfahrt und Rücksetzen, ohne versteckte Kontakte oder Verkehr", () => {
  const { api } = loadArcade({ race: true }), track = api.TrackCatalog.get("bahrain"),
    contacts = api.VehicleContacts, opponents = api.Opponents;
  let contactCalls = 0, commands = 0;
  api.VehicleContacts = { ...contacts, resolve(...args) { contactCalls++; return contacts.resolve(...args); } };
  api.Opponents = { ...opponents, create(...args) {
    const driver = opponents.create(...args);
    return { ...driver, input(car, traffic, ...rest) {
      expect(traffic).toHaveLength(1);
      expect(traffic[0].id).toBe(car.id);
      commands++;
      return driver.input(car, traffic, ...rest);
    } };
  } };
  const standing = api.QualifyingSession.create(track), moving = api.QualifyingSession.create(track),
    initial = standing.snapshot();
  expect(initial.visibleEntries.map((e) => e.id)).toEqual([initial.race.playerTeam]);
  expect(initial.entries.every((e) => e.car.x === initial.car.x && e.car.y === initial.car.y)).toBe(true);
  standing.pause(false); moving.pause(false);
  let hitRope = false;
  for (let frame = 0; frame < 18 * 30; frame++) {
    standing.advance({ throttle: 0, brake: 0, steer: 0 }, 1 / 30);
    moving.advance({ throttle: 1, brake: 0, steer: 0.7 }, 1 / 30);
    hitRope ||= moving.snapshot().car.hitWall;
    if (frame === 300) expect(moving.recover()).toBe(true);
    if (frame % 30 === 0) {
      const others = (q) => q.snapshot().entries.filter((e) => !e.player).map((e) =>
        ({ id: e.id, car: e.car, timing: e.timing, finishTime: e.finishTime }));
      expect(plain(others(moving))).toEqual(plain(others(standing)));
    }
  }
  expect(commands).toBeGreaterThan(100);
  expect(contactCalls).toBe(0);
  expect(hitRope).toBe(true);
  expect(standing.snapshot().entries.filter((e) => !e.player).every((e) =>
    e.car.s > initial.car.s + 100 && !e.car.hitCar)).toBe(true);
  expect(standing.snapshot().entries.every((e) => !e.slipstream && !e.catchup)).toBe(true);
}, 120000);
