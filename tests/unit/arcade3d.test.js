import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT } from "../helpers/project.js";

function setup() {
  const { api, data } = loadArcade();
  for (const module of ["camera3d", "tracks3d"]) {
    runInNewContext(
      readFileSync(new URL(`src/rendering/${module}.js`, ROOT), "utf8"),
      { CGPArcade: api, CGPThree: THREE },
    );
  }
  return { api, surface: api.Surface.create(data.tracks.bahrain) };
}

it("bleibt beim Rückwärtsfahren hinter derselben Fahrzeugseite und vermeidet einen 180-Grad-Schwenk", () => {
  const { api, surface } = setup(),
    rig = api.Camera3D.create(),
    pose = { x: 400, y: 300, heading: 0.8, speed: 15, longitudinalSpeed: 15 };
  const before = rig.update(pose, surface, 1 / 60),
    back = { ...pose, longitudinalSpeed: -15 };
  const after = rig.update(back, surface, 1 / 60);
  expect(
    Math.hypot(
      after.target.x - before.target.x,
      after.target.z - before.target.z,
    ),
  ).toBeLessThan(1);
  for (let i = 0; i < 120; i++) {
    const camera = rig.update(back, surface, 1 / 60);
    expect(
      (camera.position.x - back.x) * Math.cos(back.heading) +
        (camera.position.z - back.y) * Math.sin(back.heading),
    ).toBeLessThan(0);
  }
});

it("hält die Kamera hinter dem frei ausgerichteten Auto und blickt in seine Fahrtrichtung", () => {
  const { api, surface } = setup();
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI * 5]) {
    const pose = Object.freeze({ x: 50, y: 60, heading, speed: 90 });
    const result = api.Camera3D.create().update(pose, surface, 1 / 60);
    const along = (point) =>
      (point.x - pose.x) * Math.cos(heading) +
      (point.z - pose.y) * Math.sin(heading);
    expect(along(result.position)).toBeLessThan(-20);
    expect(along(result.target)).toBeGreaterThan(10);
    expect(result.position.y).toBeGreaterThan(10);
    expect(Object.values(result.position).every(Number.isFinite)).toBe(true);
  }
});

it("überquert die Winkelgrenze ohne Kameraflip und glättet zeitbezogen", () => {
  const { api, surface } = setup(),
    a = api.Camera3D.create(),
    b = api.Camera3D.create();
  const initial = { x: 200, y: 200, heading: Math.PI - 0.01, speed: 50 };
  const first = a.update(initial, surface, 1 / 60);
  b.update(initial, surface, 1 / 60);
  const next = { ...initial, heading: -Math.PI + 0.01 };
  const once = a.update(next, surface, 1 / 30);
  b.update(next, surface, 1 / 60);
  const twice = b.update(next, surface, 1 / 60);
  expect(
    Math.hypot(
      once.position.x - first.position.x,
      once.position.z - first.position.z,
    ),
  ).toBeLessThan(1);
  for (const axis of ["x", "y", "z"])
    expect(once.position[axis]).toBeCloseTo(twice.position[axis], 10);
});

it("setzt die Kamera nach Sprüngen und explizitem Reset sofort passend zurück", () => {
  const { api, surface } = setup(),
    rig = api.Camera3D.create();
  const initial = { x: 100, y: 100, heading: 0, speed: 0 };
  rig.update(initial, surface, 1 / 60);
  const jumped = { ...initial, x: 500, y: 400, heading: Math.PI };
  expect(rig.update(jumped, surface, 1 / 60)).toEqual(
    api.Camera3D.create().update(jumped, surface, 1 / 60),
  );
  rig.reset();
  expect(rig.update(initial, surface, 0)).toEqual(
    api.Camera3D.create().update(initial, surface, 0),
  );
});

it("passt die gesamte Bahrain-Fahrfläche in die räumliche Übersicht auf breiten und schmalen Fenstern", () => {
  const { api, surface } = setup();
  for (const aspect of [0.4, 1, 2.2]) {
    const result = api.Camera3D.create().update(
      { x: 0, y: 0, heading: 0 },
      surface,
      0,
      { overview: true, aspect },
    );
    const camera = new THREE.PerspectiveCamera(55, aspect, 50, 6000);
    camera.position.set(...["x", "y", "z"].map((a) => result.position[a]));
    camera.lookAt(result.target.x, result.target.y, result.target.z);
    camera.updateMatrixWorld();
    for (const s of Array.from(
      { length: 50 },
      (_, i) => (i * surface.g.len) / 50,
    ))
      for (const lane of [-surface.outerRadius, surface.outerRadius]) {
        const p = surface.at(s, lane),
          projected = new THREE.Vector3(p.x, 0, p.y).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
        expect(projected.z).toBeLessThan(1);
      }
  }
});

it("zeichnet dieselbe Fahrfläche wie die Physik, auch an engen Kurven, mit wenigen Dreiecken", () => {
  const { api, surface } = setup();
  const geometry = api.Tracks3D.roadGeometry(surface, surface.roadRadius),
    material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  for (let i = 0; i < 40; i++)
    for (const lane of [
      0,
      surface.roadRadius * 0.85,
      -surface.roadRadius * 0.85,
    ]) {
      const p = surface.at((i * surface.g.len) / 40, lane);
      ray.set(new THREE.Vector3(p.x, 10, p.y), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);
    }
  const positions = geometry.attributes.position;
  expect(positions.count / 3).toBeLessThan(2000);
  for (let i = 0; i < positions.count; i += 11) {
    const distance = surface.project({
      x: positions.getX(i),
      y: positions.getZ(i),
    }).distance;
    expect(distance).toBeLessThan(surface.roadRadius + 0.001);
    expect(geometry.attributes.normal.getY(i)).toBeGreaterThan(0.99);
  }
  geometry.dispose();
  material.dispose();
});

it("liefert bei identischer Fahrzeugpose dieselbe Kamera ohne Eingriff in die Sitzung", () => {
  const { api, surface } = setup(),
    pose = Object.freeze({ x: 100, y: 200, heading: 0.7, speed: 80 });
  const a = api.Camera3D.create(),
    b = api.Camera3D.create();
  for (let i = 0; i < 120; i++)
    expect(a.update(pose, surface, 1 / 60)).toEqual(
      b.update(pose, surface, 1 / 60),
    );
  const original = a.update(pose, surface, 1 / 60);
  original.position.x = -1e9;
  expect(a.update(pose, surface, 0).position.x).toBeGreaterThan(0);
});
