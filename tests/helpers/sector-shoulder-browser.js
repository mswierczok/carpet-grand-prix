// Test-only keyboard driver. The real session owns every pose and checkpoint.
export function sectorShoulderPilot() {
  const A = CGPArcade,
    p = A.Physics.parameters,
    surface = A.Surface.create(CGPArcadeData.tracks.bahrain),
    held = new Set();
  let prior = 0;
  globalThis.__shoulderCrossings = [];
  const key = (code, down) => {
    if (held.has(code) === down) return;
    down ? held.add(code) : held.delete(code);
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
    );
  };
  function lane(s) {
    for (const gate of surface.checkpoints) {
      const distance = Math.abs(surface.gap(gate.s, s));
      if (distance < 115)
        return (
          (gate.index === 2 ? -19 : 19) * Math.min(1, (115 - distance) / 90)
        );
    }
    return 0;
  }
  const timer = setInterval(() => {
    const snap = globalThis.__driveSnapshot;
    if (!snap) return;
    if (snap.timing.nextGate !== prior) {
      __shoulderCrossings.push({ index: prior, offroad: snap.car.offroad });
      prior = snap.timing.nextGate;
    }
    if (snap.timing.completed >= 1) {
      for (const code of [...held]) key(code, false);
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyP", bubbles: true }),
      );
      globalThis.__shoulderLapDone = true;
      clearInterval(timer);
      return;
    }
    const car = snap.car,
      look = Math.max(12, Math.min(20, 12 + car.speed * 0.13)),
      target = surface.at(car.s + look, lane(car.s + look)),
      error = Math.atan2(
        Math.sin(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
        Math.cos(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
      ),
      limit =
        p.maxSteer /
        (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
      wanted = Math.atan2(2 * p.wheelbase * Math.sin(error), look),
      steering = Math.max(-limit, Math.min(limit, wanted)),
      direction =
        Math.abs(steering) > 0.006 &&
        car.steering * Math.sign(steering) < Math.abs(steering) - 0.003
          ? Math.sign(steering)
          : 0;
    let curvature = 0.001;
    for (let ahead = 0; ahead < 70; ahead += 7) {
      const a = surface.at(car.s + ahead),
        b = surface.at(car.s + ahead + 8);
      curvature = Math.max(
        curvature,
        Math.abs(Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang))) /
          8,
      );
    }
    const desired = Math.min(
      40,
      Math.sqrt((p.maxLateralAcceleration * 0.45) / curvature),
    );
    key("KeyW", car.speed < desired - 0.5);
    key("KeyS", car.speed > desired + 1);
    key("KeyA", direction < 0);
    key("KeyD", direction > 0);
  }, 1000 / 30);
}
