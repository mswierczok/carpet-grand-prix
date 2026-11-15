(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  const create = () => ({
    elapsed: 0,
    nextGate: 0,
    started: false,
    lapStart: null,
    completed: 0,
    lastLap: null,
    bestLap: null,
    invalid: false,
  });
  function step(old, from, to, surface, dt) {
    const state = {
        ...old,
        elapsed: old.elapsed + dt,
        invalid: false,
      },
      gate = surface.gates[old.nextGate],
      tx = Math.cos(gate.ang),
      ty = Math.sin(gate.ang);
    const before = (from.x - gate.x) * tx + (from.y - gate.y) * ty,
      after = (to.x - gate.x) * tx + (to.y - gate.y) * ty;
    if (
      !(to.longitudinalSpeed < 0) &&
      before <= 0 &&
      after > 0 &&
      after > before
    ) {
      const fraction = -before / (after - before),
        x = from.x + (to.x - from.x) * fraction,
        y = from.y + (to.y - from.y) * fraction;
      const lateral = Math.abs(-(x - gate.x) * ty + (y - gate.y) * tx);
      if (lateral <= surface.outerRadius) {
        const at = old.elapsed + dt * fraction;
        if (old.nextGate === 0) {
          if (old.started) {
            const lap = { seconds: at - old.lapStart, valid: true };
            state.lastLap = lap;
            state.completed++;
            if (
              lap.valid &&
              (state.bestLap === null || lap.seconds < state.bestLap)
            )
              state.bestLap = lap.seconds;
          }
          state.started = true;
          state.lapStart = at;
          state.invalid = false;
        }
        state.nextGate = (old.nextGate + 1) % surface.gates.length;
      }
    }
    return state;
  }
  A.Timing = Object.freeze({ create, step });
})();
