import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT } from "../helpers/game.js";

const baselineSource = execFileSync(
  "git",
  ["show", "1e98252ca84a964e7a1fe42698c7c29a235b0cf8:src/racing/physics.js"],
  { cwd: ROOT, encoding: "utf8" },
);
const neutral = { throttle: 0, brake: 0, steer: 0 },
  back = { ...neutral, brake: 1 },
  gas = { ...neutral, throttle: 1 };
function setup() {
  const { api, data } = loadArcade();
  return { api, data, surface: api.Surface.create(data.tracks.bahrain) };
}
function advance(api, car, input, surface, steps) {
  for (let i = 0; i < steps; i++) car = api.Physics.step(car, input, surface);
  return car;
}

it("reagiert auf kurze Lenktipps deutlich sanfter als die veröffentlichte Version und zentriert zügig", () => {
  const { api, surface } = setup(),
    scope = {};
  runInNewContext(baselineSource, scope);
  const old = scope.CGPArcade.Physics;
  const base = {
    ...api.Physics.spawn(surface, 0),
    heading: 0,
    vx: 80,
    vy: 0,
    speed: 80,
  };
  const input = { ...gas, steer: 1 };
  let gentle = advance(api, base, input, surface, 18),
    direct = base;
  for (let i = 0; i < 18; i++) direct = old.step(direct, input, surface);
  expect(gentle.heading).toBeGreaterThan(0.03);
  expect(gentle.heading).toBeLessThan(direct.heading * 0.7);
  expect(Math.abs(gentle.y - base.y)).toBeLessThan(
    Math.abs(direct.y - base.y) * 0.7,
  );
  gentle = advance(api, gentle, neutral, surface, 30);
  for (let i = 0; i < 30; i++) direct = old.step(direct, neutral, surface);
  expect(Math.abs(gentle.steering)).toBeLessThan(Math.abs(direct.steering));
});

it("wartet im Stand kurz, fährt begrenzt rückwärts und verwirft einen unterbrochenen Haltevorgang", () => {
  const { api, surface } = setup(),
    initial = api.Physics.spawn(surface, 0);
  let car = advance(api, initial, back, surface, 24);
  expect(car.speed).toBe(0);
  expect(car.x).toBe(initial.x);
  car = advance(api, car, neutral, surface, 1);
  car = advance(api, car, back, surface, 24);
  expect(car.speed).toBe(0);
  car = advance(api, car, back, surface, 12);
  expect(car.longitudinalSpeed).toBeLessThan(0);
  expect(car.x).toBeLessThan(initial.x);
  car = advance(api, car, back, surface, 300);
  expect(car.longitudinalSpeed).toBeLessThan(-15);
  expect(car.speed * 0.3 * 3.6).toBeLessThan(25);
  expect(car.hitWall).toBe(false);
  expect(car.heading).toBe(initial.heading);
});

it("bremst vor jedem Fahrtrichtungswechsel bis null, ohne einen sofortigen Geschwindigkeitssprung", () => {
  const { api, surface } = setup();
  let car = advance(api, api.Physics.spawn(surface, 0), gas, surface, 100),
    stopped = false;
  for (let i = 0; i < 120; i++) {
    car = api.Physics.step(car, back, surface);
    expect(car.longitudinalSpeed).toBeGreaterThanOrEqual(0);
    if (car.speed === 0) {
      stopped = true;
      break;
    }
  }
  expect(stopped).toBe(true);
  car = advance(api, car, back, surface, 24);
  expect(car.speed).toBe(0);
  car = advance(api, car, back, surface, 72);
  expect(car.longitudinalSpeed).toBeLessThan(-5);
  stopped = false;
  for (let i = 0; i < 100; i++) {
    car = api.Physics.step(car, gas, surface);
    if (car.speed === 0) {
      stopped = true;
      break;
    }
    expect(car.longitudinalSpeed).toBeLessThan(0);
  }
  expect(stopped).toBe(true);
  car = api.Physics.step(car, gas, surface);
  expect(car.longitudinalSpeed).toBeGreaterThan(0);
});

