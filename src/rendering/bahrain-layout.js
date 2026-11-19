(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function create(surface) {
    if (surface.id !== "bahrain")
      throw Error("Bahrain-Dekoration auf falscher Strecke.");
    const objects = [],
      radius = surface.outerRadius;
    function clearance(at, w, d) {
      let min = Infinity;
      const columns = Math.max(4, Math.ceil(w / 3)),
        rows = Math.max(4, Math.ceil(d / 3));
      for (let ix = 0; ix <= columns; ix++)
        for (let iz = 0; iz <= rows; iz++) {
          const x = -w / 2 + (w * ix) / columns,
            z = -d / 2 + (d * iz) / rows;
          const p = {
            x: at.x + Math.cos(at.ang) * x - Math.sin(at.ang) * z,
            y: at.y + Math.sin(at.ang) * x + Math.cos(at.ang) * z,
          };
          min = Math.min(min, surface.project(p).distance - radius);
        }
      return min;
    }
    function add(id, at, w, d, h, extra = {}) {
      const c = clearance(at, w, d);
      if (c < 4)
        throw Error(`Dekoration ${id} liegt zu nah an der Fahrbahn (${c}).`);
      const entry = { id, at, w, d, h, clearance: c, ...extra };
      objects.push(entry);
      return entry;
    }
    function find(id, u, lane, w, d, h, yaw = 0) {
      for (const shift of [0, 15, -15, 30, -30, 55, -55])
        for (const extra of [0, 12, 24, 40, 65]) {
          const point = surface.at(
              u * surface.g.len + shift,
              lane + Math.sign(lane) * extra,
            ),
            at = { ...point, ang: point.ang + yaw };
          if (clearance(at, w, d) >= 8) return add(id, at, w, d, h, { u });
        }
      throw Error(`Kein sicherer Standort für ${id}.`);
    }
    const pit = surface.g.pit;
    add(
      "wooden-pits",
      {
        x: (pit[1].x + pit[2].x) / 2,
        y: Math.min(...pit.map((p) => p.y)) - 35,
        ang: 0,
      },
      104,
      34,
      25,
    );
    find("plush-camel", 0.065, -78, 50, 30, 33, 2.2);
    find("thread-towers", 0.3, 78, 42, 32, 38);
    find("cloth-dunes", 0.54, -88, 48, 34, 8);
    find("floodlight-east", 0.13, -74, 24, 18, 43);
    find("floodlight-hairpin", 0.21, -85, 24, 18, 43);
    find("floodlight-west", 0.81, -80, 24, 18, 43);
    find("sunstitched-board", 0.42, -65, 24, 8, 9);
    find("loop-board", 0.71, 67, 24, 8, 9);
    // Midway along the straight after turn one; decoration never changes collisions.
    const tunnelAt = surface.at(0.12 * surface.g.len),
      tunnel = {
        id: "block-tunnel",
        at: tunnelAt,
        w: 20,
        d: 82,
        h: 51,
        clearHeight: 22,
        clearHalfWidth: 32,
        solids: [
          [-10, 10, -41, -32, 0, 22],
          [-10, 10, 32, 41, 0, 22],
          [-10, 10, -41, 41, 22, 51],
        ],
      };
    // Validate uprights against every arm, rather than just this section's centre.
    for (const side of [-1, 1]) {
      const p = {
        x: tunnelAt.x - Math.sin(tunnelAt.ang) * side * 36.5,
        y: tunnelAt.y + Math.cos(tunnelAt.ang) * side * 36.5,
        ang: tunnelAt.ang,
      };
      if (clearance(p, 20, 9) < 3)
        throw Error("Tunnelstütze berührt den Fahrkorridor.");
    }
    objects.push(tunnel);
    // Parked playroom cars, entirely beyond the ropes on both sides.
    find("parked-car-red", 0.098, -43, 16, 9, 7, -0.12);
    find("parked-car-blue", 0.145, 44, 16, 9, 7, 0.18);
    find("parked-car-green", 0.46, -45, 16, 9, 7, -0.3);
    find("parked-car-yellow", 0.94, -44, 16, 9, 7, 0.22);
    const xs = surface.g.pts.map((p) => p.x),
      ys = surface.g.pts.map((p) => p.y);
    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    const scene = A.EnvironmentScenes.get(surface.id);
    for (const spec of [
      ...scene.room.furniture.map((f) => ({ ...f, roomFurniture: true })),
      ...scene.landmarks,
    ]) {
      const { id, at, w, d, h, ...options } = spec;
      add(id, at, w, d, h, options);
    }
    const passage = scene.passage,
      at = surface.at(passage.u * surface.g.len),
      passageSpec = {
        ...passage,
        at,
        solids: [
          [-32, 32, -44, -32, 0, 26],
          [-32, 32, 32, 44, 0, 26],
          [-33, 33, -44, 44, 26, 35],
        ],
      };
    for (const side of [-1, 1]) {
      const p = {
        x: at.x - Math.sin(at.ang) * side * 38,
        y: at.y + Math.cos(at.ang) * side * 38,
        ang: at.ang,
      };
      if (clearance(p, 64, 12) < 3)
        throw Error("Bauklotztunnel berührt den Fahrkorridor.");
    }
    objects.push(passageSpec);
    add(
      "pencils",
      { x: bounds.maxX + 110, y: bounds.minY + 165, ang: 0.27 },
      90,
      42,
      9,
    );
    return Object.freeze({
      objects: Object.freeze(objects.map((o) => Object.freeze(o))),
      bounds: Object.freeze(bounds),
      tunnel: Object.freeze(tunnel),
      passage: Object.freeze(passageSpec),
      clearance,
    });
  }
  A.BahrainLayout = Object.freeze({ create });
})();
