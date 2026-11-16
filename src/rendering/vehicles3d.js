(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(materials) {
    const group = new T.Group(),
      model = new T.Group();
    group.add(model);
    const geometries = [],
      parts = [],
      frontWheels = [],
      wheels = [],
      cache = new Map();
    const loader = new T.SVGLoader(),
      base = CGPRaceSprites.geometry,
      scale = 1 / 25.5;
    const outline = materials.ink();
    const geometry = (g) => {
      geometries.push(g);
      return g;
    };
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 64;
    const sc = shadowCanvas.getContext("2d"),
      shade = sc.createRadialGradient(32, 32, 5, 32, 32, 32);
    shade.addColorStop(0, "#17202777");
    shade.addColorStop(1, "#17202700");
    sc.fillStyle = shade;
    sc.fillRect(0, 0, 64, 64);
    const shadow = new T.Mesh(
      geometry(new T.PlaneGeometry(14, 9)),
      materials.basic("#ffffff", {
        map: materials.canvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.09;
    group.add(shadow);
    function outlined(mesh) {
      model.add(mesh);
      const hull = new T.Mesh(mesh.geometry, outline);
      hull.scale.setScalar(1.045);
      mesh.add(hull);
      return mesh;
    }
    function shape(name, depth, height, paletteKey) {
      const shapes = loader
        .parse(
          `<svg xmlns="http://www.w3.org/2000/svg"><path d="${base[name]}"/></svg>`,
        )
        .paths.flatMap((p) => p.toShapes());
      const uv = {
        generateTopUV(_g, v, a, b, c) {
          return [a, b, c].map(
            (i) =>
              new T.Vector2(
                (v[i * 3] + 140) / 280,
                1 - (v[i * 3 + 1] + 60) / 120,
              ),
          );
        },
        generateSideWallUV() {
          return [
            new T.Vector2(0, 0),
            new T.Vector2(1, 0),
            new T.Vector2(1, 1),
            new T.Vector2(0, 1),
          ];
        },
      };
      const g = geometry(
        new T.ExtrudeGeometry(shapes, {
          depth: depth / scale,
          bevelEnabled: true,
          bevelSize: 1.8,
          bevelThickness: 1.5,
          bevelSegments: 1,
          steps: 1,
          curveSegments: 8,
          UVGenerator: uv,
        }),
      );
      g.scale(scale, scale, scale);
      g.rotateX(Math.PI / 2);
      g.translate(0, height + depth, 0);
      const mesh = outlined(new T.Mesh(g));
      parts.push({ mesh, paletteKey });
      return mesh;
    }
    shape("body", 0.65, 0.55, "body");
    shape("leftPod", 0.45, 1.14, "pod");
    shape("rightPod", 0.45, 1.14, "pod");
    shape("engine", 0.75, 1.35, "spine");
    shape("nose", 0.45, 0.9, "nose");
    shape("rearWing", 0.28, 2.3, "wing");
    shape("frontWing", 0.25, 0.45, "wing");
    const rubber = materials.toon("#25272c"),
      hub = materials.toon("#c2b292", materials.maps.paint),
      metal = materials.toon("#343d45");
    const tireGeometry = geometry(new T.CylinderGeometry(1.18, 1.18, 1.15, 16));
    tireGeometry.rotateX(Math.PI / 2);
    const hubGeometry = geometry(new T.CylinderGeometry(0.57, 0.57, 1.2, 10));
    hubGeometry.rotateX(Math.PI / 2);
    for (const x of [-4.03, 3.14])
      for (const side of [-1, 1]) {
        const pivot = new T.Group();
        pivot.position.set(x, 1.18, side * 2.1);
        model.add(pivot);
        const tire = new T.Mesh(tireGeometry, rubber),
          rim = new T.Mesh(hubGeometry, hub);
        tire.add(rim);
        pivot.add(tire);
        wheels.push(tire);
        if (x > 0) frontWheels.push(pivot);
        const axle = new T.Mesh(
          geometry(new T.BoxGeometry(0.2, 0.2, 3.6)),
          metal,
        );
        axle.position.set(x, 0.9, 0);
        model.add(axle);
      }
    const seat = outlined(
      new T.Mesh(geometry(new T.SphereGeometry(0.88, 12, 8)), rubber),
    );
    seat.scale.set(1.8, 0.65, 1);
    seat.position.set(0.3, 1.7, 0);
    const helmetMaterial = materials.toon("#f1d9a4", materials.maps.paint),
      helmet = outlined(
        new T.Mesh(
          geometry(new T.SphereGeometry(0.86, 16, 12)),
          helmetMaterial,
        ),
      );
    helmet.position.set(0.38, 2.48, 0);
    const visor = new T.Mesh(
      geometry(
        new T.SphereGeometry(
          0.89,
          12,
          6,
          -Math.PI / 2,
          Math.PI,
          Math.PI * 0.37,
          Math.PI * 0.25,
        ),
      ),
      materials.toon("#243c4a"),
    );
    visor.rotation.y = Math.PI / 2;
    helmet.add(visor);
    const roll = new T.Mesh(
      geometry(new T.BoxGeometry(0.45, 0.6, 1.65)),
      metal,
    );
    roll.position.set(-0.75, 2.3, 0);
    model.add(roll);
    const rearLight = new T.Mesh(
      geometry(new T.BoxGeometry(0.15, 0.3, 0.6)),
      materials.basic("#ed7350"),
    );
    rearLight.position.set(-4.65, 1.05, 0);
    model.add(rearLight);
    let selected = null;
    function livery(id) {
      if (!CGPRaceSprites.teams[id]) id = "t01";
      if (!cache.has(id)) {
        const palette = CGPRaceSprites.teams[id],
          canvas = document.createElement("canvas");
        canvas.width = 560;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        ctx.scale(2, 2);
        ctx.translate(140, 60);
        const svg = new DOMParser().parseFromString(
          CGPRaceSprites.svg(id),
          "image/svg+xml",
        );
        for (const node of svg.querySelectorAll("path,rect,ellipse")) {
          ctx.save();
          const n = (key) => Number(node.getAttribute(key) || 0),
            path = new Path2D();
          if (node.tagName === "path")
            path.addPath(new Path2D(node.getAttribute("d")));
          if (node.tagName === "rect")
            path.roundRect(n("x"), n("y"), n("width"), n("height"), n("rx"));
          if (node.tagName === "ellipse")
            path.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2);
          ctx.globalAlpha = Number(
            node.getAttribute("opacity") ||
              node.parentElement.getAttribute("opacity") ||
              1,
          );
          const fill = node.getAttribute("fill"),
            stroke = node.getAttribute("stroke");
          if (fill && fill !== "none") {
            ctx.fillStyle = fill;
            ctx.fill(path);
          }
          if (stroke && stroke !== "none") {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = n("stroke-width") || 1.6;
            ctx.stroke(path);
          }
          ctx.restore();
        }
        const top = materials.toon("#ffffff", materials.canvasTexture(canvas));
        const sides = Object.fromEntries(
          ["body", "pod", "spine", "nose", "wing"].map((key) => [
            key,
            materials.toon(palette[key], materials.maps.paint),
          ]),
        );
        cache.set(id, { top, sides, palette });
      }
      const data = cache.get(id);
      parts.forEach((p) => {
        p.mesh.material = [data.top, data.sides[p.paletteKey]];
      });
      helmetMaterial.color.set(data.palette.accent);
      selected = id;
    }
    function update(pose, id) {
      if (selected !== id) livery(id);
      group.position.set(pose.x, pose.elevation || 0, pose.y);
      group.rotation.y = -pose.heading;
      group.rotation.z = pose.pitch || 0;
      frontWheels.forEach((w) => (w.rotation.y = -(pose.steering || 0)));
      wheels.forEach((w) => (w.rotation.z = -(pose.s || 0) / 1.18));
    }
    livery("t01");
    return Object.freeze({
      group,
      update,
      dispose() {
        geometries.forEach((g) => g.dispose());
      },
    });
  }
  A.Vehicles3D = Object.freeze({ create });
})();
