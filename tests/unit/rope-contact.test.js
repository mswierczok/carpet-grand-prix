import { it, expect } from "vitest";
import { loadArcade } from "../helpers/arcade.js";

const gas = { throttle: 1, brake: 0, steer: 0 };
function setup(options = {}) {
  const { api } = loadArcade(options),
    boundary = api.BoundaryField.create({
      polygons: [
        [
          [
            [0, 0],
            [400, 0],
            [400, 100],
            [0, 100],
            [0, 0],
          ],
        ],
      ],
    }),
    surface = {
      boundary,
      g: { width: 60 },
      outerRadius: 50,
      roadRadius: 38,
      at: (s) => ({ x: 200 + s, y: 50, ang: 0, s }),
      project: (p) => ({
        x: p.x,
        y: 50,
        s: p.x - 200,
        distance: Math.abs(p.y - 50),
        ang: 0,
      }),
      gap: (a, b) => b - a,
    };
  return { api, surface };
}
function corners(car, p) {
  const c = Math.cos(car.heading),
    s = Math.sin(car.heading);
  return [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([a, b]) => ({
    x: car.x + a * p.halfLength * c - b * p.halfWidth * s,
    y: car.y + a * p.halfLength * s + b * p.halfWidth * c,
  }));
}
function carAtWall(api, surface, angle, speed = 0) {
  const p = api.Physics.parameters;
  return {
    ...api.Physics.spawn(surface, 0),
    heading: angle,
    y:
      Math.abs(Math.sin(angle)) * p.halfLength +
      Math.abs(Math.cos(angle)) * p.halfWidth +
      0.801,
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    speed,
    longitudinalSpeed: speed,
  };
}
function drive(api, surface, car, input, n) {
  let hits = 0;
  for (let i = 0; i < n; i++) {
    car = api.Physics.step(car, input, surface);
    hits += Number(car.hitWall);
    expect(
      surface.boundary.blocksFootprint(corners(car, api.Physics.parameters)),
    ).toBe(false);
    expect(
      Object.values(car)
        .filter((v) => typeof v === "number")
        .every(Number.isFinite),
    ).toBe(true);
  }
  return { car, hits };
}
it("gleitet beim flachen Streifen weiter, statt auf null Tempo zu fallen", () => {
  const { api, surface } = setup(),
    old = setup({ ropeContacts: false }),
    initial = carAtWall(api, surface, -0.12, 80),
    next = api.Physics.step(initial, gas, surface),
    before = old.api.Physics.step(initial, gas, old.surface);
  expect(next.hitWall).toBe(true);
  expect(before.speed).toBe(0);
  expect(next.speed).toBeGreaterThan(70);
  const run = drive(api, surface, next, gas, 60);
  expect(run.car.x - initial.x).toBeGreaterThan(15);
  expect(run.car.speed).toBeGreaterThan(20);
});
it("löst einen frontalen Kontakt mit Gas und Lenken ohne Rückwärtsgang", () => {
  for (const steer of [-1, 1]) {
    const { api, surface } = setup(),
      initial = carAtWall(api, surface, -Math.PI / 2);
    let car = initial,
      hits = 0,
      steps = 0;
    while (
      Math.abs(car.heading - initial.heading) < Math.PI / 2 + 0.3 &&
      steps < 480
    ) {
      const result = drive(api, surface, car, { ...gas, steer }, 1);
      car = result.car;
      hits += result.hits;
      steps++;
    }
    expect(hits).toBeGreaterThan(0);
    expect(steps, JSON.stringify(car)).toBeLessThan(360);
    const run = drive(api, surface, car, gas, 240);
    expect(run.car.y, JSON.stringify(run)).toBeGreaterThan(initial.y + 8);
    expect(run.car.speed, JSON.stringify(run)).toBeGreaterThan(5);
    expect(run.car.longitudinalSpeed).toBeGreaterThanOrEqual(0);
  }
});
it("bleibt ohne Lenken am frontalen Seil stehen und kann normal rückwärts wegfahren", () => {
  const { api, surface } = setup(),
    initial = carAtWall(api, surface, -Math.PI / 2, 70),
    stopped = drive(api, surface, initial, gas, 120).car;
  expect(stopped.speed).toBeLessThan(1e-8);
  expect(stopped.heading).toBe(initial.heading);
  const reverse = drive(
    api,
    surface,
    stopped,
    { throttle: 0, brake: 1, steer: 0 },
    180,
  ).car;
  expect(reverse.y).toBeGreaterThan(stopped.y + 5);
  expect(reverse.longitudinalSpeed).toBeLessThan(0);
});
it("liefert ohne Seilkontakt exakt die bisherigen Zustände und verändert weder Eingabe noch Ausgangszustand", () => {
  const { api, surface } = setup(),
    old = setup({ ropeContacts: false });
  let a = api.Physics.spawn(surface, 0),
    b = old.api.Physics.spawn(old.surface, 0);
  for (let i = 0; i < 100; i++) {
    const input = Object.freeze({ ...gas, steer: Math.sin(i / 10) * 0.1 });
    const before = JSON.stringify(a);
    Object.freeze(a);
    const next = api.Physics.step(a, input, surface);
    expect(JSON.stringify(a)).toBe(before);
    a = next;
    b = old.api.Physics.step(b, input, old.surface);
    expect(a.hitWall).toBe(false);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }
});

