(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  const cross = (a, b, c) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  function pointSegment(p, a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      f = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
    return Math.hypot(p.x - a.x - f * dx, p.y - a.y - f * dy);
  }
  function intersect(a, b, c, d) {
    const x = cross(a, b, c),
      y = cross(a, b, d),
      u = cross(c, d, a),
      v = cross(c, d, b);
    return (
      x * y <= 0 &&
      u * v <= 0 &&
      Math.max(a.x, b.x) >= Math.min(c.x, d.x) &&
      Math.max(c.x, d.x) >= Math.min(a.x, b.x) &&
      Math.max(a.y, b.y) >= Math.min(c.y, d.y) &&
      Math.max(c.y, d.y) >= Math.min(a.y, b.y)
    );
  }
  function segmentDistance(a, b, c, d) {
    return intersect(a, b, c, d)
      ? 0
      : Math.min(
          pointSegment(a, c, d),
          pointSegment(b, c, d),
          pointSegment(c, a, b),
          pointSegment(d, a, b),
        );
  }
  function create(definition) {
    const polygons = definition.polygons,
      loops = polygons.flat(),
      edges = [],
      rows = new Map(),
      grid = new Map(),
      cell = 32,
      railRadius = 0.8;
    for (const ring of loops)
      for (let i = 0; i < ring.length - 1; i++) {
        const a = { x: ring[i][0], y: ring[i][1] },
          b = { x: ring[i + 1][0], y: ring[i + 1][1] };
        if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-8) continue;
        const edge = { a, b };
        edges.push(edge);
        const minX = Math.floor(Math.min(a.x, b.x) / cell),
          maxX = Math.floor(Math.max(a.x, b.x) / cell),
          minY = Math.floor(Math.min(a.y, b.y) / cell),
          maxY = Math.floor(Math.max(a.y, b.y) / cell);
        for (let y = minY; y <= maxY; y++) {
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y).push(edge);
          for (let x = minX; x <= maxX; x++) {
            const key = x + "," + y;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(edge);
          }
        }
      }
    function contains(p) {
      let inside = false;
      for (const { a, b } of rows.get(Math.floor(p.y / cell)) || []) {
        if (
          a.y > p.y !== b.y > p.y &&
          p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      return inside;
    }
    function blocksFootprint(corners) {
      if (corners.some((p) => !contains(p))) return true;
      const xs = corners.map((p) => p.x),
        ys = corners.map((p) => p.y),
        candidates = new Set();
      for (
        let y = Math.floor((Math.min(...ys) - railRadius) / cell);
        y <= Math.floor((Math.max(...ys) + railRadius) / cell);
        y++
      )
        for (
          let x = Math.floor((Math.min(...xs) - railRadius) / cell);
          x <= Math.floor((Math.max(...xs) + railRadius) / cell);
          x++
        )
          for (const e of grid.get(x + "," + y) || []) candidates.add(e);
      const inCar = (p) => {
        let positive = false,
          negative = false;
        for (let i = 0; i < 4; i++) {
          const d = cross(corners[i], corners[(i + 1) % 4], p);
          positive ||= d > 1e-9;
          negative ||= d < -1e-9;
        }
        return !(positive && negative);
      };
      for (const { a, b } of candidates) {
        if (inCar(a) || inCar(b)) return true;
        for (let i = 0; i < 4; i++)
          if (
            segmentDistance(a, b, corners[i], corners[(i + 1) % 4]) <=
            railRadius
          )
            return true;
      }
      return false;
    }
    return Object.freeze({
      polygons,
      loops,
      railRadius,
      contains,
      blocksFootprint,
    });
  }
  A.BoundaryField = Object.freeze({ create });
})();
