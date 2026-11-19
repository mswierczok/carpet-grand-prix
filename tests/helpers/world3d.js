import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "./arcade.js";
export function createWorld() {
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
    "illustrated-materials3d",
    "bahrain-materials3d",
    "environment-scenes",
    "environment-assets3d",
    "master-bedroom3d",
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
  return { api, surface, materials, world, THREE };
}
