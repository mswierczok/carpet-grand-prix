(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  const sizes = {
    woodTown: [125, 70, 65],
    brickTown: [125, 70, 65],
    bookLandscape: [114, 70, 78],
    stationery: [140, 62, 20],
    paperStand: [116, 66, 50],
    pillows: [104, 68, 22],
    blockMountains: [126, 74, 85],
    awningTown: [140, 74, 70],
    plants: [110, 90, 95],
    safari: [128, 76, 92],
    neonSkyline: [126, 70, 100],
    toyCrates: [116, 74, 66],
    futureCity: [146, 74, 90],
    rampPark: [138, 90, 40],
    plush: [100, 74, 82],
    trainViaduct: [190, 80, 90],
    technicalDesk: [146, 80, 65],
    stackedBridges: [128, 74, 95],
    grandstand: [140, 80, 60],
    sailStand: [180, 80, 60],
    threadTowers: [100, 80, 65],
    pit: [132, 72, 30],
  };
  const passageTypes = new Set([
    "woodBridge",
    "toyBridge",
    "plasticTube",
    "bedPassage",
    "dollhouse",
    "cushionTunnel",
  ]);
  function floorMap(materials, maps, config) {
    if (["carpet", "underbed", "living"].includes(config.area))
      return { map: maps.carpet, tile: 32 };
    if (config.area === "wood" || config.area === "desk")
      return { map: maps.laminate, tile: 150 };
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const c = canvas.getContext("2d");
    c.fillStyle = "#f3ead6";
    c.fillRect(0, 0, 512, 512);
    if (config.area === "bed") {
      c.strokeStyle = "#c9c4ba";
      c.lineWidth = 2;
      c.setLineDash([5, 5]);
      for (let i = 0; i <= 512; i += 128) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, 512);
        c.moveTo(0, i);
        c.lineTo(512, i);
        c.stroke();
      }
      c.setLineDash([]);
      if (config.id === "china")
        for (let x = 64; x < 512; x += 128)
          for (let y = 64; y < 512; y += 128) {
            c.fillStyle = ((x + y) / 128) % 2 ? "#d4b6a0" : "#b5c2b0";
            c.beginPath();
            c.moveTo(x, y - 37);
            c.lineTo(x + 37, y);
            c.lineTo(x, y + 37);
            c.lineTo(x - 37, y);
            c.closePath();
            c.fill();
          }
      for (let i = 12; i < 512; i += 16) {
        c.strokeStyle = "#ddd7c922";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, i);
        c.lineTo(512, i);
        c.stroke();
      }
    } else if (config.area === "mat") {
      c.strokeStyle = "#b7c3b2";
      c.lineWidth = 62;
      c.beginPath();
      c.moveTo(-50, 120);
      c.bezierCurveTo(170, 80, 220, 390, 560, 340);
      c.stroke();
      c.strokeStyle = "#f5edcf";
      c.lineWidth = 2;
      c.setLineDash([14, 18]);
      c.stroke();
      c.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const x = 40 + (i % 3) * 170,
          y = 40 + Math.floor(i / 3) * 300;
        c.fillStyle = i % 2 ? "#d1a58b" : "#a1b9bf";
        c.fillRect(x, y, 65, 46);
        c.fillStyle = "#f8efdb";
        c.fillRect(x + 8, y + 8, 15, 15);
        c.fillRect(x + 38, y + 8, 15, 15);
      }
    } else {
      c.strokeStyle = "#b3a48f";
      c.lineWidth = 5;
      for (const n of [0, 256, 512]) {
        c.beginPath();
        c.moveTo(n, 0);
        c.lineTo(n, 512);
        c.moveTo(0, n);
        c.lineTo(512, n);
        c.stroke();
      }
      c.strokeStyle = "#fff8e6";
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(i * 67, 30);
        c.lineTo(i * 67 + 37, 40);
        c.stroke();
      }
    }
    const map = materials.canvasTexture(canvas);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 1;
    return {
      map,
      tile: config.area === "mat" ? 220 : config.area === "bed" ? 180 : 160,
    };
  }
  function create(surface, materials) {
    const config = A.TrackEnvironments.scene(surface),
      group = new T.Group();
    group.name = `environment-${surface.id}`;
    const maps = A.IllustratedMaterials3D.create(materials, config.materials),
      kit = A.IllustratedKit3D.create(materials, maps),
      palette = {
        sand: config.floor,
        cream: "#fff3d2",
        paper: "#f3e5bf",
        red: "#ad5147",
        blue: config.accent,
        green: "#788c66",
        ink: "#443f37",
        honey: "#d5a86e",
        wood: "#b98255",
      },
      assets = A.CalendarAssets3D.create(palette, config.finishes),
      layout = A.EnvironmentLayout.create(surface, config),
      geometries = [],
      guards = [];
    function mesh(g, m, name) {
      geometries.push(g);
      const node = new T.Mesh(g, m);
      node.name = name;
      group.add(node);
      return node;
    }
    const floor = floorMap(materials, maps, config),
      coloredCarpet = ["carpet", "underbed", "living"].includes(config.area),
      floorTint = coloredCarpet
        ? new T.Color("#ffffff")
        : new T.Color(config.floor).lerp(
            new T.Color("#ffffff"),
            ["wood", "desk"].includes(config.area) ? 0.85 : 0,
          ),
      b = config.playBounds,
      cx = (b.minX + b.maxX) / 2,
      cz = (b.minY + b.maxY) / 2,
      width = b.maxX - b.minX,
      depth = b.maxY - b.minY;
    function uv(g) {
      const a = g.attributes.uv;
      for (let i = 0; i < a.count; i++)
        a.setXY(
          i,
          g.attributes.position.getX(i) / floor.tile,
          g.attributes.position.getZ(i) / floor.tile,
        );
      return g;
    }
    const ground = new T.PlaneGeometry(width, depth);
    ground.rotateX(-Math.PI / 2);
    ground.translate(cx, 0.005, cz);
    mesh(
      uv(ground),
      materials.basic(floorTint, { map: floor.map }),
      "theme-playing-surface",
    );
    const shoulder = A.Tracks3D.boundaryGeometry(surface);
    uv(shoulder);
    mesh(
      shoulder,
      materials.basic(floorTint.clone().multiplyScalar(0.66), {
        map: floor.map,
      }),
      "unchanged-offroad-corridor",
    );
    const road = A.Tracks3D.roadGeometry(surface, surface.roadRadius, 0.07);
    uv(road);
    mesh(
      road,
      materials.basic(floorTint, { map: floor.map }),
      "unchanged-road",
    );
    if (surface.bridge)
      mesh(
        A.Tracks3D.roadGeometry(surface, surface.outerRadius, -0.85),
        materials.basic(palette.wood, { side: T.DoubleSide }),
        "existing-bridge-underside",
      );
    const yarnMap = maps.rope;
    yarnMap.wrapS = T.RepeatWrapping;
    yarnMap.repeat.set(160, 1);
    const rope = materials.toon("#e5cf9f", yarnMap);
    const rails = surface.bridge
      ? surface.boundary.rails
      : surface.boundary.loops.map((points) => ({ points, closed: true }));
    for (const r of [...rails, ...surface.boundary.dividers])
      mesh(
        new T.TubeGeometry(
          A.Tracks3D.boundaryCurve(r.points, 0.77, !!r.closed),
          r.points.length - 1,
          surface.boundary.railRadius,
          5,
          !!r.closed,
        ),
        rope,
        "unchanged-rope",
      );
    const finish = surface.at(0),
      markings = kit.object("start-grid-and-sectors");
    for (let row = 0; row < 7; row++)
      for (const lane of [-6, 6]) {
        const at = surface.at(-22 - row * 16, lane);
        if (row === 6 && lane === 6) continue;
        for (const offset of [-4, 4])
          markings.flat(
            [
              at.x - Math.sin(at.ang) * offset,
              0.095,
              at.y + Math.cos(at.ang) * offset,
            ],
            [8, 0.55],
            palette.paper,
            at.ang,
          );
      }
    for (let i = 0; i < 16; i++) {
      const z =
        -surface.roadRadius + (i + 0.5) * ((2 * surface.roadRadius) / 16);
      for (const x of [-0.8, 0.8])
        markings.flat(
          [
            finish.x + Math.cos(finish.ang) * x - Math.sin(finish.ang) * z,
            0.11,
            finish.y + Math.sin(finish.ang) * x + Math.cos(finish.ang) * z,
          ],
          [1.6, (2 * surface.roadRadius) / 16],
          (i + Number(x > 0)) % 2 ? palette.ink : palette.paper,
          finish.ang,
        );
    }
    for (const cp of surface.checkpoints.slice(1))
      markings.flat(
        [cp.x, 0.1, cp.y],
        [0.7, surface.roadRadius * 2],
        palette.paper,
        cp.ang,
      );
    group.add(markings.finish());
    let room = null,
      roomKit = null;
    const roomCamera = { position: { x: 0, y: 0, z: 0 } };
    if (config.area !== "terrace") {
      if (config.platformHeight)
        roomKit = A.IllustratedKit3D.create(materials, maps);
      room = A.MasterBedroom3D.create(roomKit || kit, assets, config);
      if (roomKit) room.group.add(roomKit.finishShadows());
      if (!["carpet", "living", "underbed"].includes(config.area)) {
        room.group.getObjectByName("master-rug").visible = false;
        room.group.getObjectByName("stitched-rug-border").visible = false;
      }
      room.group.position.y = -config.platformHeight;
      group.add(room.group);
    } else buildTerrace();
    function buildTerrace() {
      const o = kit.object("terrace-room"),
        r = config.room.bounds,
        w = r.maxX - r.minX,
        d = r.maxY - r.minY,
        c = (r.minX + r.maxX) / 2,
        z = (r.minY + r.maxY) / 2;
      o.block([c, -7, z], [w, 12, d], config.floor);
      o.block(
        [c, 200, r.minY],
        [w, 400, 12],
        config.finishes.wall,
        [0, 0, 0],
        "plain",
        0.16,
      );
      for (const x of [c - 130, c + 130]) {
        o.block([x, 135, r.minY + 8], [220, 260, 5], palette.honey);
        o.block(
          [x, 140, r.minY + 12],
          [201, 235, 1],
          "#b5cbd0",
          [0, 0, 0],
          "light",
          0,
        );
        for (const y of [40, 140, 240])
          o.block([x, y, r.minY + 14], [205, 4, 4], palette.paper);
      }
      for (const x of [r.minX, r.maxX]) {
        for (const y of [12, 70]) o.block([x, y, z], [5, 5, d], palette.wood);
        for (let a = r.minY; a <= r.maxY; a += 80)
          o.block([x, 38, a], [4, 76, 4], palette.wood);
      }
      for (const y of [12, 70])
        o.block([c, y, r.maxY], [w, 5, 5], palette.wood);
      for (let x = r.minX; x <= r.maxX; x += 80)
        o.block([x, 38, r.maxY], [4, 76, 4], palette.wood);
      group.add(o.finish());
    }
    if (config.platformHeight) {
      const o = kit.object(`${config.area}-platform`),
        height = config.platformHeight;
      o.block(
        [cx, -5, cz],
        [width, 9, depth],
        config.area === "bed" ? palette.paper : palette.honey,
        [0, 0, 0],
        config.area === "bed" ? "cloth" : "wood",
      );
      for (const x of [b.minX + 25, b.maxX - 25])
        for (const z of [b.minY + 25, b.maxY - 25])
          o.block([x, -height / 2, z], [20, height - 7, 20], palette.wood);
      if (config.area === "bed") {
        for (const z of [b.minY + 6, b.maxY - 6])
          o.block([cx, -18, z], [width, 27, 8], palette.honey);
        o.block([cx, 18, b.minY + 5], [width, 65, 9], palette.honey);
        for (let x = b.minX + 30; x < b.maxX; x += 30)
          o.flat([x, 0.012, b.maxY - 12], [14, 1], palette.paper);
      } else
        for (const x of [b.minX, b.maxX])
          o.block([x, -10, cz], [5, 18, depth], palette.wood);
      group.add(o.finish());
    }
    function place(type, id, u, side) {
      const [w, d, h] = sizes[type];
      return layout.place(id, type, w, d, h, u, side);
    }
    if (passageTypes.has(config.signature))
      layout.passage(
        config.signature,
        config.signature === "bedPassage" ? 0.53 : 0.27,
      );
    else place(config.signature, "signature-landmark", 0.25, -1);
    if (config.signature === "futureCity") layout.passage("futureTunnel", 0.45);
    place(config.supporting, "supporting-landmark-1", 0.55, 1);
    place(config.supporting, "supporting-landmark-2", 0.79, -1);
    place("pit", "toy-pit-garages", 0.96, -1);
    if (["bed", "desk"].includes(config.area))
      place(
        config.area === "desk" ? "stationery" : "pillows",
        "surface-scale-cue",
        0.1,
        1,
      );
    for (const s of [...layout.objects, ...layout.passages]) {
      const o = kit.object(s.id, s.at);
      assets.build(s.asset, o, s);
      const node = o.finish();
      group.add(node);
      guards.push({ spec: s, node });
    }
    // Follow the already elevated driving decks in Korea/Russia. Posts are
    // checked against every road arm; the car/bridge elevations remain untouched.
    if (surface.bridge)
      for (const [i, spec] of surface.bridge.specs.entries()) {
        const o = kit.object(`existing-bridge-trestles-${i}`);
        for (const end of [-1, 1])
          for (const side of [-1, 1]) {
            const at = surface.at(
              spec.center + end * Math.max(8, spec.plateau - 5),
              side * (surface.outerRadius + 12),
            );
            if (layout.clearance(at, 6, 6) < 5) continue;
            o.block(
              [at.x, spec.height / 2 - 1, at.y],
              [6, spec.height - 2, 6],
              palette.wood,
            );
            for (const y of [spec.height * 0.3, spec.height * 0.65])
              o.block([at.x, y, at.y], [9, 3, 9], palette.honey);
          }
        group.add(o.finish());
      }
    group.add(kit.finishShadows());
    function overview(aspect, fov = 55) {
      if (room) {
        const pose = room.overview(aspect, fov);
        pose.position.y -= config.platformHeight;
        pose.target.y -= config.platformHeight;
        return pose;
      }
      const r = config.room.bounds,
        w = r.maxX - r.minX,
        d = r.maxY - r.minY,
        span = Math.max(w / Math.max(0.3, aspect), d) + 150;
      return {
        position: { x: cx, y: span * 1.14, z: cz + span * 0.24 },
        target: { x: cx, y: 50, z: cz },
      };
    }
    return Object.freeze({
      group,
      layout,
      config,
      overview,
      update(camera, pose, over, snapshot) {
        // Furniture bounds are relative to the room floor, which lies below
        // the playing surface on the desk/bed variants. Never move the camera.
        roomCamera.position.x = camera.position.x;
        roomCamera.position.y = camera.position.y + config.platformHeight;
        roomCamera.position.z = camera.position.z;
        room?.update(roomCamera, over);
        A.IllustratedKit3D.updateVisibility(guards, camera, over);
      },
      diagnostics() {
        return {
          theme: config.id,
          place: config.place,
          area: config.area,
          room: room?.diagnostics() || { id: "terrace" },
          assets: layout.objects.length,
          passages: layout.passages.map((s) => ({
            type: s.asset,
            s: s.s,
            clearHeight: s.clearHeight,
            halfWidth: s.halfWidth,
          })),
          hiddenForCamera: guards.filter((g) => !g.node.visible).length,
        };
      },
      dispose() {
        geometries.forEach((g) => g.dispose());
        kit.dispose();
        roomKit?.dispose();
        assets.dispose();
      },
    });
  }
  A.CalendarWorld3D = Object.freeze({ create, sizes: Object.freeze(sizes) });
})();
