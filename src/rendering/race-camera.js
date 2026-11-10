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
    const viewport = Object.freeze({ left: 8, right: width - 8, top: 48, bottom: height - 24 });
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

  function follow(g, width, height, trackAt, target, displayWidth = width) {
    const overview = fit(g, width, height, trackAt);
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return overview;
    const cssWidth = Number.isFinite(displayWidth) && displayWidth > 0 ? displayWidth : width;
    // Preserve the same useful car size on phones and desktop screens.
    const carLength = 23 * g.width / 64;
    const scale = Math.max(overview.scale * 2, 56 * width / (cssWidth * carLength));
    return Object.freeze({ scale, x: width / 2 - target.x * scale, y: height / 2 - target.y * scale,
      target: Object.freeze({ x: target.x, y: target.y }), mode: 'follow', bounds: overview.bounds, viewport: overview.viewport });
  }

  function apply(ctx, g, width, height, trackAt, target = null, displayWidth = width) {
    const camera = follow(g, width, height, trackAt, target, displayWidth);
    ctx.translate(camera.x, camera.y); ctx.scale(camera.scale, camera.scale);
    return camera;
  }

  function resize(canvas, g, trackAt) {
    const { bounds: b } = fit(g, canvas.width, canvas.height, trackAt);
    // Match the frame to the track instead of leaving a fixed landscape letterbox.
    // Tall tracks remain bounded so the race panel does not become a scrolling map.
    const height = Math.max(620, Math.min(1000,
      Math.ceil((b.bottom - b.top) * (canvas.width - 16) / (b.right - b.left) + 72)));
    if (canvas.height !== height) canvas.height = height;
    if (canvas.style.aspectRatio !== 'auto') canvas.style.aspectRatio = 'auto';
    if (canvas.style.maxHeight !== 'none') canvas.style.maxHeight = 'none';
    return height;
  }

  globalThis.CGPRaceCamera = Object.freeze({ fit, follow, apply, resize });
})();
