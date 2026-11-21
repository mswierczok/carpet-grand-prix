import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT } from "../helpers/project.js";
const baseline = "d6cd3a05bacfe2e0c401f0101a4bfc6fa2ce643a";
function crossing(gate, lane = 0, reverse = false) {
  const dx = Math.cos(gate.ang),
    dy = Math.sin(gate.ang),
    x = gate.x - dy * lane,
    y = gate.y + dx * lane;
  return [
    { x: x - dx * 0.2, y: y - dy * 0.2 },
    {
      x: x + dx * 0.2,
      y: y + dy * 0.2,
      offroad: true,
      longitudinalSpeed: reverse ? -5 : 5,
    },
  ];
}

it("legt genau Start/Ziel und die beiden Original-Sektorlinien mit voller Seilbreite an", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain);
  expect(surface.checkpoints).toHaveLength(3);
  expect(surface.checkpoints.map((p) => p.s)).toEqual([
    0,
    ...surface.g.sectors.map((u) => u * surface.g.len),
  ]);
  expect(Object.isFrozen(surface.checkpoints[1])).toBe(true);
  for (const sign of [-1, 1]) {
    let state = api.Timing.create();
    for (const i of [0, 1, 2, 0, 1, 2, 0]) {
      const gate = surface.checkpoints[i],
        lane = sign < 0 ? gate.minLane + 5 : gate.maxLane - 5,
        [from, to] = crossing(gate, lane);
      expect(surface.boundary.contains(to)).toBe(true);
      expect(surface.project(to).distance).toBeGreaterThan(surface.roadRadius);
      state = api.Timing.step(state, from, to, surface, 1);
    }
    expect(state.completed).toBe(2);
    expect(state.nextGate).toBe(1);
    expect(state.lastLap.valid).toBe(true);
    expect(state.invalid).toBe(false);
  }
});

it("verlangt S1 vor S2 und zählt weder eine ausgelassene Linie noch Rückwärtsfahrt oder ein doppeltes Ziel", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain);
  let state = api.Timing.create();
  const cross = (i, reverse = false, lane = 0) => {
    state = api.Timing.step(
      state,
      ...crossing(surface.checkpoints[i], lane, reverse),
      surface,
      1,
    );
  };
  cross(0, false, surface.checkpoints[0].maxLane + 1);
  expect(state.started).toBe(false);
  cross(0);
  cross(2);
  cross(0);
  expect(state.completed).toBe(0);
  expect(state.nextGate).toBe(1);
  cross(1);
  cross(0);
  cross(2, true);
  expect(state.completed).toBe(0);
  expect(state.nextGate).toBe(2);
  cross(2);
  cross(0, true);
  expect(state.completed).toBe(0);
  cross(0);
  expect(state.completed).toBe(1);
  cross(0);
  expect(state.completed).toBe(1);
});

it("zählt nach den Sektoren eine Runde ohne die bisherigen 32 unsichtbaren Zwischenprüfungen", () => {
  const { api, data } = loadArcade(),
    surface = api.Surface.create(data.tracks.bahrain),
    scope = { CGPArcade: {} };
  runInNewContext(
    execFileSync("git", ["show", baseline + ":src/racing/timing.js"], {
      cwd: ROOT,
      encoding: "utf8",
    }),
    scope,
  );
  let before = scope.CGPArcade.Timing.create(),
    after = api.Timing.create();
  for (const gate of [...surface.checkpoints, surface.checkpoints[0]]) {
    const [from, to] = crossing(gate, surface.roadRadius + 2);
    before = scope.CGPArcade.Timing.step(before, from, to, surface, 1);
    after = api.Timing.step(after, from, to, surface, 1);
  }
  expect(before.completed).toBe(0);
  expect(after.completed).toBe(1);
  expect(after.lastLap.valid).toBe(true);
});

it("fährt mit der KI spürbar schneller als der veröffentlichte Gegner, ohne Spielerphysik oder Fahrzeuggrenzen zu ändern", () => {
  const { api, data } = loadArcade({ race: true }),
    surface = api.Surface.create(data.tracks.bahrain),
    p = api.Physics.parameters,
    scope = { CGPArcade: { VehicleContacts: api.VehicleContacts } };
  runInNewContext(
    execFileSync("git", ["show", baseline + ":src/racing/opponents.js"], {
      cwd: ROOT,
      encoding: "utf8",
    }),
    scope,
  );
  expect(readFileSync(new URL("src/racing/physics.js", ROOT), "utf8")).toBe(
    execFileSync("git", ["show", baseline + ":src/racing/physics.js"], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
  function drive(module) {
    const driver = module.create(surface, p),
      memory = driver.memory(0);
    let car = { ...api.Physics.spawn(surface, -22), id: "test" },
      wall = 0,
      top = 0;
    for (let frame = 0; frame < 100 * 30; frame++) {
      const traffic = driver.prepare([car]),
        input = driver.input(traffic[0], traffic, memory);
      for (let step = 0; step < 4; step++) {
        car = { ...api.Physics.step(car, input, surface), id: "test" };
        wall += Number(car.hitWall);
        top = Math.max(top, car.speed);
      }
      if (car.s >= surface.g.len)
        return { seconds: (frame + 1) / 30, wall, top };
    }
    throw Error("Die KI beendet die Vergleichsrunde nicht.");
  }
  const before = drive(scope.CGPArcade.Opponents),
    after = drive(api.Opponents);
  expect(after.seconds).toBeLessThan(before.seconds * 0.9);
  expect(after.top).toBeGreaterThan(before.top * 1.2);
  // Math.hypot at the now-reached limiter can differ by a few floating bits.
  expect(after.top).toBeLessThanOrEqual(p.maxSpeed + 1e-9);
  expect(after.wall).toBe(0);
});
