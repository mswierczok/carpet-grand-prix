(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function create(surface, parameters) {
    const p = parameters,
      stride = 5,
      samples = Math.ceil(surface.g.len / stride),
      speedTable = Array.from({ length: samples }, (_, i) => {
        let allowed = p.maxSpeed;
        for (let ahead = 0; ahead < 100; ahead += 5) {
          const a = surface.at(i * stride + ahead),
            b = surface.at(i * stride + ahead + 8),
            turn = Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang));
          const curvature = Math.max(0.001, Math.abs(turn) / 8),
            cornerSquared = (p.maxLateralAcceleration * 0.7) / curvature,
            brakingDistance = Math.max(0, ahead - 12);
          allowed = Math.min(
            allowed,
            Math.sqrt(cornerSquared + 2 * p.braking * 0.8 * brakingDistance),
          );
        }
        return allowed;
      });
    const memory = (index, lane = 0) => ({
      lane,
      hold: 0,
      pace: 0.98 + (index % 3) * 0.01,
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
      const index = Math.min(
          samples - 1,
          Math.floor(
            (((car.s % surface.g.len) + surface.g.len) % surface.g.len) /
              stride,
          ),
        ),
        pace = speedTable[index] * state.pace;
      const passing = ahead && Math.abs(state.lane - ahead.lane) > 6.5;
      if (
        ahead &&
        !passing &&
        state.hold === 0 &&
        (ahead.car.speed < pace - 2 || ahead.gap < 20)
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
      } else if (
        !ahead &&
        state.hold === 0 &&
        !traffic.some((v) => Math.abs(v.gap) < 28)
      )
        state.lane = 0;
      const look = clamp(13 + car.speed * 0.13, 14, 25),
        target = surface.at(car.s + look, state.lane),
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
      let desired = pace;
      // Brake before a blocked nose; do not hold the brake into reverse.
      const blocker = traffic
        .filter(
          (v) =>
            v.gap > 0 &&
            v.gap < 80 &&
            (Math.abs(v.lane - state.lane) < 6 || Math.abs(v.lane - lane) < 6),
        )
        .sort((a, b) => a.gap - b.gap)[0];
      if (blocker) {
        const closing = Math.max(
            0,
            car.speed - Math.max(0, blocker.car.longitudinalSpeed),
          ),
          buffer = 12 + car.speed * 0.12 + closing * 0.35;
        if (blocker.gap < buffer)
          desired = Math.min(
            desired,
            Math.max(
              0,
              blocker.car.longitudinalSpeed + (blocker.gap - buffer) * 1.5,
            ),
          );
        if (Math.abs(state.lane - blocker.lane) > 6.5 && desired < 8) {
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
      if (Math.abs(error) > 0.9) desired = Math.min(desired, 18);
      return {
        throttle: Number(car.speed < desired - 0.5),
        brake: Number(
          car.longitudinalSpeed > 0.25 && car.speed > desired + 0.8,
        ),
        steer,
      };
    }
    return Object.freeze({ memory, input, prepare });
  }
  A.Opponents = Object.freeze({ create });
})();
