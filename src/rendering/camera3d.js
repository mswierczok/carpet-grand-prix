(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  const blend = (a, b, k) => a + (b - a) * k;
  function create(options = {}) {
    let previous = null,
      wasOverview = false;
    function update(
      pose,
      surface,
      dt,
      { overview = false, reset = false, aspect = 1 } = {},
    ) {
      const speed = pose.longitudinalSpeed ?? pose.speed ?? 0;
      const forward = { x: Math.cos(pose.heading), z: Math.sin(pose.heading) };
      let position, target;
      if (overview) {
        const xs = surface.g.pts.map((p) => p.x),
          zs = surface.g.pts.map((p) => p.y);
        const x = (Math.min(...xs) + Math.max(...xs)) / 2,
          z = (Math.min(...zs) + Math.max(...zs)) / 2;
        const span = Math.max(
          (Math.max(...xs) - Math.min(...xs) + surface.g.width * 3) /
            Math.max(0.3, aspect),
          Math.max(...zs) - Math.min(...zs) + surface.g.width * 3,
        );
        position = { x, y: span * 1.12, z: z + span * 0.26 };
        target = { x, y: 0, z };
      } else {
        const distance = options.distance ?? 26,
          height = options.height ?? 17,
          look = (options.look ?? 14) + speed * (options.speedLook ?? 0.09);
        position = {
          x: pose.x - forward.x * distance,
          y: height + (pose.elevation || 0),
          z: pose.y - forward.z * distance,
        };
        target = {
          x: pose.x + forward.x * look,
          y: 1.2 + (pose.elevation || 0),
          z: pose.y + forward.z * look,
        };
      }
      const jumped =
        previous &&
        Math.hypot(pose.x - previous.carX, pose.y - previous.carY) > 35;
      if (previous && !reset && !jumped && overview === wasOverview) {
        const k = 1 - Math.exp(-8 * Math.max(0, Math.min(0.1, dt)));
        for (const axis of ["x", "y", "z"]) {
          position[axis] = blend(previous.position[axis], position[axis], k);
          target[axis] = blend(previous.target[axis], target[axis], k);
        }
      }
      previous = { position, target, carX: pose.x, carY: pose.y };
      wasOverview = overview;
      return { position: { ...position }, target: { ...target } };
    }
    return Object.freeze({
      update,
      reset() {
        previous = null;
      },
    });
  }
  A.Camera3D = Object.freeze({ create });
})();
