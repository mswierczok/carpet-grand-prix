import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT, plain } from "../helpers/game.js";

export function straight() {
  return { g: { len: 100000, width: 40 }, roadRadius: 20,
    gap: (a, b) => ((b - a + 150000) % 100000) - 50000,
    at: (s) => ({ x: s, y: 0, ang: 0, s }),
    project: (p) => ({ x: p.x, y: 0, s: p.x, ang: 0, distance: Math.abs(p.y) }),
    boundary: { contains: (p) => Math.abs(p.y) < 32,
      blocksFootprint: (corners) => corners.some((p) => Math.abs(p.y) >= 32) } };
}
export function entry(api, id, x, y = 0, speed = 110) {
  const car = { ...api.Physics.spawn(straight(), x), y, vx: speed,
    speed, longitudinalSpeed: speed };
  return { id, car, visual: car, finishTime: null, slipstream: api.Slipstream.empty() };
}

it("schaltet erst ab 100 km/h bei beiden Autos ein und beendet darunter auch einen bestehenden Effekt", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    kmh = p.metersPerUnit * 3.6, make = (id, x, speed) => entry(api, id, x, 0, speed / kmh);
  for (const speed of [0, 80, 90, 99, 99.999]) for (const slowLeader of [false, true]) {
    const a = make("a", 0, slowLeader ? 118.8 : speed),
      b = make("b", 25, slowLeader ? speed : 118.8);
    a.slipstream = { strength: 1, sourceId: "b" };
    expect(api.Slipstream.pair(a, b, s, p)).toBeNull();
    expect(api.Slipstream.pair(a, b, s, p, true)).toBeNull();
    expect(api.Slipstream.update([a, b], s, p, 1 / 120)[0]).toEqual(api.Slipstream.empty());
  }
  for (const speed of [100, 100.001, 105, 118.8]) {
    const a = make("a", 0, speed), b = make("b", 25, speed),
      effect = api.Slipstream.pair(a, b, s, p);
    expect(effect.strength).toBe(1);
    expect(Number.isFinite(effect.strength)).toBe(true);
  }
});

it("sperrt Windschatten sieben Rennsekunden ab Grün und zählt Countdown/Pausen nicht mit, auch nach Neustart", () => {
  const { api } = loadArcade({ race: true }), real = api.Slipstream, calls = [];
  let race;
  // Read-only observation in the isolated test VM; no production hooks.
  api.Slipstream = { ...real, update(...args) {
    calls.push(race.snapshot().race.elapsed);
    return real.update(...args);
  } };
  race = api.RaceSession.create(api.TrackCatalog.get("bahrain"), { catchup: false, laps: 1 });
  const advance = (ticks) => { for (let i = 0; i < ticks; i++)
    race.advance({ throttle: 1, brake: 0, steer: 0 }, 1 / 120); };
  const off = () => expect(race.snapshot().entries.every((e) =>
    e.slipstream.strength === 0 && e.slipstream.dragReduction === 0 && e.slipstream.sourceId === null)).toBe(true);
  race.pause(false);
  advance(360); // Three-second countdown.
  expect(race.snapshot().race.elapsed).toBe(0);
  advance(360);
  off();
  const paused = plain(race.snapshot());
  race.pause(true);
  advance(600);
  expect(race.snapshot().race.elapsed).toBe(paused.race.elapsed);
  off();
  race.pause(false);
  advance(480); // Seven actual racing seconds, independent of pause/countdown.
  expect(race.snapshot().race.elapsed).toBeCloseTo(7, 10);
  expect(calls).toHaveLength(0);
  off();
  advance(1);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toBeCloseTo(7, 10);
  advance(60);
  expect(calls.every((time) => time >= 7 - 1e-9)).toBe(true);
  race.restart();
  expect(race.snapshot().race.elapsed).toBe(0);
  off();
  calls.length = 0;
  race.pause(false);
  advance(360 + 839);
  off();
  expect(calls).toHaveLength(0);
  advance(2);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toBeCloseTo(7, 10);
});

