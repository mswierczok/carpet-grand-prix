(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(palette, finishes) {
    const base = A.EnvironmentAssets3D.create(palette, finishes);
    const p = palette;
    function prism(o, at, w, h, d, color, rotation = [0, 0, 0]) {
      const v = [
          [-w / 2, 0, -d / 2],
          [w / 2, 0, -d / 2],
          [0, h, -d / 2],
          [-w / 2, 0, d / 2],
          [w / 2, 0, d / 2],
          [0, h, d / 2],
        ],
        pos = [];
      for (const f of [
        [0, 2, 1],
        [3, 4, 5],
        [0, 1, 4],
        [0, 4, 3],
        [1, 2, 5],
        [1, 5, 4],
        [2, 0, 3],
        [2, 3, 5],
      ])
        for (const i of f) pos.push(...v[i]);
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      const uv = [];
      for (let i = 0; i < pos.length; i += 3)
        uv.push(pos[i] / 32 + pos[i + 2] / 64, pos[i + 1] / 32);
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      o.part(g, color, at, [1, 1, 1], rotation, "wood", 0.15);
      g.dispose();
    }
    function house(o, x, z, color, index = 0) {
      const h = 25 + (index % 3) * 7;
      o.block([x, h / 2, z], [26, h, 27], color);
      prism(o, [x, h, z], 33, 17, 32, index % 2 ? p.red : p.honey);
      o.block([x, h * 0.25, z + 13.7], [7, h * 0.5, 1.2], p.wood);
      for (const s of [-1, 1]) {
        o.block(
          [x + s * 8, h * 0.7, z + 14],
          [6, 7, 0.8],
          p.cream,
          [0, 0, 0],
          "plain",
          0.07,
        );
        o.block(
          [x + s * 8, h * 0.7, z + 14.5],
          [0.5, 7, 0.3],
          p.blue,
          [0, 0, 0],
          "plain",
          0,
        );
      }
      base.brick(o, {
        position: [x, 2, z - 8],
        size: [28, 4, 23],
        color,
        studs: 3,
      });
    }
    function woodTown(o) {
      for (let i = 0; i < 3; i++)
        house(o, (i - 1) * 39, (i % 2) * 9, p[i % 2 ? "red" : "blue"], i);
      o.shadow([0, 5], [128, 65]);
    }
    function bookLandscape(o) {
      for (let i = 0; i < 3; i++)
        base.book(o, {
          position: [-20, 4 + i * 7, 0],
          size: [68 - i * 4, 7, 47],
          color: [p.red, p.blue, p.green][i],
          angle: (i - 1) * 0.08,
        });
      o.withTransform([34, 35, -6], [1, 1, 1], [0, 0, Math.PI / 2 - 0.08], () =>
        base.book(o, {
          position: [0, 0, 0],
          size: [66, 12, 43],
          color: p.blue,
        }),
      );
      o.block([-30, 26, 10], [21, 1, 27], p.paper, [0, 0.17, 0], "plain");
      for (let i = 0; i < 5; i++)
        o.flat([-30, 26.7, 2 + i * 3], [15, 0.35], p.blue, 0.17);
      o.shadow([0, 0], [110, 68]);
    }
    function stationery(o) {
      o.block([0, 1, 0], [124, 2, 20], p.honey);
      for (let i = 0; i < 25; i++)
        o.flat([-58 + i * 4.8, 2.05, -6], [0.6, i % 5 ? 4 : 9], p.ink);
      for (const [i, z] of [-16, 19].entries()) {
        o.cylinder([0, 3, z], [2.2, 2.2], 106, i ? p.red : p.blue, [
          0,
          0,
          Math.PI / 2,
        ]);
        o.cylinder([-57, 3, z], [0, 2.2], 8, p.honey, [0, 0, Math.PI / 2]);
        o.cylinder([55, 3, z], [2.3, 2.3], 8, p.paper, [0, 0, Math.PI / 2]);
      }
      o.block([26, 4, 5], [25, 1, 25], p.paper, [0, 0.1, 0], "plain");
    }
    function pillows(o) {
      for (let i = 0; i < 2; i++) {
        const x = (i - 0.5) * 44,
          z = i ? 10 : -9,
          c = i ? finishes.bedding : p.paper;
        o.ball([x, 8, z], [27, 8, 22], c, "cloth", [0, (i - 0.5) * 0.2, 0.04]);
        for (let j = 0; j < 7; j++)
          o.block(
            [x - 18 + j * 6, 11, z + 17],
            [2, 0.4, 0.5],
            p.cream,
            [0, 0, 0.05],
            "cloth",
            0,
          );
      }
      o.shadow([0, 0], [100, 65]);
    }
    function paperStand(o) {
      for (let i = 0; i < 4; i++)
        o.block(
          [0, 2 + i * 3, 15 - i * 10],
          [103, 4 + i * 3, 10],
          i % 2 ? p.paper : p.blue,
          [0, 0, 0],
          "plain",
        );
      for (let i = 0; i < 7; i++)
        for (const side of [-1, 1])
          base.figure(o, {
            x: -42 + i * 14,
            y: side < 0 ? 12 : 20,
            z: side < 0 ? 12 : -8,
            color: i % 2 ? p.red : p.blue,
            index: i,
          });
      for (const x of [-49, 49]) o.block([x, 26, 0], [2, 50, 2], p.honey);
      o.block([0, 43, 0], [109, 1.5, 57], p.paper, [0.1, 0, 0], "cloth");
      o.shadow([0, 0], [110, 64]);
    }
    function blockMountains(o) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 34,
          h = [39, 62, 46][i];
        o.block([x, 5, i % 2 ? 0 : 12], [33, 10, 38], p.wood);
        prism(o, [x, 10, i % 2 ? 0 : 12], 43, h, 32, i % 2 ? p.blue : p.honey);
        prism(
          o,
          [x, 10 + h * 0.65, i % 2 ? 0 : 12],
          43 * 0.35,
          h * 0.35 + 0.2,
          32.5,
          p.paper,
        );
      }
      o.shadow([0, 4], [122, 68]);
    }
    function awningTown(o) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 42;
        house(o, x, -7, [p.paper, p.blue, p.red][i], i);
        for (let n = 0; n < 4; n++)
          o.block(
            [x - 12 + n * 8, 23, 16],
            [8, 1, 24],
            n % 2 ? p.paper : finishes.bedding,
            [-0.15, 0, 0],
            "cloth",
            0.05,
          );
        for (const s of [-1, 1])
          o.cylinder([x + s * 14, 11, 25], [0.6, 0.6], 22, p.wood);
      }
    }
    function plants(o) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 26,
          z = i % 2 ? 14 : -8,
          h = [24, 42, 30][i];
        o.cylinder([x, 10, z], [12, 8], 20, i % 2 ? p.red : p.wood);
        o.cylinder([x, 20, z], [12, 12], 2, p.honey);
        o.cylinder([x, 20 + h / 2, z], [1.1, 1.6], h, p.green);
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3;
          o.ball(
            [x + Math.cos(a) * 11, 29 + h * 0.5 + j * 3, z + Math.sin(a) * 11],
            [12, 3.5, 5],
            j % 2 ? p.green : "#8ea57a",
            "cloth",
            [0, -a, 0.3],
          );
        }
      }
      o.shadow([0, 0], [90, 76]);
    }
    function plush(o) {
      o.ball([0, 24, 0], [28, 25, 21], p.honey);
      o.ball([0, 55, 2], [22, 19, 18], p.honey);
      for (const s of [-1, 1]) {
        o.ball([s * 17, 71, 0], [8, 9, 5], p.honey);
        o.ball([s * 22, 22, 6], [10, 15, 9], p.honey, "cloth", [0, 0, s * 0.4]);
        o.ball([s * 13, 5, 12], [13, 6, 12], p.honey);
        o.ball([s * 8, 59, 18], [2, 2, 1.2], p.ink, "plain");
      }
      o.ball([0, 48, 19], [11, 8, 4], p.paper);
      o.ball([0, 52, 23], [4, 2.5, 2], p.ink, "plain");
      for (let i = 0; i < 8; i++)
        o.block(
          [0, 12 + i * 4, 22],
          [1, 1, 0.5],
          p.wood,
          [0, 0, 0.3],
          "cloth",
          0,
        );
      o.shadow([0, 0], [72, 60]);
    }
    function safari(o) {
      for (const x of [-32, -15])
        for (const z of [-8, 9]) o.cylinder([x, 15, z], [2, 2], 30, p.honey);
      o.ball([-25, 34, 0], [22, 12, 15], p.honey, "wood");
      o.cylinder([-9, 53, 0], [4, 6], 41, p.honey, [0, 0, -0.15]);
      o.ball([-5, 75, 4], [11, 6, 7], p.honey, "wood");
      for (const s of [-1, 1]) {
        o.cylinder([-7 + s * 4, 83, 0], [0.7, 1], 7, p.wood);
        o.ball([-1, 77, 4 + s * 5], [1.2, 1.2, 1.2], p.ink, "plain");
      }
      for (let i = 0; i < 7; i++)
        o.block(
          [-34 + i * 4, 39, (i % 2 ? 1 : -1) * 12],
          [3, 4, 1],
          p.wood,
          [0, 0.1, 0],
          "plain",
          0,
        );
      o.withTransform([33, 0, 7], [1.6, 1.6, 1.6], [0, 0, 0], () =>
        base.parkedCar(o, "parked-car-green"),
      );
      o.shadow([0, 0], [120, 69]);
    }
    function neonSkyline(o) {
      for (let i = 0; i < 4; i++) {
        const x = -45 + i * 30,
          h = 37 + (i % 3) * 24;
        o.block([x, h / 2, 0], [24, h, 32], i % 2 ? p.blue : "#53616f");
        for (let y = 8; y < h - 5; y += 12)
          for (const a of [-6, 6])
            o.block(
              [x + a, y, 16.4],
              [4, 5, 0.5],
              (i + y) % 3 ? p.paper : p.red,
              [0, 0, 0],
              "light",
              0,
            );
        o.block([x, h + 2, 0], [27, 3, 35], p.cream);
      }
      o.label(0, [0, 31, 18], [66, 15]);
      o.shadow([0, 0], [124, 67]);
    }
    function toyCrates(o) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 33,
          h = 18 + i * 10,
          z = i % 2 ? 7 : 0;
        o.block([x, h / 2, z], [31, h, 43], [p.red, p.blue, p.green][i % 3]);
        for (const y of [4, h - 3])
          o.block([x, y, z + 22], [32, 3, 2], p.honey);
        o.block([x, h / 2, z + 22.5], [13, 4, 1], p.ink);
        base.brick(o, {
          position: [x - 5, h + 3, z - 4],
          size: [18, 6, 13],
          color: p.honey,
          studs: 2,
        });
      }
      o.shadow([0, 0], [112, 68]);
    }
    function futureCity(o) {
      for (let i = 0; i < 4; i++) {
        const x = -48 + i * 32,
          h = [38, 65, 48, 75][i];
        o.block([x, h / 2, -7], [25, h, 30], i % 2 ? p.blue : p.paper);
        o.block([x, h + 2, -7], [29, 4, 35], p.red);
        for (let y = 10; y < h; y += 13)
          o.block([x, y, 8.5], [17, 3, 0.8], p.blue, [0, 0, 0], "light", 0);
      }
      o.block([0, 3, 23], [132, 3, 17], p.cream);
      o.shadow([0, 0], [142, 70]);
    }
    function rampPark(o) {
      for (const s of [-1, 1])
        o.withTransform([s * 34, 0, 0], [1, 1, 1], [0, s * 0.3, 0], () =>
          base.rampElement(o, { length: 46, width: 35, height: 17 }),
        );
      o.withTransform([0, 1, 14], [1.3, 1.3, 1.3], [0, 0, 0], () =>
        base.parkedCar(o, "parked-car-red"),
      );
      base.brick(o, {
        position: [0, 6, -21],
        size: [23, 12, 18],
        color: p.blue,
        studs: 3,
      });
    }
    function sofa(o) {
      o.block([0, 28, 0], [282, 48, 104], finishes.bedding, [0, 0, 0], "cloth");
      o.block(
        [0, 80, -38],
        [284, 75, 24],
        finishes.bedding,
        [0, 0, 0],
        "cloth",
      );
      for (const x of [-140, 140])
        o.block(
          [x, 64, 0],
          [25, 78, 112],
          finishes.bedding,
          [0, 0, 0],
          "cloth",
        );
      for (let i = 0; i < 3; i++)
        o.ball([-88 + i * 88, 55, 8], [44, 11, 42], p.paper, "cloth");
      for (const x of [-116, 116])
        for (const z of [-35, 35]) o.block([x, 8, z], [12, 16, 12], p.wood);
    }
    function tube(o, s) {
      const half = s.halfWidth,
        depth = s.depth,
        pos = [],
        segments = 20,
        thickness = 3;
      const vertex = (x, a, outer) => [
        x,
        22 + Math.sin(a) * (40 + (outer ? thickness : 0)),
        Math.cos(a) * (half + (outer ? thickness : 0)),
      ];
      const tri = (a, b, c) => pos.push(...a, ...b, ...c);
      for (let i = 0; i < segments; i++) {
        const a = (i * Math.PI) / segments,
          b = ((i + 1) * Math.PI) / segments;
        for (const outside of [false, true]) {
          const v = [
            vertex(-depth / 2, a, outside),
            vertex(depth / 2, a, outside),
            vertex(depth / 2, b, outside),
            vertex(-depth / 2, b, outside),
          ];
          if (outside) {
            tri(v[0], v[1], v[2]);
            tri(v[0], v[2], v[3]);
          } else {
            tri(v[0], v[2], v[1]);
            tri(v[0], v[3], v[2]);
          }
        }
        for (const x of [-depth / 2, depth / 2]) {
          const v = [
            vertex(x, a, false),
            vertex(x, b, false),
            vertex(x, b, true),
            vertex(x, a, true),
          ];
          if (x > 0) {
            tri(v[0], v[1], v[2]);
            tri(v[0], v[2], v[3]);
          } else {
            tri(v[0], v[2], v[1]);
            tri(v[0], v[3], v[2]);
          }
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      o.part(
        g,
        s.asset === "futureTunnel" ? p.blue : finishes.bedding,
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
        "plain",
        0.18,
      );
      g.dispose();
      for (const z of [-half, half])
        o.block(
          [0, 11, z],
          [depth, 22, 6],
          finishes.bedding,
          [0, 0, 0],
          "plain",
        );
      for (const x of [-depth / 2, depth / 2])
        for (const z of [-half, half])
          o.block([x, 24, z], [3, 8, 9], p.paper, [0, 0, 0], "plain");
    }
    function passage(o, s) {
      const half = s.halfWidth,
        len = s.depth,
        c = s.asset === "cushionTunnel" ? finishes.bedding : p.wood;
      if (["plasticTube", "futureTunnel"].includes(s.asset)) {
        tube(o, s);
        return;
      }
      for (const z of [-half - 3.5, half + 3.5]) {
        if (s.asset === "cushionTunnel")
          o.ball([0, 22, z], [len / 2, 22, 5], c, "cloth");
        else
          for (const x of [-len / 2 + 4, len / 2 - 4]) {
            for (let level = 0; level < 4; level++)
              o.block(
                [x, 6 + level * 11, z],
                [8, 11, 7],
                level % 2 ? p.honey : p.wood,
              );
          }
      }
      if (s.asset === "cushionTunnel") {
        o.ball([0, 56, 0], [len / 2 + 3, 12, half + 7], p.paper, "cloth");
        for (const z of [-half, half])
          for (let i = 0; i < 7; i++)
            o.block(
              [-len / 2 + 4 + (i * (len - 8)) / 6, 59, z],
              [2, 0.6, 1],
              p.wood,
              [0, 0, 0],
              "cloth",
              0,
            );
      } else if (s.asset === "bedPassage") {
        o.block([0, 48, 0], [len + 12, 8, half * 2 + 14], p.honey);
        o.block(
          [0, 57, 0],
          [len + 10, 10, half * 2 + 12],
          p.paper,
          [0, 0, 0],
          "cloth",
        );
        o.block(
          [8, 63, 0],
          [len - 18, 3, half * 2 + 12],
          finishes.bedding,
          [0, 0, 0],
          "cloth",
        );
        o.ball([-len / 2 + 23, 67, 0], [19, 7, half - 6], p.paper, "cloth");
        o.block([-len / 2 - 4, 64, 0], [7, 40, half * 2 + 18], p.honey);
      } else if (s.asset === "dollhouse") {
        for (const z of [-half - 3.5, half + 3.5]) {
          o.block([0, 28, z], [len, 55, 7], p.paper);
          for (const x of [-len / 3, len / 3])
            o.block([x, 30, z + (z > 0 ? 4 : -4)], [13, 17, 1], p.blue);
        }
        o.block([0, 47, 0], [len + 8, 8, half * 2 + 14], p.paper);
        prism(o, [0, 51, 0], half * 2 + 30, 38, len + 14, p.red, [
          0,
          Math.PI / 2,
          0,
        ]);
        for (const x of [-len / 2 - 1, len / 2 + 1])
          o.block([x, 54, 0], [3, 5, half * 2 + 14], p.honey);
      } else {
        o.block([0, 47, 0], [len + 10, 9, half * 2 + 16], p.honey);
        for (let i = 0; i < 9; i++)
          o.block(
            [0, 52, -half + (2 * half * i) / 8],
            [len + 12, 1, 1],
            p.wood,
          );
        for (const x of [-len / 2 + 2, len / 2 - 2])
          o.block([x, 57, 0], [3, 8, half * 2 + 18], p.red);
        if (s.asset === "toyBridge")
          for (const z of [-half - 2, half + 2])
            prism(o, [0, 62, z], len + 12, 16, 5, p.red);
      }
      // A soft shadow is visual only; it does not turn the road into off-road.
      o.shadow([0, 0], [len + 5, half * 2], 0, 0.11);
    }
    function train(o, y, half = 50) {
      for (const x of [-7, 7])
        o.block([x, y, 0], [1.5, 1, half * 2 + 10], p.ink);
      for (let i = 0; i < 13; i++)
        o.block(
          [0, y - 0.8, -half + (i * (half * 2)) / 12],
          [24, 2, 3],
          p.wood,
        );
      for (let i = 0; i < 5; i++) {
        const z = (i - 2) * 29;
        if (i === 0) {
          o.block([0, y + 5, z], [18, 6, 25], p.red);
          o.cylinder([0, y + 12, z - 5], [6, 6], 18, p.red, [
            Math.PI / 2,
            0,
            0,
          ]);
          o.cylinder([0, y + 22, z - 10], [2.5, 3.5], 9, p.ink);
          o.block([0, y + 13, z + 8], [18, 17, 10], p.blue);
          o.block([0, y + 23, z + 8], [21, 3, 13], p.honey);
          o.cylinder(
            [0, y + 12, z - 14.5],
            [2, 2],
            1,
            p.paper,
            [Math.PI / 2, 0, 0],
            "light",
            0,
          );
        } else {
          o.block(
            [0, y + 10, z],
            [18, 15, 25],
            [p.red, p.blue, p.green][i % 3],
          );
          o.block([0, y + 19, z], [21, 3, 26], p.honey);
        }
        for (const x of [-10, 10])
          for (const dz of [-7, 7])
            o.cylinder(
              [x, y + 4, z + dz],
              [3, 3],
              2,
              p.ink,
              [0, 0, Math.PI / 2],
              "plain",
              0.05,
            );
        o.block([-9.3, y + 12, z + (i ? 0 : 8)], [0.5, 6, 9], p.paper);
      }
    }
    function trainViaduct(o) {
      o.withTransform([0, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0], () => {
        for (const z of [-75, -25, 25, 75])
          for (const x of [-13, 13]) {
            for (let level = 0; level < 3; level++)
              o.block(
                [x, 6 + level * 11, z],
                [9, 11, 9],
                level % 2 ? p.honey : p.wood,
              );
          }
        for (const z of [-50, 0, 50]) {
          o.block([0, 37, z], [36, 7, 49], z === 0 ? p.honey : p.red);
          for (const x of [-15, 15])
            o.block([x, 24, z], [3, 18, 48], p.honey, [0.27, 0, 0]);
        }
        train(o, 43, 75);
      });
      o.shadow([0, 0], [186, 68]);
    }
    function stackedBridges(o) {
      for (let level = 0; level < 3; level++) {
        const y = 13 + level * 20;
        o.block([0, y, 0], [116, 7, 47], level % 2 ? p.red : p.honey);
        for (const x of [-48, 48])
          for (const z of [-18, 18]) o.block([x, y - 9, z], [8, 13, 8], p.wood);
        for (let i = 0; i < 5; i++)
          o.block([-45 + i * 23, y + 5, 20], [16, 2, 3], p.paper);
      }
      o.withTransform([10, 66, 0], [1.2, 1.2, 1.2], [0, 0, 0], () =>
        base.parkedCar(o, "parked-car-blue"),
      );
      o.shadow([0, 0], [120, 67]);
    }
    const builders = {
      woodTown,
      brickTown: woodTown,
      bookLandscape,
      stationery,
      pillows,
      paperStand,
      blockMountains,
      awningTown,
      plants,
      plush,
      safari,
      neonSkyline,
      toyCrates,
      futureCity,
      rampPark,
      sofa,
      stackedBridges,
      technicalDesk(o) {
        o.withTransform([-30, 0, -10], [0.6, 0.6, 0.6], [0, 0, 0], () =>
          bookLandscape(o),
        );
        o.withTransform([30, 0, 10], [0.65, 0.65, 0.65], [0, 0, 0], () =>
          base.pit(o),
        );
      },
      grandstand: (o) => base.grandstand(o, { bays: 3 }),
      sailStand: (o) => base.grandstand(o, { bays: 4 }),
      threadTowers: base.towers,
      woodBridge: passage,
      toyBridge: passage,
      plasticTube: passage,
      futureTunnel: passage,
      cushionTunnel: passage,
      bedPassage: passage,
      dollhouse: passage,
      trainViaduct,
    };
    return Object.freeze({
      build(type, o, s = {}) {
        if (builders[type]) builders[type](o, s);
        else base.build(type, o, s);
      },
      types: Object.freeze([...base.types, ...Object.keys(builders)]),
      dispose() {
        base.dispose();
      },
    });
  }
  A.CalendarAssets3D = Object.freeze({ create });
})();
