import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createWorld } from "../helpers/world3d.js";
const base = "6c66dfc5226592458b4fa2b4a52828c901452422";
function cameras(THREE, api, surface, world) {
  const cfg = api.EnvironmentScenes.get("bahrain"),
    rig = api.Camera3D.create(cfg.camera),
    camera = new THREE.PerspectiveCamera(55, 1, 0.3, cfg.lighting.far);
  world.group.updateMatrixWorld(true);
  return { cfg, rig, camera };
}
it("behält Standardkamera und übrige Strecken exakt bei; Bahrain erhält nur eine explizite Darstellungsvariante", () => {
  const { api, surface, materials, world } = createWorld();
  const old = {};
  runInNewContext(
    execFileSync("git", [
      "show",
      `${base}:src/rendering/camera3d.js`,
    ]).toString(),
    { CGPArcade: old },
  );
  for (const track of ["france", "luxembourg", "canada", "england"]) {
    expect(api.EnvironmentScenes.get(track)).toBeNull();
    const a = api.Camera3D.create(),
      b = old.Camera3D.create();
    for (let s = 0; s < surface.g.len; s += 133) {
      const p = surface.at(s),
        pose = { x: p.x, y: p.y, heading: p.ang, speed: 33 };
      expect(a.update(pose, surface, 1 / 60)).toEqual(
        b.update(pose, surface, 1 / 60),
      );
    }
  }
  expect(
    readFileSync("src/rendering/tracks3d.js").equals(
      execFileSync("git", ["show", `${base}:src/rendering/tracks3d.js`]),
    ),
  ).toBe(true);
  world.dispose();
  materials.dispose();
});
it("hält das feste Zimmermaß, den Teppich und sechs Möbelmodule rund um die unveränderte Rennfläche", () => {
  const { api, surface, materials, world } = createWorld(),
    cfg = api.EnvironmentScenes.get("bahrain"),
    r = cfg.room;
  expect(Object.isFrozen(r.furniture)).toBe(true);
  expect(r.unitMillimetres).toBe(5);
  expect(r.furniture).toHaveLength(6);
  for (const id of [
    "bed",
    "desk",
    "wardrobe",
    "bookshelf",
    "toy-corner",
    "desk-stool",
  ])
    expect(world.group.getObjectByName(id)).toBeTruthy();
  for (const p of surface.g.pts) {
    expect(p.x - surface.outerRadius).toBeGreaterThan(r.rug.x - r.rug.w / 2);
    expect(p.x + surface.outerRadius).toBeLessThan(r.rug.x + r.rug.w / 2);
    expect(p.y - surface.outerRadius).toBeGreaterThan(r.rug.y - r.rug.d / 2);
    expect(p.y + surface.outerRadius).toBeLessThan(r.rug.y + r.rug.d / 2);
  }
  // Separating-axis test on complete furniture footprints, including the canopy.
  const props = world.layout.objects.filter(
    (o) =>
      r.furniture.some((f) => f.id === o.id) ||
      o.id === "main-grandstand" ||
      o.id === "wooden-pits",
  );
  const corners = (o) =>
    [-1, 1].flatMap((x) =>
      [-1, 1].map((z) => ({
        x:
          o.at.x +
          (Math.cos(o.at.ang) * x * o.w) / 2 -
          (Math.sin(o.at.ang) * z * o.d) / 2,
        z:
          o.at.y +
          (Math.sin(o.at.ang) * x * o.w) / 2 +
          (Math.cos(o.at.ang) * z * o.d) / 2,
      })),
    );
  for (let i = 0; i < props.length; i++)
    for (let j = i + 1; j < props.length; j++) {
      const a = props[i],
        b = props[j],
        ca = corners(a),
        cb = corners(b);
      const separated = [a.at.ang, b.at.ang]
        .flatMap((angle) => [angle, angle + Math.PI / 2])
        .some((angle) => {
          const aa = ca.map(
              (p) => p.x * Math.cos(angle) + p.z * Math.sin(angle),
            ),
            bb = cb.map((p) => p.x * Math.cos(angle) + p.z * Math.sin(angle));
          return (
            Math.max(...aa) < Math.min(...bb) ||
            Math.max(...bb) < Math.min(...aa)
          );
        });
      expect(separated, `${a.id} überschneidet ${b.id}`).toBe(true);
    }
  world.dispose();
  materials.dispose();
});
it("lässt echte Kamera und Sichtstrahlen durch beide Bauklotz-Durchfahrten", () => {
  const { api, surface, materials, world, THREE } = createWorld(),
    { rig, camera } = cameras(THREE, api, surface, world);
  const roots = world.layout.objects.map((o) =>
    world.group.getObjectByName(o.id),
  );
  for (const [start, end, id] of [
    [0.095, 0.15, "block-tunnel"],
    [0.85, 0.92, "wooden-tunnel"],
  ])
    for (let s = start * surface.g.len; s < end * surface.g.len; s += 7)
      for (const lane of [-25.5, -6, 0, 6, 25.5]) {
        const p = surface.at(s, lane),
          pose = { x: p.x, y: p.y, heading: p.ang, speed: 33 };
        const view = rig.update(pose, surface, 0, { reset: true });
        camera.position.set(view.position.x, view.position.y, view.position.z);
        world.update(camera, pose, false, {});
        const car = new THREE.Vector3(p.x, 1.5, p.y),
          ray = new THREE.Raycaster(
            camera.position,
            car.clone().sub(camera.position).normalize(),
            0.3,
            camera.position.distanceTo(car) - 0.5,
          );
        const hits = ray
          .intersectObjects(roots, true)
          .filter(
            (h) =>
              h.object.visible &&
              h.object.parent.visible &&
              !h.object.material.transparent,
          );
        expect(hits, `${id}, s=${s}, Spur=${lane}`).toHaveLength(0);
        expect(world.group.getObjectByName(id).visible).toBe(true);
      }
  world.dispose();
  materials.dispose();
});
it("zeigt Tribünendach und Fenster aus der Rennkamera sowie das ganze Zimmer in der Übersicht", () => {
  const { api, surface, materials, world, THREE } = createWorld(),
    { cfg, rig, camera } = cameras(THREE, api, surface, world);
  for (const [s, target] of [
    [-118, [735, 49.8, 235.5]],
    [0.58 * surface.g.len, [995, 175, -132]],
  ]) {
    const p = surface.at(s),
      view = rig.update(
        { x: p.x, y: p.y, heading: p.ang, speed: 33 },
        surface,
        0,
        { reset: true },
      );
    camera.aspect = 390 / 477;
    camera.updateProjectionMatrix();
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.target.x, view.target.y, view.target.z);
    camera.updateMatrixWorld(true);
    const v = new THREE.Vector3(...target).project(camera);
    expect(Math.abs(v.x)).toBeLessThan(1);
    expect(Math.abs(v.y)).toBeLessThan(1);
    expect(v.z).toBeLessThan(1);
  }
  const b = cfg.room.bounds;
  for (const aspect of [924 / 493, 390 / 477]) {
    camera.aspect = aspect;
    camera.far = 6000;
    camera.updateProjectionMatrix();
    const view = world.overview(aspect);
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.target.x, view.target.y, view.target.z);
    camera.updateMatrixWorld(true);
    for (const x of [b.minX, b.maxX])
      for (const z of [b.minY, b.maxY])
        for (const y of [0, b.height]) {
          const v = new THREE.Vector3(x, y, z).project(camera);
          expect(Math.abs(v.x)).toBeLessThan(1);
          expect(Math.abs(v.y)).toBeLessThan(1);
        }
  }
  world.update(camera, {}, true, {});
  expect(world.group.getObjectByName("master-ceiling").visible).toBe(false);
  world.update(camera, {}, false, {});
  expect(world.group.getObjectByName("master-ceiling").visible).toBe(true);
  world.dispose();
  materials.dispose();
});
it("baut alle Bibliothekstypen mit gültigen Optionen und gibt sämtliche Szenengeometrien wieder frei", () => {
  const { api, materials, world } = createWorld(),
    cfg = api.EnvironmentScenes.get("bahrain"),
    maps = api.IllustratedMaterials3D.create(materials, cfg.materials),
    kit = api.IllustratedKit3D.create(materials, maps),
    assets = api.EnvironmentAssets3D.create(
      api.Bahrain3D.palette,
      cfg.finishes,
    );
  for (const type of assets.types) {
    const o = kit.object(type);
    assets.build(type, o, {});
    const group = o.finish();
    expect(group.children.length, type).toBeGreaterThan(0);
    group.traverse((n) => {
      if (n.isMesh)
        for (const a of Object.values(n.geometry.attributes))
          expect(a.array.every(Number.isFinite), type).toBe(true);
    });
  }
  const disposed = new Set(),
    geometries = new Set();
  world.group.traverse((n) => {
    if (n.isMesh) {
      geometries.add(n.geometry);
      n.geometry.addEventListener("dispose", () => disposed.add(n.geometry));
    }
  });
  world.dispose();
  expect(disposed.size).toBe(geometries.size);
  kit.dispose();
  assets.dispose();
  materials.dispose();
});

