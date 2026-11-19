// Read-only test driver: real keyboard commands, no game state writes.
export function pilotPit({ fast = false } = {}) {
  const A = CGPArcade,
    surface = A.Surface.create(A.TrackCatalog.get("bahrain")),
    pit = surface.g.pit,
    cum = [0],
    held = new Set();
  pit
    .slice(1)
    .forEach((p, i) =>
      cum.push(cum.at(-1) + Math.hypot(p.x - pit[i].x, p.y - pit[i].y)),
    );

  const key = (code, down) => {
    if (held.has(code) === down) return;
    down ? held.add(code) : held.delete(code);
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
    );
  };
  const pathAt = (s) => {
    let i = 0;
    while (i < pit.length - 2 && cum[i + 1] < s) i++;
    const f = Math.max(0, Math.min(1, (s - cum[i]) / (cum[i + 1] - cum[i]))),
      a = pit[i],
      b = pit[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  let mode = "main", peakKmh = 0;
  globalThis.__pitDrive = {
    mode,
    progress: 0,
    length: cum.at(-1),
    done: false,
  };
  const timer = setInterval(() => {
    const snapshot = globalThis.__driveSnapshot;
    if (!snapshot) return;
    if (snapshot.paused) {
      for (const code of [...held]) key(code, false);
      return;
    }
    const car = snapshot.car;
    if (mode === "pit" && A.PitLane.contains(surface, car)) peakKmh = Math.max(peakKmh, car.speed * A.Physics.parameters.metersPerUnit * 3.6);
    if (mode === "main" && car.s > surface.g.len - 225) mode = "pit";
    let input;
    if (mode === "pit") {
      let nearest = Infinity,
        progress = 0;
      for (let i = 0; i < pit.length - 1; i++) {
        const a = pit[i],
          b = pit[i + 1],
          dx = b.x - a.x,
          dy = b.y - a.y,
          f = Math.max(
            0,
            Math.min(
              1,
              ((car.x - a.x) * dx + (car.y - a.y) * dy) / (dx * dx + dy * dy),
            ),
          ),
          distance = Math.hypot(car.x - a.x - f * dx, car.y - a.y - f * dy);
        if (distance < nearest) {
          nearest = distance;
          progress = cum[i] + f * (cum[i + 1] - cum[i]);
        }
      }
      globalThis.__pitDrive = {
        mode,
        peakKmh,
        progress,
        length: cum.at(-1),
        done: false,
      };
      const target = pathAt(progress + 10),
        angle = Math.atan2(
          Math.sin(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
          Math.cos(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
        ),
        desired = Math.atan2(
          2 * A.Physics.parameters.wheelbase * Math.sin(angle),
          10,
        );
      const targetSpeed = fast && car.x > 650 && car.x < 740 && Math.abs(car.y - 145) < 4 ? 75 : 24;
      input = {
        throttle: Number(car.speed < targetSpeed),
        brake: Number(car.speed > targetSpeed + 2),
        steer:
          Math.abs(desired) > 0.003 &&
          car.steering * Math.sign(desired) < Math.abs(desired) - 0.002
            ? Math.sign(desired)
            : 0,
      };
      if (progress > cum.at(-1) - 5) {
        mode = "done";
        globalThis.__pitDrive.done = true;
      }
    } else {
      const p = A.Physics.parameters,
        look = Math.max(12, Math.min(30, 12 + car.speed * 0.18)),
        target = surface.at(car.s + look),
        angle = Math.atan2(
          Math.sin(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
          Math.cos(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
        );
      let curvature = 0.001;
      for (let ahead = 0; ahead < 70; ahead += 7) {
        const a = surface.at(car.s + ahead),
          b = surface.at(car.s + ahead + 8);
        curvature = Math.max(
          curvature,
          Math.abs(
            Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang)),
          ) / 8,
        );
      }
      const speed = Math.min(
          92,
          Math.sqrt((p.maxLateralAcceleration * 0.62) / curvature),
        ),
        desired = Math.atan2(2 * p.wheelbase * Math.sin(angle), look);
      input = {
        throttle: Number(car.speed < speed),
        brake: Number(car.speed > speed + 3),
        steer:
          Math.abs(desired) > 0.003 &&
          car.steering * Math.sign(desired) < Math.abs(desired) - 0.002
            ? Math.sign(desired)
            : 0,
      };
    }
    key("KeyW", !!input.throttle);
    key("KeyS", !!input.brake);
    key("KeyA", input.steer < 0);
    key("KeyD", input.steer > 0);
    if (mode === "done") {
      for (const code of [...held]) key(code, false);
      clearInterval(timer);
    }
  }, 1000 / 30);
}