it("begrenzt Abstand, Tempo, Ausrichtung, Rand und Kontakte mit sanftem Aufbau/Ausscheren", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    a = entry(api, "a", 0), b = entry(api, "b", 25), pair = (aa = a, bb = b) => api.Slipstream.pair(aa, bb, s, p);
  expect(pair().strength).toBe(1);
  for (const distance of [0, 10, 64.8, 65, 87, 110]) expect(pair(a, entry(api, "b", distance))).toBeNull();
  for (const speed of [0, -100, 70]) expect(pair(entry(api, "a", 0, 0, speed))).toBeNull();
  expect(pair(a, entry(api, "b", 40, 5))).toBeNull();
  for (const property of ["offroad", "hitWall", "hitCar"])
    expect(pair({ ...a, car: { ...a.car, [property]: true } })).toBeNull();
  expect(pair({ ...a, finishTime: 1 })).toBeNull();
  expect(pair(a, { ...b, car: { ...b.car, heading: Math.PI } })).toBeNull();
  const initial = api.Slipstream.update([a, b], s, p, 1 / 120);
  expect(initial[0].strength).toBeGreaterThan(0);
  expect(initial[0].strength).toBeLessThan(0.06);
  a.slipstream = { ...initial[0], strength: 1 };
  const shifted = { ...b, car: { ...b.car, y: 5 } },
    fading = api.Slipstream.update([a, shifted], s, p, 1 / 120)[0];
  expect(fading.strength).toBeGreaterThan(0.97);
  expect(fading.strength).toBeLessThan(1);
  expect(fading.sourceId).toBe("b");
  expect(api.Slipstream.update([a, { ...b, car: { ...b.car, s: 1000 } }], s, p, 1 / 120)[0].strength).toBe(0);
});

it("erzeugt aus Luftwiderstand und Gas maximal fünf zusätzliche km/h und baut sie ohne Geschwindigkeitszuweisung ab", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    gas = { throttle: 1, brake: 0, steer: 0 }, kmh = p.metersPerUnit * 3.6;
  let base = entry(api, "base", 0).car, wake = { ...base }, peakDelta = 0;
  for (let n = 0; n < 120 * 10; n++) {
    base = api.Physics.step(base, gas, s, p, 1 / 120);
    const previous = wake;
    wake = api.Physics.step(wake, gas, s, p, 1 / 120, { strength: 1 });
    expect(wake.x).toBeCloseTo(previous.x + wake.vx / 120, 8);
    // Even an instantaneous test input of full strength produces an ordinary
    // force step (<0.15 km/h), never an instantaneous +5 km/h velocity jump.
    expect((wake.speed - previous.speed) * kmh).toBeLessThan(0.15);
    peakDelta = Math.max(peakDelta, (wake.speed - base.speed) * kmh);
  }
  expect(base.speed * kmh).toBeCloseTo(118.8, 8);
  expect(peakDelta).toBeGreaterThan(4.99);
  expect(peakDelta).toBeLessThanOrEqual(5.000001);
  const before = wake.speed;
  wake = api.Physics.step(wake, gas, s, p, 1 / 120, { strength: 0 });
  expect(wake.speed).toBeLessThan(before);
  expect(wake.speed).toBeGreaterThan(p.maxSpeed + 2.6);
  for (let i = 0; i < 120 * 4; i++) wake = api.Physics.step(wake, gas, s, p, 1 / 120, { strength: 0 });
  expect(wake.speed * kmh).toBeCloseTo(118.8, 4);
  const coast = api.Physics.step(entry(api, "a", 0).car, { ...gas, throttle: 0 }, s, p, 1 / 120, { strength: 1 });
  expect(coast.speed).toBeLessThan(p.maxSpeed);
  const reverse = entry(api, "a", 0, 0, -20).car;
  expect(plain(api.Physics.step(reverse, { throttle: 0, brake: 1, steer: 0 }, s, p, 1 / 120, { strength: 0 })))
    .toEqual(plain(api.Physics.step(reverse, { throttle: 0, brake: 1, steer: 0 }, s, p, 1 / 120)));
});

it("behandelt Spieler und KI identisch, stapelt Quellen nicht und behält die längste erlaubte Runde korrekt", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    a = entry(api, "a", 0), b = entry(api, "b", 25), c = entry(api, "c", 30);
  a.slipstream = { strength: 1, sourceId: "b" };
  const player = api.Slipstream.update([{ ...a, player: true }, b, c], s, p, 1 / 120),
    opponent = api.Slipstream.update([{ ...a, player: false }, b, c], s, p, 1 / 120);
  expect(plain(player)).toEqual(plain(opponent));
  expect(player[0].strength).toBe(1);
  expect(player[0].dragReduction).toBeLessThan(0.8);
  const overLine = { ...b, car: { ...b.car, s: 100025 } };
  expect(api.Slipstream.pair(a, overLine, s, p).strength).toBe(1);
});

