(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(kit, assets, config) {
    const group = new T.Group();
    group.name = "master-bedroom";
    const b = config.room.bounds,
      f = config.finishes,
      w = config.room.window,
      width = b.maxX - b.minX,
      depth = b.maxY - b.minY,
      cx = (b.minX + b.maxX) / 2,
      cz = (b.minY + b.maxY) / 2;
    const furniture = [];
    for (const spec of config.room.furniture) {
      const object = kit.object(spec.id, spec.at);
      if (spec.scale)
        object.withTransform([0, 0, 0], spec.scale, [0, 0, 0], () =>
          assets.build(spec.asset, object, spec),
        );
      else assets.build(spec.asset, object, spec);
      const node = object.finish();
      group.add(node);
      furniture.push({ spec, node });
    }
    const bed = config.room.furniture.find((f) => f.asset === "bed"),
      underbed = kit.object("underbed-soft-shade", bed.at);
    underbed.shadow([0, 0], [181, 390], 0, 0.105);
    group.add(underbed.finish());
    const carpet = config.room.rug,
      carpetObject = kit.object("master-rug"),
      rugGeo = new T.PlaneGeometry(carpet.w, carpet.d, 16, 16);
    rugGeo.rotateX(-Math.PI / 2);
    rugGeo.translate(carpet.x, 0, carpet.y);
    const cp = rugGeo.attributes.position,
      cu = rugGeo.attributes.uv,
      colors = [];
    for (let i = 0; i < cp.count; i++) {
      cu.setXY(i, cp.getX(i) / 32, cp.getZ(i) / 32);
      const shade =
        0.965 +
        0.03 * Math.sin(cp.getX(i) * 0.017) * Math.cos(cp.getZ(i) * 0.014);
      colors.push(shade, shade, shade);
    }
    rugGeo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    carpetObject.part(
      rugGeo,
      "#ffffff",
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      "carpet",
      0,
    );
    rugGeo.dispose();
    const rugGroup = carpetObject.finish();
    rugGroup.children[0].name = "looped-carpet";
    group.add(rugGroup);
    const floor = kit.object("master-laminate-floor");
    const g = new T.PlaneGeometry(width, depth);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, -0.12, cz);
    for (let i = 0; i < g.attributes.uv.count; i++)
      g.attributes.uv.setXY(
        i,
        g.attributes.position.getX(i) / 150,
        g.attributes.position.getZ(i) / 150,
      );
    floor.part(g, f.floor, [0, 0, 0], [1, 1, 1], [0, 0, 0], "laminate", 0);
    g.dispose();
    group.add(floor.finish());
    const north = kit.object("master-window-wall"),
      sash = w.x - w.w / 2,
      right = w.x + w.w / 2;
    // The north wall has a genuine opening; no opaque wall hides the window.
    north.block(
      [(b.minX + sash) / 2, b.height / 2, b.minY],
      [sash - b.minX, b.height, 10],
      f.wall,
      [0, 0, 0],
      "plain",
      0.16,
    );
    north.block(
      [(right + b.maxX) / 2, b.height / 2, b.minY],
      [b.maxX - right, b.height, 10],
      f.wall,
      [0, 0, 0],
      "plain",
      0.16,
    );
    north.block(
      [w.x, w.bottom / 2, b.minY],
      [w.w, w.bottom, 10],
      f.wall,
      [0, 0, 0],
      "plain",
      0.16,
    );
    north.block(
      [w.x, (w.bottom + w.h + b.height) / 2, b.minY],
      [w.w, b.height - w.bottom - w.h, 10],
      f.wall,
      [0, 0, 0],
      "plain",
      0.16,
    );
    north.block(
      [cx, 74, b.minY + 5.3],
      [width, 144, 1],
      f.dado,
      [0, 0, 0],
      "plain",
      0,
    );
    north.block([cx, 9, b.minY + 7], [width, 18, 5], f.trim);
    north.block([cx, 150, b.minY + 7], [width, 6, 4], f.trim);
    north.block([cx, b.height - 12, b.minY + 6], [width, 9, 5], f.trim);
    // A simple illustrated exterior, framed like a paper theatre behind the glass.
    north.block(
      [w.x, w.bottom + w.h / 2, b.minY - 7],
      [w.w, w.h, 1],
      "#b7d0d1",
      [0, 0, 0],
      "light",
      0,
    );
    north.block(
      [w.x, w.bottom + 23, b.minY - 5],
      [w.w, 46, 1],
      "#98ad8b",
      [0, 0, 0],
      "plain",
      0,
    );
    north.cylinder(
      [w.x - 63, w.bottom + w.h - 43, b.minY - 4],
      [23, 23],
      0.6,
      "#ffe5a5",
      [Math.PI / 2, 0, 0],
      "light",
      0,
    );
    for (const [x, y] of [
      [w.x - 120, 350],
      [w.x + 35, 380],
      [w.x + 90, 335],
    ])
      north.ball(
        [x, y, b.minY - 4],
        [30, 7, 0.8],
        "#f7edcf",
        "light",
        [0, 0, 0],
        0,
      );
    for (const x of [sash, right, w.x])
      north.block(
        [x, w.bottom + w.h / 2, b.minY + 2],
        [7, w.h + 12, 11],
        f.trim,
      );
    for (const y of [w.bottom, w.bottom + w.h, w.bottom + w.h / 2])
      north.block([w.x, y, b.minY + 2], [w.w + 15, 7, 11], f.trim);
    north.block(
      [w.x, w.bottom - 4, b.minY + 9],
      [w.w + 32, 8, 31],
      paletteWood(),
    );
    for (const side of [-1, 1]) {
      const x = w.x + side * (w.w / 2 - 12);
      for (let i = 0; i < 4; i++)
        north.block(
          [x + side * i * 10, w.bottom + w.h / 2, b.minY + 12 + (i % 2) * 5],
          [12, w.h + 24, 5],
          i % 2 ? "#668593" : f.bedding,
          [0, 0, side * 0.015],
          "cloth",
          0.08,
        );
      north.block(
        [x + side * 15, w.bottom + 55, b.minY + 18],
        [48, 8, 7],
        f.beddingAccent,
        [0, 0, 0],
        "cloth",
        0.08,
      );
    }
    north.cylinder(
      [w.x, w.bottom + w.h + 19, b.minY + 16],
      [2, 2],
      w.w + 40,
      f.trim,
      [0, 0, Math.PI / 2],
      "wood",
      0.08,
    );
    group.add(north.finish());
    const cutaways = [];
    for (const side of ["west", "east", "south"]) {
      const o = kit.object(`master-${side}-wall`),
        vertical = side !== "south",
        x = side === "west" ? b.minX : side === "east" ? b.maxX : cx,
        z = vertical ? cz : b.maxY,
        span = vertical ? depth : width;
      o.block(
        [x, b.height / 2, z],
        vertical ? [10, b.height, span] : [span, b.height, 10],
        f.wall,
        [0, 0, 0],
        "plain",
        0.15,
      );
      o.block(
        [x, 74, z],
        vertical ? [11, 144, span] : [span, 144, 11],
        f.dado,
        [0, 0, 0],
        "plain",
        0,
      );
      o.block([x, 9, z], vertical ? [15, 18, span] : [span, 18, 15], f.trim);
      o.block([x, 150, z], vertical ? [14, 6, span] : [span, 6, 14], f.trim);
      o.block(
        [x, b.height - 12, z],
        vertical ? [14, 9, span] : [span, 9, 14],
        f.trim,
      );
      const node = o.finish();
      group.add(node);
      if (side !== "west") cutaways.push(node);
    }
    const ceiling = kit.object("master-ceiling");
    ceiling.block(
      [cx, b.height + 3, cz],
      [width, 5, depth],
      "#f3e6cb",
      [0, 0, 0],
      "light",
      0,
    );
    const roof = ceiling.finish();
    group.add(roof);
    const art = kit.object("bedroom-motorsport-posters");
    for (const [i, x] of [125, 410, 690].entries()) {
      art.block(
        [x, 315, b.minY + 6],
        [134, 122, 1],
        f.trim,
        [0, 0, 0],
        "plain",
        0.3,
      );
      art.block(
        [x, 315, b.minY + 6.7],
        [119, 106, 0.3],
        ["#ad5147", "#526e86", "#788c66"][i],
        [0, 0, 0],
        "plain",
        0,
      );
      art.label(i === 1 ? 0 : 4, [x, 315, b.minY + 7], [110, 65]);
    }
    group.add(art.finish());
    const rug = config.room.rug,
      fringe = kit.object("stitched-rug-border");
    for (const side of [-1, 1]) {
      fringe.flat(
        [rug.x, 0.009, rug.y + side * (rug.d / 2 - 7)],
        [rug.w - 10, 1.3],
        "#ad9874",
      );
      fringe.flat(
        [rug.x + side * (rug.w / 2 - 7), 0.009, rug.y],
        [1.3, rug.d - 12],
        "#ad9874",
      );
      for (let i = 0; i < 35; i++)
        fringe.flat(
          [
            rug.x - rug.w / 2 + 12 + (i * (rug.w - 24)) / 34,
            0.005,
            rug.y + side * (rug.d / 2 + 2.5),
          ],
          [1.1, 7],
          "#e5d2ad",
        );
    }
    group.add(fringe.finish());
    function paletteWood() {
      return "#d5a86e";
    }
    return Object.freeze({
      group,
      update(camera, overview) {
        A.IllustratedKit3D.updateVisibility(furniture, camera, overview);
        roof.visible = !overview;
        cutaways.forEach((n) => (n.visible = !overview));
      },
      overview(aspect, fov = 55) {
        // Fit all eight room corners, including the high back wall, without
        // the excessive empty border of a guessed camera distance.
        const aim = b.height * 0.55,
          rise = 1 / Math.hypot(1, 0.28),
          offset = 0.28 * rise,
          tanV = Math.tan((fov * Math.PI) / 360),
          tanH = tanV * Math.max(0.3, aspect),
          margin = 0.92;
        let distance = 0;
        for (const x of [b.minX, b.maxX])
          for (const z of [b.minY, b.maxY])
            for (const y of [0, b.height]) {
              const dy = y - aim,
                dz = z - cz,
                along = dy * rise + dz * offset,
                vertical = dy * offset - dz * rise;
              distance = Math.max(
                distance,
                along + Math.abs(x - cx) / (tanH * margin),
                along + Math.abs(vertical) / (tanV * margin),
              );
            }
        return {
          position: {
            x: cx,
            y: aim + rise * distance,
            z: cz + offset * distance,
          },
          target: { x: cx, y: aim, z: cz },
        };
      },
      diagnostics() {
        return {
          id: config.room.id,
          unitMillimetres: config.room.unitMillimetres,
          bounds: b,
          furniture: config.room.furniture.length,
          hiddenForCamera: furniture.filter((f) => !f.node.visible).length,
        };
      },
    });
  }
  A.MasterBedroom3D = Object.freeze({ create });
})();
