/* Presentation only: fit the existing world into the race canvas. */
(() => {
  'use strict';
  const cache = new WeakMap();

  function fit(g, width, height, trackAt) {
    let sizes = cache.get(g);
    const key = `${width}:${height}`;
    if (sizes?.has(key)) return sizes.get(key);
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    const include = (x, y, rx, ry = rx) => {
      left = Math.min(left, x - rx); right = Math.max(right, x + rx);
      top = Math.min(top, y - ry); bottom = Math.max(bottom, y + ry);
    };
    // The outer road stroke is 1.28 road widths; include its edge and a small margin.
    for (const p of g.pts) include(p.x, p.y, g.width * .64 + 4);
    for (const p of g.pit) include(p.x, p.y, g.width * .24 + 4);
    const pm = { x: (g.pit[1].x + g.pit[2].x) / 2, y: (g.pit[1].y + g.pit[2].y) / 2 };
    include(pm.x, pm.y - g.width * .28 - 5, 14, 9);
    // Use existing read-only geometry interpolation for the actual label anchors.
    if (trackAt) for (const [i, u] of [0, ...g.sectors].entries()) {
      const p = trackAt(g, u), sign = i ? -1 : 1, distance = g.width * .7 + 8;
      include(p.x + sign * Math.sin(p.ang) * distance,
        p.y - sign * Math.cos(p.ang) * distance - 5, 16, 9);
    }
    const viewport = Object.freeze({ left: 20, right: width - 20, top: 64, bottom: height - 34 });
    const scale = Math.min((viewport.right - viewport.left) / (right - left),
      (viewport.bottom - viewport.top) / (bottom - top));
    const result = Object.freeze({ scale,
      x: (viewport.left + viewport.right) / 2 - (left + right) / 2 * scale,
      y: (viewport.top + viewport.bottom) / 2 - (top + bottom) / 2 * scale,
      bounds: Object.freeze({ left, right, top, bottom }), viewport });
    if (!sizes) { sizes = new Map(); cache.set(g, sizes); }
    sizes.set(key, result);
    return result;
  }

  function apply(ctx, g, width, height, trackAt) {
    const camera = fit(g, width, height, trackAt);
    ctx.translate(camera.x, camera.y); ctx.scale(camera.scale, camera.scale);
    return camera;
  }

  globalThis.CGPRaceCamera = Object.freeze({ fit, apply });
})();