it("gibt volle Wirkung bei ein bis drei Längen, blendet bis sechs ab und beendet dort auch einen bestehenden Effekt", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    a = entry(api, "a", 0), length = p.halfLength * 2;
  for (const gap of [1, 1.5, 2, 2.5, 3]) {
    const b = entry(api, "b", gap * length);
    expect(api.Slipstream.pair(a, b, s, p).strength).toBe(1);
  }
  let previous = 1;
  for (const gap of [3.1, 4, 5, 5.9, 5.999]) {
    const effect = api.Slipstream.pair(a, entry(api, "b", gap * length), s, p);
    expect(effect.strength).toBeGreaterThan(0);
    expect(effect.strength).toBeLessThan(previous);
    previous = effect.strength;
  }
  a.slipstream = { strength: 1, sourceId: "b" };
  for (const gap of [6, 6.001, 7, 8, 9]) {
    const b = entry(api, "b", gap * length);
    expect(api.Slipstream.pair(a, b, s, p)).toBeNull();
    expect(api.Slipstream.pair(a, b, s, p, true)).toBeNull();
    expect(api.Slipstream.update([a, b], s, p, 1 / 120)[0].strength).toBe(0);
    expect(api.Slipstream.update([a, b], s, p, 1 / 120)[0].dragReduction).toBe(0);
  }
});

it("erreicht den spürbaren Fünf-km/h-Vorteil beim echten Heranfahren aus vier Fahrzeuglängen", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    follower = entry(api, "a", 0), leader = entry(api, "b", 4 * p.halfLength * 2),
    gas = { throttle: 1, brake: 0, steer: 0 };
  let peak = 0;
  for (let i = 0; i < 120 * 12; i++) {
    const effects = api.Slipstream.update([follower, leader], s, p, 1 / 120);
    follower.slipstream = effects[0]; leader.slipstream = effects[1];
    follower.car = api.Physics.step(follower.car, gas, s, p, 1 / 120, effects[0]);
    leader.car = api.Physics.step(leader.car, gas, s, p, 1 / 120, effects[1]);
    peak = Math.max(peak, (follower.car.speed - leader.car.speed) * p.metersPerUnit * 3.6);
    if (leader.car.x - follower.car.x < p.halfLength * 2 * 1.1) break;
  }
  expect(peak).toBeGreaterThan(4.9);
  expect(peak).toBeLessThanOrEqual(5.000001);
});

it("erreicht auch seitlich versetzt im sichtbaren Korridor rund fünf km/h innerhalb von zwei Sekunden", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    gas = { throttle: 1, brake: 0, steer: 0 }, kmh = p.metersPerUnit * 3.6;
  for (const offset of [-3.9, -3, -2, -1, 0, 1, 2, 3, 3.9]) {
    const follower = entry(api, "a", 0, offset), leader = entry(api, "b", 3 * p.halfLength * 2);
    expect(api.Slipstream.pair(follower, leader, s, p).strength).toBe(1);
    for (let tick = 0; tick < 240; tick++) {
      const effects = api.Slipstream.update([follower, leader], s, p, 1 / 120);
      for (const [i, e] of [follower, leader].entries()) {
        e.slipstream = effects[i];
        const previous = e.car;
        e.car = api.Physics.step(e.car, gas, s, p, 1 / 120, effects[i]);
        expect((e.car.speed - previous.speed) * kmh).toBeLessThan(0.15);
        expect(e.car.x).toBeCloseTo(previous.x + e.car.vx / 120, 8);
      }
      const advantage = (follower.car.speed - leader.car.speed) * kmh;
      expect(advantage).toBeLessThanOrEqual(5.000001);
      if (tick === 179) expect(advantage, `Versatz ${offset}, nach 1,5 s`).toBeGreaterThan(4.9);
    }
    expect((follower.car.speed - leader.car.speed) * kmh, `Versatz ${offset}, nach 2 s`).toBeGreaterThan(4.98);
    expect(follower.slipstream.distanceLengths).toBeGreaterThan(1);
    expect(follower.slipstream.distanceLengths).toBeLessThan(3);
  }
});

