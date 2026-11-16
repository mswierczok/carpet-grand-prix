(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  function south(points, pit, sectors, settings) {
    const { start, end, distance, section = [0, 1] } = settings;
    if (
      !(
        start >= 0 &&
        start < end &&
        end <= 1 &&
        distance > 0 &&
        section[0] >= 0 &&
        section[0] < section[1] &&
        section[1] <= 1
      )
    )
      throw Error("Ungültiges südliches Streckenprofil.");
    const ys = points.map((p) => p.y),
      low = Math.min(...ys),
      high = Math.max(...ys),
      begin = low + (high - low) * start,
      finish = low + (high - low) * end,
      cum = [0];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    const length = cum.at(-1),
      gates = sectors.map((u) => u * length),
      at = (i, f) => ({
        x: points[i].x + (points[(i + 1) % points.length].x - points[i].x) * f,
        y: points[i].y + (points[(i + 1) % points.length].y - points[i].y) * f,
      });
    function offset(y) {
      const t = Math.max(0, Math.min(1, (y - begin) / (finish - begin)));
      // C2 joins: the unchanged road and translated curve meet with no
      // sudden change in tangent or curvature.
      return distance * t * t * t * (10 + t * (-15 + 6 * t));
    }
    function mapped(p, s) {
      if (s < length * section[0] || s > length * section[1]) return p;
      const dy = offset(p.y);
      return dy ? Object.freeze({ x: p.x, y: p.y + dy }) : p;
    }
    // Localizing an extension must never introduce a step at its arc limits.
    for (const u of section) {
      const s = u * length;
      let i = 0;
      while (i < points.length - 1 && cum[i + 1] < s) i++;
      const f = (s - cum[i]) / (cum[i + 1] - cum[i]);
      if (offset(at(i, f).y) > 1e-7)
        throw Error(
          "Südliche Verlängerung endet außerhalb des unveränderten Anschlusses.",
        );
    }
    const result = [],
      sourceDistances = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        span = cum[i + 1] - cum[i],
        ma = mapped(a, cum[i]),
        mb = mapped(b, cum[i + 1]),
        moved = ma !== a || mb !== b,
        steps = moved
          ? Math.max(1, Math.ceil(Math.hypot(mb.x - ma.x, mb.y - ma.y) / 6))
          : 1,
        fractions = new Set(Array.from({ length: steps }, (_, j) => j / steps));
      for (const gate of gates)
        if (gate >= cum[i] && gate < cum[i + 1]) {
          const f = (gate - cum[i]) / span;
          // Preserve the physical sector point exactly when this part moves.
          if (mapped(at(i, f), gate).y !== at(i, f).y) fractions.add(f);
        }
      for (const f of [...fractions].sort((a, b) => a - b)) {
        const s = cum[i] + f * span,
          p = f === 0 ? a : Object.freeze(at(i, f));
        sourceDistances.push(s);
        result.push(mapped(p, s));
      }
    }
    const sectorLocations = gates.map((gate) => {
      let i = 0;
      while (i < result.length - 1 && sourceDistances[i + 1] <= gate) i++;
      const next = sourceDistances[i + 1] ?? length;
      return {
        index: i,
        fraction: (gate - sourceDistances[i]) / (next - sourceDistances[i]),
      };
    });
    return Object.freeze({
      points: Object.freeze(result),
      sectorLocations,
      pit: Object.freeze(
        pit.map((p) => {
          const dy = offset(p.y);
          return dy ? Object.freeze({ x: p.x, y: p.y + dy }) : p;
        }),
      ),
    });
  }
  A.TrackShape = Object.freeze({ south });
})();
