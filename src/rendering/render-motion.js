/* Frame interpolation only. Never writes to cars, sessions or random state. */
(() => {
  'use strict';
  const snapshots = new WeakMap();
  function remember(session, cars, pose) {
    const previous = new Map();
    for (const car of cars) { const p = pose(car); previous.set(car.id, { x: p.x, y: p.y, ang: p.ang, level: p.level }); }
    snapshots.set(session, previous);
  }
  function sample(session, id, current, alpha, limit = 80) {
    const previous = snapshots.get(session)?.get(id);
    if (!previous || previous.level !== current.level || Math.hypot(current.x - previous.x, current.y - previous.y) > limit) return current;
    const t = Math.max(0, Math.min(1, alpha));
    // A paused/current-pose frame discards stale history, so resuming cannot
    // briefly pull a car back toward its last pre-pause snapshot.
    if (t >= 1) { snapshots.delete(session); return current; }
    const angle = Math.atan2(Math.sin(current.ang - previous.ang), Math.cos(current.ang - previous.ang));
    return { ...current, x: previous.x + (current.x - previous.x) * t,
      y: previous.y + (current.y - previous.y) * t, ang: previous.ang + angle * t };
  }
  globalThis.CGPRenderMotion = Object.freeze({ remember, sample });
})();
