import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
import { ROOT } from "./game.js";
export function loadArcade({ race = false } = {}) {
  const math = Object.create(Math);
  math.random = () => {
    throw Error("Der Fahrtest darf keine Zufallssteuerung verwenden.");
  };
  const scope = createContext({ Math: math });
  for (const file of [
    "data/arcade-tracks",
    "data/arcade-roster",
    "data/arcade-boundaries",
    "racing/boundary-field",
    "racing/track-surface",
    "racing/physics",
    "racing/timing",
    "racing/session",
    ...(race
      ? ["racing/vehicle-contacts", "racing/opponents", "racing/race-session"]
      : []),
  ])
    new Script(
      readFileSync(new URL(`src/${file}.js`, ROOT), "utf8"),
    ).runInContext(scope);
  return { api: scope.CGPArcade, data: scope.CGPArcadeData };
}
// Test-only feedback driver. Produces the same binary commands as keyboard buttons;
// it never changes a pose, physics parameter, clock or checkpoint.
export function driveBahrain(
  session,
  { laps = 3, maxSeconds = 240, binary = true } = {},
) {
  const surface = session.surface,
    p = session.parameters,
    trace = [],
    lapTimes = [];
  let priorCompleted = 0;
  session.pause(false);
  for (let frame = 0; frame < maxSeconds * 30; frame++) {
    const snap = session.snapshot(),
      car = snap.car,
      look = Math.max(12, Math.min(30, 12 + car.speed * 0.18)),
      target = surface.at(car.s + look),
      angle = Math.atan2(
        Math.sin(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
        Math.cos(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
      );
    let curvature = 0.001;
    for (let ahead = 0; ahead < 70; ahead += 7) {
      const a = surface.at(car.s + ahead),
        b = surface.at(car.s + ahead + 8),
        turn = Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang));
      curvature = Math.max(curvature, Math.abs(turn) / 8);
    }
    const targetSpeed = Math.min(
      92,
      Math.sqrt((p.maxLateralAcceleration * 0.62) / curvature),
    );
    const steer = binary
      ? Math.abs(angle) > 0.065
        ? Math.sign(angle)
        : 0
      : Math.max(
          -1,
          Math.min(
            1,
            Math.atan2(2 * p.wheelbase * Math.sin(angle), look) / p.maxSteer,
          ),
        );
    const input = {
      throttle: Number(car.speed < targetSpeed),
      brake: Number(car.speed > targetSpeed + 3),
      steer,
    };
    trace.push(input);
    session.advance(input, 1 / 30);
    const next = session.snapshot();
    if (next.timing.completed > priorCompleted) {
      lapTimes.push(next.timing.lastLap);
      priorCompleted = next.timing.completed;
      if (priorCompleted >= laps)
        return {
          trace,
          lapTimes,
          seconds: next.timing.elapsed,
          contacts: next.contacts,
        };
    }
  }
  const last = session.snapshot();
  throw Error(
    `Fahrprobe nicht beendet: ${JSON.stringify({ s: last.car.s, speed: last.car.speed, car: last.car, timing: last.timing, contacts: last.contacts })}`,
  );
}
