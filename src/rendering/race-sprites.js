/* Carpet Grand Prix: four-team rendering preview. No simulation/state access. */
(() => {
  'use strict';
  const bounds = Object.freeze({ x: -140, y: -60, width: 280, height: 120 });
  const geometry = Object.freeze({
    body: 'M-114-30L-114 30L-105 30L-105 51L-30 51Q-16 51-5 41Q20 21 56 14L135 6L139 5L139-5L135-6L56-14Q20-21-5-41Q-16-51-30-51L-105-51L-105-30Z',
    frontWing: 'M96-49L119-52L125-43L116-29L111-9L111 9L116 29L125 43L119 52L96 49L99 29L105 10L105-10L99-29Z',
    rearWing: 'M-139-33L-120-35L-117-27L-117 27L-120 35L-139 33Z',
    engine: 'M-112-12L-112 12L-31 14Q-18 12-19 0Q-18-12-31-14Z',
    leftPod: 'M-103-49L-29-49Q-14-48-6-39L-31-25L-103-23Z',
    rightPod: 'M-103 49L-29 49Q-14 48-6 39L-31 25L-103 23Z',
    nose: 'M38-13L135-5L139-4L139 4L135 5L38 13Z',
    cockpit: 'M-16-11Q-20 0-16 11L23 11Q38 9 38 0Q38-9 23-11Z',
  });
  const teams = Object.freeze({
    t01: Object.freeze({ name: 'Vauclair Motorsport', body: '#03b6d4', wing: '#102b56', pod: '#06bcd3', spine: '#09c0db', nose: '#ffdc27', accent: '#fff9e8', mark: '#102b56' }),
    t04: Object.freeze({ name: 'Scuderia Bellarossa', body: '#e32329', wing: '#d71923', pod: '#ed2830', spine: '#ef3035', nose: '#e32329', accent: '#fff7ed', mark: '#f4c94e' }),
    t10: Object.freeze({ name: 'Panther Racing', body: '#567e16', wing: '#eff2dc', pod: '#f5f2df', spine: '#6d941f', nose: '#648c1d', accent: '#d62328', mark: '#d62328' }),
    t05: Object.freeze({ name: 'Eisenbach Motorsport', body: '#163c91', wing: '#fff0d3', pod: '#fff0d3', spine: '#19499e', nose: '#fff0d3', accent: '#fff0d3', mark: '#163c91' }),
  });
  const bitmapCache = new Map();
  const pathCache = new Map();
  const path = (d, fill, stroke = '#14202b', strokeWidth = 1.6) => ({ kind: 'path', d, fill, stroke, strokeWidth });
  const rect = (x, y, width, height, fill, radius = 2, stroke = '#14202b', strokeWidth = 1.6) => ({ kind: 'rect', x, y, width, height, fill, radius, stroke, strokeWidth });
  const ellipse = (cx, cy, rx, ry, fill, stroke = 'none', strokeWidth = 0) => ({ kind: 'ellipse', cx, cy, rx, ry, fill, stroke, strokeWidth });

  function shapes(id, retired = false) {
    const original = teams[id];
    if (!original) return null;
    const palette = retired ? { body: '#737b80', wing: '#929b9f', pod: '#899297', spine: '#9aa3a6', nose: '#9aa3a6', accent: '#bac1c3', mark: '#485259' } : original;
    const out = [];
    // Shared suspension, wing, body and engine cover: identical for all teams.
    for (const x of [-103, 80]) for (const side of [-1, 1]) {
      out.push(path(`M${x - 10} ${side * 15}L${x + 10} ${side * 46}M${x + 12} ${side * 13}L${x - 10} ${side * 46}`, 'none', '#26353e', 3));
    }
    out.push(path(geometry.rearWing, palette.wing), path(geometry.frontWing, palette.wing));
    out.push(path(geometry.body, palette.body), path(geometry.leftPod, palette.pod), path(geometry.rightPod, palette.pod));
    out.push(path(geometry.engine, palette.spine), path(geometry.nose, palette.nose, 'none', 0));

    if (id === 't01') {
      // Turquoise sidepods, yellow axial nose and dark blue wing corners.
      for (const side of [-1, 1]) {
        out.push(path(`M-101 ${side * 47}L-49 ${side * 47}L-80 ${side * 30}L-101 ${side * 30}Z`, palette.mark, 'none', 0));
        out.push(path(`M-72 ${side * 29}L-61 ${side * 43}L-45 ${side * 27}L-52 ${side * 27}L-61 ${side * 35}L-66 ${side * 29}Z`, palette.accent, 'none', 0));
        out.push(path(`M99 ${side * 39}L120 ${side * 41}`, palette.nose, palette.nose, 4));
      }
      out.push(path('M-134-25L-134 25', 'none', palette.nose, 4));
    } else if (id === 't04') {
      // Two white circular fields echo the showroom sidepod badge, without text.
      for (const side of [-1, 1]) {
        out.push(ellipse(-61, side * 37, 16, 11, palette.accent));
        out.push(path(`M-61 ${side * 30}L-59 ${side * 35}L-53 ${side * 37}L-59 ${side * 39}L-61 ${side * 44}L-63 ${side * 39}L-69 ${side * 37}L-63 ${side * 35}Z`, palette.body, 'none', 0));
        out.push(path(`M43 ${side * 9}L119 ${side * 4}`, 'none', palette.accent, 2.2));
      }
      out.push(path('M63-5L70-5L74 0L70 5L63 5L59 0Z', palette.mark, 'none', 0));
      out.push(path('M-134-23L-134 23', 'none', palette.accent, 3));
    } else if (id === 't10') {
      // Three staggered red bars on each white field: an original simplified mark.
      for (const side of [-1, 1]) for (const x of [-86, -65, -44]) {
        out.push(path(`M${x} ${side * 30}L${x + 9} ${side * 30}L${x + 3} ${side * 44}L${x - 6} ${side * 44}Z`, palette.accent, 'none', 0));
      }
      out.push(path('M-132-27L-122-27L-122 27L-132 27Z', palette.body, 'none', 0));
    } else if (id === 't05') {
      // Ivory axial nose and sidepod fields surrounded by the deep-blue chassis.
      for (const side of [-1, 1]) {
        out.push(path(`M-74 ${side * 30}L-52 ${side * 30}L-66 ${side * 37}L-52 ${side * 44}L-74 ${side * 44}L-60 ${side * 37}Z`, palette.mark, 'none', 0));
        out.push(path(`M99 ${side * 41}L121 ${side * 43}`, 'none', palette.body, 4));
      }
      out.push(path('M-134-19L-122-19L-122 19L-134 19Z', palette.body, 'none', 0));
    }
    // Common cockpit/helmet, subdued relief and tire geometry. No sponsor text.
    out.push(path(geometry.cockpit, '#111922', palette.nose, 2));
    out.push(ellipse(0, 0, 8, 7.5, '#f2e9d8', '#334451', 1.5));
    out.push(path('M3-6Q9 0 3 6', 'none', '#253342', 3));
    out.push(path('M-106-7L-35-7M44-7L117-2', 'none', '#ffffff', 0.8));
    for (const x of [-124, 62]) for (const y of [-58, 38]) {
      out.push(rect(x, y, 39, 20, '#10161c', 4, '#060b10', 1.4));
      out.push(path(`M${x + 8} ${y + 4}L${x + 30} ${y + 4}`, 'none', '#68747b', 1.8));
    }
    return out;
  }

  function svg(id, retired = false) {
    const list = shapes(id, retired);
    if (!list) return null;
    const elements = list.map(s => {
      const common = `fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"`;
      if (s.kind === 'path') return `<path d="${s.d}" ${common}/>`;
      if (s.kind === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" ${common}/>`;
      return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.radius}" ${common}/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-140 -60 280 120" width="280" height="120" role="img" aria-label="${teams[id].name} Top-Down-Rennsprite">${elements}</svg>`;
  }

  function bitmap(id, retired) {
    const key = `${id}:${retired ? 1 : 0}`;
    if (bitmapCache.has(key)) return bitmapCache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width; canvas.height = bounds.height;
    const ctx = canvas.getContext('2d');
    ctx.translate(-bounds.x, -bounds.y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of shapes(id, retired)) {
      ctx.beginPath();
      let shape;
      if (s.kind === 'path') {
        if (!pathCache.has(s.d)) pathCache.set(s.d, new Path2D(s.d));
        shape = pathCache.get(s.d);
      } else if (s.kind === 'ellipse') {
        ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2);
      } else ctx.roundRect(s.x, s.y, s.width, s.height, s.radius);
      if (s.fill !== 'none') { ctx.fillStyle = s.fill; if (shape) ctx.fill(shape); else ctx.fill(); }
      if (s.stroke !== 'none' && s.strokeWidth) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; if (shape) ctx.stroke(shape); else ctx.stroke(); }
    }
    bitmapCache.set(key, canvas);
    return canvas;
  }

  function draw(ctx, pose, id, scale = 1, retired = false) {
    if (!teams[id]) return false;
    const image = bitmap(id, !!retired);
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.ang); ctx.scale(scale, scale);
    // Keep the old 23-unit longitudinal envelope (-10..13). The photograph's
    // 280:120 proportions fit inside the old 14-unit-wide visual envelope.
    ctx.drawImage(image, -10, -23 * 120 / 280 / 2, 23, 23 * 120 / 280);
    ctx.restore();
    return true;
  }

  globalThis.CGPRaceSprites = Object.freeze({ draw, svg, bounds, geometry, teams });
})();
