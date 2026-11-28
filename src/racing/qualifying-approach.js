(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function select(surface, parameters) {
    const profiles = Object.values(parameters), p = profiles[0];
    // Conservative standing acceleration distance using the weakest net force
    // at the limiter. The same start point is used for every isolated entrant.
    const required = Math.max(...profiles.map(v => v.maxSpeed ** 2 /
      (2 * Math.max(1, v.acceleration - v.rollingDrag - v.aeroDrag * v.maxSpeed ** 2))));
    const desired = Math.min(surface.g.len * .2, 450, Math.max(220, Math.ceil((required * 1.15 + p.halfLength * 2) / 5) * 5));
    let straight = 0;
    const finish = surface.at(0);
    for (let distance = 5; distance <= Math.min(600, surface.g.len * .25); distance += 5) {
      const a = surface.at(-distance), b = surface.at(-distance + 5),
        turn = Math.abs(Math.atan2(Math.sin(b.ang-a.ang),Math.cos(b.ang-a.ang))),
        alignment = Math.cos(a.ang-finish.ang);
      if (turn / 5 > .003 || alignment < Math.cos(.22)) break;
      straight = distance;
    }
    const candidates = Array.from({length:81},(_,i) => desired + (i % 2 ? 1 : -1) * Math.ceil(i/2) * 5);
    for (const distance of candidates) {
      if (distance < 80 || distance > surface.g.len * .25) continue;
      const car = A.Physics.spawn(surface, -distance);
      if (surface.boundary?.blocksFootprint(A.VehicleContacts.footprint(car,p),car.s) ||
        A.PitLane.contains(surface,car)) continue;
      return Object.freeze({ s: -distance, distance, estimatedAccelerationDistance: required, finishStraight: straight });
    }
    throw Error("Keine sichere Qualifying-Anfahrt auf dieser Strecke verfügbar.");
  }
  A.QualifyingApproach = Object.freeze({ select });
})();
