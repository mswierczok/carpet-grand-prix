// Build-time only. Original drawing stays intact; the explicit POV layout is in
// the same fitted world coordinates as the published room (one unit = 5 mm).
export function bahrainIteration2(track) {
  const all = track.points.concat(track.pit),
    xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(
    1010 / (maxX - minX + track.width * 4),
    584 / (maxY - minY + track.width * 4),
  );
  const convert = (p) => ({
    x: 590 + (p[0] - (minX + maxX) / 2) * scale,
    y: 374 + (p[1] - (minY + maxY) / 2) * scale,
  });
  const pts = track.points.map(convert),
    cum = [0];
  pts.forEach((p, i) =>
    cum.push(
      cum.at(-1) +
        Math.hypot(
          pts[(i + 1) % pts.length].x - p.x,
          pts[(i + 1) % pts.length].y - p.y,
        ),
    ),
  );
  const len = cum.at(-1);
  const at = (u) => {
    const s = u * len;
    let i = 0;
    while (i < pts.length - 1 && cum[i + 1] < s) i++;
    const f = (s - cum[i]) / (cum[i + 1] - cum[i]);
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  function spline(knots, step = 3) {
    const out = [];
    for (let i = 0; i < knots.length - 1; i++) {
      const a = knots[Math.max(0, i - 1)],
        b = knots[i],
        c = knots[i + 1],
        d = knots[Math.min(knots.length - 1, i + 2)];
      const steps = Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / step);
      for (let j = 0; j < steps; j++) {
        const t = j / steps,
          t2 = t * t,
          t3 = t2 * t;
        const p = {};
        for (const k of ["x", "y"])
          p[k] =
            0.5 *
            (2 * b[k] +
              (-a[k] + c[k]) * t +
              (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
              (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
        out.push(p);
      }
    }
    return [...out, knots.at(-1)];
  }
  const start = 0.49,
    end = 0.605;
  const controls = [
    at(start),
    { x: 540, y: 517 },
    { x: 455, y: 564 },
    { x: 350, y: 630 },
    { x: 245, y: 680 },
    { x: 170, y: 685 },
    { x: 110, y: 665 },
    { x: 85, y: 630 },
    { x: 91, y: 595 },
    { x: 130, y: 572 },
    { x: 200, y: 559 },
    { x: 285, y: 520 },
    { x: 370, y: 458 },
    { x: 438, y: 425 },
    at(end),
  ];
  const local = spline(controls, 6),
    first = pts.filter((_, i) => cum[i] < start * len),
    last = pts.filter((_, i) => cum[i] > end * len);
  const route = [...first, ...local, ...last];
  const distance = [0];
  route.forEach((p, i) =>
    distance.push(
      distance.at(-1) +
        Math.hypot(
          route[(i + 1) % route.length].x - p.x,
          route[(i + 1) % route.length].y - p.y,
        ),
    ),
  );
  const newLen = distance.at(-1),
    localLength = local
      .slice(1)
      .reduce(
        (n, p, i) => n + Math.hypot(p.x - local[i].x, p.y - local[i].y),
        0,
      );
  const sectors = track.sectorU.map((u) =>
    u < start
      ? (u * len) / newLen
      : u > end
        ? (u * len + (newLen - len)) / newLen
        : (start * len + ((u - start) / (end - start)) * localLength) / newLen,
  );
  // Smooth divergence before the grid, parallel service lane, open merge after
  // the finish. Radius is independent of the unchanged main-road width.
  const pit = spline([
    { x: 550, y: 198.6714200817 },
    { x: 582, y: 187 },
    { x: 614, y: 157 },
    { x: 650, y: 145 },
    { x: 780, y: 145 },
    { x: 814, y: 159 },
    { x: 834, y: 185 },
    { x: 840, y: 224 },
  ]);
  const mapU = (u) =>
    u < start ? (u * len) / newLen : (u * len + newLen - len) / newLen;
  return {
    ...track,
    pov: {
      ...track.pov,
      layoutVersion: "bahrain-underbed-2",
      routePoints: route.map((p) => [p.x, p.y]),
      sectorU: sectors,
      pitPoints: pit.map((p) => [p.x, p.y]),
      pitRadius: 12,
      sourceSection: [start, end],
      underbed: {
        startIndex: first.length,
        endIndex: first.length + local.length - 1,
      },
      landmarkU: { arch: mapU(0.12), tunnel: mapU(0.882) },
      originalLength: len,
    },
  };
}