it("rollt rückwärts aus, bremst bei beiden Tasten und lenkt beim Rückwärtsfahren wie ein Auto", () => {
  const { api, surface } = setup(),
    initial = api.Physics.spawn(surface, 0),
    moving = { ...initial, vx: -15, vy: 0, speed: 15, longitudinalSpeed: -15 };
  const coast = api.Physics.step(moving, neutral, surface);
  expect(coast.speed).toBeLessThan(15);
  expect(coast.longitudinalSpeed).toBeLessThan(0);
  const turn = advance(api, moving, { ...back, steer: 1 }, surface, 20);
  expect(turn.heading).toBeLessThan(initial.heading);
  let stopped = advance(api, moving, { ...gas, brake: 1 }, surface, 120);
  expect(stopped.speed).toBe(0);
  expect(stopped.reverseHold).toBe(0);
  const shoulder = surface.at(0, surface.roadRadius + 3),
    off = api.Physics.step(
      { ...moving, x: shoulder.x, y: shoulder.y },
      back,
      surface,
    ),
    on = api.Physics.step(moving, back, surface);
  expect(off.speed).toBeLessThan(on.speed);
});

it("hält auch rückwärts an der Begrenzung und kann danach ohne Reset wieder vorwärts wegfahren", () => {
  const { api, surface } = setup();
  let car = {
    ...api.Physics.spawn(surface, 0),
    heading: Math.PI / 2,
    vx: 0,
    vy: -18,
    speed: 18,
    longitudinalSpeed: -18,
  };
  let contact = false;
  for (let i = 0; i < 240; i++) {
    car = api.Physics.step(car, back, surface);
    contact ||= car.hitWall;
  }
  expect(contact).toBe(true);
  expect(car.speed).toBe(0);
  expect(surface.project(car, 0).distance).toBeLessThan(surface.outerRadius);
  const y = car.y;
  car = advance(api, car, gas, surface, 60);
  expect(car.y).toBeGreaterThan(y + 2);
  expect(car.longitudinalSpeed).toBeGreaterThan(0);
  expect(car.hitWall).toBe(false);
});

it("löst die Rückwärts-Vorwahl bei Pause und Neustart", () => {
  const { api, data } = setup(),
    s = api.Session.create(data.tracks.bahrain);
  s.pause(false);
  for (let i = 0; i < 6; i++) s.advance(back, 1 / 30);
  expect(s.snapshot().car.reverseHold).toBeGreaterThan(0.1);
  s.pause();
  expect(s.snapshot().car.reverseHold).toBe(0);
  s.pause(false);
  for (let i = 0; i < 6; i++) s.advance(back, 1 / 30);
  expect(s.snapshot().car.speed).toBe(0);
  for (let i = 0; i < 5; i++) s.advance(back, 1 / 30);
  expect(s.snapshot().car.longitudinalSpeed).toBeLessThan(0);
  s.restart();
  expect(s.snapshot().car.speed).toBe(0);
  expect(s.snapshot().car.reverseHold).toBe(0);
});

it("zählt rückwärts weder Start/Ziel noch Kontrollpunkte, auch bei Bewegung entlang der Rennrichtung", () => {
  const { api, surface } = setup();
  let state = api.Timing.create();
  function cross(index, reverse) {
    const p = surface.checkpoints[index],
      dx = Math.cos(p.ang),
      dy = Math.sin(p.ang);
    state = api.Timing.step(
      state,
      { x: p.x - dx, y: p.y - dy },
      { x: p.x + dx, y: p.y + dy, longitudinalSpeed: reverse ? -5 : 5 },
      surface,
      1,
    );
  }
  cross(0, true);
  expect(state.started).toBe(false);
  cross(0, false);
  expect(state.started).toBe(true);
  cross(1, true);
  expect(state.nextGate).toBe(1);
  for (let i = 1; i < surface.checkpoints.length; i++) cross(i, false);
  cross(0, true);
  expect(state.completed).toBe(0);
  expect(state.bestLap).toBe(null);
  expect(state.nextGate).toBe(0);
  cross(0, false);
  expect(state.completed).toBe(1);
  expect(state.lastLap.valid).toBe(true);
});
