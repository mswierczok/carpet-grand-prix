(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    base = A.Physics,
    views = new WeakMap();
  const elevation = (car, surface) => ({
    ...car,
    elevation: surface.bridge.heightAt(car.s),
    pitch: surface.bridge.pitchAt(car.s),
  });
  function view(surface, s) {
    let cached = views.get(surface);
    if (!cached) {
      const context = { s };
      cached = {
        context,
        surface: Object.freeze({
          ...surface,
          project: (point, hint) => surface.project(point, hint ?? context.s),
          boundary: Object.freeze({
            ...surface.boundary,
            blocksFootprint: (corners) =>
              surface.boundary.blocksFootprint(corners, context.s),
          }),
        }),
      };
      views.set(surface, cached);
    }
    cached.context.s = s;
    return cached.surface;
  }
  A.Physics = Object.freeze({
    ...base,
    spawn(surface, s) {
      const car = base.spawn(surface, s);
      return surface.bridge ? elevation(car, surface) : car;
    },
    step(previous, input, surface, p, dt) {
      if (!surface.bridge) return base.step(previous, input, surface, p, dt);
      // The unchanged planar physics receives only this car's corridor and
      // projection hint. Elevation follows the road; no new speed factors.
      return elevation(
        base.step(previous, input, view(surface, previous.s), p, dt),
        surface,
      );
    },
  });
})();
