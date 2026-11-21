import { withoutStartLights } from "../helpers/start-lights.js";
import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT, plain } from "../helpers/project.js";

function straight() {
  return { g: { len: 100000, width: 40 }, roadRadius: 20,
    at: (s) => ({ x: s, y: 0, ang: 0, s }), gap: (a, b) => b - a,
    project: (p) => ({ s: p.x, distance: Math.abs(p.y), ang: 0 }),
    boundary: { contains: (p) => Math.abs(p.y) < 32,
      blocksFootprint: (corners) => corners.some((p) => Math.abs(p.y) >= 32) } };
}
function field() {
  const { api } = loadArcade({ race: true }), surface = straight(), p = api.Physics.parameters,
    entries = Array.from({ length: 13 }, (_, i) => ({ id: "car" + String(i).padStart(2, "0"),
      player: i === 6, finishTime: null, timing: { started: true }, catchup: api.Catchup.empty(),
      car: { ...api.Physics.spawn(surface, -250 * i), vx: 100, speed: 100, longitudinalSpeed: 100 } })),
    history = api.RaceGaps.create();
  let time = 0;
  for (const e of entries) history.observe(e.id, e.car.s, 0);
  function advance(seconds = 1 / 120) {
    time += seconds;
    for (const e of entries) { e.car.s += 100 * seconds; e.car.x = e.car.s; }
    const states = api.Catchup.update(entries, surface, p, time, seconds, history, (e) => e.car.s);
    entries.forEach((e, i) => { e.catchup = states[i]; });
  }
  advance(40);
  return { api, entries, advance };
}

it("misst Zeitabstände aus tatsächlichen Passagen statt Entfernung durch momentanes Tempo", () => {
  const { api } = loadArcade({ race: true }), h = api.RaceGaps.create();
  h.observe("a", 0, 0); h.observe("a", 160, 2); h.observe("a", 320, 3);
  expect(h.crossing("a", 200)).toBeCloseTo(2.25, 10);
  h.observe("a", 320, 10); // Standing still must not move earlier passage times.
  expect(h.crossing("a", 320)).toBe(3);
  h.observe("a", 336, 11);
  expect(h.crossing("a", 336)).toBe(11);
  h.observe("a", 300, 12); h.observe("a", 352, 13);
  expect(h.crossing("a", 320)).toBe(3);
  expect(h.crossing("a", 352)).toBe(13);
  expect(h.crossing("a", 400)).toBeNull();
  // Absolute route coordinates distinguish another lap at the same location.
  h.observe("a", 1352, 30);
  expect(h.crossing("a", 352)).toBe(13);
  expect(h.crossing("a", 1000)).toBeGreaterThan(13);
  h.observe("stopped", 0, 0); h.observe("stopped", 10, 0.1);
  h.observe("stopped", 10, 10); h.observe("stopped", 20, 10.1);
  expect(h.crossing("stopped", 15)).toBeCloseTo(10.05, 8);
  expect(h.crossing("stopped", 10)).toBeCloseTo(0.1, 8);
});

it("begrenzt Ranggruppen und Rückstand, schließt Spieler und P1–P3 strikt aus", () => {
  const { api, entries, advance } = field();
  const limits = [0, 0, 0, 0.002, 0.002, 0.002, 0.005, 0.005, 0.005, 0.009, 0.009, 0.009, 0.009];
  for (let n = 0; n < 360; n++) advance();
  for (const [i, e] of entries.entries()) {
    expect(e.catchup.pace).toBeLessThanOrEqual(limits[i]);
    if (i < 3 || e.player) expect(e.catchup.pace).toBe(0);
    else expect(e.catchup.pace).toBeGreaterThan(0);
  }
  expect(entries[12].catchup.pace).toBeGreaterThan(0.008);
  const near = entries[12];
  near.car.s = entries[0].car.s - 100; near.car.x = near.car.s;
  // The car has become P2: no support despite a previous P13 memory.
  advance();
  expect(near.catchup.position).toBe(2);
  expect(near.catchup.pace).toBe(0);
});

it("reduziert Hilfe im direkten Zweikampf", () => {
  const { entries, advance } = field(), tail = entries[12];
  for (let n = 0; n < 360; n++) advance();
  const alone = tail.catchup.target;
  entries[11].car.s = tail.car.s + 18; entries[11].car.x = entries[11].car.s;
  advance();
  expect(tail.catchup.duelFactor).toBe(0.25);
  expect(tail.catchup.target).toBeLessThanOrEqual(alone * 0.251);
});

it("gewährt Fehlererholung höchstens acht Sekunden und belohnt Fahrzeugkontakte nicht", () => {
  const { entries, advance } = field(), tail = entries[12];
  tail.car.offroad = true;
  for (let n = 0; n < 60; n++) advance();
  expect(tail.catchup.pace).toBe(0);
  tail.car.offroad = false; advance();
  expect(tail.catchup.recoveryRemaining).toBeCloseTo(8, 8);
  for (let n = 0; n < 120 * 4; n++) advance();
  expect(tail.catchup.pace).toBeGreaterThan(0.011);
  expect(tail.catchup.pace).toBeLessThanOrEqual(0.012);
  for (let n = 0; n < 120 * 5; n++) advance();
  expect(tail.catchup.recoveryRemaining).toBe(0);
  expect(tail.catchup.pace).toBeLessThanOrEqual(0.009);
  tail.car.hitCar = true; tail.car.offroad = true;
  for (let n = 0; n < 60; n++) advance();
  tail.car.hitCar = false;
  for (let n = 0; n < 360; n++) advance();
  tail.car.offroad = false;
  for (let n = 0; n < 130; n++) advance();
  expect(tail.catchup.recoveryRemaining).toBe(0);
});