it("begrenzt den vollen seitlichen Korridor und schaltet die normale Ausblendung spätestens bei sechs Längen ab", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    a = entry(api, "a", 0), length = p.halfLength * 2;
  for (const offset of [-6, -5, -4, 4, 5, 6])
    expect(api.Slipstream.pair(a, entry(api, "b", 2 * length, offset), s, p)).toBeNull();
  a.slipstream = { strength: 1, sourceId: "b" };
  const b = entry(api, "b", 2 * length, 5), faded = api.Slipstream.update([a, b], s, p, 0.05)[0];
  expect(faded.strength).toBeGreaterThan(0);
  expect(faded.strength).toBeLessThan(1);
  a.slipstream = faded;
  b.car.x = b.car.s = 6 * length;
  expect(api.Slipstream.update([a, b], s, p, 1 / 120)[0].strength).toBe(0);
  b.car.x = b.car.s = 2 * length;
  b.car.y = 6;
  expect(api.Slipstream.update([a, b], s, p, 1 / 120)[0].strength).toBe(0);
});

it("lässt die KI den gemeinsamen Windschatten auf freien Geraden nutzen und behält ihre Kurvenbremsung", () => {
  const { api } = loadArcade({ race: true }), s = api.Surface.create(api.TrackCatalog.get("bahrain")),
    p = api.Physics.parameters, driver = api.Opponents.create(s, p, { diagnostics: true });
  let straightCases = 0, brakingCases = 0;
  for (let distance = 0; distance < s.g.len; distance += 40) {
    const pose = api.Physics.spawn(s, distance), state = driver.memory(0, 0), speed = 112,
      car = { ...pose, id: "a", vx: speed * Math.cos(pose.heading), vy: speed * Math.sin(pose.heading),
        speed, longitudinalSpeed: speed, slipstream: { strength: 1 } },
      traffic = driver.prepare([car]), command = driver.input(traffic[0], traffic, state),
      diagnostic = driver.diagnostics(state);
    if (diagnostic.desiredSpeed >= p.maxSpeed) {
      straightCases++;
      expect(command.throttle).toBe(1);
      expect(command.brake).toBe(0);
    } else if (diagnostic.desiredSpeed < 90) {
      brakingCases++;
      expect(command.brake).toBe(1);
    }
  }
  expect(straightCases).toBeGreaterThan(0);
  expect(brakingCases).toBeGreaterThan(0);
});

it("rangiert bei zu engem Stillstand vor einem Hindernis rückwärts, aber nicht in ein dahinter stehendes Auto", () => {
  const { api } = loadArcade({ race: true }), surface = api.Surface.create(api.TrackCatalog.get("bahrain")),
    driver = api.Opponents.create(surface, api.Physics.parameters),
    placed = (id, s, lane) => {
      const at = surface.at(s, lane);
      return { ...api.Physics.spawn(surface, s), id, x: at.x, y: at.y, heading: at.ang };
    },
    car = placed("ego", -200, -8.8), obstacle = placed("parked", -188, -6),
    rear = placed("rear", -212, -8.8);
  function commands(others) {
    const memory = driver.memory(0, 8), traffic = driver.prepare([car, ...others]), result = [];
    for (let frame = 0; frame < 55; frame++) result.push(driver.input(traffic[0], traffic, memory));
    return result;
  }
  expect(commands([obstacle]).some((c) => c.brake === 1 && c.throttle === 0)).toBe(true);
  expect(commands([obstacle, rear]).every((c) => c.brake === 0)).toBe(true);
});

it("schließt reale Brückenebenen und nahe Nachbararme auf allen 22 Strecken aus", () => {
  const { api } = loadArcade({ race: true }), p = api.Physics.parameters;
  let nearbyChecks = 0, ordinaryPairs = 0;
  for (const track of api.TrackCatalog.tracks) {
    const s = api.Surface.create(track),
      at = (id, distance) => { const car = api.Physics.spawn(s, distance);
        return { id, car: { ...car, vx: 100 * Math.cos(car.heading), vy: 100 * Math.sin(car.heading),
          speed: 100, longitudinalSpeed: 100 }, finishTime: null }; };
    for (let d = 0; d < s.g.len; d += 20) {
      const a = at("a", d), b = at("b", d + 40);
      if (api.Slipstream.pair(a, b, s, p)) ordinaryPairs++;
      for (let q = 0; q < s.g.len; q += 20) {
        if (Math.abs(s.gap(d, q)) < 110) continue;
        const bp = s.at(q);
        if (Math.hypot(bp.x - a.car.x, bp.y - a.car.y) > 95) continue;
        const other = at("b", q);
        expect(api.Slipstream.pair(a, other, s, p), `${track.id}:${d}:${q}`).toBeNull();
        nearbyChecks++;
      }
    }
    for (const bridge of s.bridge?.specs || []) {
      const over = at("a", bridge.center), under = at("b", bridge.under);
      expect(api.Slipstream.pair(over, under, s, p)).toBeNull();
      expect(api.Slipstream.pair(under, over, s, p)).toBeNull();
    }
  }
  expect(nearbyChecks).toBeGreaterThan(100);
  expect(ordinaryPairs).toBeGreaterThan(100);
}, 120000);

