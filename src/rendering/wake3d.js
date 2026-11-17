(() => {
  "use strict";
  const A = globalThis.CGPArcade, T = globalThis.CGPThree;
  function create() {
    // One shared fixed-size ribbon batch for the entire field; at most one
    // extra draw call and 2,496 triangles. No per-frame GPU allocations.
    const vertices = 13 * 4 * 24 * 6,
      positions = new Float32Array(vertices * 3), colors = new Float32Array(vertices * 4),
      geometry = new T.BufferGeometry(),
      position = new T.Float32BufferAttribute(positions, 3),
      color = new T.Float32BufferAttribute(colors, 4),
      material = new T.MeshBasicMaterial({ vertexColors: true, transparent: true,
        depthWrite: false, side: T.DoubleSide }),
      mesh = new T.Mesh(geometry, material);
    geometry.setAttribute("position", position);
    geometry.setAttribute("color", color);
    geometry.setDrawRange(0, 0);
    mesh.name = "slipstream-ink";
    mesh.frustumCulled = false;
    mesh.visible = false;
    let activeEmitters = 0;
    function update(snapshot) {
      const strokes = A.WakeVisuals.strokes(snapshot);
      let cursor = 0;
      activeEmitters = new Set(strokes.map((s) => s.id)).size;
      for (const { points } of strokes) for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1],
          length = Math.hypot(b.x - a.x, b.z - a.z) || 1,
          nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
        for (const [p, side] of [[a, -1], [b, -1], [b, 1], [a, -1], [b, 1], [a, 1]]) {
          position.setXYZ(cursor, p.x + nx * p.width * side, p.y, p.z + nz * p.width * side);
          color.setXYZW(cursor++, 0.83, 0.91, 0.91, p.alpha);
        }
      }
      geometry.setDrawRange(0, cursor);
      mesh.visible = cursor > 0;
      position.needsUpdate = color.needsUpdate = cursor > 0;
    }
    return Object.freeze({ mesh, update,
      diagnostics: () => ({ emitters: activeEmitters, triangles: geometry.drawRange.count / 3 }),
      dispose() { geometry.dispose(); material.dispose(); },
    });
  }
  A.Wake3D = Object.freeze({ create });
})();
