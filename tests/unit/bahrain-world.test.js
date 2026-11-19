import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
const base = "34a7c07ac683ababd4e5f130b3a75e9029448560";
function setup() {
  const { api } = loadArcade({ race: true });
  const context = new Proxy(
    { createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (o, k) => o[k] || (() => {}) },
  );
  const document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
  for (const module of [
    "camera3d",
    "materials3d",
    "tracks3d",
    "illustrated-kit3d",
    "bahrain-materials3d",
    "bahrain-layout",
    "bahrain3d",
  ])
    runInNewContext(readFileSync(`src/rendering/${module}.js`, "utf8"), {
      CGPArcade: api,
      CGPThree: THREE,
      document,
    });
  const surface = api.Surface.create(api.TrackCatalog.get("bahrain")),
    materials = api.Materials3D.create(null),
    world = api.Tracks3D.create(surface, materials);
  return { api, surface, materials, world };
}
it("erhält sämtliche Rennsysteme, Stammdaten, Speicherformate und 35 Original-PNGs bytegenau", () => {
  const files = [
    "physics",
    "opponents",
    "opponent-line",
    "vehicle-contacts",
    "ai-difficulty",
    "slipstream",
    "catchup",
    "timing",
    "track-surface",
    "race-session",
    "race-weekend",
  ]
    .map((n) => `src/racing/${n}.js`)
    .concat([
      "src/data/arcade-tracks.js",
      "src/data/arcade-boundaries.js",
      "src/data/arcade-roster.js",
      "src/data/race-formats.js",
      "src/persistence/pov-checkpoint.js",
      "src/persistence/pov-game-store.js",
      ...Array.from(
        { length: 35 },
        (_, i) =>
          `assets/drivers/portraits/d${String(i + 1).padStart(3, "0")}.png`,
      ),
    ]);
  for (const path of files)
    expect(
      readFileSync(path).equals(
        execFileSync("git", ["show", `${base}:${path}`], {
          maxBuffer: 8 * 1024 * 1024,
        }),
      ),
      path,
    ).toBe(true);
});
it("übernimmt dieselben Fahrbahndreiecke und hält reale Requisitenflächen außerhalb aller Streckenarme", () => {
  const { api, surface, materials, world } = setup();
  const road = world.group.getObjectByName("unchanged-cream-road").geometry;
  expect([...road.attributes.position.array]).toEqual([
    ...api.Tracks3D.roadGeometry(surface, surface.roadRadius, 0.07).attributes
      .position.array,
  ]);
  world.group.updateMatrixWorld(true);
  world.group.traverse((node) => {
    if (!node.isMesh) return;
    for (const attribute of Object.values(node.geometry.attributes))
      expect(attribute.array.every(Number.isFinite), node.name).toBe(true);
  });
  for (const spec of world.layout.objects) {
    if (spec.id !== "block-tunnel")
      expect(spec.clearance, spec.id).toBeGreaterThan(4);
    const root = world.group.getObjectByName(spec.id);
    root.traverse((node) => {
      if (!node.isMesh || node.material.transparent) return;
      const p = node.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        const v = new THREE.Vector3(
          p.getX(i),
          p.getY(i),
          p.getZ(i),
        ).applyMatrix4(node.matrixWorld);
        if (spec.id === "block-tunnel" && v.y >= 21.5) continue;
        expect(
          surface.project({ x: v.x, y: v.z }).distance,
          `${spec.id} @ ${v.x},${v.z}`,
        ).toBeGreaterThan(surface.outerRadius + 2);
      }
    });
  }
  world.dispose();
  materials.dispose();
});
it("lässt die echte Verfolgungskamera durch den Tunnel und hält den Sichtstrahl zum Auto frei", () => {
  const { api, surface, materials, world } = setup(),
    camera = new THREE.PerspectiveCamera(55, 1, 0.3, 800),
    rig = api.Camera3D.create();
  world.group.updateMatrixWorld(true);
  for (let s = 0.85 * surface.g.len; s < 0.92 * surface.g.len; s += 4)
    for (const lane of [-23, -6, 0, 6, 23]) {
      const p = surface.at(s, lane),
        pose = { x: p.x, y: p.y, heading: p.ang, speed: 85 },
        view = rig.update(pose, surface, 0, { reset: true });
      camera.position.set(view.position.x, view.position.y, view.position.z);
      world.update(camera, pose, false, {});
      const car = new THREE.Vector3(p.x, 1.5, p.y),
        distance = camera.position.distanceTo(car),
        ray = new THREE.Raycaster(
          camera.position,
          car.clone().sub(camera.position).normalize(),
          0.3,
          distance - 0.5,
        );
      const hits = ray
        .intersectObjects(
          world.layout.objects.map((o) => world.group.getObjectByName(o.id)),
          true,
        )
        .filter(
          (h) => h.object.parent.visible && !h.object.material.transparent,
        );
      expect(hits.length, `Sicht bei s=${s}, Spur=${lane}`).toBe(0);
      expect(world.group.getObjectByName("block-tunnel").visible).toBe(true);
    }
  const t = world.layout.tunnel,
    point = {
      x: t.at.x - Math.sin(t.at.ang) * 38,
      y: 10,
      z: t.at.y + Math.cos(t.at.ang) * 38,
    };
  camera.position.set(point.x, point.y, point.z);
  world.update(camera, {}, false, {});
  expect(world.group.getObjectByName("block-tunnel").visible).toBe(false);
  world.dispose();
  materials.dispose();
});
