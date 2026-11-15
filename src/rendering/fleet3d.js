(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  // Opponents reuse the actual player model and liveries. Bake its static parts
  // into a few material batches; do not render 12 complete articulated trees.
  function create(template, materials) {
    const group = new T.Group(),
      cache = new Map(),
      geometries = [];
    function bake(id) {
      template.update({ x: 0, y: 0, heading: 0, steering: 0, s: 0 }, id);
      template.group.updateMatrixWorld(true);
      const batches = new Map();
      template.group.traverse((node) => {
        if (!node.isMesh) return;
        const source = node.geometry.index
          ? node.geometry.toNonIndexed()
          : node.geometry.clone();
        source.applyMatrix4(node.matrixWorld);
        const ranges = Array.isArray(node.material)
          ? source.groups
          : [
              {
                start: 0,
                count: source.attributes.position.count,
                materialIndex: 0,
              },
            ];
        for (const range of ranges) {
          const m = Array.isArray(node.material)
              ? node.material[range.materialIndex]
              : node.material,
            key = [
              !!m.isMeshToonMaterial,
              m.side,
              m.map?.uuid || "",
              m.transparent,
              m.depthWrite,
            ].join(":"),
            b = batches.get(key) || {
              original: m,
              position: [],
              normal: [],
              uv: [],
              color: [],
            };
          batches.set(key, b);
          const pos = source.attributes.position,
            normal = source.attributes.normal,
            uv = source.attributes.uv;
          for (let i = range.start; i < range.start + range.count; i++) {
            b.position.push(pos.getX(i), pos.getY(i), pos.getZ(i));
            b.normal.push(normal.getX(i), normal.getY(i), normal.getZ(i));
            b.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
            b.color.push(m.color.r, m.color.g, m.color.b);
          }
        }
        source.dispose();
      });
      const model = new T.Group();
      model.name = "opponent-" + id;
      for (const b of batches.values()) {
        const geometry = new T.BufferGeometry();
        for (const [name, itemSize] of [
          ["position", 3],
          ["normal", 3],
          ["uv", 2],
          ["color", 3],
        ])
          geometry.setAttribute(
            name,
            new T.Float32BufferAttribute(b[name], itemSize),
          );
        geometry.computeBoundingSphere();
        geometries.push(geometry);
        const m = b.original,
          options = {
            vertexColors: true,
            side: m.side,
            transparent: m.transparent,
            opacity: m.opacity,
            depthWrite: m.depthWrite,
          };
        const material = m.isMeshToonMaterial
          ? materials.toon("#ffffff", m.map, options)
          : materials.basic("#ffffff", { ...options, map: m.map });
        model.add(new T.Mesh(geometry, material));
      }
      cache.set(id, model);
      group.add(model);
      return model;
    }
    function update(entries) {
      for (const model of cache.values()) model.visible = false;
      for (const entry of entries) {
        if (entry.player) continue;
        const model = cache.get(entry.teamId) || bake(entry.teamId);
        model.visible = true;
        model.position.set(entry.visual.x, 0, entry.visual.y);
        model.rotation.y = -entry.visual.heading;
      }
    }
    return Object.freeze({
      group,
      update,
      dispose() {
        geometries.forEach((g) => g.dispose());
      },
    });
  }
  A.Fleet3D = Object.freeze({ create });
})();
