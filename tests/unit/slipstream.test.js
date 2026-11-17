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

it("begrenzt Abstand, Tempo, Ausrichtung, Rand und Kontakte mit sanftem Aufbau/Ausscheren", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    a = entry(api, "a", 0), b = entry(api, "b", 40), pair = (aa = a, bb = b) => api.Slipstream.pair(aa, bb, s, p);
  expect(pair().strength).toBe(1);
  for (const distance of [0, 10, 21, 87, 110]) expect(pair(a, entry(api, "b", distance))).toBeNull();
  for (const speed of [0, -100, 70]) expect(pair(entry(api, "a", 0, 0, speed))).toBeNull();
  expect(pair(a, entry(api, "b", 40, 5))).toBeNull();
  for (const property of ["offroad", "hitWall", "hitCar"])
    expect(pair({ ...a, car: { ...a.car, [property]: true } })).toBeNull();
  expect(pair({ ...a, finishTime: 1 })).toBeNull();
  expect(pair(a, { ...b, car: { ...b.car, heading: Math.PI } })).toBeNull();
  const initial = api.Slipstream.update([a, b], s, p, 1 / 120);
  expect(initial[0].strength).toBeGreaterThan(0);
  expect(initial[0].strength).toBeLessThan(0.02);
  a.slipstream = { ...initial[0], strength: 1 };
  const shifted = { ...b, car: { ...b.car, y: 5 } },
    fading = api.Slipstream.update([a, shifted], s, p, 1 / 120)[0];
  expect(fading.strength).toBeGreaterThan(0.97);
  expect(fading.strength).toBeLessThan(1);
  expect(fading.sourceId).toBe("b");
  expect(api.Slipstream.update([a, { ...b, car: { ...b.car, s: 1000 } }], s, p, 1 / 120)[0].strength).toBe(0);
});

it("erzeugt aus Luftwiderstand und Gas maximal drei zusätzliche km/h und baut sie ohne Geschwindigkeitszuweisung ab", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    gas = { throttle: 1, brake: 0, steer: 0 }, kmh = p.metersPerUnit * 3.6;
  let base = entry(api, "base", 0).car, wake = { ...base }, peakDelta = 0;
  for (let n = 0; n < 120 * 10; n++) {
    base = api.Physics.step(base, gas, s, p, 1 / 120);
    const previous = wake;
    wake = api.Physics.step(wake, gas, s, p, 1 / 120, { strength: 1 });
    expect(wake.x).toBeCloseTo(previous.x + wake.vx / 120, 8);
    // Even an instantaneous test input of full strength produces an ordinary
    // force step (<0.1 km/h), never an instantaneous +3 km/h velocity jump.
    expect((wake.speed - previous.speed) * kmh).toBeLessThan(0.1);
    peakDelta = Math.max(peakDelta, (wake.speed - base.speed) * kmh);
  }
  expect(base.speed * kmh).toBeCloseTo(118.8, 8);
  expect(peakDelta).toBeGreaterThan(2.99);
  expect(peakDelta).toBeLessThanOrEqual(3.000001);
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
    a = entry(api, "a", 0), b = entry(api, "b", 40), c = entry(api, "c", 50);
  a.slipstream = { strength: 1, sourceId: "b" };
  const player = api.Slipstream.update([{ ...a, player: true }, b, c], s, p, 1 / 120),
    opponent = api.Slipstream.update([{ ...a, player: false }, b, c], s, p, 1 / 120);
  expect(plain(player)).toEqual(plain(opponent));
  expect(player[0].strength).toBe(1);
  expect(player[0].dragReduction).toBeLessThan(0.5);
  const overLine = { ...b, car: { ...b.car, s: 100040 } };
  expect(api.Slipstream.pair(a, overLine, s, p).strength).toBe(1);
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
