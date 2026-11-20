import { it, expect } from "vitest";
import { createWorld } from "../helpers/world3d.js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const base = "d5a9e933d648dc72e51ad3e029befecac92494db";
it("erhält Rennsysteme, Daten und den abgenommenen Bahrain-Aufbau bytegenau", () => {
  for (const file of [
    "physics",
    "bridge-physics",
    "opponents",
    "opponent-line",
    "ai-difficulty",
    "slipstream",
    "catchup",
    "timing",
    "race-session",
    "qualifying-session",
    "pitlane",
  ]) {
    const path = `src/racing/${file}.js`;
    expect(
      readFileSync(path).equals(
        execFileSync("git", ["show", `${base}:${path}`]),
      ),
      path,
    ).toBe(true);
  }
  for (const file of [
    "arcade-tracks",
    "arcade-boundaries",
    "arcade-roster",
    "race-formats",
  ]) {
    const path = `src/data/${file}.js`;
    expect(
      readFileSync(path).equals(
        execFileSync("git", ["show", `${base}:${path}`], {
          maxBuffer: 8 * 1024 * 1024,
        }),
      ),
      path,
    ).toBe(true);
  }
  for (const file of [
    "bahrain3d",
    "bahrain-layout",
    "environment-scenes",
    "environment-assets3d",
    "illustrated-kit3d",
    "illustrated-materials3d",
  ]) {
    const path = `src/rendering/${file}.js`;
    expect(
      readFileSync(path).equals(
        execFileSync("git", ["show", `${base}:${path}`]),
      ),
      path,
    ).toBe(true);
  }
});
it("baut 21 eigenständige Themen mit sicheren Requisiten, identischer Straße und endlichen Geometrien", () => {
  const initial = createWorld(),
    ids = initial.api.TrackEnvironments.definitions.map((d) => d.id);
  expect(ids).toHaveLength(21);
  expect(new Set(ids).size).toBe(21);
  expect(ids).not.toContain("bahrain");
  initial.world.dispose();
  initial.materials.dispose();
  for (const id of ids) {
    const { world, surface, api, materials } = createWorld(id),
      p = api.Physics.parameters;
    expect(world.diagnostics().theme).toBe(id);
    expect(world.layout.objects.length).toBeGreaterThanOrEqual(3);
    expect([
      ...world.group.getObjectByName("unchanged-road").geometry.attributes
        .position.array,
    ]).toEqual([
      ...api.Tracks3D.roadGeometry(surface, surface.roadRadius, 0.07).attributes
        .position.array,
    ]);
    for (const spec of world.layout.objects)
      expect(
        world.layout.clearance(spec.at, spec.w, spec.d),
        `${id}/${spec.id}`,
      ).toBeGreaterThanOrEqual(6);
    for (const pass of world.layout.passages) {
      expect(pass.clearHeight).toBeGreaterThan(17 + 2);
      expect(pass.halfWidth).toBeGreaterThan(surface.outerRadius + 10);
      for (const at of pass.supports)
        expect(
          world.layout.clearance(at, pass.depth, pass.postWidth),
        ).toBeGreaterThanOrEqual(5);
      expect(surface.bridge?.heightAt(pass.s) || 0).toBe(0);
    }
    world.group.updateMatrixWorld(true);
    for (const pass of world.layout.passages) {
      const node = world.group.getObjectByName(pass.id),
        pnt = surface.at(pass.s),
        camera = new initial.THREE.PerspectiveCamera(55, 1, 0.3, 3000);
      camera.position.set(pnt.x, 17, pnt.y);
      world.update(camera, { x: pnt.x, y: pnt.y }, false, {});
      expect(node.visible, `${id}: Bauwerk darf innen nicht verschwinden`).toBe(
        true,
      );
      const ray = new initial.THREE.Raycaster(
        new initial.THREE.Vector3(pnt.x, 17, pnt.y),
        new initial.THREE.Vector3(0, 1, 0),
      );
      const hits = ray.intersectObject(node, true);
      expect(hits.length, `${id}: tatsächliches Dach`).toBeGreaterThan(0);
      expect(
        hits[0].distance,
        `${id}: Kopffreiheit der Kamera`,
      ).toBeGreaterThan(20);
    }

    world.group.traverse((node) => {
      if (!node.isMesh) return;
      for (const attr of Object.values(node.geometry.attributes))
        expect(attr.array.every(Number.isFinite), `${id}/${node.name}`).toBe(
          true,
        );
    });
    // Actual solid landmark vertices, rather than only placement centres.
    for (const spec of world.layout.objects) {
      const node = world.group.getObjectByName(spec.id);
      for (const mesh of node.children) {
        if (!mesh.isMesh || mesh.material.transparent) continue;
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 3) {
          const v = new initial.THREE.Vector3(
            pos.getX(i),
            pos.getY(i),
            pos.getZ(i),
          ).applyMatrix4(mesh.matrixWorld);
          if (v.y < -0.1 || v.y > p.halfLength * 2 + 17) continue;
          expect(
            surface.project({ x: v.x, y: v.z }).distance,
            `${id}/${spec.id}`,
          ).toBeGreaterThan(surface.outerRadius + 2);
        }
      }
    }
    world.dispose();
    materials.dispose();
  }
}, 240000);
