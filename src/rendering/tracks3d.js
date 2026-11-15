(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  // Union of segment strips and round joins, matching distance-to-polyline physics.
  function roadGeometry(surface, radius, height = 0.06) {
    const positions = [],
      uv = [],
      pts = surface.g.pts;
    function triangle(a, b, c) {
      if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0)
        [b, c] = [c, b];
      for (const p of [a, b, c]) {
        positions.push(p.x, height, p.y);
        uv.push(p.x / 9, p.y / 9);
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length],
        len = Math.hypot(b.x - a.x, b.y - a.y),
        nx = (-(b.y - a.y) / len) * radius,
        ny = ((b.x - a.x) / len) * radius;
      const al = { x: a.x - nx, y: a.y - ny },
        ar = { x: a.x + nx, y: a.y + ny },
        bl = { x: b.x - nx, y: b.y - ny },
        br = { x: b.x + nx, y: b.y + ny };
      triangle(al, ar, br);
      triangle(al, br, bl);
      const prev = pts[(i - 1 + pts.length) % pts.length],
        incoming = Math.atan2(a.y - prev.y, a.x - prev.x),
        outgoing = Math.atan2(b.y - a.y, b.x - a.x);
      const turn = Math.atan2(
        Math.sin(outgoing - incoming),
        Math.cos(outgoing - incoming),
      );
      if (Math.abs(turn) > 1e-6) {
        const start = incoming - (Math.sign(turn) * Math.PI) / 2,
          steps = Math.ceil(Math.abs(turn) / (Math.PI / 24));
        for (let j = 0; j < steps; j++) {
          const angle = start + (turn * j) / steps,
            next = start + (turn * (j + 1)) / steps;
          triangle(
            a,
            {
              x: a.x + Math.cos(next) * radius,
              y: a.y + Math.sin(next) * radius,
            },
            {
              x: a.x + Math.cos(angle) * radius,
              y: a.y + Math.sin(angle) * radius,
            },
          );
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function boundaryGeometry(surface, height = 0.035) {
    if (!surface.boundary) throw Error("Geschlossene Streckengrenzen fehlen.");
    const positions = [],
      uv = [];
    for (const polygon of surface.boundary.polygons) {
      const rings = polygon.map((r) =>
          r.slice(0, -1).map((p) => new T.Vector2(p[0], p[1])),
        ),
        vertices = rings.flat();
      for (const face of T.ShapeUtils.triangulateShape(
        rings[0],
        rings.slice(1),
      )) {
        let [a, b, c] = face.map((i) => vertices[i]);
        if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0)
          [b, c] = [c, b];
        for (const p of [a, b, c]) {
          positions.push(p.x, height, p.y);
          uv.push(p.x / 9, p.y / 9);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function boundaryCurve(ring, height = 0.77) {
    const points = ring
      .slice(0, -1)
      .map((p) => new T.Vector3(p[0], height, p[1]));
    class PolygonCurve extends T.Curve {
      getPoint(t, target = new T.Vector3()) {
        const u = (((t % 1) + 1) % 1) * points.length,
          i = Math.floor(u),
          f = u - i;
        return target
          .copy(points[i % points.length])
          .lerp(points[(i + 1) % points.length], f);
      }
      getPointAt(t, target) {
        return this.getPoint(t, target);
      }
      getTangentAt(t, target = new T.Vector3()) {
        const n = points.length,
          u = (((t % 1) + 1) % 1) * n,
          rounded = Math.round(u),
          i = Math.abs(u - rounded) < 1e-7 ? rounded % n : Math.floor(u);
        if (Math.abs(u - rounded) < 1e-7) {
          target.copy(points[(i + 1) % n]).sub(points[(i + n - 1) % n]);
        } else target.copy(points[(i + 1) % n]).sub(points[i]);
        if (target.lengthSq() < 1e-12)
          target.copy(points[(i + 1) % n]).sub(points[i]);
        return target.normalize();
      }
    }
    return new PolygonCurve();
  }
  function create(surface, materials) {
    const group = new T.Group(),
      geometries = [],
      disposables = [],
      g = surface.g;
    const geometry = (value) => {
      geometries.push(value);
      return value;
    };
    function mesh(geom, material, x = 0, y = 0, z = 0) {
      const m = new T.Mesh(geom, material);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    }
    const ground = mesh(
      geometry(new T.PlaneGeometry(2700, 2700)),
      materials.basic("#c4b99e", { map: materials.maps.carpet }),
      590,
      0,
      374,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.geometry.attributes.uv.array.forEach((v, i, a) => (a[i] = v * 300));
    mesh(
      geometry(boundaryGeometry(surface)),
      materials.basic("#9e9378", { map: materials.maps.carpet }),
    );
    mesh(
      geometry(roadGeometry(surface, surface.roadRadius, 0.07)),
      materials.basic("#f9efd6", { map: materials.maps.carpet }),
    );
    const ropeCanvas = document.createElement("canvas");
    ropeCanvas.width = 128;
    ropeCanvas.height = 32;
    const rc = ropeCanvas.getContext("2d");
    rc.fillStyle = "#c5ad7e";
    rc.fillRect(0, 0, 128, 32);
    rc.lineWidth = 9;
    for (let i = -1; i < 6; i++) {
      rc.strokeStyle = "#f8e3b3";
      rc.beginPath();
      rc.moveTo(i * 32, 0);
      rc.lineTo(i * 32 + 18, 32);
      rc.stroke();
      rc.strokeStyle = "#927e57";
      rc.lineWidth = 2;
      rc.stroke();
      rc.lineWidth = 9;
    }
    const ropeMap = materials.canvasTexture(ropeCanvas);
    ropeMap.wrapS = T.RepeatWrapping;
    ropeMap.repeat.set(280, 1);
    const yarn = materials.toon("#f5e4bd", ropeMap);
    for (const ring of surface.boundary.loops)
      mesh(
        geometry(
          new T.TubeGeometry(
            boundaryCurve(ring),
            ring.length - 1,
            surface.boundary.railRadius,
            6,
            true,
          ),
        ),
        yarn,
      );
    const checker = document.createElement("canvas");
    checker.width = 32;
    checker.height = 256;
    const c = checker.getContext("2d");
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 2; x++) {
        c.fillStyle = (x + y) % 2 ? "#25323b" : "#fff0d3";
        c.fillRect(x * 16, y * 16, 16, 16);
      }
    const stripe = surface.at(0),
      finish = mesh(
        geometry(
          new T.PlaneGeometry(
            2,
            (surface.outerRadius - surface.boundary.railRadius) * 2,
          ),
        ),
        materials.basic("#ffffff", { map: materials.canvasTexture(checker) }),
        stripe.x,
        0.095,
        stripe.y,
      );
    finish.rotation.set(-Math.PI / 2, 0, 0);
    finish.rotation.z = -stripe.ang;
    const wood = materials.toon("#d6aa6d", materials.maps.wood),
      ink = materials.basic("#26313a");
    function box(x, y, z, sx, sy, sz, material, rotation = 0, outline = true) {
      const m = mesh(
        geometry(new T.BoxGeometry(sx, sy, sz)),
        material,
        x,
        y,
        z,
      );
      m.rotation.y = rotation;
      if (outline) {
        const lines = new T.LineSegments(
          geometry(new T.EdgesGeometry(m.geometry)),
          new T.LineBasicMaterial({ color: "#40362c" }),
        );
        disposables.push(lines.material);
        m.add(lines);
      }
      return m;
    }
    // Props never enter the driving corridor, including nearby arms of the circuit.
    function free(p, r) {
      return (
        surface.project({ x: p.x, y: p.y }).distance >
        surface.outerRadius + r + 3
      );
    }
    const blockColors = ["#3d8181", "#b95e48", "#d1a247", "#516a82"];
    for (let i = 0; i < 24; i++) {
      const s = ((i + 0.45) * g.len) / 24,
        side = i % 2 ? 1 : -1,
        p = surface.at(s, side * (surface.outerRadius + 24 + (i % 3) * 7));
      if (!free(p, 10)) continue;
      box(
        p.x,
        3.5,
        p.y,
        8,
        7,
        8,
        materials.toon(blockColors[i % 4], materials.maps.wood),
        i * 0.73,
      );
      if (i % 3 === 0) box(p.x + 1, 9, p.y, 6, 4, 6, wood, i * 0.73);
    }
    const paperCanvas = document.createElement("canvas");
    paperCanvas.width = 256;
    paperCanvas.height = 128;
    const pc = paperCanvas.getContext("2d");
    pc.fillStyle = "#f3e2bc";
    pc.fillRect(0, 0, 256, 128);
    pc.strokeStyle = "#45392c";
    pc.lineWidth = 7;
    pc.strokeRect(3, 3, 250, 122);
    pc.fillStyle = "#b85d44";
    pc.beginPath();
    pc.moveTo(43, 52);
    pc.lineTo(139, 52);
    pc.lineTo(139, 24);
    pc.lineTo(205, 64);
    pc.lineTo(139, 104);
    pc.lineTo(139, 76);
    pc.lineTo(43, 76);
    pc.closePath();
    pc.fill();
    const board = materials.basic("#ffffff", {
      map: materials.canvasTexture(paperCanvas),
      side: T.DoubleSide,
    });
    for (const index of [3, 6, 10, 14, 18, 22, 26, 30]) {
      const gate = surface.gates[index];
      let p = surface.at(gate.s, surface.outerRadius + 9);
      if (!free(p, 3)) p = surface.at(gate.s, -surface.outerRadius - 9);
      if (!free(p, 3)) continue;
      box(p.x, 2.3, p.y, 0.6, 4.6, 0.6, wood, 0, false);
      const sign = mesh(
        geometry(new T.PlaneGeometry(9, 4.5)),
        board,
        p.x,
        5,
        p.y,
      );
      sign.rotation.y = -gate.ang;
    }
    // Wooden desk edge and room blocks frame the toy-scale world beyond the track.
    const xs = g.pts.map((p) => p.x),
      zs = g.pts.map((p) => p.y),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    box(
      (minX + maxX) / 2,
      20,
      minZ - 100,
      maxX - minX + 240,
      40,
      18,
      wood,
      0,
      false,
    );
    box(
      maxX + 115,
      18,
      (minZ + maxZ) / 2,
      18,
      36,
      maxZ - minZ + 150,
      materials.toon("#516272", materials.maps.wood),
      0,
      false,
    );
    const bannerCanvas = document.createElement("canvas");
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bc = bannerCanvas.getContext("2d");
    bc.fillStyle = "#ecdfc4";
    bc.fillRect(0, 0, 512, 128);
    bc.strokeStyle = "#26323a";
    bc.lineWidth = 12;
    bc.strokeRect(6, 6, 500, 116);
    bc.fillStyle = "#304b55";
    bc.font = "900 45px system-ui";
    bc.textAlign = "center";
    bc.fillText("CARPET GRAND PRIX", 256, 78);
    const bp = surface.at(-g.width * 1.8, -surface.outerRadius - 12);
    if (free(bp, 8)) {
      box(bp.x, 3.5, bp.y, 12, 7, 1.5, wood, -stripe.ang);
      const banner = mesh(
        geometry(new T.PlaneGeometry(12, 3)),
        materials.basic("#ffffff", {
          map: materials.canvasTexture(bannerCanvas),
          side: T.DoubleSide,
        }),
        bp.x,
        4.5,
        bp.y,
      );
      banner.rotation.y = -stripe.ang;
    }
    return Object.freeze({
      group,
      dispose() {
        geometries.forEach((g) => g.dispose());
        disposables.forEach((m) => m.dispose());
      },
    });
  }
  A.Tracks3D = Object.freeze({
    create,
    roadGeometry,
    boundaryGeometry,
    boundaryCurve,
  });
})();
