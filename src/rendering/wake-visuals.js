(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  // Two restrained, tapered pen strokes per rear-wing tip. No particles,
  // random numbers, textures, or independent distance-based activation.
  function strokes(snapshot) {
    const result = [], entries = snapshot.entries || [], emitters = new Map();
    for (const follower of entries) {
      const wake = follower.slipstream;
      if (wake?.strength > 0) emitters.set(wake.sourceId,
        Math.max(emitters.get(wake.sourceId) || 0, wake.strength));
    }
    for (const entry of entries) {
      const strength = emitters.get(entry.id) || 0;
      if (!strength) continue;
      const pose = entry.visual, cs = Math.cos(pose.heading), sn = Math.sin(pose.heading),
        pitch = pose.pitch || 0, phase = (snapshot.race?.elapsed || 0) * 3;
      for (const side of [-1, 1]) for (let line = 0; line < 2; line++) {
        const points = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24,
            x = -5.2 - u * (10 + line * 4),
            z = side * (2.1 + u * 1.4 + Math.sin(u * Math.PI * 2.3 - phase + line) * u * 0.8),
            y = 2.3 + Math.sin(u * Math.PI * 2 - phase) * u * 0.35;
          points.push({ x: pose.x + x * cs - z * sn,
            y: (pose.elevation || 0) + y + x * Math.sin(pitch),
            z: pose.y + x * sn + z * cs,
            width: (0.35 - line * 0.09) * (1 - u * 0.85),
            alpha: Math.sqrt(strength) * 0.65 * Math.sin(Math.PI * (0.08 + u * 0.92)) });
        }
        result.push({ id: entry.id, pose, points });
      }
    }
    return result;
  }
  A.WakeVisuals = Object.freeze({ strokes });
})();