it("streift auf allen 22 echten Strecken sichere Seilabschnitte, einschließlich beider Brückenebenen", () => {
  const { api, data } = loadArcade(),
    p = api.Physics.parameters;
  for (const model of Object.values(data.tracks)) {
    const surface = api.Surface.create(model),
      locations = surface.bridge
        ? surface.bridge.specs.flatMap((b) => [b.center, b.under])
        : [surface.g.len * 0.2];
    for (const location of locations)
      for (const side of [-1, 1]) {
        let initial = null;
        for (let attempt = 0; attempt < (surface.bridge ? 1 : 60); attempt++) {
          const s = (location + (attempt * surface.g.len) / 60) % surface.g.len;
          const before = surface.at(s - 20),
            after = surface.at(s + 20);
          if (
            !surface.bridge &&
            Math.abs(
              Math.atan2(
                Math.sin(after.ang - before.ang),
                Math.cos(after.ang - before.ang),
              ),
            ) > 0.04
          )
            continue;
          function at(lane) {
            const pose = surface.at(s, side * lane),
              heading = pose.ang + side * 0.12;
            return {
              ...api.Physics.spawn(surface, s),
              x: pose.x,
              y: pose.y,
              heading,
              vx: 70 * Math.cos(heading),
              vy: 70 * Math.sin(heading),
              speed: 70,
              longitudinalSpeed: 70,
            };
          }
          const blocked = (car) =>
            surface.boundary.blocksFootprint(corners(car, p), s);
          let low = 0,
            high = surface.outerRadius + 15;
          if (blocked(at(low)) || !blocked(at(high))) continue;
          for (let i = 0; i < 24; i++) {
            const mid = (low + high) / 2;
            if (blocked(at(mid))) high = mid;
            else low = mid;
          }
          const candidate = at(Math.max(0, low - 0.001)),
            next = api.Physics.step(candidate, gas, surface);
          if (!next.hitWall || next.speed < 35) continue;
          initial = candidate;
          break;
        }
        expect(
          initial,
          `${model.id}/${location}/${side}: gültiger Kontaktfall`,
        ).not.toBeNull();
        let car = initial,
          hits = 0;
        for (let i = 0; i < 24; i++) {
          const next = api.Physics.step(car, gas, surface);
          hits += Number(next.hitWall);
          expect(
            surface.boundary.blocksFootprint(corners(next, p), next.s),
            model.id,
          ).toBe(false);
          expect(Math.hypot(next.x - car.x, next.y - car.y)).toBeLessThan(1.1);
          if (surface.bridge)
            expect(next.elevation).toBe(surface.bridge.heightAt(next.s));
          car = next;
        }
        expect(hits).toBeGreaterThan(0);
        expect(
          Math.hypot(car.x - initial.x, car.y - initial.y),
          model.id,
        ).toBeGreaterThan(2);
      }
  }
}, 120000);

