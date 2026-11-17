(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    base = A.Physics,
    settings = Object.freeze({
      minKmh: 80, fullKmh: 90, minLengths: 2, fullLengths: 3,
      fadeLengths: 6, maxLengths: 8, releaseLengths: 9,
      lateralWidths: 0.8, releaseWidths: 1.2,
      riseSeconds: 0.65, fallSeconds: 0.45,
      maxGainKmh: 3, governorResponse: 3,
    });
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
  function empty() {
    return { strength: 0, sourceId: null, distanceLengths: null, lateral: null, dragReduction: 0 };
  }
  function reduction(p) {
    const gain = settings.maxGainKmh / (p.metersPerUnit * 3.6);
    // At full throttle the existing speed limiter supplies only the force
    // needed at maxSpeed. Above it, the engine governor tapers that force.
    // Solve the drag equilibrium for exactly +3 km/h, never assign velocity.
    return clamp(1 - (p.aeroDrag * p.maxSpeed ** 2 - settings.governorResponse * gain) /
      (p.aeroDrag * (p.maxSpeed + gain) ** 2));
  }
  function pair(follower, leader, surface, p, release = false) {
    const a = follower.car, b = leader.car,
      forwardA = a.vx * Math.cos(a.heading) + a.vy * Math.sin(a.heading),
      forwardB = b.vx * Math.cos(b.heading) + b.vy * Math.sin(b.heading),
      kmh = Math.min(forwardA, forwardB) * p.metersPerUnit * 3.6;
    if (follower.id === leader.id || follower.finishTime !== null || leader.finishTime !== null ||
      a.offroad || b.offroad || a.hitWall || b.hitWall || a.hitCar || b.hitCar || kmh < settings.minKmh)
      return null;
    const dx = b.x - a.x, dy = b.y - a.y,
      length = 2 * p.halfLength,
      along = dx * Math.cos(b.heading) + dy * Math.sin(b.heading),
      lateral = -dx * Math.sin(b.heading) + dy * Math.cos(b.heading),
      lengths = along / length,
      width = 2 * p.halfWidth * (release ? settings.releaseWidths : settings.lateralWidths);
    if (lengths < settings.minLengths || lengths > (release ? settings.releaseLengths : settings.maxLengths) ||
      Math.abs(lateral) >= width || Math.cos(a.heading - b.heading) < 0.94 ||
      Math.abs((a.elevation || 0) - (b.elevation || 0)) > 2)
      return null;
    // A positive local route gap rejects another arm, the opposite side of a
    // hairpin, crossing decks and close parallel roads (including over a lap).
    const gap = surface.gap(a.s, b.s);
    if (gap <= 0 || Math.abs(gap - along) > Math.max(length, along * 0.12)) return null;
    for (let i = 0, count = Math.ceil(along / (length / 2)); i <= count; i++) {
      const f = i / count, s = a.s + gap * f,
        point = { x: a.x + dx * f, y: a.y + dy * f },
        road = surface.project(point, s);
      if (!road || road.distance > surface.roadRadius - p.halfWidth ||
        Math.cos(road.ang - b.heading) < 0.9 ||
        !surface.boundary.contains(point, s) ||
        (surface.bridge && Math.abs(surface.bridge.heightAt(s) -
          ((a.elevation || 0) + ((b.elevation || 0) - (a.elevation || 0)) * f)) > 1))
        return null;
    }
    const strength = smooth((kmh - settings.minKmh) / (settings.fullKmh - settings.minKmh)) *
      smooth((lengths - settings.minLengths) / (settings.fullLengths - settings.minLengths)) *
      (1 - smooth((lengths - settings.fadeLengths) / (settings.maxLengths - settings.fadeLengths))) *
      (1 - smooth(Math.abs(lateral) / (2 * p.halfWidth * settings.lateralWidths)));
    return { strength, sourceId: leader.id, distanceLengths: lengths, lateral };
  }
  function update(entries, surface, p, dt) {
    return entries.map((entry) => {
      let best = null;
      for (const leader of entries) {
        const candidate = pair(entry, leader, surface, p);
        if (candidate && candidate.strength > (best?.strength || 0)) best = candidate;
      }
      const prior = entry.slipstream || empty(),
        source = entries.find((e) => e.id === prior.sourceId),
        support = source && pair(entry, source, surface, p, true);
      // Invalid topology/contact is cut immediately for safety. The ordinary
      // lateral/distance release fades while the original corridor stays valid.
      if (!best && !support) return empty();
      const target = best || { ...support, strength: 0 },
        previous = target.sourceId === prior.sourceId ? prior.strength : 0,
        tau = target.strength > previous ? settings.riseSeconds : settings.fallSeconds,
        strength = previous + (target.strength - previous) * (1 - Math.exp(-dt / tau));
      return strength < 1e-5 ? empty() : {
        ...target, strength, dragReduction: strength * reduction(p),
      };
    });
  }
  A.Slipstream = Object.freeze({ settings, empty, pair, update, reduction });
  // Race-only optional aerodynamic context. Calls without it replay the
  // original shared physics, including both free driving modes, byte for byte.
  A.Physics = Object.freeze({ ...base,
    step(previous, input, surface, p = base.parameters, dt = 1 / 120, wake = null) {
      const strength = clamp(wake?.strength || 0),
        forward = previous.vx * Math.cos(previous.heading) + previous.vy * Math.sin(previous.heading);
      if (!wake || (strength === 0 && forward <= p.maxSpeed))
        return base.step(previous, input, surface, p, dt);
      const highSpeed = forward >= p.maxSpeed - 1e-9,
        acceleration = highSpeed ? Math.max(0, p.rollingDrag + p.aeroDrag * p.maxSpeed ** 2 -
          settings.governorResponse * Math.max(0, forward - p.maxSpeed)) : p.acceleration;
      return base.step(previous, input, surface, {
        ...p, aeroDrag: p.aeroDrag * (1 - strength * reduction(wake.aerodynamicBase || p)),
        acceleration,
        maxSpeed: highSpeed ? Math.max(p.maxSpeed + settings.maxGainKmh / (p.metersPerUnit * 3.6),
          wake.catchup === undefined ? 0 : forward) : p.maxSpeed,
      }, dt);
    },
  });
})();
