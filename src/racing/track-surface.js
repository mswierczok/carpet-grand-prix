(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  const gap = (a, b, len) => {
    let d = (b - a) % len;
    if (d > len / 2) d -= len;
    if (d < -len / 2) d += len;
    return d;
  };
  function create(model) {
    const all = model.points.concat(model.pit),
      xs = all.map((p) => p[0]),
      ys = all.map((p) => p[1]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys),
      sourceScale = Math.min(
        1010 / (maxX - minX + model.width * 4),
        584 / (maxY - minY + model.width * 4),
      ),
      // Layout and road width are independent of vehicle dimensions. Apply
      // these explicit POV profiles AFTER fitting the original drawing, so
      // the extra curve radius is not cancelled by normalization.
      scale = sourceScale * (model.pov?.layoutScale ?? 1);
    const convert = (p) =>
      Object.freeze({
        x: 590 + (p[0] - (minX + maxX) / 2) * scale,
        y: 374 + (p[1] - (minY + maxY) / 2) * scale,
      });
    const originalPoints = model.points.map(convert),
      shape = model.pov?.southExtension
        ? A.TrackShape.south(
            originalPoints,
            model.pit.map(convert),
            model.sectorU,
            model.pov.southExtension,
          )
        : null,
      pts = model.pov?.routePoints
        ? model.pov.routePoints.map(([x, y]) => Object.freeze({ x, y }))
        : shape?.points || originalPoints,
      cum = [0];
    let len = 0;
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      len += Math.hypot(q.x - p.x, q.y - p.y);
      cum.push(len);
    });
    const g = Object.freeze({
      pts: Object.freeze(pts),
      cum: Object.freeze(cum),
      len,
      width: model.width * sourceScale * (model.pov?.roadScale ?? 1),
      sectors: shape
        ? Object.freeze(
            shape.sectorLocations.map(
              ({ index, fraction }) =>
                (cum[index] + fraction * (cum[index + 1] - cum[index])) / len,
            ),
          )
        : model.pov?.sectorU || model.sectorU,
      pit: model.pov?.pitPoints
        ? Object.freeze(model.pov.pitPoints.map(([x, y]) => Object.freeze({ x, y })))
        : shape?.pit || Object.freeze(model.pit.map(convert)),
      ...(model.pov?.layoutVersion ? {pitRadius:model.pov.pitRadius, layout:model.pov} : {}),
      bridges: model.bridgeU,
      scale,
    });
    // Exact broad phase: any segment nearer than padding is present in the
    // queried cell. Far-away positions fall back to the original full scan.
    const cells = new Map(),
      cellSize = 64,
      padding = g.width * 0.85 + 12;
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      for (
        let y = Math.floor((Math.min(a.y, b.y) - padding) / cellSize);
        y <= Math.floor((Math.max(a.y, b.y) + padding) / cellSize);
        y++
      )
        for (
          let x = Math.floor((Math.min(a.x, b.x) - padding) / cellSize);
          x <= Math.floor((Math.max(a.x, b.x) + padding) / cellSize);
          x++
        ) {
          const key = x + "," + y;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(i);
        }
    });
    function at(s, lane = 0) {
      const dist = ((s % len) + len) % len;
      let lo = 0,
        hi = pts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid + 1] < dist) lo = mid + 1;
        else hi = mid;
      }
      const i = lo,
        a = pts[i],
        b = pts[(i + 1) % pts.length],
        f = (dist - cum[i]) / (cum[i + 1] - cum[i] || 1),
        prev = pts[(i - 1 + pts.length) % pts.length],
        next = pts[(i + 2) % pts.length];
      const a1 = Math.atan2(b.y - prev.y, b.x - prev.x),
        a2 = Math.atan2(next.y - a.y, next.x - a.x),
        turn = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)),
        ang = a1 + f * turn;
      return {
        x: a.x + (b.x - a.x) * f - Math.sin(ang) * lane,
        y: a.y + (b.y - a.y) * f + Math.cos(ang) * lane,
        ang,
        s,
      };
    }
    function project(p, hint = null) {
      const nearby = cells.get(
        Math.floor(p.x / cellSize) + "," + Math.floor(p.y / cellSize),
      );
      const candidate = scan(p, hint, nearby);
      return nearby && (!candidate || candidate.distance > padding)
        ? scan(p, hint, null)
        : candidate;
    }
    function scan(p, hint, candidates) {
      let best = null;
      for (let k = 0; k < (candidates ? candidates.length : pts.length); k++) {
        const i = candidates ? candidates[k] : k;
        if (
          hint !== null &&
          Math.abs(gap(hint, (cum[i] + cum[i + 1]) / 2, len)) >
            g.width * 2.5 + (cum[i + 1] - cum[i]) / 2
        )
          continue;
        const a = pts[i],
          b = pts[(i + 1) % pts.length],
          dx = b.x - a.x,
          dy = b.y - a.y,
          f = Math.max(
            0,
            Math.min(
              1,
              ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
            ),
          ),
          x = a.x + dx * f,
          y = a.y + dy * f,
          distance = Math.hypot(p.x - x, p.y - y);
        if (!best || distance < best.distance) {
          const normalized = cum[i] + f * (cum[i + 1] - cum[i]),
            s = hint === null ? normalized : hint + gap(hint, normalized, len);
          best = { x, y, s, distance, ang: Math.atan2(dy, dx), segment: i };
        }
      }
      return best;
    }
    const gates = Object.freeze(
      Array.from({ length: 32 }, (_, i) =>
        Object.freeze({ ...at((i * len) / 32), index: i }),
      ),
    );
    const definition = globalThis.CGPArcadeData?.boundaries?.[model.id];
    const bridge =
      definition?.kind === "bridges" && A.BridgeSurface
        ? A.BridgeSurface.create({
            g,
            at,
            project,
            gap: (a, b) => gap(a, b, len),
            definition,
          })
        : null;
    const boundary = bridge
      ? bridge.boundary
      : definition &&
          Math.abs(definition.radius - g.width * 0.85) < 1e-6 &&
          A.BoundaryField
        ? A.BoundaryField.create(definition)
        : null;
    function checkpoint(u, index) {
      const point = at(u * len),
        nx = -Math.sin(point.ang),
        ny = Math.cos(point.ang);
      let minLane = -g.width * 0.85,
        maxLane = g.width * 0.85;
      if (boundary) {
        minLane = -Infinity;
        maxLane = Infinity;
        const lines = [
          ...boundary.loops,
          ...boundary.dividers.map((d) => d.points),
        ];
        for (const line of lines)
          for (let i = 0; i < line.length - 1; i++) {
            const a = line[i],
              b = line[i + 1],
              dx = b[0] - a[0],
              dy = b[1] - a[1],
              divisor = nx * dy - ny * dx;
            if (Math.abs(divisor) < 1e-10) continue;
            const ax = a[0] - point.x,
              ay = a[1] - point.y,
              lane = (ax * dy - ay * dx) / divisor,
              fraction = (ax * ny - ay * nx) / divisor;
            if (fraction < -1e-9 || fraction > 1 + 1e-9) continue;
            if (lane < 0) minLane = Math.max(minLane, lane);
            else if (lane > 0) maxLane = Math.min(maxLane, lane);
          }
        if (!Number.isFinite(minLane) || !Number.isFinite(maxLane))
          throw Error(
            "Sektorlinie erreicht keine geschlossene Seilbegrenzung.",
          );
      }
      // BEGIN BAHRAIN PIT FINISH
      if (index === 0 && g.pitRadius) {
        for (let i = 0; i < g.pit.length - 1; i++) {
          const a = g.pit[i], b = g.pit[i + 1],
            before = (a.x - point.x) * Math.cos(point.ang) + (a.y - point.y) * Math.sin(point.ang),
            after = (b.x - point.x) * Math.cos(point.ang) + (b.y - point.y) * Math.sin(point.ang);
          if (before <= 0 && after > 0) {
            const f = -before / (after - before),
              lane = -(a.x + (b.x-a.x)*f - point.x)*Math.sin(point.ang) + (a.y + (b.y-a.y)*f - point.y)*Math.cos(point.ang);
            minLane = Math.min(minLane, lane - g.pitRadius);
            maxLane = Math.max(maxLane, lane + g.pitRadius);
          }
        }
      }
      // END BAHRAIN PIT FINISH
      return Object.freeze({ ...point, index, minLane, maxLane });
    }
    // Lap validation uses only the actual finish and sector lines. The 32
    // legacy geometry markers remain for scenery/sign placement, not timing.
    const checkpoints = Object.freeze([0, ...g.sectors].map(checkpoint));
    return Object.freeze({
      id: model.id,
      name: model.name,
      g,
      at,
      project,
      gates,
      checkpoints,
      gap: (a, b) => gap(a, b, len),
      boundary,
      roadRadius: g.width / 2,
      outerRadius: g.width * 0.85,
      ...(bridge ? { bridge } : {}),
    });
  }
  A.Surface = Object.freeze({ create });
})();
