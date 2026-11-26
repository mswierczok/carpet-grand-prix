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
    steerResponse: 4,
    steerReturnResponse: 9,
    steerSpeedReference: 70,
    steerSpeedReduction: 0.65,
    maxReverseSpeed: 22,
    reverseAcceleration: 20,
    reverseDelay: 0.25,
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
  function lateralAcceleration(p, speed) {
    return p.maxLateralAcceleration * (1 + (p.highSpeedGrip || 0) * Math.min(1, Math.abs(speed) / (p.gripSpeedReference || p.maxSpeed)) ** 2);
  }
  function cornerSpeedSquared(p, curvature, confidence = 1) {
    const grip = p.maxLateralAcceleration * confidence;
    return grip / Math.max(1e-9, curvature - grip * (p.highSpeedGrip || 0) / (p.gripSpeedReference || p.maxSpeed) ** 2);
  }
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
      longitudinalSpeed: 0,
      reverseHold: 0,
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
    const forward = previous.vx * fx + previous.vy * fy,
      lateral = previous.vx * nx + previous.vy * ny;
    const road = surface.project(
        previous,
        surface.boundary ? null : previous.s,
      ),
      offroad = road.distance > surface.roadRadius;
    const drag =
      p.rollingDrag +
      p.aeroDrag * forward * forward +
      (offroad ? p.offroadDrag * Math.abs(forward) : 0);
    let speed = Math.abs(forward),
      direction = Math.sign(forward),
      reverseHold = 0;
    if (throttle > 0 && brake > 0) {
      speed = Math.max(0, speed - (p.braking + drag) * dt);
    } else if (throttle > 0) {
      if (direction < 0)
        speed = Math.max(0, speed - (throttle * p.braking + drag) * dt);
      else {
        direction = 1;
        speed = clamp(
          speed + (throttle * p.acceleration - (speed > 0 ? drag : 0)) * dt,
          0,
          p.maxSpeed,
        );
      }
    } else if (brake > 0) {
      if (direction > 0)
        speed = Math.max(0, speed - (brake * p.braking + drag) * dt);
      else {
        reverseHold = Math.min(
          p.reverseDelay,
          (previous.reverseHold || 0) + dt,
        );
        if (direction < 0 || reverseHold + 1e-12 >= p.reverseDelay) {
          direction = -1;
          speed = clamp(
            speed +
              (brake * p.reverseAcceleration - (speed > 0 ? drag : 0)) * dt,
            0,
            p.maxReverseSpeed,
          );
        }
      }
    } else speed = Math.max(0, speed - drag * dt);
    const longitudinalSpeed = speed * direction;
    const steeringLimit =
      p.maxSteer /
      (1 +
        p.steerSpeedReduction *
          (Math.abs(forward) / p.steerSpeedReference) ** 2);
    const targetSteering = steer * steeringLimit;
    const centering = steer === 0 || previous.steering * targetSteering < 0;
    const response = centering ? p.steerReturnResponse : p.steerResponse;
    const steering =
      previous.steering +
      (targetSteering - previous.steering) * (1 - Math.exp(-response * dt));
    const desiredYaw = (longitudinalSpeed / p.wheelbase) * Math.tan(steering),
      grip = lateralAcceleration(p, speed) * (offroad ? p.offroadGrip : 1),
      yaw = clamp(
        desiredYaw,
        -grip / Math.max(speed, 1),
        grip / Math.max(speed, 1),
      );
    const heading = previous.heading + yaw * dt,
      retain = Math.exp(-p.lateralDamping * dt),
      residual = lateral * retain,
      side = Math.abs(residual) < 0.001 ? 0 : residual;
    let vx = Math.cos(heading) * longitudinalSpeed - Math.sin(heading) * side,
      vy = Math.sin(heading) * longitudinalSpeed + Math.cos(heading) * side;
    const proposed = {
      x: previous.x + vx * dt,
      y: previous.y + vy * dt,
      heading,
      steering,
      vx,
      vy,
      speed: Math.hypot(vx, vy),
      longitudinalSpeed,
      reverseHold,
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
        [-1, -1],
        [-1, 1],
      ].map(([a, b]) => ({
        x: state.x + a * p.halfLength * cs - b * p.halfWidth * sn,
        y: state.y + a * p.halfLength * sn + b * p.halfWidth * cs,
      }));
    };
    const corners = footprint(proposed);
    let hit = surface.boundary
      ? surface.boundary.blocksFootprint(corners)
      : corners.some(
          (c) => surface.project(c, previous.s).distance > surface.outerRadius,
        );
    if (hit) {
      proposed.x = previous.x;
      proposed.y = previous.y;
      proposed.heading = previous.heading;
      proposed.vx = 0;
      proposed.vy = 0;
      proposed.speed = 0;
      proposed.longitudinalSpeed = 0;
      proposed.hitWall = true;
    }
    const projection = surface.project(proposed, previous.s);
    const nearest = surface.boundary ? surface.project(proposed) : projection;
    proposed.s =
      surface.boundary &&
      projection.distance > nearest.distance + surface.g.width * 0.25
        ? previous.s + surface.gap(previous.s, nearest.s)
        : projection.s;
    proposed.offroad = nearest.distance > surface.roadRadius;
    return proposed;
  }
  A.Physics = Object.freeze({ parameters, spawn, step, lateralAcceleration, cornerSpeedSquared });
})();
