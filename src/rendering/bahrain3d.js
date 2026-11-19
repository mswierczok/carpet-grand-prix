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
    const maps = A.BahrainMaterials3D.create(materials),
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
    const groundGeo = new T.PlaneGeometry(2700, 2700, 16, 16);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(590, 0, 374);
    const gp = groundGeo.attributes.position,
      gu = groundGeo.attributes.uv,
      colors = [];
    for (let i = 0; i < gp.count; i++) {
      gu.setXY(i, gp.getX(i) / 32, gp.getZ(i) / 32);
      const shade =
        0.965 +
        0.03 * Math.sin(gp.getX(i) * 0.017) * Math.cos(gp.getZ(i) * 0.014);
      colors.push(shade, shade, shade);
    }
    groundGeo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    mesh(
      groundGeo,
      materials.basic("#ffffff", { map: maps.carpet, vertexColors: true }),
      "looped-carpet",
    );
    mesh(
      uvScale(A.Tracks3D.boundaryGeometry(surface), 9 / 32),
      materials.basic("#a9916d", { map: maps.carpet }),
      "unchanged-dark-shoulder",
    );
    mesh(
      A.Tracks3D.roadGeometry(surface, surface.roadRadius + 0.24, 0.058),
      materials.basic("#9c8c70"),
      "painted-edge-ink",
    );
    mesh(
      uvScale(
        A.Tracks3D.roadGeometry(surface, surface.roadRadius, 0.07),
        9 / 40,
      ),
      materials.basic("#ffffff", { map: maps.road }),
      "unchanged-cream-road",
    );

    // Continuous physical polylines; texture U follows real distance, not vertex count.
    const ropeFill = materials.toon("#ffffff", maps.rope),
      ropeInk = materials.basic("#756044", { side: T.BackSide }),
      contact = materials.basic("#8b7556", {
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
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
      const outline = g.clone(),
        p = outline.attributes.position,
        n = outline.attributes.normal;
      for (let i = 0; i < p.count; i++)
        p.setXYZ(
          i,
          p.getX(i) + n.getX(i) * 0.09,
          p.getY(i) + n.getY(i) * 0.09,
          p.getZ(i) + n.getZ(i) * 0.09,
        );
      batchRope(outline, ropeInk, "yarn-outline");
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
      outline.dispose();
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
    // Unequal braking traces; every point stays inside the unchanged cream strip.
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
    for (let s = 50; s < surface.g.len; s += 140)
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
      build(obj);
      const node = obj.finish();
      group.add(node);
      guards.push({ spec, node });
      return node;
    }
    function pit(o) {
      o.shadow([0, 0], [124, 58]);
      o.box([0, 1, 0], [102, 2, 32], palette.wood);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 32;
        o.box([x, 11, -10], [30, 20, 9], i === 1 ? palette.red : palette.honey);
        o.box([x, 10.5, 4.2], [22, 15, 1], "#3c4850", [0, 0, 0], "plain", 0.07);
        for (const side of [-1, 1])
          o.box(
            [x + side * 13, 10, 6],
            [4, 18, 8],
            side < 0 ? palette.wood : palette.honey,
          );
        o.box([x, 21, 4], [32, 4, 28], i === 1 ? palette.honey : palette.red);
        o.box(
          [x, 2.2, 7],
          [21, 0.18, 16],
          palette.paper,
          [0, 0, 0],
          "plain",
          0.04,
        );
        o.box([x - 6, 3.4, 10], [3, 2.5, 3], palette.blue);
        o.cylinder(
          [x + 7, 3.8, 9],
          [1.5, 1.6],
          3,
          "#3e4545",
          [0, 0, 0],
          "plain",
        );
        o.label(6, [x, 14, 4.8], [6, 3]);
      }
      o.box([0, 24, 3], [73, 3, 6], palette.paper);
      o.label(2, [0, 24, 6.1], [69, 6]);
      for (const x of [-45, 45]) {
        o.box([x, 10.5, 11], [3, 18, 2], palette.honey);
        o.box([x, 20, 11], [6, 2, 3], palette.paper);
      }
    }
    function camel(o) {
      const fur = "#cda36d",
        light = "#e6c28c",
        seam = "#88613f";
      o.shadow([0, 0], [50, 30]);
      for (const x of [-8, 8])
        for (const z of [-3.6, 3.6]) {
          o.ball([x, 5.1, z], [1.65, 5.1, 1.7], fur);
          o.ball([x + 0.3, 1.2, z - 0.2], [2.5, 1.2, 2.2], "#b88a59");
        }
      o.ball([0, 11, 0], [12.6, 6.6, 6.2], fur);
      o.ball([-2, 17, 0], [5.8, 7.5, 5.3], light);
      o.ball([10.7, 18.5, 0], [3, 8, 3.5], fur, "cloth", [0, 0, 0.23]);
      o.ball([14, 26, 0], [4.5, 4.5, 3.6], light);
      o.ball([19, 24, 0], [5, 2.7, 3.6], fur);
      for (const z of [-3.1, 3.1]) {
        o.ball([12.3, 30, z], [1.1, 2.5, 1.45], light, "cloth", [0.3, 0, -0.3]);
        o.ball(
          [18.4, 28, z * 0.7],
          [0.65, 1.7, 1.2],
          "#fff6dc",
          "plain",
          [0, 0, 0],
          0.11,
        );
        o.ball(
          [19, 28, z * 0.7],
          [0.25, 0.8, 0.55],
          "#26323b",
          "plain",
          [0, 0, 0],
          0,
        );
        o.ball(
          [23.5, 24.9, z * 0.5],
          [0.23, 0.38, 0.45],
          seam,
          "plain",
          [0, 0, 0],
          0,
        );
      }
      o.ball([11.8, 30.3, 0], [1.7, 1.5, 1.4], fur);
      for (let z = -2; z <= 2; z += 0.5)
        o.ball(
          [23.65, 22.7 + 0.1 * z * z, z],
          [0.12, 0.12, 0.12],
          seam,
          "plain",
          [0, 0, 0],
          0,
        );
      o.ball([-13, 12, 0], [0.8, 3.2, 0.85], fur, "cloth", [0, 0, -0.7]);
      for (let i = 0; i < 13; i++)
        o.box(
          [-10 + i * 1.65, 10.1, -6.18],
          [0.18, 0.8, 0.1],
          seam,
          [0, 0, 0.4],
          "plain",
          0,
        );
      for (let i = 0; i < 4; i++)
        o.box(
          [16 + i * 1.5, 22.9, -3.05],
          [0.7, 0.11, 0.1],
          seam,
          [0, 0, 0],
          "plain",
          0,
        );
      o.box(
        [-2, 14.3, -5.7],
        [10, 5, 0.35],
        palette.red,
        [0, 0, 0],
        "cloth",
        0.07,
      );
      o.label(6, [-2, 14.4, -5.95], [7.5, 3.5], [0, Math.PI, 0]);
    }
    function spool(o, x, color, height) {
      o.cylinder(
        [x, height / 2 + 1, 0],
        [6.2, 6.2],
        height,
        color,
        [0, 0, 0],
        "cloth",
        0.12,
      );
      for (const y of [1, height + 1]) {
        o.cylinder([x, y, 0], [8.6, 8.6], 1.8, palette.honey);
        o.cylinder(
          [x, y + 1, 0],
          [2.1, 2.1],
          0.3,
          "#7c5b40",
          [0, 0, 0],
          "plain",
          0,
        );
      }
      for (let y = 4; y < height; y += 3)
        o.cylinder(
          [x, y, 0],
          [6.35, 6.35],
          0.22,
          color === "#526e86" ? "#90a7b4" : "#c77968",
          [0, 0, 0],
          "plain",
          0,
        );
    }
    function towers(o) {
      o.shadow([0, 0], [48, 35]);
      spool(o, -10, palette.blue, 27);
      spool(o, 10, palette.red, 20);
      o.cylinder([-10, 33, 0], [0.4, 0.4], 9, "#e4cc86", [0, 0, 0.08]);
      o.label(5, [8, 11, -6.5], [9, 4], [0, Math.PI, 0]);
    }
    function dunes(o) {
      o.shadow([0, 0], [55, 39]);
      o.box(
        [0, 1, 0],
        [42, 1.5, 28],
        palette.paper,
        [0, 0.07, 0],
        "cloth",
        0.07,
      );
      o.box(
        [-9, 4, -1],
        [21, 0.7, 24],
        palette.cream,
        [0, 0.07, -0.28],
        "cloth",
        0.06,
      );
      o.box(
        [11, 3, 0],
        [21, 0.7, 25],
        "#dfca9f",
        [0, 0.07, 0.22],
        "cloth",
        0.06,
      );
      for (let i = 0; i < 9; i++)
        o.box(
          [-18 + i * 4, 0.8, 13.8],
          [0.7, 0.2, 1.3],
          "#9e8763",
          [0, 0.07, 0],
          "plain",
          0,
        );
    }
    function stand(o) {
      o.shadow([0, 0], [64, 35]);
      for (let i = 0; i < 3; i++) {
        o.box(
          [0, 2 + i * 3.4, 8 - i * 7],
          [52, 3.8, 8],
          i % 2 ? palette.blue : palette.honey,
        );
        for (let j = 0; j < 8; j++) {
          const x = -23 + j * 6.4;
          o.cylinder(
            [x, 5.5 + i * 3.3, 8 - i * 7],
            [1.5, 1.7],
            1.4,
            palette.paper,
          );
        }
      }
      o.box([0, 14, -8], [55, 4, 2], palette.paper);
      o.label(7, [0, 14, -6.9], [51, 5]);
      for (const side of [-1, 1])
        o.box([side * 26, 7, 0], [1.4, 14, 22], palette.red);
    }
    function flood(o) {
      o.shadow([1, 4], [22, 47], -0.4);
      o.box([0, 1, 0], [10, 2, 9], palette.wood);
      o.cylinder([0, 19, 0], [1, 1.5], 36, palette.honey, [0, 0, 0.025]);
      o.box(
        [0, 38, 0],
        [20, 8, 3],
        palette.blue,
        [0.13, 0, 0.03],
        "plain",
        0.15,
      );
      for (const x of [-7, -2.3, 2.3, 7]) {
        o.box(
          [x, 38, 1.7],
          [3.7, 5.8, 0.35],
          palette.ink,
          [0.13, 0, 0],
          "plain",
          0,
        );
        o.box(
          [x, 38.3, 2.0],
          [2.8, 4.2, 0.12],
          "#fff1bf",
          [0.13, 0, 0],
          "light",
          0,
        );
        o.box(
          [x, 39.3, 2.12],
          [2.4, 0.45, 0.05],
          "#fffbea",
          [0.13, 0, 0],
          "light",
          0,
        );
      }
      for (const y of [9, 23, 31])
        o.box(
          [0, y, 0.1],
          [2.9, 0.8, 2.8],
          palette.wood,
          [0, 0, 0],
          "wood",
          0.05,
        );
    }
    function tunnel(o) {
      for (const side of [-1, 1])
        for (let i = 0; i < 2; i++)
          for (const end of [-1, 1])
            o.box(
              [end * 22, 5.4 + i * 10.8, side * 37.75],
              [43.8, 10.6, 12.5],
              [palette.honey, palette.red, palette.wood][
                (i + (side > 0 ? 1 : 0) + (end > 0 ? 1 : 0)) % 3
              ],
            );
      for (const end of [-1, 1])
        o.box(
          [end * 23, 23.7, 0],
          [45.5, 3.4, 90],
          end < 0 ? palette.honey : palette.wood,
        );
      o.box([0, 27, 0], [85, 3, 86], palette.red);
      o.label(1, [-46, 25, 0], [69, 6], [0, -Math.PI / 2, 0]);
      // Interior contact shade is low contrast; it never affects traction.
      o.shadow([0, 0], [104, 81], 0, 0.078);
    }
    function wardrobe(o) {
      o.shadow([15, 15], [140, 290]);
      o.box([0, 73, 0], [82, 142, 238], palette.blue);
      for (const z of [-57, 57]) {
        o.box([43, 74, z], [2, 123, 108], "#698193", [0, 0, 0], "wood", 0.18);
        o.cylinder([46, 73, z < 0 ? -11 : 11], [2.2, 2.2], 10, palette.honey, [
          Math.PI / 2,
          0,
          0,
        ]);
      }
      o.box([0, 145, 0], [88, 5, 245], palette.honey);
      o.box([0, 6, 0], [88, 10, 245], palette.wood);
    }
    function chest(o) {
      o.shadow([0, 0], [135, 105]);
      o.box([0, 24, 0], [98, 45, 65], palette.red);
      o.box([0, 46, -21], [103, 6, 68], palette.honey, [-0.18, 0, 0]);
      o.box([0, 23, 33], [28, 10, 2], palette.paper);
      o.label(4, [0, 23, 34.1], [27, 10]);
      for (const x of [-40, 40]) o.box([x, 23, 33], [5, 39, 2], palette.wood);
      o.box([28, 54, -14], [19, 14, 19], palette.green, [0, 0.25, 0.06]);
      o.box([-27, 53, -11], [25, 13, 21], palette.blue, [0, -0.13, 0]);
    }
    function pencils(o) {
      o.shadow([0, 0], [105, 55]);
      for (const [i, color] of [
        palette.red,
        palette.green,
        palette.blue,
      ].entries()) {
        const z = (i - 1) * 13;
        o.cylinder(
          [0, 3 + i * 0.6, z],
          [2.4, 2.4],
          65,
          color,
          [0, 0, Math.PI / 2],
          "plain",
          0.1,
        );
        o.cylinder(
          [36, 3 + i * 0.6, z],
          [0, 2.4],
          8,
          palette.honey,
          [0, 0, -Math.PI / 2],
          "wood",
          0.04,
        );
        o.cylinder(
          [40, 3 + i * 0.6, z],
          [0, 0.8],
          3,
          color,
          [0, 0, -Math.PI / 2],
          "plain",
          0,
        );
        o.cylinder(
          [-34, 3 + i * 0.6, z],
          [2.5, 2.5],
          5,
          palette.paper,
          [0, 0, Math.PI / 2],
          "plain",
          0.05,
        );
      }
    }
    for (const spec of layout.objects)
      assemble(spec, (o) => {
        if (spec.id === "wooden-pits") pit(o);
        else if (spec.id === "plush-camel") {
          o.group.scale.setScalar(0.75);
          camel(o);
        } else if (spec.id === "thread-towers") towers(o);
        else if (spec.id === "cloth-dunes") dunes(o);
        else if (spec.id === "carpet-club") stand(o);
        else if (spec.id.startsWith("floodlight")) flood(o);
        else if (spec.id === "block-tunnel") tunnel(o);
        else if (spec.id === "wardrobe") wardrobe(o);
        else if (spec.id === "toy-chest") chest(o);
        else if (spec.id === "pencils") pencils(o);
        else {
          o.shadow([0, 0], [29, 16]);
          o.box([0, 4, 0], [23, 8, 2], palette.honey);
          o.label(
            spec.id === "loop-board" ? 4 : 3,
            [0, 4, -1.1],
            [22, 7],
            [0, Math.PI, 0],
          );
        }
      });
    const room = kit.object("bedroom-wall-and-skirting"),
      b = layout.bounds;
    room.box(
      [(b.minX + b.maxX) / 2, 65, b.minY - 190],
      [b.maxX - b.minX + 520, 130, 10],
      "#dfd4b8",
      [0, 0, 0],
      "plain",
      0.2,
    );
    room.box(
      [(b.minX + b.maxX) / 2, 7, b.minY - 183],
      [b.maxX - b.minX + 520, 14, 5],
      "#ac8b65",
    );
    room.box(
      [b.maxX + 190, 65, (b.minY + b.maxY) / 2],
      [10, 130, b.maxY - b.minY + 390],
      "#cfbea1",
      [0, 0, 0],
      "plain",
      0.2,
    );
    room.box(
      [b.maxX + 183, 7, (b.minY + b.maxY) / 2],
      [5, 14, b.maxY - b.minY + 390],
      "#ac8b65",
    );
    for (const x of [b.minX + 150, b.minX + 440]) {
      room.box(
        [x, 78, b.minY - 183],
        [105, 62, 1],
        palette.paper,
        [0, 0, 0],
        "plain",
        0.3,
      );
      room.box(
        [x, 78, b.minY - 182],
        [90, 48, 1],
        x === b.minX + 150 ? palette.blue : palette.green,
        [0, 0, 0],
        "cloth",
        0,
      );
    }
    group.add(room.finish());
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
      for (const { spec, node } of guards) {
        const dx = camera.position.x - spec.at.x,
          dz = camera.position.z - spec.at.y,
          x = dx * Math.cos(spec.at.ang) + dz * Math.sin(spec.at.ang),
          z = -dx * Math.sin(spec.at.ang) + dz * Math.cos(spec.at.ang),
          y = camera.position.y;
        const solids = spec.solids || [
          [-spec.w / 2, spec.w / 2, -spec.d / 2, spec.d / 2, 0, spec.h],
        ];
        node.visible =
          overview ||
          !solids.some(
            (b) =>
              x > b[0] - 2 &&
              x < b[1] + 2 &&
              z > b[2] - 2 &&
              z < b[3] + 2 &&
              y > b[4] - 2 &&
              y < b[5] + 2,
          );
      }
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
      diagnostics() {
        return {
          theme: "carpet-desert",
          assets: layout.objects.length,
          ropeTriangles,
          tunnelClearHeight: layout.tunnel.clearHeight,
          tunnelHalfWidth: layout.tunnel.clearHalfWidth,
          hiddenForCamera: guards.filter((g) => !g.node.visible).length,
        };
      },
      dispose() {
        geometries.forEach((g) => g.dispose());
        kit.dispose();
      },
    });
  }
  A.Bahrain3D = Object.freeze({ create, palette });
})();
