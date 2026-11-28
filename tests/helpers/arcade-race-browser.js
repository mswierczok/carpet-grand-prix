// Test-only feedback driver. It reads render snapshots and sends real keyboard
// events; it never changes session state, physics parameters, poses or timing.
// Preserve the historical three-lap regression scenarios through the public
// options argument. Only this temporary response is instrumented, never assets
// on disk or the production UI. Separate tests exercise the real track defaults.
export async function threeLapRegression(page) {
  await page.route("**/src/racing/race-session.js*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
;(() => {
  const original = CGPArcade.RaceSession;
  CGPArcade.RaceSession = Object.freeze({ ...original,
    create(track, options = {}) {
      return original.create(track, { ...options, laps: options.laps ?? 3 });
    }
  });
})();
`,
    });
  });
}
export function pilotRace({ stopOnQualifiedGrid = false, difficulty = "normal", throttleDuty = 1 } = {}) {
  globalThis.__racePilotPeakSpeeds = {};
  const A = CGPArcade,
    surface = A.Surface.create(
      A.TrackCatalog.get(document.getElementById("track").value),
    ),
    p = globalThis.__driveSnapshot?.entries.find(e=>e.player)?.performance?.parameters || A.Physics.parameters,
    driver = A.Opponents.create(surface, p, { difficulty }),
    memory = driver.memory(0, -6),
    held = new Set();
  let pedalFrame = 0;
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
    if (
      s.race.phase === "finished" ||
      (stopOnQualifiedGrid && s.qualifyingResult && s.race.phase === "grid")
    ) {
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
        (s.visibleEntries || s.entries).map((e) => ({
          ...e.car,
          id: e.id,
          ...(e.slipstream ? { slipstream: e.slipstream } : {}),
        })),
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
    // Optional intentionally slow HUMAN test inputs for loss/recovery cases.
    // The normal pilot is unchanged; no car limits, timing or AI are altered.
    key("KeyW", !!input.throttle && (pedalFrame++ % 10) < Math.max(0, Math.min(10, Math.round(throttleDuty * 10))));
    key("KeyS", !!input.brake);
    key("KeyA", direction < 0);
    key("KeyD", direction > 0);
  }, 1000 / 30);
}
