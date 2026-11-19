(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  const palette = Object.freeze({
    sand: "#c7b28f",
    cream: "#fff3d2",
    paper: "#f3e5bf",
    red: "#ad5147",
    blue: "#526e86",
    green: "#788c66",
    ink: "#443f37",
    honey: "#d5a86e",
    wood: "#b98255",
  });
  function create(surface, materials) {
    const group = new T.Group();
    group.name = "bahrain-carpet-desert";
    const sceneConfig = A.EnvironmentScenes.get(surface.id);
    const maps = A.IllustratedMaterials3D.create(
        materials,
        sceneConfig.materials,
      ),
      kit = A.IllustratedKit3D.create(materials, maps),
      layout = A.BahrainLayout.create(surface),
      geometries = [],
      guards = [],
      signal = [];
    const geometry = (g) => {
      geometries.push(g);
      return g;
    };
    function mesh(g, m, name) {
      const node = new T.Mesh(geometry(g), m);
      node.name = name;
      group.add(node);
      return node;
    }
    function uvScale(g, factor) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, uv.getX(i) * factor, uv.getY(i) * factor);
      return g;
    }
    // Same triangle coverage, same heights, same physical definitions as Tracks3D.
    mesh(
      uvScale(A.Tracks3D.boundaryGeometry(surface), 9 / 32),
      materials.basic(sceneConfig.materials.shoulderTint, { map: maps.carpet }),
      "unchanged-dark-shoulder",
    );
    mesh(
      A.Tracks3D.roadGeometry(surface, surface.roadRadius + 0.24, 0.058),
      materials.basic("#9c8c70"),
      "carpet-edge-ink",
    );
    mesh(
      uvScale(
        A.Tracks3D.roadGeometry(surface, surface.roadRadius, 0.07),
        9 / 32,
      ),
      materials.basic(sceneConfig.materials.roadTint, { map: maps.carpet }),
      "unchanged-carpet-road",
    );

    // Continuous physical polylines; texture U follows real distance, not vertex count.
    const ropeFill = materials.toon("#ffffff", maps.rope),
      contact = materials.basic("#8b7556", {
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
    // A view-dependent ink rim in the existing toon pass replaces a second
    // complete rope mesh. The pinned Three.js shader exposes view-space normal.
    ropeFill.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
        float yarnEdge = smoothstep(0.08, 0.40, abs(dot(normal, normalize(vViewPosition))));
        outgoingLight = mix(vec3(0.17789, 0.11697, 0.05781), outgoingLight, yarnEdge);
        #include <opaque_fragment>
      `,
      );
    };
    ropeFill.customProgramCacheKey = () => "cgp-bahrain-yarn-ink-1";
    const rails = [
      ...surface.boundary.loops.map((points) => ({ points, closed: true })),
      ...surface.boundary.dividers.map((d) => ({ ...d, closed: false })),
    ];
    const ropeBatches = new Map(),
      caps = kit.object("rounded-yarn-ends");
    function batchRope(g, material, name) {
      const b = ropeBatches.get(name) || {
        material,
        position: [],
        normal: [],
        uv: [],
      };
      ropeBatches.set(name, b);
      const source = g.index ? g.toNonIndexed() : g;
      for (const key of ["position", "normal", "uv"]) {
        if (source.attributes[key])
          for (const value of source.attributes[key].array) b[key].push(value);
        else
          for (let i = 0; i < source.attributes.position.count * 2; i++)
            b.uv.push(0);
      }
      if (source !== g) source.dispose();
    }
    let ropeTriangles = 0;
    for (const { points, closed } of rails) {
      const curve = A.Tracks3D.boundaryCurve(points, 0.77, closed),
        g = new T.TubeGeometry(
          curve,
          points.length - 1,
          surface.boundary.railRadius,
          6,
          closed,
        );
      const uv = g.attributes.uv;
      let distance = 0;
      const total = points
        .slice(1)
        .reduce(
          (n, p, i) => n + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]),
          0,
        );
      const coilLength = closed
        ? total / Math.max(1, Math.round(total / 3.5))
        : 3.5;
      for (let i = 0; i < points.length; i++) {
        if (i)
          distance += Math.hypot(
            points[i][0] - points[i - 1][0],
            points[i][1] - points[i - 1][1],
          );
        for (let j = 0; j <= 6; j++) uv.setX(i * 7 + j, distance / coilLength);
      }
      batchRope(g, ropeFill, "continuous-yarn");
      ropeTriangles += g.index.count / 3;
      const shadePositions = [];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = Math.hypot(dx, dz),
          nx = (-dz / length) * 1.3,
          nz = (dx / length) * 1.3;
        for (const [p, side] of [
          [a, -1],
          [a, 1],
          [b, 1],
          [a, -1],
          [b, 1],
          [b, -1],
        ])
          shadePositions.push(
            p[0] + nx * side + 0.5,
            0.047,
            p[1] + nz * side + 0.7,
          );
      }
      const shade = new T.BufferGeometry();
      shade.setAttribute(
        "position",
        new T.Float32BufferAttribute(shadePositions, 3),
      );
      shade.computeVertexNormals();
      batchRope(shade, contact, "yarn-contact");
      g.dispose();
      shade.dispose();
      if (!closed) {
        for (const p of [points[0], points.at(-1)])
          caps.ball(
            [p[0], 0.77, p[1]],
            [0.82, 0.82, 0.82],
            "#d8bf8d",
            "plain",
            [0, 0, 0],
            0.05,
          );
      }
    }
    group.add(caps.finish());
    for (const [name, b] of ropeBatches) {
      const g = new T.BufferGeometry();
      for (const [key, size] of [
        ["position", 3],
        ["normal", 3],
        ["uv", 2],
      ])
        g.setAttribute(key, new T.Float32BufferAttribute(b[key], size));
      g.computeBoundingSphere();
      mesh(g, b.material, name);
    }
    ropeBatches.clear();

    const markings = kit.object("paint-and-rubber");
    for (let i = 0; i < 13; i++) {
      const p = surface.at(
        -22 - Math.floor(i / 2) * 16 - (i % 2) * 3,
        i % 2 ? 6 : -6,
      );
      for (const offset of [-3, 3]) {
        const x = p.x - Math.sin(p.ang) * offset,
          z = p.y + Math.cos(p.ang) * offset;
        markings.flat([x, 0.085, z], [10, 0.17], "#8a816f", p.ang);
      }
      markings.flat(
        [p.x + Math.cos(p.ang) * 5, 0.085, p.y + Math.sin(p.ang) * 5],
        [0.17, 6],
        "#8a816f",
        p.ang,
      );
    }
    const finish = surface.at(0);
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 20; col++) {
        const p = surface.at(row * 1.25 - 0.625, (col - 9.5) * 1.55);
        markings.flat(
          [p.x, 0.09, p.y],
          [1.25, 1.55],
          (col + row) % 2 ? "#343a3b" : "#fff9e8",
          finish.ang,
        );
      }
    // Unequal braking traces; every point stays inside the unchanged carpet driving strip.
    for (const [u, length, bend] of [
      [0.025, 24, 1.3],
      [0.18, 32, -1.6],
      [0.39, 17, 0.7],
    ])
      for (const lane of [-2.2, 2.2])
        for (let j = 0; j < length; j += 2) {
          const s = u * surface.g.len - length + j,
            p = surface.at(s, lane + (bend * j) / length);
          if (surface.project(p).distance > surface.roadRadius - 1) continue;
          markings.flat(
            [p.x, 0.084, p.y],
            [1.7, 0.15 + (j % 5) * 0.018],
            j % 6 ? "#c6b99e" : "#d4c6a9",
            p.ang,
          );
        }
    group.add(markings.finish());
    const posts = kit.object("small-wooden-yarn-holders");
    for (let s = 50; s < surface.g.len; s += 280)
      for (const side of [-1, 1]) {
        const p = surface.at(s, side * (surface.outerRadius + 2.8));
        if (surface.project(p).distance < surface.outerRadius + 1.4) continue;
        posts.cylinder(
          [p.x, 1.2, p.y],
          [0.6, 0.8],
          2.4,
          palette.wood,
          [0, 0, 0.08],
          "wood",
          0.06,
        );
      }
    group.add(posts.finish());

    function assemble(spec, build) {
      const obj = kit.object(spec.id, spec.at);
      if (spec.scale)
        obj.withTransform([0, 0, 0], spec.scale, [0, 0, 0], () => build(obj));
      else build(obj);
      const node = obj.finish();
      group.add(node);
      guards.push({ spec, node });
      return node;
    }
    const assets = A.EnvironmentAssets3D.create(
      palette,
      A.EnvironmentScenes.get(surface.id).finishes,
    );
    for (const spec of layout.objects.filter((o) => !o.roomFurniture))
      assemble(spec, (o) => {
        if (spec.asset) assets.build(spec.asset, o, spec);
        else if (spec.id === "wooden-pits") assets.pit(o);
        else if (spec.id === "plush-camel") {
          o.group.scale.setScalar(0.75);
          assets.camel(o);
        } else if (spec.id === "thread-towers") assets.towers(o);
        else if (spec.id === "cloth-dunes") assets.dunes(o);
        else if (spec.id === "carpet-club") assets.stand(o);
        else if (spec.id.startsWith("floodlight")) assets.flood(o);
        else if (spec.id === "block-tunnel") assets.archGate(o);
        else if (spec.id.startsWith("parked-car-"))
          assets.parkedCar(o, spec.id);
        else if (spec.id === "wardrobe") assets.wardrobe(o);
        else if (spec.id === "toy-chest") assets.chest(o);
        else if (spec.id === "pencils") assets.pencils(o);
        else {
          o.shadow([0, 0], [29, 16]);
          o.box([0, 4, 0], [23, 8, 2], palette.honey);
          const road = surface.project(spec.at);
          const facing =
            (road.x - spec.at.x) * -Math.sin(spec.at.ang) +
              (road.y - spec.at.y) * Math.cos(spec.at.ang) >
            0
              ? 1
              : -1;
          o.label(
            spec.id === "loop-board" ? 4 : 3,
            [0, 4, facing * 1.1],
            [22, 7],
            [0, facing > 0 ? 0 : Math.PI, 0],
          );
        }
      });
    const room = A.MasterBedroom3D.create(
      kit,
      assets,
      A.EnvironmentScenes.get(surface.id),
    );
    group.add(room.group);
    const lightAt = surface.at(9, surface.outerRadius + 9),
      lamp = kit.object("handmade-start-lights", lightAt);
    lamp.shadow([0, 0], [17, 26]);
    lamp.box([0, 10, 5], [2.4, 20, 3], palette.honey);
    lamp.box([0, 20, 0], [3, 6, 15], "#37444b", [0, 0, 0], "plain", 0.14);
    for (let i = 0; i < 5; i++)
      lamp.cylinder(
        [-1.6, 20, (i - 2) * 2.7],
        [1, 1],
        0.3,
        "#222b30",
        [0, 0, Math.PI / 2],
        "plain",
        0,
      );
    lamp.label(0, [-1.7, 13, 0], [18, 5], [0, -Math.PI / 2, 0]);
    group.add(lamp.finish());
    for (let i = 0; i < 5; i++) {
      const red = kit.object(`red-start-bulb-${i}`, lightAt);
      red.cylinder(
        [-1.82, 20, (i - 2) * 2.7],
        [0.8, 0.8],
        0.1,
        "#e35e43",
        [0, 0, Math.PI / 2],
        "light",
        0,
      );
      signal.push(red.finish());
      group.add(signal.at(-1));
    }
    const green = kit.object("green-start-bulbs", lightAt);
    for (let i = 0; i < 5; i++)
      green.cylinder(
        [-1.86, 20, (i - 2) * 2.7],
        [0.8, 0.8],
        0.1,
        "#b7dc89",
        [0, 0, Math.PI / 2],
        "light",
        0,
      );
    const greens = green.finish();
    group.add(greens);
    group.add(kit.finishShadows());
    function update(camera, pose, overview, snapshot) {
      room.update(camera, overview);
      A.IllustratedKit3D.updateVisibility(guards, camera, overview);
      const race = snapshot.race,
        lit =
          race?.phase === "countdown"
            ? Math.min(5, Math.floor((3 - race.countdown) / 0.6) + 1)
            : 0;
      signal.forEach((node, i) => (node.visible = i < lit));
      greens.visible = race?.phase === "racing" && race.elapsed < 2;
    }
    return Object.freeze({
      group,
      update,
      layout,
      overview: room.overview,
      diagnostics() {
        return {
          theme: "carpet-desert",
          room: room.diagnostics(),
          passage: {
            clearHeight: layout.passage.clearHeight,
            clearHalfWidth: layout.passage.clearHalfWidth,
          },
          assets: layout.objects.length,
          ropeTriangles,
          tunnelClearHeight: layout.tunnel.clearHeight,
          tunnelHalfWidth: layout.tunnel.clearHalfWidth,
          hiddenForCamera:
            guards.filter((g) => !g.node.visible).length +
            room.diagnostics().hiddenForCamera,
        };
      },
      dispose() {
        geometries.forEach((g) => g.dispose());
        kit.dispose();
        assets.dispose();
      },
    });
  }
  A.Bahrain3D = Object.freeze({ create, palette });
})();
