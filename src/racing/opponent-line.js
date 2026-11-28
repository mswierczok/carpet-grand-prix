(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    cache = new WeakMap(),
    clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function curvature(a, b, c) {
    const ax = b.x - a.x,
      ay = b.y - a.y,
      bx = c.x - b.x,
      by = c.y - b.y;
    return (
      (2 * (ax * by - ay * bx)) /
      (Math.hypot(ax, ay) *
        Math.hypot(bx, by) *
        Math.hypot(c.x - a.x, c.y - a.y) || 1)
    );
  }
  function create(surface, profile = A.AIDifficulty.get()) {
    if (!cache.has(surface)) cache.set(surface, new Map());
    const cached = cache.get(surface);
    const cacheKey=profile.cacheKey||profile.id;
    if (cached.has(cacheKey)) return cached.get(cacheKey);
    const n = Math.ceil(surface.g.len / 8),
      stride = surface.g.len / n,
      base = Array.from({ length: n }, (_, i) => surface.at(i * stride)),
      offsets = base.map(() => 0),
      pos = (i, lane) => ({
        x: base[i].x - Math.sin(base[i].ang) * lane,
        y: base[i].y + Math.cos(base[i].ang) * lane,
      }),
      points = base.map((_, i) => pos(i, 0)),
      limit = Math.min(profile.lineWidth, surface.roadRadius - profile.edgeMargin),
      routes = new Map();
    // Spread curvature over entry/apex/exit within the existing road. These
    // are steering targets, never positions assigned to a simulated car.
    for (let pass = 0; pass < profile.iterations; pass++)
      for (let step = 0; step < n; step++) {
        const i = pass % 2 ? step : n - 1 - step,
          a = points[(i + n - 1) % n],
          b = points[i],
          c = points[(i + 1) % n],
          wanted =
            (curvature(points[(i + n - 2) % n], a, b) +
              curvature(b, c, points[(i + 2) % n])) *
            0.5,
          current = curvature(a, b, c),
          derivative =
            (curvature(a, pos(i, offsets[i] + 0.1), c) -
              curvature(a, pos(i, offsets[i] - 0.1), c)) /
            0.2;
        if (Math.abs(derivative) < 1e-8) continue;
        // A small optional inward bias trades excess distance for apex use.
        // The existing smoothness solver and road margin still bound the line.
        offsets[i] = clamp(
          offsets[i] + clamp((wanted - current) / derivative, -0.2, 0.2) * 0.5 +
            (profile.pathBias || 0) * Math.sign(current) * Math.min(1, Math.abs(current) * 40),
          -limit,
          limit,
        );
        points[i] = pos(i, offsets[i]);
      }
    for (let i = 0; i < n; i++) {
      const bend = curvature(base[(i + n - 3) % n], base[i], base[(i + 3) % n]);
      offsets[i] = clamp(offsets[i] + Math.sign(bend) *
        Math.min(1, Math.abs(bend) * 80) * profile.apexInset, -limit, limit);
      points[i] = pos(i, offsets[i]);
    }
    const vehicle = A.Physics.parameters,
      minimumRadius = vehicle.wheelbase / Math.tan(vehicle.maxSteer),
      bends = base.map((b, i) =>
        Math.abs(curvature(base[(i + n - 1) % n], b, base[(i + 1) % n])),
      ),
      signedBends=profile.relativePassing?base.map((b,i)=>curvature(base[(i+n-1)%n],b,base[(i+1)%n])):null;
    function route(lane = 0) {
      if (routes.has(lane)) return routes.get(lane);
      const pts =
          lane === 0
            ? points
            : base.map((_, i) => {
                const side = pos(i, lane);
                // Even a wide road can have an inner passing radius smaller
                // than the vehicle can steer. Merge by local curvature on every
                // track; road width alone does not describe a hairpin.
                let bend = 0,turn=0;
                for (let d = -3; d <= 3; d++){
                  const index=(i+d+n)%n;
                  if(signedBends&&bends[index]>bend)turn=signedBends[index];
                  bend = Math.max(bend, bends[index]);
                }
                const merge = clamp(
                  bend *
                    2 *
                    (minimumRadius + Math.abs(lane) + vehicle.halfLength) -
                    1,
                  0,
                  1,
                );
                // Only the INNER route loses steering radius. Collapsing the
                // outer line as well unnecessarily turned every hairpin into
                // one lane. V4 keeps a geometrically available outside route.
                if(profile.relativePassing)return pos(i,clamp(offsets[i]+lane*(1-(lane*turn>0?merge:0)),
                  -surface.roadRadius+profile.edgeMargin,surface.roadRadius-profile.edgeMargin));
                return {
                  x: side.x + (points[i].x - side.x) * merge,
                  y: side.y + (points[i].y - side.y) * merge,
                };
              }),
        cum = [0];
      for (let i = 0; i < n; i++)
        cum.push(
          cum.at(-1) +
            Math.hypot(
              pts[(i + 1) % n].x - pts[i].x,
              pts[(i + 1) % n].y - pts[i].y,
            ),
        );
      const length = cum.at(-1);
      function at(s) {
        const dist = ((s % length) + length) % length;
        let lo = 0,
          hi = n - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid + 1] < dist) lo = mid + 1;
          else hi = mid;
        }
        const i = lo,
          f = (dist - cum[i]) / (cum[i + 1] - cum[i]),
          a = pts[i],
          b = pts[(i + 1) % n],
          prev = pts[(i + n - 1) % n],
          next = pts[(i + 2) % n],
          a1 = Math.atan2(b.y - prev.y, b.x - prev.x),
          a2 = Math.atan2(next.y - a.y, next.x - a.x),
          ang = a1 + Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)) * f;
        return {
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          ang,
          s,
          trackS: (i + f) * stride,
        };
      }
      function project(car) {
        const index = Math.floor(
          (((car.s % surface.g.len) + surface.g.len) % surface.g.len) / stride,
        );
        let best = null;
        // Keep the original track topology at adjacent hairpins. The actual
        // path distance is used only for this driver's speed and steering.
        for (let delta = -18; delta <= 18; delta++) {
          const i = (index + delta + n) % n,
            a = pts[i],
            b = pts[(i + 1) % n],
            dx = b.x - a.x,
            dy = b.y - a.y,
            f = clamp(
              ((car.x - a.x) * dx + (car.y - a.y) * dy) / (dx * dx + dy * dy),
              0,
              1,
            ),
            distance =
              (car.x - a.x - f * dx) ** 2 + (car.y - a.y - f * dy) ** 2;
          if (!best || distance < best.distance)
            best = { s: cum[i] + f * (cum[i + 1] - cum[i]), distance };
        }
        return best.s;
      }
      const result = Object.freeze({ length, at, project });
      routes.set(lane, result);
      return result;
    }
    const result = Object.freeze({ route });
    cached.set(cacheKey, result);
    return result;
  }
  A.OpponentLine = Object.freeze({ create });
})();
