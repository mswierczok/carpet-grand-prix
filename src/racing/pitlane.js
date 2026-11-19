(() => {
  "use strict";
  const A = globalThis.CGPArcade, base = A.Physics, limitKmh = 80, bounds = new WeakMap();
  function contains(surface, point) {
    const radius = surface.g.pitRadius;
    // Only explicitly opened, collision-tested pit corridors qualify. The
    // overlapping main straight keeps its ordinary racing behaviour.
    if (!radius) return false;
    if (!bounds.has(surface)) bounds.set(surface, {
      minX: Math.min(...surface.g.pit.map(p => p.x)) - radius,
      maxX: Math.max(...surface.g.pit.map(p => p.x)) + radius,
      minY: Math.min(...surface.g.pit.map(p => p.y)) - radius,
      maxY: Math.max(...surface.g.pit.map(p => p.y)) + radius,
    });
    const box = bounds.get(surface);
    if (point.x < box.minX || point.x > box.maxX || point.y < box.minY || point.y > box.maxY ||
      surface.project(point).distance <= surface.roadRadius) return false;
    const points = surface.g.pit;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y,
        t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy) <= radius) return true;
    }
    return false;
  }
  A.PitLane = Object.freeze({ limitKmh, contains });
  A.Physics = Object.freeze({ ...base,
    step(previous, input, surface, p = base.parameters, dt = 1 / 120, context = null) {
      if (!contains(surface, previous)) return base.step(previous, input, surface, p, dt, context);
      const limit = Math.min(p.maxSpeed, limitKmh / (p.metersPerUnit * 3.6)),
        forward = previous.vx * Math.cos(previous.heading) + previous.vy * Math.sin(previous.heading),
        overspeed = forward > limit + 1e-9,
        command = overspeed ? { ...input, throttle: 0, brake: 1 } : input,
        next = base.step(previous, command, surface,
          { ...p, maxSpeed: limit, offroadDrag: 0, offroadGrip: 1 }, dt, null);
      // Apply the limiter through normal braking; never teleport a pose or
      // overwrite velocity. Slipstream/catch-up do not override pit safety.
      if (contains(surface, next)) next.offroad = false;
      return next;
    },
  });
})();
