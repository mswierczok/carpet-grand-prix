import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT } from "../helpers/game.js";
import { boundaryScript } from "../../scripts/build-arcade-boundaries.js";
function setup() {
  const { api, data } = loadArcade();
  runInNewContext(
    readFileSync(new URL("src/rendering/tracks3d.js", ROOT), "utf8"),
    { CGPArcade: api, CGPThree: THREE },
  );
  return { api, data, surface: api.Surface.create(data.tracks.bahrain) };
}
const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function edges(loops) {
  return loops.flatMap((r) => r.slice(0, -1).map((a, i) => [a, r[i + 1]]));
}
function intersects(a, b, c, d) {
  return (
    cross(a, b, c) * cross(a, b, d) < -1e-10 &&
    cross(c, d, a) * cross(c, d, b) < -1e-10
  );
}
function box(x, y, w, h) {
  return [
    { x: x - w, y: y - h },
    { x: x + w, y: y - h },
    { x: x + w, y: y + h },
    { x: x - w, y: y + h },
  ];
}

it("erzeugt die geschlossenen Seilränder reproduzierbar aus den unveränderten Quelldaten", () => {
  const { data, surface } = setup();
  expect(
    readFileSync(new URL("src/data/arcade-boundaries.js", ROOT), "utf8"),
  ).toBe(boundaryScript());
  expect(Object.isFrozen(data.boundaries.bahrain.polygons[0][0][0])).toBe(true);
  expect(surface.boundary).not.toBe(null);
  expect(surface.g.pts).toHaveLength(470);
});

it("ersetzt die früheren Kreuzungen durch geschlossene, endliche und kreuzungsfreie Ringe", () => {
  const { surface } = setup(),
    lines = edges(surface.boundary.loops);
  expect(surface.boundary.loops.length).toBeGreaterThanOrEqual(2);
  for (const r of surface.boundary.loops) {
    expect(r[0]).toEqual(r.at(-1));
    for (let i = 0; i < r.length - 1; i++) {
      expect(r[i].every(Number.isFinite)).toBe(true);
      expect(
        Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]),
      ).toBeGreaterThan(1e-6);
    }
  }
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++)
      expect(intersects(...lines[i], ...lines[j])).toBe(false);
});

it("hält das tatsächliche 3D-Seil außerhalb der hellen Fahrbahn, auch an den früheren Engstellen", () => {
  const { api, surface } = setup();
  let triangles = 0;
  for (const ring of surface.boundary.loops) {
    const n = ring.length - 1,
      curve = api.Tracks3D.boundaryCurve(ring),
      tube = new THREE.TubeGeometry(
        curve,
        n,
        surface.boundary.railRadius,
        6,
        true,
      );
    triangles += tube.index.count / 3;
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n);
      expect(surface.project({ x: p.x, y: p.z }).distance).toBeGreaterThan(
        surface.outerRadius - 0.12,
      );
      expect(surface.project({ x: p.x, y: p.z }).distance).toBeLessThan(
        surface.outerRadius + 0.12,
      );
    }
    const a = tube.attributes.position;
    for (let i = 0; i < a.count; i++) {
      expect(Number.isFinite(a.getX(i) + a.getY(i) + a.getZ(i))).toBe(true);
      expect(
        surface.project({ x: a.getX(i), y: a.getZ(i) }).distance,
      ).toBeGreaterThan(surface.roadRadius + 3);
    }
    tube.dispose();
  }
  expect(triangles).toBeLessThan(10000);
});

it("zeichnet genau die Fläche, die auch die physische Begrenzung beschreibt", () => {
  const { api, surface } = setup(),
    g = api.Tracks3D.boundaryGeometry(surface),
    m = new THREE.MeshBasicMaterial(),
    mesh = new THREE.Mesh(g, m),
    ray = new THREE.Raycaster();
  mesh.updateMatrixWorld();
  for (let x = 180; x < 1000; x += 37)
    for (let y = 140; y < 650; y += 31) {
      ray.set(new THREE.Vector3(x, 10, y), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(mesh).length > 0).toBe(
        surface.boundary.contains({ x, y }),
      );
    }
  for (let i = 0; i < g.attributes.normal.count; i++)
    expect(g.attributes.normal.getY(i)).toBeGreaterThan(0.99);
  g.dispose();
  m.dispose();
});

it("blockiert Rechteckkontakte und Inseln im Fahrzeug, selbst wenn alle vier Ecken innerhalb liegen", () => {
  const { api } = setup(),
    field = api.BoundaryField.create({
      polygons: [
        [
          [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
            [0, 0],
          ],
          [
            [40, 40],
            [40, 60],
            [60, 60],
            [60, 40],
            [40, 40],
          ],
        ],
      ],
    });
  expect(field.contains({ x: 10, y: 10 })).toBe(true);
  expect(field.contains({ x: 50, y: 50 })).toBe(false);
  expect(field.contains({ x: 110, y: 50 })).toBe(false);
  expect(field.blocksFootprint(box(10, 10, 3, 3))).toBe(false);
  expect(field.blocksFootprint(box(2, 10, 1.5, 2))).toBe(true);
  const straddling = box(50, 50, 20, 5),
    enclosing = box(50, 50, 15, 15);
  expect(straddling.every(field.contains)).toBe(true);
  expect(enclosing.every(field.contains)).toBe(true);
  expect(field.blocksFootprint(straddling)).toBe(true);
  expect(field.blocksFootprint(enclosing)).toBe(true);
});

it("lässt die unveränderte Mittellinie frei und korrigiert veralteten Fortschritt ohne Positionssprung", () => {
  const { api, surface } = setup();
  for (let i = 0; i < 100; i++) {
    const p = surface.at((i * surface.g.len) / 100),
      cs = Math.cos(p.ang),
      sn = Math.sin(p.ang),
      corners = [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ].map(([a, b]) => ({
        x: p.x + a * 5.4 * cs - b * 2.5 * sn,
        y: p.y + a * 5.4 * sn + b * 2.5 * cs,
      }));
    expect(surface.boundary.blocksFootprint(corners)).toBe(false);
  }
  const p = surface.at(surface.g.len * 0.5),
    car = { ...api.Physics.spawn(surface, 0), x: p.x, y: p.y, heading: p.ang },
    next = api.Physics.step(car, { throttle: 0, brake: 0, steer: 0 }, surface);
  expect(next.hitWall).toBe(false);
  expect(next.x).toBe(car.x);
  expect(next.y).toBe(car.y);
  expect(Math.abs(surface.gap(next.s, p.s))).toBeLessThan(1e-6);
});

it("startet und beendet eine gezählte Runde auch über den dunklen Rand der Kontrollpunkte", () => {
  const { api, surface } = setup();
  let t = api.Timing.create();
  for (let i = 0; i <= 32; i++) {
    const gate = surface.gates[i % 32],
      lane = surface.roadRadius + 3,
      dx = Math.cos(gate.ang),
      dy = Math.sin(gate.ang),
      p = surface.at(gate.s, lane);
    expect(surface.boundary.contains(p)).toBe(true);
    t = api.Timing.step(
      t,
      { x: p.x - dx * 0.1, y: p.y - dy * 0.1 },
      {
        x: p.x + dx * 0.1,
        y: p.y + dy * 0.1,
        offroad: true,
        longitudinalSpeed: 10,
      },
      surface,
      1,
    );
  }
  expect(t.completed).toBe(1);
  expect(t.lastLap.valid).toBe(true);
  expect(t.invalid).toBe(false);
  expect(t.bestLap).toBeCloseTo(32, 8);
});
