(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function create(surface, config) {
    const objects = [],
      passages = [],
      radius = surface.outerRadius;
    // A conservative rectangle-to-road test. Sampling plus a Lipschitz margin
    // bounds every point of each footprint, including rotated corners.
    function clearance(at, w, d) {
      let min = Infinity;
      const nx = Math.max(2, Math.ceil(w / 8)),
        nz = Math.max(2, Math.ceil(d / 8)),
        c = Math.cos(at.ang || 0),
        s = Math.sin(at.ang || 0);
      for (let ix = 0; ix <= nx; ix++)
        for (let iz = 0; iz <= nz; iz++) {
          const x = -w / 2 + (w * ix) / nx,
            z = -d / 2 + (d * iz) / nz,
            p = { x: at.x + c * x - s * z, y: at.y + s * x + c * z };
          min = Math.min(min, surface.project(p).distance - radius);
        }
      return min - Math.hypot(w / nx, d / nz) / 2;
    }
    function fitsRoom(at, w, d) {
      const c = Math.abs(Math.cos(at.ang || 0)),
        s = Math.abs(Math.sin(at.ang || 0)),
        hx = (w * c + d * s) / 2,
        hz = (w * s + d * c) / 2,
        b = config.room.bounds;
      if (
        at.x - hx < b.minX + 14 ||
        at.x + hx > b.maxX - 14 ||
        at.y - hz < b.minY + 14 ||
        at.y + hz > b.maxY - 14
      )
        return false;
      return !config.room.furniture.some((f) => {
        if (f.h < config.platformHeight) return false;
        const fc = Math.abs(Math.cos(f.at.ang)),
          fs = Math.abs(Math.sin(f.at.ang)),
          fx = (f.w * fc + f.d * fs) / 2 + 10,
          fz = (f.w * fs + f.d * fc) / 2 + 10;
        return (
          Math.abs(at.x - f.at.x) < hx + fx && Math.abs(at.y - f.at.y) < hz + fz
        );
      });
    }
    function overlaps(at, w, d) {
      const r = Math.hypot(w, d) / 2;
      return objects.some(
        (o) =>
          Math.hypot(at.x - o.at.x, at.y - o.at.y) <
          r + Math.hypot(o.w, o.d) / 2 + 5,
      );
    }
    function place(
      id,
      asset,
      w,
      d,
      h,
      u = 0.25,
      preferredSide = -1,
      options = {},
    ) {
      for (let turn = 0; turn < 28; turn++)
        for (const side of [preferredSide, -preferredSide])
          for (const offset of [12, 30, 60, 105]) {
            const at = surface.at(
              ((u + turn * 0.037) % 1) * surface.g.len,
              side * (radius + d / 2 + offset),
            );
            if (
              !fitsRoom(at, w, d) ||
              overlaps(at, w, d) ||
              clearance(at, w, d) < 6
            )
              continue;
            const spec = {
              id,
              asset,
              at: { x: at.x, y: at.y, ang: at.ang + (side > 0 ? Math.PI : 0) },
              w,
              d,
              h,
              ...options,
            };
            objects.push(spec);
            return spec;
          }
      // A checked edge of the play area is the deterministic fallback, rather
      // than dropping the landmark or placing it in an adjacent hairpin.
      const b = config.playBounds;
      for (const x of [b.minX - w / 2 - 16, b.maxX + w / 2 + 16])
        for (let j = 0; j < 20; j++) {
          const at = { x, y: b.minY + ((b.maxY - b.minY) * j) / 19, ang: 0 };
          if (
            fitsRoom(at, w, d) &&
            clearance(at, w, d) >= 6 &&
            !overlaps(at, w, d)
          ) {
            const spec = { id, asset, at, w, d, h, ...options };
            objects.push(spec);
            return spec;
          }
        }
      throw Error(`Kein sicherer Standort: ${surface.id}/${id}`);
    }
    function passage(asset, preferred = 0.3) {
      const depth =
          asset === "bedPassage" ? 105 : asset === "dollhouse" ? 55 : 40,
        halfWidth = radius + 19,
        postWidth = 7;
      let best = null;
      for (let i = 0; i < 160; i++) {
        const u = (preferred + i / 160) % 1,
          s = u * surface.g.len;
        if (
          s < 150 ||
          s > surface.g.len - 170 ||
          (surface.bridge?.heightAt(s) || 0) > 0.01
        )
          continue;
        const p = surface.at(s),
          c = Math.cos(p.ang),
          sn = Math.sin(p.ang);
        let drift = 0;
        for (const a of [-depth / 2 - 35, depth / 2 + 35]) {
          const q = surface.at(s + a);
          drift = Math.max(
            drift,
            Math.abs(-(q.x - p.x) * sn + (q.y - p.y) * c),
          );
        }
        if (drift > 7 || !fitsRoom(p, depth, 2 * (halfWidth + postWidth)))
          continue;
        const supportOffsets = [-halfWidth, halfWidth];
        const supports = supportOffsets.map((offset) => ({
          x: p.x - sn * (offset + (Math.sign(offset) * postWidth) / 2),
          y: p.y + c * (offset + (Math.sign(offset) * postWidth) / 2),
          ang: p.ang,
        }));
        const free = Math.min(
          ...supports.map((a) => clearance(a, depth, postWidth)),
        );
        if (free < 5) continue;
        const score = drift + Math.abs(u - preferred) * 2;
        if (!best || score < best.score)
          best = {
            id: `${surface.id}-passage`,
            asset,
            at: { x: p.x, y: p.y, ang: p.ang },
            w: depth,
            d: 2 * (halfWidth + postWidth),
            h: 80,
            halfWidth,
            depth,
            clearHeight: 42,
            s,
            score,
            supports,
            postWidth,
            solids: [
              [
                -depth / 2 - 8,
                depth / 2 + 8,
                -halfWidth - 10,
                halfWidth + 10,
                42,
                110,
              ],
              [
                -depth / 2 - 8,
                depth / 2 + 8,
                -halfWidth - 10,
                -halfWidth,
                0,
                42,
              ],
              [-depth / 2 - 8, depth / 2 + 8, halfWidth, halfWidth + 10, 0, 42],
            ],
          };
      }
      if (!best)
        throw Error(`Keine sichere Durchfahrt: ${surface.id}/${asset}`);
      passages.push(best);
      return best;
    }
    return Object.freeze({ objects, passages, clearance, place, passage });
  }
  A.EnvironmentLayout = Object.freeze({ create });
})();
