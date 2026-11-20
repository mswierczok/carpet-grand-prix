import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { ROOT } from "../helpers/game.js";
import { loadArcade } from "../helpers/arcade.js";
import {
  measureField,
  paceBaseline,
  publishedOpponents,
} from "../helpers/opponent-pace.js";

it("hält bei allen zwölf KI-Profilen auf freier Gerade das volle Spielertempo von gerundet 119 km/h", () => {
  const { api, data } = loadArcade({ race: true }),
    surface = api.Surface.create(data.tracks.bahrain),
    p = api.Physics.parameters;
  expect(readFileSync(new URL("src/racing/physics.js", ROOT), "utf8")).toBe(
    execFileSync("git", ["show", `${paceBaseline}:src/racing/physics.js`], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
  function straight(module, index) {
    const driver = module.create(surface, p),
      memory = driver.memory(index),
      pose = api.Physics.spawn(surface, -400);
    let car = {
      ...pose,
      id: "ai",
      speed: p.maxSpeed,
      longitudinalSpeed: p.maxSpeed,
      vx: Math.cos(pose.heading) * p.maxSpeed,
      vy: Math.sin(pose.heading) * p.maxSpeed,
    };
    let minimum = Infinity,
      wall = 0;
    for (let frame = 0; frame < 60; frame++) {
      const traffic = driver.prepare([car]),
        input = driver.input(traffic[0], traffic, memory);
      for (let step = 0; step < 4; step++) {
        car = { ...api.Physics.step(car, input, surface), id: "ai" };
        minimum = Math.min(minimum, car.speed * p.metersPerUnit * 3.6);
        wall += Number(car.hitWall);
      }
    }
    return { minimum, wall };
  }
  expect(straight(publishedOpponents(api), 0).minimum).toBeLessThan(118);
  for (let index = 0; index < 12; index++) {
    const result = straight(api.Opponents, index);
    expect(Math.round(result.minimum)).toBe(119);
    expect(result.wall).toBe(0);
  }
});

it("hält das volle Feld über drei Runden schneller und kompakter als die veröffentlichte KI", () => {
  const before = measureField(true),
    after = measureField();
  expect(after.entries).toHaveLength(12);
  expect(after.entries.every((e) => e.lapSeconds.length === 3)).toBe(true);
  expect(after.entries.every((e) => Math.round(e.peakKmh) >= 119)).toBe(true);
  expect(after.entries.every((e) => e.observedWallFrames === 0)).toBe(true);
  expect(after.winnerSeconds).toBeLessThan(before.winnerSeconds * 0.96);
  expect(after.medianSeconds).toBeLessThan(before.medianSeconds * 0.95);
  expect(after.lastSeconds).toBeLessThan(before.lastSeconds * 0.95);
  expect(after.spreadSeconds).toBeLessThan(before.spreadSeconds);
  // Outcome floor for the user's reported 77-second race: the leaders must
  // be close, and the tail must no longer be almost an entire lap behind.
  expect(after.winnerSeconds).toBeLessThanOrEqual(83);
  expect(after.medianSeconds).toBeLessThanOrEqual(95);
  expect(after.lastSeconds).toBeLessThanOrEqual(100);
  expect(
    after.entries.some((e) => e.lapSeconds.slice(1).some((t) => t < 26.5)),
  ).toBe(true);
}, 120000);

it("befreit ein an der Seilkante feststehendes KI-Auto durch normale Fahrbefehle und fährt weiter", () => {
  const { api, data } = loadArcade({ race: true }),
    surface = api.Surface.create(data.tracks.bahrain),
    p = api.Physics.parameters,
    driver = api.Opponents.create(surface, p),
    memory = driver.memory(1);
  // Rope sliding now allows forward recovery as well as reversing. All
  // movement must still use normal inputs and keep the full footprint inside.
  const start = -200,
    placed = (lane) => {
      const pose = surface.at(start, lane);
      return {
        ...api.Physics.spawn(surface, start),
        id: "blocked",
        x: pose.x,
        y: pose.y,
        heading: pose.ang + Math.PI / 2,
      };
    };
  let inner = 0,
    outer = surface.outerRadius;
  for (let i = 0; i < 40; i++) {
    const middle = (inner + outer) / 2;
    if (
      surface.boundary.blocksFootprint(
        api.VehicleContacts.footprint(placed(middle), p),
      )
    )
      outer = middle;
    else inner = middle;
  }
  let car = placed(inner - 0.01),
    contact = false,
    resumed = false;
  expect(
    surface.boundary.blocksFootprint(api.VehicleContacts.footprint(car, p)),
  ).toBe(false);
  for (let frame = 0; frame < 30 * 30; frame++) {
    const traffic = driver.prepare([car]),
      input = driver.input(traffic[0], traffic, memory);
    for (let step = 0; step < 4; step++) {
      const prior = car;
      car = { ...api.Physics.step(car, input, surface), id: "blocked" };
      expect(Math.hypot(car.x - prior.x, car.y - prior.y)).toBeLessThanOrEqual(
        p.maxSpeed / 120 + 1e-8,
      );
      expect(
        surface.boundary.blocksFootprint(api.VehicleContacts.footprint(car, p)),
      ).toBe(false);
      contact ||= car.hitWall;
    }
    if (car.s > start + 56 && car.longitudinalSpeed > 20) {
      resumed = true;
      break;
    }
  }
  expect(contact).toBe(true);
  expect(resumed).toBe(true);
});
