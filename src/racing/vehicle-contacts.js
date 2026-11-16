(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function footprint(car, p) {
    const cs = Math.cos(car.heading),
      sn = Math.sin(car.heading);
    return [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ].map(([a, b]) => ({
      x: car.x + a * p.halfLength * cs - b * p.halfWidth * sn,
      y: car.y + a * p.halfLength * sn + b * p.halfWidth * cs,
    }));
  }
  function overlap(a, b, p) {
    if (Math.abs((a.elevation || 0) - (b.elevation || 0)) > 6) return null;
    if (
      Math.hypot(a.x - b.x, a.y - b.y) >
      2 * Math.hypot(p.halfLength, p.halfWidth)
    )
      return null;
    const axes = [
      a.heading,
      a.heading + Math.PI / 2,
      b.heading,
      b.heading + Math.PI / 2,
    ];
    let best = null;
    for (const angle of axes) {
      const x = Math.cos(angle),
        y = Math.sin(angle),
        extent = (car) =>
          p.halfLength * Math.abs(Math.cos(car.heading - angle)) +
          p.halfWidth * Math.abs(Math.sin(car.heading - angle)),
        signed = (a.x - b.x) * x + (a.y - b.y) * y,
        depth = extent(a) + extent(b) - Math.abs(signed);
      if (depth <= 1e-8) return null;
      if (!best || depth < best.depth)
        best = {
          depth,
          x: x * (signed < 0 ? -1 : 1),
          y: y * (signed < 0 ? -1 : 1),
        };
    }
    return best;
  }
  function resolve(proposed, previous, surface, p, tick = 0) {
    const cars = proposed.map((car) => ({ ...car, hitCar: false })),
      contacts = new Map(),
      count = cars.length;
    const clear = (car) =>
      !surface.boundary.blocksFootprint(footprint(car, p), car.s);
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (let row = 0; row < count; row++) {
        const i = (row + tick) % count;
        for (let offset = 1; offset < count - row; offset++) {
          const j = (row + offset + tick) % count,
            a = cars[i],
            b = cars[j],
            hit = overlap(a, b, p);
          if (!hit) continue;
          changed = true;
          a.hitCar = b.hitCar = true;
          const amount = hit.depth + 0.005,
            shifted = (car, scale) => ({
              ...car,
              x: car.x + hit.x * amount * scale,
              y: car.y + hit.y * amount * scale,
            });
          let ca = shifted(a, 0.5),
            cb = shifted(b, -0.5);
          if (!(clear(ca) && clear(cb))) {
            if (clear(shifted(a, 1))) {
              ca = shifted(a, 1);
              cb = b;
            } else if (clear(shifted(b, -1))) {
              ca = a;
              cb = shifted(b, -1);
            } else {
              ca = {
                ...a,
                x: previous[i].x,
                y: previous[i].y,
                heading: previous[i].heading,
              };
              cb = {
                ...b,
                x: previous[j].x,
                y: previous[j].y,
                heading: previous[j].heading,
              };
            }
          }
          a.x = ca.x;
          a.y = ca.y;
          b.x = cb.x;
          b.y = cb.y;
          a.heading = ca.heading;
          b.heading = cb.heading;
          const relative = (a.vx - b.vx) * hit.x + (a.vy - b.vy) * hit.y;
          if (relative < 0) {
            const impulse = -relative * 0.525;
            a.vx += impulse * hit.x;
            a.vy += impulse * hit.y;
            b.vx -= impulse * hit.x;
            b.vy -= impulse * hit.y;
          }
          contacts.set(Math.min(i, j) + ":" + Math.max(i, j), [i, j]);
        }
      }
      if (!changed) break;
    }
    for (const car of cars) {
      if (!car.hitCar) continue;
      car.speed = Math.hypot(car.vx, car.vy);
      car.longitudinalSpeed =
        car.vx * Math.cos(car.heading) + car.vy * Math.sin(car.heading);
      const projection = surface.project(car, car.s);
      car.s = projection.s;
      car.offroad =
        surface.project(car, surface.bridge ? car.s : null).distance >
        surface.roadRadius;
      if (surface.bridge) {
        car.elevation = surface.bridge.heightAt(car.s);
        car.pitch = surface.bridge.pitchAt(car.s);
      }
    }
    return {
      cars,
      contacts: [...contacts.entries()].map(([key, pair]) => ({ key, pair })),
    };
  }
  A.VehicleContacts = Object.freeze({ footprint, overlap, resolve });
})();
