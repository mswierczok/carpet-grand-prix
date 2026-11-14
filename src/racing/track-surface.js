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
      scale = Math.min(
        1010 / (maxX - minX + model.width * 4),
        584 / (maxY - minY + model.width * 4),
      );
    const convert = (p) =>
      Object.freeze({
        x: 590 + (p[0] - (minX + maxX) / 2) * scale,
        y: 374 + (p[1] - (minY + maxY) / 2) * scale,
      });
    const pts = model.points.map(convert),
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
      width: model.width * scale,
      sectors: model.sectorU,
      pit: Object.freeze(model.pit.map(convert)),
      bridges: model.bridgeU,
      scale,
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
      let best = null;
      for (let i = 0; i < pts.length; i++) {
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
    return Object.freeze({
      g,
      at,
      project,
      gates,
      gap: (a, b) => gap(a, b, len),
      roadRadius: g.width / 2,
      outerRadius: g.width * 0.85,
    });
  }
  A.Surface = Object.freeze({ create });
})();
