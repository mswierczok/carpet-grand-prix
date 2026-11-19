import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadArcade, driveBahrain } from "../helpers/arcade.js";
import { createGame, ROOT, plain } from "../helpers/game.js";
import { arcadeScripts } from "../../scripts/export-arcade-data.js";
it("exportiert Bahrain und die 13/92 Identitäten exakt, ohne Testadapter im Fahrspiel", () => {
  const { api, data } = loadArcade(),
    { game } = createGame(),
    surface = api.Surface.create({...data.tracks.bahrain, pov:undefined}),
    classic = game.makeGeometry(game.trackDefs[0]);
  expect(plain(surface.g.pts)).toEqual(plain(classic.pts));
  expect([...surface.g.cum]).toEqual([...classic.cum]);
  expect(surface.g.width).toBe(classic.width);
  expect(surface.g.len).toBe(classic.len);
  expect(plain(surface.g.pit)).toEqual(plain(classic.pit));
  expect(plain(surface.g.sectors)).toEqual(plain(classic.sectors));
  expect(plain(data.roster.teams)).toEqual(plain(game.MASTER.teams));
  expect(plain(data.roster.drivers)).toEqual(plain(game.MASTER.drivers));
  for (const [name, source] of Object.entries(arcadeScripts()))
    expect(readFileSync(new URL(`src/data/${name}.js`, ROOT), "utf8")).toBe(
      source,
    );
  expect(Object.isFrozen(data.tracks.bahrain.points[0])).toBe(true);
});
it("beschleunigt, bremst und lenkt frei statt die Fahrzeugrichtung an die Strecke zu binden", () => {
  const { api, data } = loadArcade(),
    s = api.Session.create(data.tracks.bahrain),
    initial = s.snapshot();
  s.pause(false);
  for (let i = 0; i < 60; i++)
    s.advance({ throttle: 1, brake: 0, steer: 0 }, 1 / 60);
  const moving = s.snapshot();
  expect(moving.car.speed).toBeGreaterThan(40);
  expect(moving.car.x - initial.car.x).toBeGreaterThan(20);
  for (let i = 0; i < 20; i++)
    s.advance({ throttle: 1, brake: 0, steer: 1 }, 1 / 60);
  expect(s.snapshot().car.heading).toBeGreaterThan(moving.car.heading + 0.1);
  // Holding the brake after stopping now deliberately selects reverse.
  // Check the stop itself before the reverse hold delay can expire.
  for (let i = 0; i < 120 && s.snapshot().car.speed > 0; i++)
    s.advance({ throttle: 0, brake: 1, steer: 0 }, 1 / 120);
  expect(s.snapshot().car.speed).toBe(0);
});
it("bleibt ohne Eingabe im Stand und erzeugt deterministische, endliche Bewegung", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain),
    initial = api.Physics.spawn(surface);
  let a = initial,
    b = initial;
  for (let i = 0; i < 100; i++) {
    const input = { throttle: 0, brake: 0, steer: 0 };
    a = api.Physics.step(a, input, surface);
    b = api.Physics.step(b, input, surface);
  }
  expect(a).toEqual(b);
  expect(a.x).toBe(initial.x);
  expect(a.y).toBe(initial.y);
  expect(a.speed).toBe(0);
  expect(
    Object.values(a)
      .filter((v) => typeof v === "number")
      .every(Number.isFinite),
  ).toBe(true);
});
it("verliert auf der Schulter Tempo und begrenzt Kurvenführung bei zu hoher Querbeschleunigung", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain),
    base = api.Physics.spawn(surface, 0);
  const road = { ...base, vx: 80, vy: 0, speed: 80, heading: 0 },
    shoulderPos = surface.at(0, surface.roadRadius + 3),
    shoulder = { ...road, x: shoulderPos.x, y: shoulderPos.y };
  const on = api.Physics.step(
      road,
      { throttle: 1, brake: 0, steer: 0 },
      surface,
    ),
    off = api.Physics.step(
      shoulder,
      { throttle: 1, brake: 0, steer: 0 },
      surface,
    );
  expect(off.speed).toBeLessThan(on.speed);
  expect(off.offroad).toBe(true);
  const fast = api.Physics.step(
    { ...road, vx: 105, speed: 105, steering: 0.58 },
    { throttle: 0, brake: 0, steer: 1 },
    surface,
  );
  expect(fast.understeer).toBeGreaterThan(1);
  expect(fast.heading).toBeLessThan(
    ((105 / api.Physics.parameters.wheelbase) * Math.tan(0.58)) / 120,
  );
  let slowTurn = { ...road, vx: 35, speed: 35, steering: 0.58 };
  let fastTurn = { ...road, vx: 105, speed: 105, steering: 0.58 };
  for (let i = 0; i < 12; i++) {
    slowTurn = api.Physics.step(
      slowTurn,
      { throttle: 0, brake: 0, steer: 1 },
      surface,
    );
    fastTurn = api.Physics.step(
      fastTurn,
      { throttle: 0, brake: 0, steer: 1 },
      surface,
    );
  }
  // The same full steering command turns the fast car less while it travels farther.
  expect(fastTurn.heading).toBeLessThan(slowTurn.heading);
  expect(fastTurn.x - road.x).toBeGreaterThan((slowTurn.x - road.x) * 2);
});
it("stoppt vor dem äußeren Rand ohne Durchfahren oder automatische Rückführung", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain);
  let car = api.Physics.spawn(surface, 0);
  car = { ...car, heading: Math.PI / 2, vx: 0, vy: 60, speed: 60 };
  let hit = false;
  for (let i = 0; i < 100; i++) {
    car = api.Physics.step(car, { throttle: 1, brake: 0, steer: 0 }, surface);
    hit ||= car.hitWall;
  }
  expect(hit).toBe(true);
  expect(surface.project(car, 0).distance).toBeLessThan(surface.outerRadius);
  expect(car.speed).toBe(0);
});
it("respektiert Pause und Schrittgröße und beginnt nach Rücksetzen eine neue Messung", () => {
  const { api, data } = loadArcade(),
    a = api.Session.create(data.tracks.bahrain),
    b = api.Session.create(data.tracks.bahrain),
    input = { throttle: 1, brake: 0, steer: 0 };
  a.advance(input, 10);
  expect(a.snapshot().timing.elapsed).toBe(0);
  a.pause(false);
  b.pause(false);
  for (let i = 0; i < 60; i++) a.advance(input, 1 / 60);
  for (let i = 0; i < 30; i++) b.advance(input, 1 / 30);
  expect(a.snapshot().car).toEqual(b.snapshot().car);
  a.pause();
  const paused = a.snapshot();
  a.advance(input, 100);
  expect(a.snapshot()).toEqual(paused);
  a.recover();
  expect(a.snapshot().car.speed).toBe(0);
  expect(a.snapshot().timing.started).toBe(false);
  expect(a.snapshot().timing.nextGate).toBe(0);
});
it("hält eng benachbarte Streckenarme bei der lokalen Projektion auseinander", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain),
    s = surface.g.len * 0.5,
    p = surface.at(s);
  const local = surface.project(p, s);
  expect(Math.abs(local.s - s)).toBeLessThan(1e-6);
  const other = surface.project(p, 0);
  expect(Math.abs(other.s)).toBeLessThan(surface.g.width * 3);
});
it("zählt nur vorwärts überquerte Kontrollpunkte in Reihenfolge und misst echte aktive Sekunden", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain);
  let t = api.Timing.create();
  const cross = (index, back = false, offroad = false) => {
    const p = surface.checkpoints[index],
      x = Math.cos(p.ang),
      y = Math.sin(p.ang),
      from = { x: p.x - x, y: p.y - y },
      to = { x: p.x + x, y: p.y + y, offroad };
    t = api.Timing.step(t, back ? to : from, back ? from : to, surface, 1);
  };
  cross(0);
  expect(t.started).toBe(true);
  cross(0);
  expect(t.completed).toBe(0);
  cross(1, true);
  expect(t.nextGate).toBe(1);
  for (let i = 1; i < surface.checkpoints.length; i++) cross(i);
  cross(0);
  expect(t.completed).toBe(1);
  expect(t.lastLap.valid).toBe(true);
  expect(t.bestLap).toBe(5);
  for (let i = 1; i < surface.checkpoints.length; i++) cross(i, false, i === 1);
  cross(0);
  expect(t.lastLap.valid).toBe(true);
  expect(t.invalid).toBe(false);
  expect(t.bestLap).toBe(3);
});
it("beendet drei gültige Bahrain-Runden mit binären Tastaturkommandos ohne Kontakt oder Datenmanipulation", () => {
  const { api, data } = loadArcade(),
    s = api.Session.create(data.tracks.bahrain),
    result = driveBahrain(s);
  expect(result.lapTimes).toHaveLength(3);
  expect(
    result.lapTimes.every((l) => l.valid && l.seconds > 20 && l.seconds < 60),
  ).toBe(true);
  expect(result.contacts).toBe(0);
  const finished = s.snapshot().timing;
  s.recover();
  expect(s.snapshot().timing.bestLap).toBe(finished.bestLap);
  expect(s.snapshot().timing.completed).toBe(3);
  expect(s.snapshot().timing.started).toBe(false);
  s.restart();
  expect(s.snapshot().timing.bestLap).toBe(null);
  expect(s.snapshot().timing.completed).toBe(0);
  expect(s.snapshot().paused).toBe(true);
  expect(
    result.trace.every(
      (input) =>
        [0, 1].includes(input.throttle) &&
        [0, 1].includes(input.brake) &&
        [-1, 0, 1].includes(input.steer),
    ),
  ).toBe(true);
});
