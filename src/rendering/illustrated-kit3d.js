(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  // Static, material-batched toy parts. No renderer/scene state enters the simulation.
  function create(materials, maps) {
    const sources = new Map(),
      geometries = [],
      shadows = [];
    const finishes = {
      wood: materials.basic("#ffffff", { map: maps.wood, vertexColors: true }),
      cloth: materials.basic("#ffffff", {
        map: maps.cloth,
        vertexColors: true,
      }),
      plain: materials.basic("#ffffff", { vertexColors: true }),
      ink: materials.basic("#39332e", { side: T.BackSide }),
      label: materials.basic("#ffffff", {
        map: maps.labels,
        side: T.DoubleSide,
      }),
      light: materials.basic("#ffffff", { vertexColors: true }),
      shadow: materials.basic("#ffffff", {
        map: maps.shadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
      }),
    };
    function source(key, factory) {
      if (!sources.has(key)) sources.set(key, factory());
      return sources.get(key);
    }
    function roundedBox(w, h, d) {
      return source(`box:${w}:${h}:${d}`, () => {
        const segments = Math.min(w, h, d) <= 2 ? 1 : 2;
        const g = new T.BoxGeometry(w, h, d, segments, segments, segments),
          p = g.attributes.position,
          r = Math.min(0.38, w * 0.12, h * 0.12, d * 0.12),
          core = [w / 2 - r, h / 2 - r, d / 2 - r];
        for (let i = 0; i < p.count; i++) {
          const v = new T.Vector3(p.getX(i), p.getY(i), p.getZ(i)),
            c = new T.Vector3(
              Math.max(-core[0], Math.min(core[0], v.x)),
              Math.max(-core[1], Math.min(core[1], v.y)),
              Math.max(-core[2], Math.min(core[2], v.z)),
            );
          v.sub(c).normalize().multiplyScalar(r).add(c);
          p.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        return g;
      });
    }
    function object(name, at = { x: 0, y: 0, ang: 0 }) {
      const group = new T.Group(),
        batches = new Map();
      group.name = name;
      group.position.set(at.x, 0, at.y);
      group.rotation.y = -(at.ang || 0);
      function append(g, kind, color) {
        const b = batches.get(kind) || {
          position: [],
          normal: [],
          uv: [],
          color: [],
        };
        batches.set(kind, b);
        const c = new T.Color(color),
          p = g.attributes.position,
          n = g.attributes.normal,
          u = g.attributes.uv;
        const baked = ["wood", "cloth", "plain"].includes(kind),
          cosine = Math.cos(at.ang || 0),
          sine = Math.sin(at.ang || 0);
        for (let i = 0; i < p.count; i++) {
          b.position.push(p.getX(i), p.getY(i), p.getZ(i));
          b.normal.push(n.getX(i), n.getY(i), n.getZ(i));
          b.uv.push(u?.getX(i) || 0, u?.getY(i) || 0);
          if (baked) {
            // Fixed golden-hour light, baked once into the static toy geometry.
            // Vehicles retain the existing dynamic toon materials.
            const nx = n.getX(i) * cosine - n.getZ(i) * sine,
              nz = n.getX(i) * sine + n.getZ(i) * cosine,
              dot = (-150 * nx + 200 * n.getY(i) - 80 * nz) / 262.49,
              band = dot > 0.4 ? 1.03 : dot > -0.15 ? 0.76 : 0.48;
            b.color.push(c.r * band * 1.025, c.g * band, c.b * band * 0.94);
          } else b.color.push(c.r, c.g, c.b);
        }
      }
      function part(
        geometry,
        color,
        position = [0, 0, 0],
        scale = [1, 1, 1],
        rotation = [0, 0, 0],
        kind = "plain",
        stroke = 0.18,
      ) {
        const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(),
          m = new T.Mesh();
        m.position.set(...position);
        m.scale.set(...scale);
        m.rotation.set(...rotation);
        m.updateMatrix();
        g.applyMatrix4(m.matrix);
        append(g, kind, color);
        if (stroke) {
          const p = g.attributes.position,
            n = g.attributes.normal;
          for (let i = 0; i < p.count; i++)
            p.setXYZ(
              i,
              p.getX(i) + n.getX(i) * stroke,
              p.getY(i) + n.getY(i) * stroke,
              p.getZ(i) + n.getZ(i) * stroke,
            );
          append(g, "ink", "#ffffff");
        }
        g.dispose();
      }
      function box(
        position,
        size,
        color,
        rotation = [0, 0, 0],
        kind = "wood",
        stroke = 0.18,
      ) {
        part(
          roundedBox(...size),
          color,
          position,
          [1, 1, 1],
          rotation,
          kind,
          stroke,
        );
      }
      function ball(
        position,
        size,
        color,
        kind = "cloth",
        rotation = [0, 0, 0],
        stroke = 0.16,
      ) {
        const small = Math.min(...size) < 2;
        part(
          source(
            small ? "small-sphere" : "sphere",
            () => new T.SphereGeometry(1, small ? 8 : 12, small ? 6 : 8),
          ),
          color,
          position,
          size,
          rotation,
          kind,
          stroke,
        );
      }
      function cylinder(
        position,
        radii,
        length,
        color,
        rotation = [0, 0, 0],
        kind = "wood",
        stroke = 0.1,
      ) {
        const segments = Math.max(...radii) < 2.5 ? 8 : 16;
        part(
          source(
            `cylinder:${radii}:${length}`,
            () =>
              new T.CylinderGeometry(radii[0], radii[1], length, segments, 1),
          ),
          color,
          position,
          [1, 1, 1],
          rotation,
          kind,
          stroke,
        );
      }
      function label(index, position, size, rotation = [0, 0, 0]) {
        const g = new T.PlaneGeometry(...size),
          uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++)
          uv.setY(i, (7 - index + uv.getY(i)) / 8);
        part(g, "#ffffff", position, [1, 1, 1], rotation, "label", 0);
        g.dispose();
      }
      function shadow(position, size, angle = 0, height = 0.025) {
        const heading = at.ang || 0;
        const dx =
          (5 * Math.cos(heading) + 3 * Math.sin(heading)) / group.scale.x;
        const dz =
          (-5 * Math.sin(heading) + 3 * Math.cos(heading)) / group.scale.z;
        part(
          source("plane", () => new T.PlaneGeometry(1, 1)),
          "#ffffff",
          [position[0] + dx, height, position[1] + dz],
          [size[0], size[1], 1],
          [-Math.PI / 2, 0, angle],
          "shadow",
          0,
        );
      }
      function flat(position, size, color, heading = 0) {
        part(
          source("plane", () => new T.PlaneGeometry(1, 1)),
          color,
          position,
          [size[0], size[1], 1],
          [-Math.PI / 2, 0, -heading],
          "plain",
          0,
        );
      }
      function decal(position, size, color, rotation = [0, 0, 0]) {
        part(
          source("plane", () => new T.PlaneGeometry(1, 1)),
          color,
          position,
          [size[0], size[1], 1],
          rotation,
          "plain",
          0,
        );
      }
      function finish() {
        for (const [kind, b] of batches) {
          const g = new T.BufferGeometry();
          for (const [key, size] of [
            ["position", 3],
            ["normal", 3],
            ["uv", 2],
            ["color", 3],
          ])
            g.setAttribute(key, new T.Float32BufferAttribute(b[key], size));
          g.computeBoundingSphere();
          geometries.push(g);
          group.add(new T.Mesh(g, finishes[kind]));
          if (kind === "shadow") {
            group.updateMatrix();
            g.applyMatrix4(group.matrix);
            shadows.push(g);
            group.remove(group.children.at(-1));
          }
        }
        batches.clear();
        return group;
      }
      return {
        group,
        part,
        box,
        ball,
        cylinder,
        label,
        shadow,
        flat,
        decal,
        finish,
      };
    }
    function finishShadows() {
      const g = new T.BufferGeometry();
      for (const [key, size] of [
        ["position", 3],
        ["normal", 3],
        ["uv", 2],
      ]) {
        const values = [];
        for (const source of shadows)
          values.push(...source.attributes[key].array);
        g.setAttribute(key, new T.Float32BufferAttribute(values, size));
      }
      g.computeBoundingSphere();
      geometries.push(g);
      return new T.Mesh(g, finishes.shadow);
    }
    return Object.freeze({
      object,
      finishShadows,
      dispose() {
        geometries.forEach((g) => g.dispose());
        sources.forEach((g) => g.dispose());
      },
    });
  }
  A.IllustratedKit3D = Object.freeze({ create });
})();
