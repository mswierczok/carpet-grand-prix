// Test-only feedback driver. It reads render snapshots and sends real keyboard
// events; it never changes session state, physics parameters, poses or timing.
export function pilotRace() {
  globalThis.__racePilotPeakSpeeds = {};
  const A = CGPArcade,
    surface = A.Surface.create(
      A.TrackCatalog.get(document.getElementById("track").value),
    ),
    p = A.Physics.parameters,
    driver = A.Opponents.create(surface, p),
    memory = driver.memory(0, -6),
    held = new Set();
  const key = (code, down) => {
    if (held.has(code) === down) return;
    down ? held.add(code) : held.delete(code);
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
    );
  };
  const timer = setInterval(() => {
    const s = globalThis.__driveSnapshot;
    if (!s?.race) return;
    for (const entry of s.entries)
      __racePilotPeakSpeeds[entry.id] = Math.max(
        __racePilotPeakSpeeds[entry.id] || 0,
        entry.car.speed * p.metersPerUnit * 3.6,
      );
    if (s.race.phase === "finished") {
      for (const code of [...held]) key(code, false);
      globalThis.__racePilotDone = true;
      clearInterval(timer);
      return;
    }
    if (s.paused || s.race.phase !== "racing") {
      for (const code of [...held]) key(code, false);
      return;
    }
    const traffic = driver.prepare(
        s.entries.map((e) => ({ ...e.car, id: e.id })),
      ),
      car = traffic.find((e) => e.id === s.race.playerTeam),
      input = driver.input(car, traffic, memory),
      limit =
        p.maxSteer /
        (1 + p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
      target = input.steer * limit,
      direction =
        Math.abs(target) > 0.006 &&
        car.steering * Math.sign(target) < Math.abs(target) - 0.003
          ? Math.sign(target)
          : 0;
    key("KeyW", !!input.throttle);
    key("KeyS", !!input.brake);
    key("KeyA", direction < 0);
    key("KeyD", direction > 0);
  }, 1000 / 30);
}
