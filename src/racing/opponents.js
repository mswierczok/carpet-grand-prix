(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function create(surface, parameters) {
    const p = parameters,
      stride = 5,
      lines = A.OpponentLine.create(surface),
      plans = new Map();
    function plan(lane) {
      if (plans.has(lane)) return plans.get(lane);
      const route = lines.route(lane),
        samples = Math.ceil(route.length / stride),
        speedTable = Array.from({ length: samples }, (_, i) => {
          let allowed = p.maxSpeed;
          for (let ahead = 0; ahead < 100; ahead += 5) {
            const a = route.at(i * stride + ahead),
              b = route.at(i * stride + ahead + 8),
              turn = Math.atan2(
                Math.sin(b.ang - a.ang),
                Math.cos(b.ang - a.ang),
              );
            const curvature = Math.max(0.001, Math.abs(turn) / 8),
              cornerSquared =
                (p.maxLateralAcceleration * (lane === 0 ? 1.5 : 0.85)) /
                curvature,
              brakingDistance = Math.max(0, ahead - 12);
            allowed = Math.min(
              allowed,
              Math.sqrt(cornerSquared + 2 * p.braking * 0.8 * brakingDistance),
            );
          }
          return allowed;
        });
      const result = { route, speedTable, samples };
      plans.set(lane, result);
      return result;
    }
    function motion(car, state) {
      const { route, speedTable, samples } = plan(state.lane),
        s = route.project(car),
        index = Math.min(samples - 1, Math.floor(s / stride)),
        point = route.at(s),
        road = surface.at(point.trackS),
        lane =
          -(point.x - road.x) * Math.sin(road.ang) +
          (point.y - road.y) * Math.cos(road.ang);
      return {
        route,
        s,
        lane,
        distance: Math.hypot(car.x - point.x, car.y - point.y),
        pace: Math.min(p.maxSpeed, speedTable[index] * state.pace),
      };
    }
    const memory = (index, lane = 0) => ({
      lane,
      hold: 0,
      // Small differences in corner commitment; every driver can use the
      // player's complete straight-line speed range.
      pace: 1 + (index % 3) * 0.01,
    });
    function prepare(cars) {
      return cars.map((car) => {
        const road = surface.project(car, car.s);
        return {
          ...car,
          lane:
            -(car.x - road.x) * Math.sin(road.ang) +
            (car.y - road.y) * Math.cos(road.ang),
        };
      });
    }
    function input(car, others, state, dt = 1 / 30) {
      const projection = surface.project(car, car.s),
        lane =
          car.lane ??
          -(car.x - projection.x) * Math.sin(projection.ang) +
            (car.y - projection.y) * Math.cos(projection.ang),
        traffic = others
          .filter((other) => other.id !== car.id)
          .map((other) => {
            const road =
              other.lane === undefined ? surface.project(other, other.s) : null;
            return {
              car: other,
              gap: surface.gap(car.s, other.s),
              lane:
                other.lane ??
                -(other.x - road.x) * Math.sin(road.ang) +
                  (other.y - road.y) * Math.cos(road.ang),
            };
          }),
        ahead = traffic
          .filter(
            (v) => v.gap > 0 && v.gap < 75 && Math.abs(v.lane - lane) < 5.8,
          )
          .sort((a, b) => a.gap - b.gap)[0];
      state.hold = Math.max(0, state.hold - dt);
      let path = motion(car, state);
      const passing = ahead && Math.abs(path.lane - ahead.lane) > 6.5;
      if (
        ahead &&
        !passing &&
        state.hold === 0 &&
        (ahead.car.speed < path.pace - 2 || ahead.gap < 20)
      ) {
        const choices = [-8, 8].filter(
          (target) =>
            Math.abs(target - lane) > 3 &&
            !traffic.some(
              (v) =>
                v.gap > -16 && v.gap < 35 && Math.abs(v.lane - target) < 6.5,
            ),
        );
        if (choices.length) {
          choices.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
          state.lane = choices[0];
          state.hold = 2;
        }
      } else if (!ahead && state.hold === 0 && state.lane !== 0) {
        const nominal = motion(car, { ...state, lane: 0 });
        // The leading car may merge into a clear racing line. A car ahead
        // gets priority, so adjacent drivers do not converge simultaneously.
        const busy = traffic.some(
          (v) =>
            v.gap > -18 &&
            v.gap < 28 &&
            (Math.abs(v.lane - nominal.lane) < 5.8 ||
              (v.gap > 0 && Math.abs(v.lane - nominal.lane) < 12)),
        );
        if (!busy) {
          state.lane = 0;
          state.hold = 0.6;
        }
      }
      path = motion(car, state);
      const look = clamp(8 + car.speed * 0.25, 12, 35),
        target = path.route.at(path.s + look),
        error = Math.atan2(
          Math.sin(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
          Math.cos(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
        ),
        maxSteer =
          p.maxSteer /
          (1 +
            p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
        steer = clamp(
          Math.atan2(2 * p.wheelbase * Math.sin(error), look) / maxSteer,
          -1,
          1,
        );
      let desired = path.pace;
      // A merge can start far from its new path. Settle onto it before using
      // qualifying pace, rather than running wide with the old steering angle.
      if (path.distance > 6 && Math.abs(error) > 0.2)
        desired = Math.min(desired, 65);
      // Brake before a blocked nose; do not hold the brake into reverse.
      const blocker = traffic
        .filter(
          (v) =>
            v.gap > 0 &&
            v.gap < 80 &&
            (Math.abs(v.lane - path.lane) < 6 || Math.abs(v.lane - lane) < 6),
        )
        .sort((a, b) => a.gap - b.gap)[0];
      if (blocker) {
        // Keep room for the body, reaction and braking away closing speed.
        // Matched-speed cars do not need a large speed-dependent empty gap.
        const closing = Math.max(
            0,
            car.speed - Math.max(0, blocker.car.longitudinalSpeed),
          ),
          buffer =
            2 * p.halfLength +
            2 +
            car.speed * 0.035 +
            closing * 0.15 +
            (closing * closing) / (2 * p.braking * 0.8);
        if (blocker.gap < buffer)
          desired = Math.min(
            desired,
            Math.max(
              0,
              blocker.car.longitudinalSpeed + (blocker.gap - buffer) * 1.5,
            ),
          );
        if (Math.abs(path.lane - blocker.lane) > 6.5 && desired < 8) {
          // Progress alone is too conservative beside a parked car. Creep only
          // if the actual oriented rectangle has room in the chosen direction.
          const predicted = {
            ...car,
            x: car.x + Math.cos(car.heading) * 1.5,
            y: car.y + Math.sin(car.heading) * 1.5,
          };
          if (
            !surface.boundary.blocksFootprint(
              A.VehicleContacts.footprint(predicted, p),
            ) &&
            !others.some(
              (other) =>
                other.id !== car.id &&
                A.VehicleContacts.overlap(predicted, other, p),
            )
          )
            desired = 8;
        }
      }
      if (Math.abs(error) > 0.9) desired = Math.min(desired, 40);
      state.blocked =
        car.hitWall && car.speed < 0.5 ? (state.blocked || 0) + dt : 0;
      if (state.blocked > 0.2) {
        state.retreat = 0.9;
        state.blocked = 0;
      }
      if (state.retreat > 0) {
        state.retreat = Math.max(0, state.retreat - dt);
        const rear = {
          ...car,
          x: car.x - Math.cos(car.heading) * 3,
          y: car.y - Math.sin(car.heading) * 3,
        };
        const busy = others.some(
          (other) =>
            other.id !== car.id && A.VehicleContacts.overlap(rear, other, p),
        );
        // Ordinary reverse controls, including the shared delay, no reset.
        return { throttle: Number(busy), brake: Number(!busy), steer: -steer };
      }
      return {
        // At the shared limiter keep the pedal down like a human holding W;
        // lifting for a whole input frame needlessly loses straight-line pace.
        throttle: Number(desired >= p.maxSpeed || car.speed < desired - 0.05),
        brake: Number(
          car.longitudinalSpeed > 0.25 && car.speed > desired + 0.8,
        ),
        steer,
      };
    }
    // Build every racing/passing profile before the countdown. Input updates
    // must never pay the path-planning cost during a race.
    for (const lane of [-8, -6, 0, 6, 8]) plan(lane);
    return Object.freeze({ memory, input, prepare });
  }
  A.Opponents = Object.freeze({ create });
})();