it("integriert maximal 1,2 Prozent Motorhilfe ohne neuen Grip oder Geschwindigkeitssprung beim Wegfall", () => {
  const { api } = loadArcade({ race: true }), s = straight(), p = api.Physics.parameters,
    gas = { throttle: 1, brake: 0, steer: 0 }, kmh = p.metersPerUnit * 3.6;
  for (const strength of [0, 1]) {
    let car = { ...api.Physics.spawn(s, 0), vx: p.maxSpeed, speed: p.maxSpeed, longitudinalSpeed: p.maxSpeed };
    for (let n = 0; n < 120 * 10; n++) {
      const prior = car;
      car = api.Physics.step(car, gas, s, p, 1 / 120, { strength, catchup: 0.012 });
      expect(car.x).toBeCloseTo(prior.x + car.vx / 120, 8);
      expect(car.speed * kmh).toBeLessThanOrEqual(118.8 * 1.012 + strength * 5 + 0.000001);
    }
    expect(car.speed * kmh).toBeCloseTo(118.8 * 1.012 + strength * 5, 4);
    const prior = car.speed;
    car = api.Physics.step(car, gas, s, p, 1 / 120, { strength, catchup: 0 });
    expect(car.speed).toBeGreaterThan(p.maxSpeed + strength * 5 / kmh + 1);
    expect((prior - car.speed) * kmh).toBeLessThan(0.1);
    for (let n = 0; n < 120 * 5; n++) car = api.Physics.step(car, gas, s, p, 1 / 120, { strength, catchup: 0 });
    expect(car.speed * kmh).toBeCloseTo(118.8 + strength * 5, 3);
  }
  expect(api.Physics.parameters.maxLateralAcceleration).toBe(210);
  expect(api.Physics.parameters.braking).toBe(145);
});

it("erhält ohne Aufholhilfe den veröffentlichten Rennkern unter identischer Windschattenabstimmung", () => {
  // Both replay kernels intentionally use the same current wind profile.
  // This isolates catch-up integration from the separately authorized wind tuning.
  const { api, data } = loadArcade({ race: true }), scope = { CGPArcade: { ...api }, CGPArcadeData: data };
  for (const name of ["opponents", "race-session"])
    runInNewContext(execFileSync("git", ["show", `2bc124a11c274c0f52eb516bd9a0f1ea9e0d377f:src/racing/${name}.js`], { cwd: ROOT, encoding: "utf8" }), scope);
  const track = api.TrackCatalog.get("bahrain"),
    current = api.RaceSession.create(track, { catchup: false, laps: 3 }),
    prior = scope.CGPArcade.RaceSession.create(track, { laps: 3 });
  // The historical session predates the separately authorized seven-second
  // start gate. Apply that same wind rule in its temporary test context, so
  // this replay continues to isolate catch-up integration with wind enabled.
  scope.CGPArcade.Slipstream = { ...api.Slipstream, update(...args) {
    return prior.snapshot().race.elapsed + 1e-9 < api.Slipstream.settings.startSeconds
      ? args[0].map(() => api.Slipstream.empty()) : api.Slipstream.update(...args);
  } };
  current.pause(false); prior.pause(false);
  for (let n = 0; n < 30 * 20; n++) {
    const input = { throttle: Number(n % 150 < 110), brake: Number(n % 150 >= 110), steer: Math.sin(n / 120) };
    current.advance(input, 1 / 30); prior.advance(input, 1 / 30);
    if (n % 30 === 0) expect(withoutStartLights(current.snapshot())).toEqual(withoutStartLights(prior.snapshot()));
  }
}, 120000);

it("erhält Team, Schwierigkeit und Rundenzahl beim Umschalten und sperrt ab Countdown", () => {
  const { api } = loadArcade({ race: true }), race = api.RaceSession.create(api.TrackCatalog.get("russia"),
    { difficulty: "hard", playerTeam: "t05", laps: 2 });
  expect(race.selectCatchup(false)).toBe(true);
  expect(race.snapshot().entries.every((e) => !Object.hasOwn(e, "catchup"))).toBe(true);
  race.pause(false);
  expect(race.selectCatchup(true)).toBe(false);
  race.restart(); race.selectCatchup(true);
  expect(race.snapshot().race).toMatchObject({ difficulty: "hard", playerTeam: "t05", laps: 2, catchup: true });
  expect(race.snapshot().entries.every((e) => e.catchup.pace === 0)).toBe(true);
});

it("reserviert die Positionen bereits fertiger Fahrer und verwirft zu alte Zeitmessungen", () => {
  const { api, entries } = field();
  entries.slice(0, 3).forEach((e, i) => { e.finishTime = i + 1; e.timing.completed = 1; });
  const unknownHistory = { observe() {}, crossing: () => null },
    states = api.Catchup.update(entries, straight(), api.Physics.parameters, 50, 1 / 120, unknownHistory, (e) => e.car.s);
  expect(states.map((s) => s.position)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  expect(states.slice(0, 3).every((s) => s.pace === 0)).toBe(true);
  const history = api.RaceGaps.create();
  for (let i = 0; i <= 4000; i++) history.observe("a", i * 5, i * 0.05);
  expect(history.crossing("a", 1000)).toBeNull();
  expect(history.crossing("a", 19000)).toBeCloseTo(190, 6);
});
