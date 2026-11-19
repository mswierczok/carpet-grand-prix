(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(palette, finishes) {
    const sharedGeometry = new Map();
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
        tireStack(o, { x: x + 7, y: 2.4, z: 9, tiers: 3 });
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
      for (let z = -2; z <= 2; z += 0.5) {
        const y = 22.7 + 0.1 * z * z;
        const x =
          19 + 5 * Math.sqrt(1 - ((y - 24) / 2.7) ** 2 - (z / 3.6) ** 2) + 0.09;
        o.decal([x, y, z], [0.24, 0.24], seam, [0, Math.PI / 2, 0]);
      }
      o.ball([-13, 12, 0], [0.8, 3.2, 0.85], fur, "cloth", [0, 0, -0.7]);
      for (let i = 0; i < 13; i++) {
        const x = -10 + i * 1.65;
        const z =
          -6.2 * Math.sqrt(1 - (x / 12.6) ** 2 - (0.9 / 6.6) ** 2) - 0.09;
        o.decal([x, 10.1, z], [0.18, 0.8], seam, [0, Math.PI, 0.4]);
      }
      for (let i = 0; i < 4; i++)
        o.decal([16 + i * 1.5, 22.9, -3.05], [0.7, 0.11], seam, [
          0,
          Math.PI,
          0,
        ]);
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
          o.box(
            [x, 5.5 + i * 3.3, 8 - i * 7],
            [3, 0.8, 2],
            palette.paper,
            [0, 0, 0],
            "plain",
            0.08,
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
    // Closed extruded wood profiles in the cross-track (z/y) plane. Static
    // triangles join the existing material batches; no new renderer dependency.
    function woodProfile(o, points, depth, color) {
      const contour = points.map(([z, y]) => new T.Vector2(y, z)),
        triangles = T.ShapeUtils.triangulateShape(contour, []),
        positions = [],
        uv = [];
      function face(a, b, c) {
        for (const [x, y, z] of [a, b, c]) {
          positions.push(x, y, z);
          uv.push(z / 24, y / 24);
        }
      }
      const at = (i, x) => [x, points[i][1], points[i][0]];
      for (const triangle of triangles) {
        let [a, b, c] = triangle;
        const pa = contour[a],
          pb = contour[b],
          pc = contour[c];
        if ((pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x) < 0)
          [b, c] = [c, b];
        face(at(a, depth / 2), at(b, depth / 2), at(c, depth / 2));
        face(at(c, -depth / 2), at(b, -depth / 2), at(a, -depth / 2));
      }
      let area = 0;
      for (let i = 0; i < contour.length; i++) {
        const a = contour[i],
          b = contour[(i + 1) % contour.length];
        area += a.x * b.y - b.x * a.y;
      }
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        const a = at(i, -depth / 2),
          b = at(j, -depth / 2),
          c = at(j, depth / 2),
          d = at(i, depth / 2);
        if (area > 0) {
          face(a, b, c);
          face(a, c, d);
        } else {
          face(c, b, a);
          face(d, c, a);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      o.part(g, color, [0, 0, 0], [1, 1, 1], [0, 0, 0], "wood", 0.1);
      g.dispose();
    }
    function archGate(o) {
      // Short upside-down U, assembled from two block stacks and curved voussoirs.
      // 22 units clear even at the edges; the chase camera is only 17 units high.
      for (const side of [-1, 1])
        for (let i = 0; i < 2; i++)
          o.box(
            [0, 5.5 + i * 11, side * 36.5],
            [18, 10.8, 9],
            [palette.honey, palette.wood, palette.red][
              (i + (side > 0 ? 1 : 0)) % 3
            ],
          );
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 12 + 0.001,
          b = ((i + 1) * Math.PI) / 12 - 0.001;
        woodProfile(
          o,
          [
            [32 * Math.cos(a), 22 + 12 * Math.sin(a)],
            [41 * Math.cos(a), 22 + 20 * Math.sin(a)],
            [41 * Math.cos(b), 22 + 20 * Math.sin(b)],
            [32 * Math.cos(b), 22 + 12 * Math.sin(b)],
          ],
          18,
          [palette.honey, palette.wood, "#e2bd80"][i % 3],
        );
      }
      const crown = (z) => 22 + 20 * Math.sqrt(1 - (z / 41) ** 2);
      for (const [i, z] of [-32, -16, 0, 16, 32].entries())
        woodProfile(
          o,
          [
            [z - 7.9, crown(z - 7.9) - 0.7],
            [z + 7.9, crown(z + 7.9) - 0.7],
            [z, crown(z) + 8],
          ],
          19.5,
          i % 2 ? palette.honey : palette.red,
        );
      o.label(1, [-9.15, 38, 0], [26, 4.5], [0, -Math.PI / 2, 0]);
      o.shadow([0, 0], [32, 87], 0, 0.078);
    }
    function parkedCar(o, id) {
      const color = {
        red: palette.red,
        blue: palette.blue,
        green: palette.green,
        yellow: "#d9b458",
      }[id.split("-").at(-1)];
      o.shadow([0, 0], [17, 10]);
      o.box([0, 2.2, 0], [13, 2.2, 5.6], color, [0, 0, 0], "plain", 0.12);
      o.box([-0.8, 4.3, 0], [6.5, 2.7, 4.8], color, [0, 0, 0], "plain", 0.1);
      for (const side of [-1, 1]) {
        // Dark windows, cream pillars and real protruding toy wheels.
        for (const x of [-2.3, 0.8])
          o.box(
            [x, 4.5, side * 2.42],
            [2.45, 1.5, 0.08],
            "#304753",
            [0, 0, 0],
            "plain",
            0,
          );
        for (const x of [-4.1, 4.1]) {
          o.cylinder(
            [x, 1.5, side * 2.9],
            [1.45, 1.45],
            0.9,
            "#293036",
            [Math.PI / 2, 0, 0],
            "plain",
            0.07,
          );
          o.cylinder(
            [x, 1.5, side * 3.4],
            [0.65, 0.65],
            0.12,
            palette.paper,
            [Math.PI / 2, 0, 0],
            "plain",
            0,
          );
        }
      }
      o.box([2.53, 4.4, 0], [0.09, 1.6, 3.7], "#304753", [0, 0, 0], "plain", 0);
      o.box([-4.1, 4.4, 0], [0.09, 1.5, 3.7], "#304753", [0, 0, 0], "plain", 0);
      o.box(
        [4.7, 3.36, 0],
        [3.1, 0.06, 0.7],
        palette.paper,
        [0, 0, 0],
        "plain",
        0,
      );
      for (const z of [-1.8, 1.8]) {
        o.box(
          [6.51, 2.5, z],
          [0.08, 0.65, 1],
          "#fff1bf",
          [0, 0, 0],
          "light",
          0,
        );
        o.box(
          [-6.51, 2.5, z],
          [0.08, 0.5, 0.8],
          "#e36d4e",
          [0, 0, 0],
          "plain",
          0,
        );
      }
      o.box(
        [6.55, 1.8, 0],
        [0.15, 0.3, 4.6],
        palette.paper,
        [0, 0, 0],
        "plain",
        0,
      );
    }
    function chest(o) {
      o.shadow([0, 0], [135, 105]);
      o.box([0, 24, 0], [98, 45, 65], palette.red);
      o.box([0, 46, -21], [103, 6, 68], palette.honey, [-0.18, 0, 0]);
      o.box([0, 23, -33], [28, 10, 2], palette.paper);
      o.label(4, [0, 23, -34.1], [27, 10], [0, Math.PI, 0]);
      for (const x of [-40, 40]) o.box([x, 23, -33], [5, 39, 2], palette.wood);
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
    function brick(o, position, size, color, studs = 2) {
      o.box(position, size, color, [0, 0, 0], "plain", 0.12);
      for (let i = 0; i < studs; i++)
        o.cylinder(
          [
            position[0] + ((i - (studs - 1) / 2) * size[0]) / studs,
            position[1] + size[1] / 2 + 0.4,
            position[2],
          ],
          [Math.min(1.1, size[2] / 5), Math.min(1.1, size[2] / 5)],
          0.8,
          color,
          [0, 0, 0],
          "plain",
          0.04,
        );
    }
    function figure(o, x, y, z, color, index = 0) {
      for (const side of [-1, 1])
        o.block(
          [x + side * 1.4, y + 1.5, z],
          [0.7, 2.2, 0.9],
          color,
          [0, 0, side * 0.15],
          "plain",
          0.05,
        );
      const skin = ["#d29b66", "#995e3f", "#edc694"][index % 3];
      o.box([x, y + 1.4, z], [2.1, 2.8, 1.7], color, [0, 0, 0], "plain", 0.08);
      o.cylinder(
        [x, y + 3.8, z],
        [1.2, 1.2],
        2.5,
        skin,
        [0, 0, 0],
        "plain",
        0.07,
      );
      o.box(
        [x, y - 0.2, z + 0.7],
        [2.3, 0.65, 2.3],
        "#343d44",
        [0, 0, 0],
        "plain",
        0.03,
      );
    }
    function sail(o, width, depth, base) {
      const key = `sail:${width}:${depth}:${base}`;
      if (!sharedGeometry.has(key)) {
        const positions = [],
          uv = [],
          nx = 8,
          nz = 4;
        const point = (i, j, under = 0) => {
          const u = (i / nx) * 2 - 1,
            v = (j / nz) * 2 - 1;
          return [
            (u * width) / 2,
            base + 10 * (1 - u * u) * (0.65 + v * 0.35) + 4 * v * v - under,
            (v * depth) / 2,
          ];
        };
        const tri = (a, b, c) => {
          for (const p of [a, b, c]) {
            positions.push(...p);
            uv.push(p[0] / 24, p[2] / 24);
          }
        };
        for (let i = 0; i < nx; i++)
          for (let j = 0; j < nz; j++) {
            const a = point(i, j),
              b = point(i + 1, j),
              c = point(i + 1, j + 1),
              d = point(i, j + 1);
            tri(a, c, b);
            tri(a, d, c);
            const aa = point(i, j, 0.35),
              bb = point(i + 1, j, 0.35),
              cc = point(i + 1, j + 1, 0.35),
              dd = point(i, j + 1, 0.35);
            tri(aa, bb, cc);
            tri(aa, cc, dd);
          }
        for (const j of [0, nz])
          for (let i = 0; i < nx; i++) {
            const a = point(i, j),
              b = point(i + 1, j),
              c = point(i + 1, j, 0.35),
              d = point(i, j, 0.35);
            if (j === 0) {
              tri(a, b, c);
              tri(a, c, d);
            } else {
              tri(c, b, a);
              tri(d, c, a);
            }
          }
        for (const i of [0, nx])
          for (let j = 0; j < nz; j++) {
            const a = point(i, j),
              b = point(i, j + 1),
              c = point(i, j + 1, 0.35),
              d = point(i, j, 0.35);
            if (i === nx) {
              tri(a, b, c);
              tri(a, c, d);
            } else {
              tri(c, b, a);
              tri(d, c, a);
            }
          }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
        g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        sharedGeometry.set(key, g);
      }
      o.part(
        sharedGeometry.get(key),
        "#fff8e6",
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
        "cloth",
        0.09,
      );
    }
    function grandstand(o, spec = {}) {
      const bays = spec.bays || 4,
        bay = 40;
      o.shadow([0, 0], [bays * bay + 18, 77]);
      for (let b = 0; b < bays; b++) {
        const x = (b - (bays - 1) / 2) * bay;
        for (let row = 0; row < 4; row++) {
          const z = 17 - row * 10,
            y = 3 + row * 4;
          o.block(
            [x, y, z],
            [39, 5 + row * 2, 10],
            row % 2 ? palette.blue : palette.honey,
          );
          o.detail(() => {
            for (let seat = 0; seat < 6; seat++)
              o.block(
                [x - 15 + seat * 6, y + 3 + row, z],
                [4.2, 0.8, 4],
                seat % 3 ? "#dfd2a8" : palette.red,
                [0, 0, 0],
                "plain",
                0.06,
              );
            if ((row + b) % 2 === 0)
              figure(
                o,
                x - 9 + (b % 2) * 12,
                y + 4 + row,
                z,
                [palette.red, palette.green, palette.blue, palette.paper][
                  (row + b) % 4
                ],
                b + row,
              );
          });
        }
        for (const xOffset of [-18, 18])
          for (const z of [-23, 23]) {
            const u = xOffset / 20,
              v = z / 26.5;
            const height =
              36 + 10 * (1 - u * u) * (0.65 + v * 0.35) + 4 * v * v;
            o.cylinder(
              [x + xOffset, height / 2, z],
              [0.65, 0.95],
              height,
              palette.honey,
              [0, 0, 0],
              "wood",
              0.07,
            );
          }
        o.withTransform([x, 0, 0], [1, 1, 1], [0, 0, 0], () =>
          sail(o, 40, 53, 36),
        );
        brick(o, [x, 3, 26], [37, 6, 3], b % 2 ? palette.red : palette.blue, 3);
      }
      o.block([0, 13, -26], [bays * bay + 3, 24, 2], palette.blue);
      o.label(7, [0, 7, 27.7], [bays * bay - 8, 6]);
    }
    function blockTunnel(o) {
      for (const side of [-1, 1])
        for (let row = 0; row < 3; row++)
          for (const end of [-1, 1])
            o.box(
              [end * 16, 4.3 + row * 8.6, side * 38],
              [31.8, 8.4, 12],
              [palette.honey, palette.wood, palette.red][
                (row + (side > 0 ? 1 : 0) + (end > 0 ? 1 : 0)) % 3
              ],
            );
      o.box([0, 29.5, 0], [64, 7, 88], palette.honey);
      for (const z of [-27, 0, 27])
        o.box(
          [0, 34, z],
          [62, 1.5, 26.7],
          z === 0 ? palette.red : palette.wood,
        );
      o.label(1, [-32.2, 29.6, 0], [57, 5], [0, -Math.PI / 2, 0]);
      o.shadow([0, 0], [81, 87], 0, 0.078);
    }
    function book(o, position, size, color, angle = 0) {
      o.withTransform(position, [1, 1, 1], [0, angle, 0], () => {
        o.box([0, 0, 0], size, color, [0, 0, 0], "plain", 0.18);
        o.box(
          [size[0] / 2 + 0.1, 0, 0],
          [0.3, size[1] * 0.75, size[2] * 0.85],
          palette.paper,
          [0, 0, 0],
          "plain",
          0,
        );
        o.box(
          [0, size[1] / 2 + 0.08, 0],
          [size[0] * 0.8, 0.2, size[2] * 0.65],
          palette.paper,
          [0, 0, 0],
          "plain",
          0,
        );
      });
    }
    function bed(o) {
      o.shadow([0, 0], [193, 407]);
      for (const x of [-72, 72])
        for (const z of [-168, 168])
          o.block([x, 27, z], [17, 54, 18], palette.honey);
      for (const x of [-81, 81])
        o.block([x, 58, 0], [12, 22, 368], palette.wood);
      o.block([0, 60, 0], [161, 14, 364], palette.honey);
      o.box([0, 76, 0], [157, 23, 356], "#f2e4c9", [0, 0, 0], "cloth", 0.22);
      o.block(
        [0, 91, -116],
        [114, 14, 61],
        "#fff0d7",
        [0, 0.03, 0],
        "cloth",
        0.28,
      );
      o.block(
        [0, 87, 59],
        [161, 7, 242],
        finishes.bedding,
        [0, 0, 0],
        "cloth",
        0.2,
      );
      for (const x of [-78, 78])
        o.block(
          [x, 75, 59],
          [4, 28, 239],
          finishes.bedding,
          [0, 0, 0],
          "cloth",
          0.15,
        );
      o.block(
        [0, 92, -57],
        [161, 10, 28],
        finishes.beddingAccent,
        [0, 0, 0],
        "cloth",
        0.15,
      );
      for (const x of [-54, 0, 54])
        o.block(
          [x, 91.2, 63],
          [2, 0.15, 228],
          "#8da6ae",
          [0, 0, 0],
          "plain",
          0,
        );
      o.block([0, 80, -185], [174, 78, 11], palette.honey);
      o.block([0, 65, 185], [174, 41, 11], palette.wood);
      for (const x of [-64, 64])
        o.block(
          [x, 87, -178.8],
          [3, 53, 0.8],
          "#ebc994",
          [0, 0, 0],
          "plain",
          0,
        );
    }
    function desk(o) {
      o.shadow([0, 0], [314, 180]);
      for (const x of [-128, 128])
        for (const z of [-61, 61])
          o.block([x, 72, z], [15, 144, 15], palette.honey);
      o.block([0, 148, 0], [292, 9, 160], palette.honey);
      o.block([0, 132, -59], [267, 24, 12], palette.wood);
      o.block([89, 125, 0], [70, 36, 132], palette.wood);
      o.block([89, 125, 67], [62, 26, 2], palette.honey);
      o.block([89, 125, 69], [18, 3, 3], palette.ink, [0, 0, 0], "plain", 0.1);
      o.detail(() => {
        book(o, [-24, 157, 5], [73, 6, 46], palette.red, -0.12);
        book(o, [-29, 163, 2], [69, 5, 41], palette.blue, 0.04);
        o.block(
          [-42, 153, 53],
          [106, 1.4, 15],
          palette.paper,
          [0, 0.08, 0],
          "plain",
          0.12,
        );
        for (let i = 0; i < 12; i++)
          o.block(
            [-90 + i * 8, 153.9, 55],
            [0.5, 0.1, i % 2 ? 5 : 9],
            palette.ink,
            [0, 0.08, 0],
            "plain",
            0,
          );
        for (const [i, c] of [
          palette.red,
          palette.green,
          palette.honey,
        ].entries())
          o.cylinder(
            [-55 + i * 17, 156, -42],
            [1.4, 1.4],
            42,
            c,
            [0, 0, -Math.PI / 2 + 0.15 * i],
            "plain",
            0.06,
          );
        o.cylinder(
          [106, 155, -43],
          [16, 18],
          4,
          palette.blue,
          [0, 0, 0],
          "plain",
          0.12,
        );
        o.block([105, 184, -44], [5, 57, 5], palette.honey, [0, 0, -0.22]);
        o.block([90, 209, -44], [43, 5, 6], palette.honey, [0, 0, 0.22]);
        o.cylinder(
          [70, 219, -44],
          [13, 21],
          24,
          palette.blue,
          [0, 0, -0.2],
          "plain",
          0.12,
        );
        o.cylinder(
          [68, 207, -44],
          [17, 17],
          0.8,
          "#fff2c5",
          [0, 0, -0.2],
          "light",
          0,
        );
        o.withTransform([15, 154, -48], [1.35, 1.35, 1.35], [0, 0.1, 0], () =>
          parkedCar(o, "parked-car-green"),
        );
      });
    }
    function wardrobe(o) {
      o.shadow([0, 0], [276, 154]);
      o.block([0, 187, 0], [246, 365, 112], palette.blue);
      o.block([0, 375, 0], [250, 10, 120], palette.honey);
      o.block([0, 10, 0], [250, 18, 120], palette.wood);
      for (const x of [-61, 61]) {
        o.block([x, 191, 58], [117, 342, 4], "#6d8794");
        o.block(
          [x, 194, 60.3],
          [94, 304, 0.7],
          palette.blue,
          [0, 0, 0],
          "wood",
          0.08,
        );
        o.block([x < 0 ? -12 : 12, 190, 64], [5, 28, 6], palette.honey);
      }
      for (const x of [-103, 103])
        o.block([x, 4, 0], [20, 8, 95], palette.wood);
    }
    function bookshelf(o) {
      o.shadow([0, 0], [344, 96]);
      for (const x of [-75, 75])
        o.block([x, 155, -30], [5, 305, 5], palette.wood);
      for (const x of [-155, 155])
        o.block([x, 155, 0], [10, 310, 70], palette.honey);
      for (const y of [8, 82, 156, 230, 305])
        o.block([0, y, 0], [320, 9, 70], palette.honey);
      o.detail(() => {
        for (const row of [0, 1, 2])
          for (let i = 0; i < 7; i++) {
            const x = -130 + i * 24 + (row % 2) * 15;
            const h = 38 + (i % 3) * 8;
            o.block(
              [x, 14 + row * 74 + h / 2, -5],
              [15, h, 42],
              [palette.red, palette.blue, palette.green, palette.paper][
                (i + row) % 4
              ],
              [0, 0, ((i % 3) - 1) * 0.06],
              "plain",
              0.12,
            );
            o.block(
              [x, 22 + row * 74, 16.3],
              [11, 2, 0.3],
              palette.paper,
              [0, 0, 0],
              "plain",
              0,
            );
          }
        o.withTransform([-85, 236, 6], [2.2, 2.2, 2.2], [0, 0, 0], () =>
          parkedCar(o, "parked-car-red"),
        );
        o.withTransform([-20, 236, 4], [2.0, 2.0, 2.0], [0, 0.08, 0], () =>
          parkedCar(o, "parked-car-yellow"),
        );
        for (let i = 0; i < 3; i++)
          brick(
            o,
            [72 + i * 22, 244 + (i % 2) * 5, 0],
            [19, 14, 26],
            [palette.blue, palette.red, palette.honey][i],
            2,
          );
      });
    }
    function toyCorner(o) {
      o.shadow([0, 0], [276, 205]);
      o.withTransform([-52, 0, -23], [1, 1, 1], [0, 0.12, 0], () => chest(o));
      // A dollhouse and a closed little railway remain decorative, not driveable.
      o.box([74, 29, -13], [65, 58, 62], palette.paper);
      o.withTransform([74, 0, -13], [1, 1, 1], [0, Math.PI / 2, 0], () =>
        woodProfile(
          o,
          [
            [-33, 58],
            [33, 58],
            [0, 96],
          ],
          65,
          palette.red,
        ),
      );
      // The roof profile is rotated to span the house width, not the car corridor.
      for (const x of [54, 91])
        for (const y of [22, 48])
          o.box(
            [x, y, 18.5],
            [17, 16, 1],
            palette.blue,
            [0, 0, 0],
            "plain",
            0.1,
          );
      o.box([74, 18, 19], [15, 35, 1.4], palette.wood);
      o.detail(() => {
        for (let i = 0; i < 7; i++)
          brick(
            o,
            [-104 + i * 22, 4, 68],
            [19, 7, 16],
            [palette.red, palette.green, palette.blue][i % 3],
            2,
          );
        for (const z of [39, 57])
          o.box(
            [0, 1, z],
            [174, 1.5, 2],
            palette.ink,
            [0, 0, 0],
            "plain",
            0.04,
          );
        for (let i = 0; i < 11; i++)
          o.box([-82 + i * 16, 0.8, 48], [4, 1, 24], palette.wood);
        for (let i = 0; i < 3; i++) {
          o.box(
            [-55 + i * 34, 8, 48],
            [27, 12, 17],
            [palette.blue, palette.red, palette.green][i],
          );
          for (const z of [39, 57])
            for (const x of [-8, 8])
              o.cylinder(
                [-55 + i * 34 + x, 3, z],
                [2.4, 2.4],
                2,
                palette.ink,
                [Math.PI / 2, 0, 0],
                "plain",
                0.04,
              );
        }
        for (const side of [-1, 1])
          o.ball([-100 + side * 8, 55, -35], [6, 4, 7], palette.honey);
        o.ball([-100, 69, -45], [14, 18, 11], palette.honey);
        o.ball([-100, 94, -45], [12, 12, 11], palette.honey);
        for (const side of [-1, 1]) {
          o.ball([-100 + side * 10, 105, -45], [5, 5, 3.2], palette.honey);
          o.ball(
            [-100 + side * 5, 97, -35],
            [1.6, 1.9, 0.9],
            palette.ink,
            "plain",
            [0, 0, 0],
            0,
          );
        }
        o.ball([-100, 92, -33], [4, 3, 1.8], palette.paper);
      });
    }
    function stool(o) {
      o.shadow([0, 0], [83, 83]);
      for (const x of [-23, 23])
        for (const z of [-23, 23])
          o.box([x, 39, z], [7, 78, 7], palette.honey, [
            0,
            0,
            (x > 0 ? -1 : 1) * 0.06,
          ]);
      o.box(
        [0, 82, 0],
        [70, 12, 70],
        finishes.bedding,
        [0, 0, 0],
        "cloth",
        0.2,
      );
    }
    function tireStack(o, { x = 0, y = 0, z = 0, tiers = 3 } = {}) {
      for (let i = 0; i < tiers; i++) {
        o.cylinder(
          [x, y + 0.7 + i * 1.3, z],
          [1.65, 1.65],
          1.18,
          "#343b40",
          [0, 0, 0],
          "plain",
          0.04,
        );
        o.cylinder(
          [x, y + 1.31 + i * 1.3, z],
          [0.65, 0.65],
          0.03,
          "#1e292d",
          [0, 0, 0],
          "plain",
          0,
        );
      }
    }
    function paperSign(o, { label = 4, width = 22, height = 8 } = {}) {
      o.box([0, height / 2, 0], [width, height, 1], palette.paper);
      o.label(label, [0, height / 2, 0.6], [width - 1, height - 1]);
    }
    // Asset-only extension points. No surfaces, contacts or elevated racing paths.
    function bridgeDeck(o, { length = 60, width = 32, height = 22 } = {}) {
      for (const x of [-length / 2 + 5, length / 2 - 5])
        for (const z of [-width / 2 + 3, width / 2 - 3])
          o.box([x, height / 2, z], [6, height, 6], palette.wood);
      o.box([0, height, 0], [length, 4, width], palette.honey);
    }
    function rampElement(o, { length = 40, width = 25, height = 12 } = {}) {
      o.withTransform([0, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0], () =>
        woodProfile(
          o,
          [
            [-length / 2, 0],
            [length / 2, 0],
            [length / 2, height],
          ],
          width,
          palette.honey,
        ),
      );
    }
    const builders = {
      pit,
      camel,
      towers,
      dunes,
      stand,
      flood,
      archGate,
      chest,
      pencils,
      bed,
      desk,
      wardrobe,
      bookshelf,
      toyCorner,
      stool,
      grandstand,
      blockTunnel,
      tireStack,
      paperSign,
      bridgeDeck,
      rampElement,
      parkedCar: (o, s = {}) => parkedCar(o, s.colorId || "parked-car-red"),
      brick: (o, s = {}) =>
        brick(
          o,
          s.position || [0, 3, 0],
          s.size || [12, 6, 8],
          s.color || palette.honey,
          s.studs ?? 2,
        ),
      figure: (o, s = {}) =>
        figure(
          o,
          s.x || 0,
          s.y || 0,
          s.z || 0,
          s.color || palette.blue,
          s.index || 0,
        ),
      book: (o, s = {}) =>
        book(
          o,
          s.position || [0, 3, 0],
          s.size || [40, 6, 25],
          s.color || palette.red,
          s.angle || 0,
        ),
      sailCanopy: (o, s = {}) =>
        sail(o, s.width || 40, s.depth || 53, s.height || 49),
    };
    return Object.freeze({
      ...builders,
      parkedCar,
      types: Object.freeze(Object.keys(builders)),
      build(type, o, options = {}) {
        if (!builders[type]) throw Error(`Unbekanntes Umgebungsmodul: ${type}`);
        builders[type](o, options);
      },
      dispose() {
        sharedGeometry.forEach((g) => g.dispose());
        sharedGeometry.clear();
      },
    });
  }
  A.EnvironmentAssets3D = Object.freeze({ create });
})();
