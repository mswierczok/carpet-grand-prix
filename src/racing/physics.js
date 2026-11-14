(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  // Provisional parameters for the new driving test only. World units are inherited from the track.
  const parameters = Object.freeze({
    maxSpeed: 110,
    acceleration: 55,
    braking: 145,
    rollingDrag: 1.5,
    aeroDrag: 0.0015,
    wheelbase: 7.8,
    maxSteer: 0.58,
    steerResponse: 7,
    maxLateralAcceleration: 210,
    lateralDamping: 10,
    offroadDrag: 1.7,
    offroadGrip: 0.6,
    halfLength: 5.4,
    halfWidth: 2.5,
    metersPerUnit: 0.3,
  });
  const clamp = (n, a, b) =>
    Math.max(a, Math.min(b, Number.isFinite(n) ? n : 0));
  function spawn(surface, s = -surface.g.width * 0.9) {
    const p = surface.at(s);
    return {
      x: p.x,
      y: p.y,
      heading: p.ang,
      vx: 0,
      vy: 0,
      s,
      steering: 0,
      speed: 0,
      offroad: false,
      hitWall: false,
      understeer: 0,
    };
  }
  function step(previous, input, surface, p = parameters, dt = 1 / 120) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.05)
      throw Error("Ungültiger Physikschritt");
    const throttle = clamp(input.throttle, 0, 1),
      brake = clamp(input.brake, 0, 1),
      steer = clamp(input.steer, -1, 1),
      fx = Math.cos(previous.heading),
      fy = Math.sin(previous.heading),
      nx = -fy,
      ny = fx;
    const forward = Math.max(0, previous.vx * fx + previous.vy * fy),
      lateral = previous.vx * nx + previous.vy * ny;
    const road = surface.project(previous, previous.s),
      offroad = road.distance > surface.roadRadius;
    const drag =
      p.rollingDrag +
      p.aeroDrag * forward * forward +
      (offroad ? p.offroadDrag * forward : 0);
    const speed = clamp(
      forward +
        (throttle * p.acceleration -
          brake * p.braking -
          (forward > 0 ? drag : 0)) *
          dt,
      0,
      p.maxSpeed,
    );
    const steering =
      previous.steering +
      (steer * p.maxSteer - previous.steering) *
        (1 - Math.exp(-p.steerResponse * dt));
    const desiredYaw = (speed / p.wheelbase) * Math.tan(steering),
      grip = p.maxLateralAcceleration * (offroad ? p.offroadGrip : 1),
      yaw = clamp(
        desiredYaw,
        -grip / Math.max(speed, 1),
        grip / Math.max(speed, 1),
      );
    const heading = previous.heading + yaw * dt,
      retain = Math.exp(-p.lateralDamping * dt),
      residual = lateral * retain,
      side = Math.abs(residual) < 0.001 ? 0 : residual;
    let vx = Math.cos(heading) * speed - Math.sin(heading) * side,
      vy = Math.sin(heading) * speed + Math.cos(heading) * side;
    const proposed = {
      x: previous.x + vx * dt,
      y: previous.y + vy * dt,
      heading,
      steering,
      vx,
      vy,
      speed: Math.hypot(vx, vy),
      offroad,
      hitWall: false,
      understeer: Math.abs(desiredYaw - yaw),
    };
    // Small fixed steps check all four corners against the local corridor. Reject penetration; never snap to the driving line.
    const footprint = (state) => {
      const cs = Math.cos(state.heading),
        sn = Math.sin(state.heading);
      return [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([a, b]) => ({
        x: state.x + a * p.halfLength * cs - b * p.halfWidth * sn,
        y: state.y + a * p.halfLength * sn + b * p.halfWidth * cs,
      }));
    };
    let hit = footprint(proposed).some(
      (c) => surface.project(c, previous.s).distance > surface.outerRadius,
    );
    if (hit) {
      proposed.x = previous.x;
      proposed.y = previous.y;
      proposed.heading = previous.heading;
      proposed.vx = 0;
      proposed.vy = 0;
      proposed.speed = 0;
      proposed.hitWall = true;
    }
    const projection = surface.project(proposed, previous.s);
    proposed.s = projection.s;
    proposed.offroad = projection.distance > surface.roadRadius;
    return proposed;
  }
  A.Physics = Object.freeze({ parameters, spawn, step });
})();
