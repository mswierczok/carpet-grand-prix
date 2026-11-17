(() => {
  "use strict";
  const A = globalThis.CGPArcade, base = A.Physics,
    settings = Object.freeze({ maxPace: 0.012, recoveryPace: 0.003,
      startSeconds: 8, gapStartSeconds: 2, fullGapSeconds: 10,
      duelMinSeconds: 0.7, duelFullSeconds: 1.8, duelFloor: 0.25,
      riseSeconds: 0.8, fallSeconds: 1.2,
      errorHoldSeconds: 0.35, recoverySeconds: 8, cooldownSeconds: 4 });
  const clamp = (v, max = 1) => Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));
  const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const positionLimit = (position) => position <= 3 ? 0 : position <= 6 ? 0.002 : position <= 9 ? 0.005 : 0.009;
  function empty() {
    return { pace: 0, target: 0, position: null, leaderGapSeconds: null, duelFactor: 1,
      recoveryRemaining: 0, errorSeconds: 0, armed: false, suppressed: false, recoveryUntil: -Infinity, contactUntil: -Infinity };
  }
  function update(entries, surface, p, time, dt, history, progress) {
    const active = entries.filter((e) => e.finishTime === null),
      order = [...entries].sort((a, b) => {
        if (a.finishTime !== null || b.finishTime !== null) {
          if (a.finishTime === null) return 1;
          if (b.finishTime === null) return -1;
          return a.finishTime - b.finishTime || a.id.localeCompare(b.id);
        }
        return progress(b) - progress(a) || a.id.localeCompare(b.id);
      });
    for (const entry of entries) history.observe(entry.id,
      entry.finishTime === null ? progress(entry) : entry.timing.completed * surface.g.len,
      entry.finishTime === null ? time : entry.finishTime);
    return entries.map((entry) => {
      const old = entry.catchup || empty(), car = entry.car,
        position = order.indexOf(entry) + 1,
        contactUntil = car.hitCar ? time + 1 : old.contactUntil,
        symptom = car.offroad || car.hitWall || car.longitudinalSpeed < -1,
        suppressed = !!car.hitCar || ((symptom || time < contactUntil) && old.suppressed),
        error = !suppressed && !car.hitCar && time >= contactUntil && symptom,
        errorSeconds = error ? old.errorSeconds + dt : 0;
      let armed = old.armed || errorSeconds >= settings.errorHoldSeconds,
        recoveryUntil = old.recoveryUntil;
      if (!error && armed && !car.hitCar && time >= contactUntil) {
        if (time >= recoveryUntil + settings.cooldownSeconds) recoveryUntil = time + settings.recoverySeconds;
        armed = false;
      }
      if (suppressed) armed = false;
      const recoveryRemaining = Math.max(0, recoveryUntil - time),
        leader = order[0],
        crossed = leader ? history.crossing(leader.id, progress(entry)) : null,
        gap = entry === leader ? 0 : crossed === null ? null : Math.max(0, time - crossed);
      let duelFactor = 1;
      for (const other of active) {
        if (other === entry || Math.abs((car.elevation || 0) - (other.car.elevation || 0)) > 6) continue;
        const routeGap = Math.abs(surface.gap(car.s, other.car.s)),
          worldGap = Math.hypot(car.x - other.car.x, car.y - other.car.y);
        if (routeGap < 60 && worldGap < 60)
          duelFactor = Math.min(duelFactor, settings.duelFloor + (1 - settings.duelFloor) * smooth((Math.max(routeGap, worldGap) - 22) / 38));
      }
      const neighbor = order[position - 2], behind = order[position],
        aheadTime = neighbor ? history.crossing(neighbor.id, progress(entry)) : null,
        behindTime = behind ? history.crossing(entry.id, progress(behind)) : null;
      for (const stamp of [aheadTime, behindTime]) {
        if (stamp === null) continue;
        const seconds = Math.max(0, time - stamp);
        duelFactor = Math.min(duelFactor, settings.duelFloor + (1 - settings.duelFloor) *
          smooth((seconds - settings.duelMinSeconds) / (settings.duelFullSeconds - settings.duelMinSeconds)));
      }
      const eligible = !entry.player && position > 3 && entry.finishTime === null &&
        entry.timing.started && time >= settings.startSeconds && gap !== null &&
        !car.offroad && !car.hitWall && !car.hitCar && car.longitudinalSpeed > 1,
        gapFactor = gap === null ? 0 : smooth((gap - settings.gapStartSeconds) /
          (settings.fullGapSeconds - settings.gapStartSeconds)),
        limit = Math.min(settings.maxPace, positionLimit(position) + (recoveryRemaining > 0 ? settings.recoveryPace : 0)),
        target = eligible ? limit * gapFactor * duelFactor : 0,
        tau = target > old.pace ? settings.riseSeconds : settings.fallSeconds,
        pace = eligible ? clamp(old.pace + (target - old.pace) * (1 - Math.exp(-dt / tau)), Math.min(limit, settings.maxPace)) : 0;
      return { pace, target, position: position || null, leaderGapSeconds: gap, duelFactor,
        recoveryRemaining: entry.player || entry.finishTime !== null ? 0 : recoveryRemaining,
        errorSeconds, armed, suppressed, recoveryUntil, contactUntil };
    });
  }
  function visible(state) {
    const { pace, target, position, leaderGapSeconds, duelFactor, recoveryRemaining } = state;
    return { pace, target, position, leaderGapSeconds, duelFactor, recoveryRemaining };
  }
  A.Catchup = Object.freeze({ settings, empty, positionLimit, update, visible });
  A.Physics = Object.freeze({ ...base,
    step(previous, input, surface, p = base.parameters, dt = 1 / 120, context = null) {
      if (context?.catchup === undefined) return base.step(previous, input, surface, p, dt, context);
      const pace = clamp(context.catchup, settings.maxPace),
        assisted = pace ? { ...p, maxSpeed: p.maxSpeed * (1 + pace), acceleration: p.acceleration * (1 + pace) } : p;
      // Only longitudinal engine assistance. Never grant extra corner grip,
      // braking, steering, a position write, or a player-specific advantage.
      return base.step(previous, input, surface, assisted, dt, { ...context, aerodynamicBase: p });
    },
  });
})();
