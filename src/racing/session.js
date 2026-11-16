(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {}),
    fixedStep = 1 / 120;
  function create(track, options = {}) {
    const surface = A.Surface.create(track),
      parameters = Object.freeze({
        ...A.Physics.parameters,
        ...options.parameters,
      });
    let car = A.Physics.spawn(surface),
      previous = car,
      timing = A.Timing.create(),
      paused = true,
      accumulator = 0,
      lastSafe = car.s,
      contacts = 0;
    function advance(input, realSeconds) {
      if (paused) return;
      accumulator += Math.min(
        0.1,
        Math.max(0, Number.isFinite(realSeconds) ? realSeconds : 0),
      );
      while (accumulator + 1e-12 >= fixedStep) {
        previous = car;
        car = A.Physics.step(car, input, surface, parameters, fixedStep);
        timing = A.Timing.step(timing, previous, car, surface, fixedStep);
        if (!car.offroad && !car.hitWall) lastSafe = car.s;
        if (car.hitWall && !previous.hitWall) contacts++;
        accumulator = Math.max(0, accumulator - fixedStep);
      }
    }
    function pause(value = true) {
      paused = !!value;
      car = { ...car, reverseHold: 0 };
      previous = car;
      accumulator = 0;
    }
    function recover() {
      car = A.Physics.spawn(surface, lastSafe);
      previous = car;
      timing = {
        ...A.Timing.create(),
        elapsed: timing.elapsed,
        completed: timing.completed,
        lastLap: timing.lastLap,
        bestLap: timing.bestLap,
      };
      accumulator = 0;
    }
    function restart() {
      car = A.Physics.spawn(surface);
      previous = car;
      timing = A.Timing.create();
      lastSafe = car.s;
      contacts = 0;
      accumulator = 0;
      paused = true;
    }
    function snapshot() {
      const alpha = paused ? 1 : accumulator / fixedStep,
        turn = Math.atan2(
          Math.sin(car.heading - previous.heading),
          Math.cos(car.heading - previous.heading),
        );
      return {
        car: { ...car },
        visual: {
          ...car,
          x: previous.x + (car.x - previous.x) * alpha,
          y: previous.y + (car.y - previous.y) * alpha,
          heading: previous.heading + turn * alpha,
          ...(surface.bridge
            ? {
                elevation:
                  previous.elevation +
                  (car.elevation - previous.elevation) * alpha,
                pitch: previous.pitch + (car.pitch - previous.pitch) * alpha,
              }
            : {}),
        },
        timing: {
          ...timing,
          lastLap: timing.lastLap ? { ...timing.lastLap } : null,
        },
        paused,
        contacts,
        lapSeconds: timing.started ? timing.elapsed - timing.lapStart : 0,
      };
    }
    return Object.freeze({
      surface,
      parameters,
      advance,
      pause,
      recover,
      restart,
      snapshot,
    });
  }
  A.Session = Object.freeze({ create, fixedStep });
})();
