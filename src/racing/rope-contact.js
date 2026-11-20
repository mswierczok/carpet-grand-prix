(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    base = A.Physics,
    openViews = new WeakMap(),
    indexes = new WeakMap(),
    cell = 32;
  function footprint(car, p) {
    const c = Math.cos(car.heading),
      s = Math.sin(car.heading);
    return [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ].map(([a, b]) => ({
      x: car.x + a * p.halfLength * c - b * p.halfWidth * s,
      y: car.y + a * p.halfLength * s + b * p.halfWidth * c,
    }));
  }
  const cross = (a, b, p) =>
    (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  function distance(p, a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy),
        ),
      );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function intersects(a, b, c, d) {
    return (
      cross(a, b, c) * cross(a, b, d) <= 0 &&
      cross(c, d, a) * cross(c, d, b) <= 0 &&
      Math.max(a.x, b.x) >= Math.min(c.x, d.x) &&
      Math.max(c.x, d.x) >= Math.min(a.x, b.x) &&
      Math.max(a.y, b.y) >= Math.min(c.y, d.y) &&
      Math.max(c.y, d.y) >= Math.min(a.y, b.y)
    );
  }
  function inCar(point, corners) {
    const sides = corners.map((a, i) => cross(a, corners[(i + 1) % 4], point));
    return !sides.some((v) => v > 1e-9) || !sides.some((v) => v < -1e-9);
  }
  function touches(edge, corners, radius) {
    if (inCar(edge.a, corners) || inCar(edge.b, corners)) return true;
    return corners.some((a, i) => {
      const b = corners[(i + 1) % 4];
      return (
        intersects(a, b, edge.a, edge.b) ||
        Math.min(
          distance(a, edge.a, edge.b),
          distance(b, edge.a, edge.b),
          distance(edge.a, a, b),
          distance(edge.b, a, b),
        ) <= radius
      );
    });
  }
  function nearby(field, corners, radius) {
    if (!indexes.has(field)) {
      const grid = new Map();
      for (const points of [
        ...field.loops,
        ...(field.dividers || []).map((d) => d.points),
      ])
        for (let i = 1; i < points.length; i++) {
          const a = { x: points[i - 1][0], y: points[i - 1][1] },
            b = { x: points[i][0], y: points[i][1] },
            length = Math.hypot(b.x - a.x, b.y - a.y);
          if (length < 1e-8) continue;
          const edge = {
            a,
            b,
            nx: -(b.y - a.y) / length,
            ny: (b.x - a.x) / length,
          };
          for (
            let y = Math.floor(Math.min(a.y, b.y) / cell);
            y <= Math.floor(Math.max(a.y, b.y) / cell);
            y++
          )
            for (
              let x = Math.floor(Math.min(a.x, b.x) / cell);
              x <= Math.floor(Math.max(a.x, b.x) / cell);
              x++
            ) {
              const key = x + "," + y;
              if (!grid.has(key)) grid.set(key, []);
              grid.get(key).push(edge);
            }
        }
      indexes.set(field, grid);
    }
    const grid = indexes.get(field),
      edges = new Set(),
      xs = corners.map((p) => p.x),
      ys = corners.map((p) => p.y);
    for (
      let y = Math.floor((Math.min(...ys) - radius) / cell);
      y <= Math.floor((Math.max(...ys) + radius) / cell);
      y++
    )
      for (
        let x = Math.floor((Math.min(...xs) - radius) / cell);
        x <= Math.floor((Math.max(...xs) + radius) / cell);
        x++
      )
        for (const edge of grid.get(x + "," + y) || []) edges.add(edge);
    return [...edges].filter((edge) => touches(edge, corners, radius));
  }
  function openView(surface) {
    if (!openViews.has(surface))
      openViews.set(
        surface,
        Object.freeze({
          ...surface,
          boundary: Object.freeze({
            ...surface.boundary,
            blocksFootprint: () => false,
          }),
        }),
      );
    return openViews.get(surface);
  }
  function safeMotion(previous, candidate, boundary, p) {
    const turn = candidate.heading - previous.heading,
      travel =
        Math.hypot(candidate.x - previous.x, candidate.y - previous.y) +
        Math.hypot(p.halfLength, p.halfWidth) * Math.abs(turn),
      steps = Math.max(turn === 0 ? 1 : 4, Math.ceil(travel / 0.3));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (
        boundary.blocksFootprint(
          footprint(
            {
              x: previous.x + (candidate.x - previous.x) * t,
              y: previous.y + (candidate.y - previous.y) * t,
              heading: previous.heading + turn * t,
            },
            p,
          ),
        )
      )
        return false;
    }
    return true;
  }
  function fitPivot(
    previous,
    free,
    heading,
    normals,
    surface,
    p,
    maxCorrection,
  ) {
    if (heading === previous.heading) return null;
    const road = surface.project(previous, previous.s),
      directions = [
        { x: road.x - previous.x, y: road.y - previous.y },
        normals.reduce((v, n) => ({ x: v.x + n.x, y: v.y + n.y }), {
          x: 0,
          y: 0,
        }),
        ...normals,
      ],
      at = (n, distance) => ({
        ...free,
        x: previous.x + n.x * distance,
        y: previous.y + n.y * distance,
        heading,
      }),
      clear = (car) =>
        !surface.boundary.blocksFootprint(footprint(car, p)) &&
        safeMotion(previous, car, surface.boundary, p),
      zero = at({ x: 0, y: 0 }, 0);
    if (safeMotion(previous, zero, surface.boundary, p)) return zero;
    // At a concave contour, the infinite half-planes of adjacent rope edges
    // can disagree. Fit a tiny, bounded clearance using the real footprint
    // predicate instead, without moving to a racing line or crossing a rail.
    for (const direction of directions) {
      const length = Math.hypot(direction.x, direction.y);
      if (length < 1e-8) continue;
      const n = { x: direction.x / length, y: direction.y / length };
      if (!clear(at(n, maxCorrection))) continue;
      let low = 0,
        high = maxCorrection;
      for (let i = 0; i < 9; i++) {
        const mid = (low + high) / 2;
        if (clear(at(n, mid))) high = mid;
        else low = mid;
      }
      const candidate = at(n, high);
      if (safeMotion(previous, candidate, surface.boundary, p))
        return candidate;
    }
    return null;
  }
  function resolve(previous, free, input, surface, p, dt) {
    const boundary = surface.boundary,
      field = surface.bridge?.fieldAt(previous.s) || boundary,
      radius = field.railRadius + 1e-6,
      edges = nearby(field, footprint(free, p), radius);
    if (boundary.blocksFootprint(footprint(previous, p))) return null;
    const normals = edges.map((edge) => {
      const side =
        (previous.x - edge.a.x) * edge.nx + (previous.y - edge.a.y) * edge.ny >=
        0
          ? 1
          : -1;
      return { x: edge.nx * side, y: edge.ny * side, at: edge.a };
    });
    // BridgeSurface also enforces its existing local road envelope. It can
    // be tighter than the polygon patch near a crossing; resolve that same
    // constraint on the current level, never an edge from the other deck.
    if (surface.bridge)
      for (const corner of footprint(free, p)) {
        const road = surface.project(corner, previous.s);
        if (road.distance <= surface.outerRadius - field.railRadius) continue;
        const x = (road.x - corner.x) / road.distance,
          y = (road.y - corner.y) / road.distance;
        normals.push({
          x,
          y,
          at: {
            x: road.x - x * surface.outerRadius,
            y: road.y - y * surface.outerRadius,
          },
        });
      }
    if (!normals.length) return null;
    let vx = free.vx,
      vy = free.vy;
    for (let pass = 0; pass < 3; pass++)
      for (const n of normals) {
        const inward = Math.min(0, vx * n.x + vy * n.y);
        vx -= inward * n.x;
        vy -= inward * n.y;
      }
    if (Math.hypot(vx, vy) < 1e-6) vx = vy = 0;
    const throttle = Number.isFinite(input.throttle)
        ? Math.max(0, Math.min(1, input.throttle))
        : 0,
      brake = Number.isFinite(input.brake)
        ? Math.max(0, Math.min(1, input.brake))
        : 0;
    const forward =
        previous.vx * Math.cos(previous.heading) +
        previous.vy * Math.sin(previous.heading),
      drive =
        throttle > 0 && !(brake > 0) && free.longitudinalSpeed > 0
          ? 1
          : brake > 0 && !(throttle > 0) && free.longitudinalSpeed < 0
            ? -1
            : 0,
      steer = Number.isFinite(input.steer)
        ? Math.max(-1, Math.min(1, input.steer))
        : 0,
      // A small contact-only pivot lets a stopped nose turn away with gas and
      // steering. No steering assistance is applied on the open track.
      heading =
        Math.abs(forward) < 8 && drive && steer
          ? previous.heading + drive * steer * 0.9 * dt
          : free.heading;
    let candidate = {
      ...free,
      x: previous.x + vx * dt,
      y: previous.y + vy * dt,
      heading,
    };
    const maxCorrection =
      0.1 + (p.halfLength + p.halfWidth) * Math.abs(heading - previous.heading);
    // Keep enough clearance for the small arc swept between the two poses,
    // rather than fitting only the final rectangle flush against the rope.
    const separationRadius =
      radius +
      (Math.hypot(p.halfLength, p.halfWidth) *
        (heading - previous.heading) ** 2) /
        2;
    let correction = 0;
    separate: for (let pass = 0; pass < 3; pass++)
      for (const n of normals) {
        const depth =
          separationRadius -
          Math.min(
            ...footprint(candidate, p).map(
              (c) => (c.x - n.at.x) * n.x + (c.y - n.at.y) * n.y,
            ),
          );
        if (depth <= 0) continue;
        correction += depth;
        if (correction > maxCorrection) break separate;
        candidate.x += depth * n.x;
        candidate.y += depth * n.y;
      }
    // Validate the entire motion, not just its endpoint: no divider, inner
    // island or bridge rail can be crossed by the slide or pivot.
    if (
      correction > maxCorrection ||
      !safeMotion(previous, candidate, boundary, p)
    ) {
      candidate = fitPivot(
        previous,
        free,
        heading,
        normals,
        surface,
        p,
        maxCorrection,
      );
      if (!candidate) return null;
      vx = vy = 0;
    }
    candidate.vx = vx;
    candidate.vy = vy;
    candidate.speed = Math.hypot(vx, vy);
    candidate.longitudinalSpeed =
      vx * Math.cos(heading) + vy * Math.sin(heading);
    candidate.hitWall = true;
    const projection = surface.project(candidate, previous.s),
      nearest = surface.project(candidate);
    candidate.s =
      projection.distance > nearest.distance + surface.g.width * 0.25
        ? previous.s + surface.gap(previous.s, nearest.s)
        : projection.s;
    candidate.offroad = nearest.distance > surface.roadRadius;
    return candidate;
  }
  A.Physics = Object.freeze({
    ...base,
    step(previous, input, surface, p = base.parameters, dt = 1 / 120) {
      const next = base.step(previous, input, surface, p, dt);
      if (!next.hitWall || !surface.boundary) return next;
      const free = base.step(previous, input, openView(surface), p, dt);
      return resolve(previous, free, input, surface, p, dt) || next;
    },
  });
})();