it("lässt an offenen Trennseilen vorwärts und rückwärts gleiten, ohne auf die andere Seite zu wechseln", () => {
  for (const side of [-1, 1])
    for (const gear of [-1, 1]) {
      const { api, surface } = setup();
      surface.boundary = api.BoundaryField.create({
        polygons: surface.boundary.polygons,
        dividers: [
          {
            points: [
              [200, 5],
              [200, 95],
            ],
          },
        ],
      });
      const heading = Math.PI / 2 - side * 0.12 + (gear < 0 ? Math.PI : 0),
        p = api.Physics.parameters,
        car = {
          ...api.Physics.spawn(surface, 0),
          x:
            200 -
            side *
              (Math.abs(Math.cos(heading)) * p.halfLength +
                Math.abs(Math.sin(heading)) * p.halfWidth +
                0.801),
          y: 25,
          heading,
          vx: 35 * gear * Math.cos(heading),
          vy: 35 * gear * Math.sin(heading),
          speed: 35,
          longitudinalSpeed: 35 * gear,
        },
        run = drive(
          api,
          surface,
          car,
          { throttle: Number(gear > 0), brake: Number(gear < 0), steer: 0 },
          60,
        );
      expect(run.hits).toBeGreaterThan(0);
      expect(run.car.y - car.y).toBeGreaterThan(4);
      expect(side * (run.car.x - 200)).toBeLessThan(-p.halfWidth);
    }
});

it("befreit sich auch an echten Kurvenrändern aller 22 Strecken mit Gas und Lenken zur Fahrbahn", () => {
  const { api, data } = loadArcade(),
    p = api.Physics.parameters;
  for (const model of Object.values(data.tracks))
    for (const side of [-1, 1]) {
      const surface = api.Surface.create(model);
      let car = null;
      for (let j = 0; j < 60 && !car; j++) {
        const s = (0.43 + j / 60) * surface.g.len;
        const at = (lane) => {
          const pose = surface.at(s, side * lane);
          return {
            ...api.Physics.spawn(surface, s),
            x: pose.x,
            y: pose.y,
            heading: pose.ang + (side * Math.PI) / 2,
          };
        };
        const blocked = (c) =>
          surface.boundary.blocksFootprint(corners(c, p), s);
        let low = 0,
          high = surface.outerRadius + 10;
        if (blocked(at(low)) || !blocked(at(high))) continue;
        for (let i = 0; i < 24; i++) {
          const mid = (low + high) / 2;
          if (blocked(at(mid))) high = mid;
          else low = mid;
        }
        const candidate = at(Math.max(0, low - 0.001));
        if (api.Physics.step(candidate, gas, surface).hitWall) car = candidate;
      }
      expect(car, `${model.id}/${side}: Kontakt aufgebaut`).not.toBeNull();
      let escaped = false;
      for (let i = 0; i < 720; i++) {
        const target = surface.at(car.s + 15),
          error = Math.atan2(
            Math.sin(
              Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
            ),
            Math.cos(
              Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
            ),
          );
        car = api.Physics.step(
          car,
          { ...gas, steer: Math.abs(error) > 0.04 ? Math.sign(error) : 0 },
          surface,
        );
        expect(
          surface.boundary.blocksFootprint(corners(car, p), car.s),
          model.id,
        ).toBe(false);
        if (
          !car.hitWall &&
          car.longitudinalSpeed > 2 &&
          surface.project(car, car.s).distance <
            surface.roadRadius - p.halfWidth - 1
        ) {
          escaped = true;
          break;
        }
      }
      expect(escaped, `${model.id}/${side}: ${JSON.stringify(car)}`).toBe(true);
    }
}, 120000);
