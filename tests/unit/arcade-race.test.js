import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT, plain } from "../helpers/game.js";

const zero = { throttle: 0, brake: 0, steer: 0 };
function setup(options) {
  const { api, data } = loadArcade({ race: true });
  return {
    api,
    data,
    race: api.RaceSession.create(data.tracks.bahrain, options),
  };
}
function advance(race, seconds, input = zero) {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    race.advance(input, 1 / 120);
}

it("liefert mit räumlichem Index exakt die Projektion des veröffentlichten Fahrtests, einschließlich ferner Punkte", () => {
  const { api, data } = loadArcade(),
    scope = {
      CGPArcade: { BoundaryField: api.BoundaryField },
      CGPArcadeData: data,
    };
  const source = execFileSync(
    "git",
    [
      "show",
      "80cd477a617e052ed09bf7ed1e973bc25529ab36:src/racing/track-surface.js",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  runInNewContext(source, scope);
  const before = scope.CGPArcade.Surface.create(data.tracks.bahrain),
    after = api.Surface.create(data.tracks.bahrain);
  for (let i = 0; i < 1200; i++) {
    const p = {
        x: -100 + ((i * 19.71) % 1500),
        y: -200 + ((i * 11.31) % 1200),
      },
      hint = i % 3 === 0 ? null : (i * 0.731) % before.g.len;
    expect(plain(after.project(p, hint))).toEqual(
      plain(before.project(p, hint)),
    );
  }
});

it("stellt genau 13 unveränderte Teamidentitäten ohne Fahrzeug- oder Seilüberlappung auf", () => {
  const { api, data, race } = setup(),
    s = race.snapshot();
  expect(s.entries).toHaveLength(13);
  expect(s.entries.filter((e) => e.player)).toHaveLength(1);
  expect(s.race.position).toBe(13);
  expect(s.paused).toBe(true);
  expect(s.race.phase).toBe("grid");
  expect(s.entries.map((e) => e.teamId).sort()).toEqual(
    data.roster.teams.map((t) => t.id).sort(),
  );
  for (let i = 0; i < 13; i++) {
    const a = s.entries[i];
    expect(
      race.surface.boundary.blocksFootprint(
        api.VehicleContacts.footprint(a.car, race.parameters),
      ),
    ).toBe(false);
    for (let j = i + 1; j < 13; j++)
      expect(
        api.VehicleContacts.overlap(a.car, s.entries[j].car, race.parameters),
      ).toBe(null);
  }
  expect(race.parameters).toBe(api.Physics.parameters);
});

it("hält bei Rot alle Fahrzeuge fest, friert den Countdown in Pause ein und startet erst bei Grün", () => {
  const { race } = setup(),
    start = race.snapshot();
  race.pause(false);
  advance(race, 1, { ...zero, throttle: 1 });
  expect(race.snapshot().race.countdown).toBe(2);
  race.pause(true);
  advance(race, 1);
  expect(race.snapshot().race.countdown).toBe(2);
  race.pause(false);
  advance(race, 2, { ...zero, throttle: 1 });
  const green = race.snapshot();
  expect(green.race.phase).toBe("racing");
  expect(green.race.elapsed).toBe(0);
  expect(green.entries.map((e) => e.car)).toEqual(
    start.entries.map((e) => e.car),
  );
  advance(race, 1, { ...zero, throttle: 1 });
  expect(
    race
      .snapshot()
      .entries.every((e, i) => e.car.s > start.entries[i].car.s + 1),
  ).toBe(true);
});

it("erlaubt Teamwahl nur vor dem Start und setzt ein neues Rennen vollständig zurück", () => {
  const { race } = setup();
  expect(race.selectTeam("missing")).toBe(false);
  expect(race.selectTeam("t04")).toBe(true);
  expect(
    race
      .snapshot()
      .entries.filter((e) => e.player)
      .map((e) => e.id),
  ).toEqual(["t04"]);
  race.pause(false);
  advance(race, 5, { ...zero, throttle: 1 });
  expect(race.selectTeam("t05")).toBe(false);
  race.restart();
  const s = race.snapshot();
  expect(s.race.playerTeam).toBe("t04");
  expect(s.race.position).toBe(13);
  expect(s.race.elapsed).toBe(0);
  expect(s.race.finished).toBe(0);
  expect(
    s.entries.every(
      (e) =>
        e.timing.completed === 0 && e.finishTime === null && e.car.speed === 0,
    ),
  ).toBe(true);
});

it("lässt zwölf KI-Fahrzeuge auch bei einem stehenbleibenden Spieler ihre Runde beenden", () => {
  const { race } = setup({ laps: 1 });
  race.pause(false);
  for (
    let frame = 0;
    frame < 110 * 30 && race.snapshot().race.finished < 12;
    frame++
  )
    race.advance(zero, 1 / 30);
  const s = race.snapshot();
  expect(s.race.finished).toBe(12);
  expect(s.race.phase).toBe("racing");
  expect(
    s.entries
      .filter((e) => !e.player)
      .every((e) => e.finishTime !== null && e.timing.completed === 1),
  ).toBe(true);
  expect(s.entries.find((e) => e.player).finishTime).toBe(null);
  expect(s.timing.completed).toBe(0);
}, 120000);

it("erzeugt dieselbe Bewegung und Reihenfolge unabhängig von der Aufteilung der Renderframes", () => {
  const { api, data } = loadArcade({ race: true }),
    a = api.RaceSession.create(data.tracks.bahrain),
    b = api.RaceSession.create(data.tracks.bahrain);
  a.pause(false);
  b.pause(false);
  for (let i = 0; i < 240; i++) a.advance({ ...zero, throttle: 1 }, 1 / 30);
  for (let i = 0; i < 480; i++) b.advance({ ...zero, throttle: 1 }, 1 / 60);
  expect(plain(a.snapshot().race)).toEqual(plain(b.snapshot().race));
  expect(plain(a.snapshot().entries.map((e) => e.car))).toEqual(
    plain(b.snapshot().entries.map((e) => e.car)),
  );
  const copy = a.snapshot();
  copy.entries[0].car.x = -9999;
  expect(a.snapshot().entries[0].car.x).not.toBe(-9999);
});

it("löst frontale Kontakte für Spieler und KI symmetrisch ohne verbleibende Durchdringung auf", () => {
  const { api, race } = setup(),
    s = race.surface,
    p = race.parameters,
    a = {
      ...api.Physics.spawn(s, -100),
      vx: 20,
      speed: 20,
      longitudinalSpeed: 20,
    },
    b = {
      ...api.Physics.spawn(s, -92),
      vx: -20,
      speed: 20,
      longitudinalSpeed: -20,
    };
  Object.freeze(a);
  Object.freeze(b);
  const result = api.VehicleContacts.resolve([a, b], [a, b], s, p),
    [x, y] = result.cars;
  expect(result.contacts).toHaveLength(1);
  expect(api.VehicleContacts.overlap(x, y, p)).toBe(null);
  expect((x.x + y.x) / 2).toBeCloseTo((a.x + b.x) / 2, 10);
  expect(x.vx + y.vx).toBeCloseTo(0, 10);
  expect(x.vx ** 2 + y.vx ** 2).toBeLessThan(a.vx ** 2 + b.vx ** 2);
  const reversed = api.VehicleContacts.resolve([b, a], [b, a], s, p).cars;
  expect(x.x).toBeCloseTo(reversed[1].x, 10);
  expect(y.x).toBeCloseTo(reversed[0].x, 10);
});

it("drückt bei einem Seitenkontakt kein Fahrzeug durch das Seil", () => {
  const { api, race } = setup(),
    s = race.surface,
    p = race.parameters,
    make = (lane) => ({
      ...api.Physics.spawn(s, -80),
      ...s.at(-80, lane),
      heading: 0,
    }),
    a = make(24.4),
    b = make(20.4),
    result = api.VehicleContacts.resolve([a, b], [a, b], s, p);
  for (const car of result.cars)
    expect(
      s.boundary.blocksFootprint(api.VehicleContacts.footprint(car, p)),
    ).toBe(false);
  expect(api.VehicleContacts.overlap(...result.cars, p)).toBe(null);
  expect(result.cars[0].y).toBeCloseTo(a.y, 10);
});

it("überholt ein stehendes Fahrzeug mit normalen Lenkrichtungs-/Pedalbefehlen ohne Kontakt", () => {
  const { api, race } = setup(),
    s = race.surface,
    p = race.parameters,
    driver = api.Opponents.create(s, p),
    memory = driver.memory(0),
    parked = { ...api.Physics.spawn(s, -40), id: "parked" };
  let car = {
      ...api.Physics.spawn(s, -100),
      id: "moving",
      vx: 50,
      speed: 50,
      longitudinalSpeed: 50,
    },
    maxLane = 0;
  for (let frame = 0; frame < 600 && car.s < parked.s + 20; frame++) {
    const traffic = driver.prepare([car, parked]),
      command = driver.input(traffic[0], traffic, memory);
    expect(command.throttle).toBeGreaterThanOrEqual(0);
    expect(command.throttle).toBeLessThanOrEqual(1);
    expect(Math.abs(command.steer)).toBeLessThanOrEqual(1);
    for (let step = 0; step < 4; step++) {
      car = { ...api.Physics.step(car, command, s), id: "moving" };
      expect(api.VehicleContacts.overlap(car, parked, p)).toBe(null);
      expect(car.hitWall).toBe(false);
    }
    maxLane = Math.max(maxLane, s.project(car, car.s).distance);
  }
  expect(car.s).toBeGreaterThan(parked.s + 20);
  expect(maxLane).toBeGreaterThan(5);
});

it("setzt nur das Spielerfahrzeug auf einen freien vorangegangenen Platz zurück und erhält Zeit und Tore", () => {
  const { api, race } = setup();
  race.pause(false);
  advance(race, 5);
  const before = race.snapshot();
  expect(race.recover()).toBe(true);
  const after = race.snapshot(),
    player = after.entries.find((e) => e.player);
  expect(player.car.s).toBeLessThanOrEqual(before.car.s + 1e-6);
  expect(after.timing).toEqual(before.timing);
  expect(after.race.elapsed).toBe(before.race.elapsed);
  for (const other of after.entries.filter((e) => !e.player))
    expect(
      api.VehicleContacts.overlap(player.car, other.car, race.parameters),
    ).toBe(null);
});

it("beendet ein volles Drei-Runden-Rennen mit 13 echten Zieleinläufen, endlicher Bewegung und stabilen Ergebnissen", () => {
  const { api, race } = setup(),
    driver = api.Opponents.create(race.surface, race.parameters),
    memory = driver.memory(0, -6);
  race.pause(false);
  let previous = race.snapshot(),
    maxPenetration = 0;
  for (let frame = 0; frame < 250 * 30; frame++) {
    const traffic = driver.prepare(
        previous.entries.map((e) => ({ ...e.car, id: e.id })),
      ),
      player = traffic.find((e) => e.id === previous.race.playerTeam);
    race.advance(driver.input(player, traffic, memory), 1 / 30);
    const next = race.snapshot();
    if (frame % 15 === 0) {
      for (let i = 0; i < 13; i++) {
        const car = next.entries[i].car;
        expect(
          Object.values(car)
            .filter((v) => typeof v === "number")
            .every(Number.isFinite),
        ).toBe(true);
        expect(
          race.surface.boundary.blocksFootprint(
            api.VehicleContacts.footprint(car, race.parameters),
          ),
        ).toBe(false);
        for (let j = i + 1; j < 13; j++)
          maxPenetration = Math.max(
            maxPenetration,
            api.VehicleContacts.overlap(
              car,
              next.entries[j].car,
              race.parameters,
            )?.depth || 0,
          );
      }
    }
    previous = next;
    if (next.race.phase === "finished") break;
  }
  const s = race.snapshot();
  expect(s.race.phase).toBe("finished");
  expect(s.race.finished).toBe(13);
  expect(s.paused).toBe(true);
  expect(
    s.entries.every(
      (e) =>
        e.timing.completed === 3 && e.timing.lastLap.valid && e.finishTime > 60,
    ),
  ).toBe(true);
  expect(s.race.standings.map((e) => e.position)).toEqual(
    Array.from({ length: 13 }, (_, i) => i + 1),
  );
  const times = s.race.standings.map((e) => e.finishTime);
  expect(times).toEqual([...times].sort((a, b) => a - b));
  expect(maxPenetration).toBeLessThan(0.05);
  advance(race, 2, { ...zero, throttle: 1 });
  expect(race.snapshot().race).toEqual(s.race);
}, 120000);