it("hält Fensterrahmen und Vorhangstange innerhalb der Zimmerbreite", () => {
  const { api, materials, world } = createWorld(),
    bounds = api.EnvironmentScenes.get("bahrain").room.bounds;
  const root = world.group.getObjectByName("master-window-wall");
  root.traverse((n) => {
    if (n.isMesh) {
      n.geometry.computeBoundingBox();
      // Half a unit allows the illustrative wall contour, not a protruding rod.
      expect(n.geometry.boundingBox.max.x).toBeLessThanOrEqual(
        bounds.maxX + 0.5,
      );
      expect(n.geometry.boundingBox.min.x).toBeGreaterThan(bounds.minX - 1);
    }
  });
  world.dispose();
  materials.dispose();
});

it("baut das vollständige Master-Zimmer samt Möbeln und Teppich ohne Bahrain-Assembler", () => {
  const { api, materials, world } = createWorld(),
    cfg = api.EnvironmentScenes.get("bahrain"),
    maps = api.IllustratedMaterials3D.create(materials, cfg.materials),
    kit = api.IllustratedKit3D.create(materials, maps),
    assets = api.EnvironmentAssets3D.create(
      api.Bahrain3D.palette,
      cfg.finishes,
    ),
    room = api.MasterBedroom3D.create(kit, assets, cfg);
  for (const spec of cfg.room.furniture)
    expect(room.group.getObjectByName(spec.id), spec.id).toBeTruthy();
  expect(room.group.getObjectByName("looped-carpet").isMesh).toBe(true);
  expect(room.diagnostics().furniture).toBe(6);
  kit.dispose();
  assets.dispose();
  world.dispose();
  materials.dispose();
});