it("reproduziert ohne Windschatten das veröffentlichte 13er-Feld exakt", () => {
  const { api } = loadArcade({ race: true }), scope = { CGPArcade: { ...api }, CGPArcadeData: undefined };
  for (const path of ["racing/opponents", "racing/race-session"])
    runInNewContext(execFileSync("git", ["show", `1bf76bb90b0b5e99e693cab1b24ba57336a9746e:src/${path}.js`], { cwd: ROOT, encoding: "utf8" }), scope);
  // Both receive the public team roster explicitly; no global save or test hook.
  const { data } = loadArcade({ race: true });
  scope.CGPArcadeData = data;
  const track = api.TrackCatalog.get("bahrain"),
    a = api.RaceSession.create(track, { laps: 3, slipstream: false, catchup: false }),
    b = scope.CGPArcade.RaceSession.create(track, { laps: 3 });
  a.pause(false); b.pause(false);
  for (let i = 0; i < 30 * 20; i++) {
    const command = { throttle: Number(i % 200 < 150), brake: Number(i % 200 >= 150), steer: Math.sin(i / 120) };
    a.advance(command, 1 / 30); b.advance(command, 1 / 30);
    if (i % 30 === 0) expect(plain(a.snapshot())).toEqual(plain(b.snapshot()));
  }
}, 120000);

it("zeichnet ausschließlich den aktiven gemeinsamen Effektzustand in einem festen 3D-Batch", () => {
  const { api } = loadArcade({ race: true }), a = entry(api, "a", 0), b = entry(api, "b", 40);
  for (const file of ["wake-visuals", "wake3d"])
    runInNewContext(readFileSync(new URL(`src/rendering/${file}.js`, ROOT), "utf8"), { CGPArcade: api, CGPThree: THREE });
  const renderer = api.Wake3D.create(), snapshot = { entries: [a, b], race: { elapsed: 2 } };
  renderer.update(snapshot);
  expect(renderer.mesh.visible).toBe(false);
  a.slipstream = { strength: 0.8, sourceId: "b" };
  renderer.update(snapshot);
  expect(renderer.mesh.visible).toBe(true);
  expect(renderer.diagnostics().emitters).toBe(1);
  const positions = renderer.mesh.geometry.attributes.position, copy = Array.from(positions.array);
  expect(copy.every(Number.isFinite)).toBe(true);
  expect(Math.max(...copy.filter((_, i) => i % 3 === 0))).toBeLessThan(b.car.x - 4);
  expect(Math.min(...copy.filter((_, i) => i % 3 === 0 && i < renderer.mesh.geometry.drawRange.count * 3)))
    .toBeCloseTo(b.car.x - 3 * api.Physics.parameters.halfLength * 2, 1);
  renderer.update(snapshot);
  expect(renderer.mesh.geometry.attributes.position).toBe(positions);
  expect(Array.from(positions.array)).toEqual(copy);
  a.slipstream = api.Slipstream.empty();
  renderer.update(snapshot);
  expect(renderer.mesh.visible).toBe(false);
  expect(renderer.mesh.geometry.drawRange.count).toBe(0);
  renderer.dispose();
});

it("enthält vollständige endliche A/B-Messprotokolle statt ausgefallener Kontaktzähler", () => {
  const report = JSON.parse(readFileSync(new URL("docs/slipstream/field-ab.json", ROOT), "utf8")),
    tracks = ["bahrain", "france", "portugal", "japan", "korea", "russia"];
  expect(report.runs).toHaveLength(12);
  for (const id of tracks) for (const enabled of [false, true]) {
    const run = report.runs.find((r) => r.id === id && r.enabled === enabled);
    expect(run.finished).toBe(13);
    expect(run.entries).toHaveLength(13);
    for (const entry of run.entries) {
      expect(entry.lapSeconds).toHaveLength(2);
      expect(entry.finishSeconds).toBeGreaterThan(0);
      for (const key of ["observedContactFrames", "observedShoulderFrames", "observedWallFrames", "activeSeconds", "peakLongitudinalKmh"])
        expect(Number.isFinite(entry[key])).toBe(true);
      expect(entry.observedWallFrames).toBe(0);
      expect(entry.activeSeconds).toBeGreaterThanOrEqual(0);
      if (!enabled) expect(entry.activeSeconds).toBe(0);
    }
  }
});
