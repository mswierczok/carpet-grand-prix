/* Carpet Grand Prix: shared top-down geometry for all teams. No simulation/state access. */
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
    t02: Object.freeze({ name: 'Alderwick Racing', body: '#191b1e', wing: '#17191c', pod: '#212326', spine: '#15171a', nose: '#17191c', accent: '#eee6d4', mark: '#d82c32' }),
    t03: Object.freeze({ name: 'Falkenheim GP', body: '#c7cdd3', wing: '#a7afb9', pod: '#b9c1c9', spine: '#e3e7eb', nose: '#414b56', accent: '#eef2f5', mark: '#444e59' }),
    t06: Object.freeze({ name: 'Orange', body: '#f76b08', wing: '#1d2022', pod: '#1d2022', spine: '#ff7b0b', nose: '#f76b08', accent: '#ff7b0b', mark: '#f5e9da' }),
    t07: Object.freeze({ name: 'Ragos Racing', body: '#0875b5', wing: '#086ca5', pod: '#0875b5', spine: '#118ccd', nose: '#1085c4', accent: '#f5f2e8', mark: '#da2736' }),
    t08: Object.freeze({ name: 'Mugan', body: '#f2c512', wing: '#efbc0b', pod: '#f6cd18', spine: '#e9a40d', nose: '#ffdb26', accent: '#1a2024', mark: '#a96c08' }),
    t09: Object.freeze({ name: 'Lincoln', body: '#22262b', wing: '#25292e', pod: '#292d32', spine: '#363b42', nose: '#2b3036', accent: '#b9c2ca', mark: '#777f87' }),
    t11: Object.freeze({ name: 'Rivage Racing', body: '#f7d41a', wing: '#f7d41a', pod: '#f7d41a', spine: '#174c9c', nose: '#ffe02b', accent: '#174c9c', mark: '#f7d41a' }),
    t12: Object.freeze({ name: 'Scuderia Vespera', body: '#791e2c', wing: '#791e2c', pod: '#8e2332', spine: '#155339', nose: '#155339', accent: '#e9d8b1', mark: '#d5aa49' }),
    t13: Object.freeze({ name: 'Redwood GP', body: '#f6f2e9', wing: '#f6f2e9', pod: '#fffbf2', spine: '#f1e8dc', nose: '#fffbf2', accent: '#79273a', mark: '#79273a' }),
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
    } else if (id === 't02') {
      // Ivory ovals and red underlines distinguish Alderwick from dark Lincoln.
      for (const side of [-1, 1]) {
        out.push(ellipse(-64, side * 36, 29, 11, palette.accent));
        out.push(path(`M-85 ${side * 46}L-40 ${side * 43}`, 'none', palette.mark, 3));
        out.push(path(`M-94 ${side * 49}L-26 ${side * 49}M48 ${side * 10}L122 ${side * 4}`, 'none', palette.accent, 1.8));
      }
    } else if (id === 't03') {
      // Graphite shoulder wedges over a silver shell; abstract swept falcon mark.
      for (const side of [-1, 1]) {
        out.push(path(`M-103 ${side * 48}L-82 ${side * 48}L-12 ${side * 35}L-33 ${side * 26}Z`, palette.mark, 'none', 0));
        out.push(path(`M-92 ${side * 30}L-46 ${side * 28}`, 'none', palette.accent, 2));
      }
      out.push(path('M65-7L96 0L65 7L77 0Z', palette.accent, 'none', 0));
    } else if (id === 't06') {
      // Orange upper shell, black sidepods, orange bands and leading wedges.
      for (const side of [-1, 1]) {
        out.push(path(`M-101 ${side * 34}L-26 ${side * 34}L-35 ${side * 43}L-101 ${side * 43}Z`, palette.accent, 'none', 0));
        out.push(path(`M-31 ${side * 49}L-6 ${side * 39}L-31 ${side * 26}Z`, palette.accent, 'none', 0));
      }
      out.push(path('M-131-26L-131 26', 'none', palette.accent, 4));
    } else if (id === 't07') {
      // Large white pointed plaques with a red underline on metallic blue.
      for (const side of [-1, 1]) {
        out.push(path(`M-100 ${side * 29}L-27 ${side * 28}L-17 ${side * 35}L-42 ${side * 47}L-95 ${side * 47}Z`, palette.accent, 'none', 0));
        out.push(path(`M-88 ${side * 43}L-48 ${side * 41}L-26 ${side * 34}`, 'none', palette.mark, 4));
      }
      out.push(path('M-132-22L-126-16L-132-10M-132 10L-126 16L-132 22', 'none', palette.accent, 3));
    } else if (id === 't08') {
      // Amber shoulders and black inlet/chevrons keep Mugan distinct from Rivage.
      for (const side of [-1, 1]) {
        out.push(path(`M-102 ${side * 47}L-32 ${side * 47}L-9 ${side * 38}L-34 ${side * 35}Z`, palette.mark, 'none', 0));
        out.push(path(`M-36 ${side * 27}L-20 ${side * 29}L-29 ${side * 42}L-41 ${side * 40}Z`, palette.accent, 'none', 0));
        out.push(path(`M-90 ${side * 29}L-80 ${side * 35}L-70 ${side * 29}L-60 ${side * 35}`, 'none', palette.accent, 4));
      }
    } else if (id === 't09') {
      // Restrained silver nose/sill strokes on a graphite-black car; no oval badges.
      for (const side of [-1, 1]) {
        out.push(path(`M-103 ${side * 48}L-34 ${side * 48}L-14 ${side * 39}`, 'none', palette.accent, 2));
        out.push(path(`M88 ${side * 7}L135 ${side * 3}`, 'none', palette.accent, 2.5));
      }
      out.push(path('M-133-15L-125-7M-133-3L-125 5', 'none', palette.accent, 3));
    } else if (id === 't11') {
      // Sharp yellow-front/blue-rear division, including sidepods and rear wing.
      out.push(path('M-138-32L-121-34L-118-26L-118 26L-121 34L-138 32Z', palette.accent, 'none', 0));
      for (const side of [-1, 1]) {
        out.push(path(`M-104 ${side * 48}L-60 ${side * 48}L-46 ${side * 25}L-104 ${side * 25}Z`, palette.accent, 'none', 0));
        out.push(path(`M-34 ${side * 29}L-18 ${side * 36}L-38 ${side * 42}`, 'none', palette.accent, 4));
      }
      out.push(path('M-132-18L-122-5L-132 5L-123 18', 'none', palette.mark, 4));
    } else if (id === 't12') {
      // Green spine/nose within burgundy, with fine ivory edging and gold badges.
      for (const side of [-1, 1]) {
        out.push(path(`M-109 ${side * 15}L-28 ${side * 16}M43 ${side * 13}L133 ${side * 6}`, 'none', palette.accent, 1.8));
        out.push(ellipse(-63, side * 36, 8, 8, palette.mark));
        out.push(ellipse(-60, side * 34, 7, 6, palette.pod));
      }
    } else if (id === 't13') {
      // Pearl white, burgundy cockpit surround, fine pinstripes and leaf symbols.
      out.push(path(geometry.cockpit, palette.accent, palette.accent, 7));
      for (const side of [-1, 1]) {
        out.push(path(`M-106 ${side * 47}L-32 ${side * 47}L-12 ${side * 36}`, 'none', palette.accent, 1.8));
        out.push(path(`M-71 ${side * 29}Q-44 ${side * 29}-49 ${side * 43}Q-65 ${side * 44}-71 ${side * 29}Z`, palette.mark, 'none', 0));
        out.push(path(`M46 ${side * 10}L128 ${side * 4}`, 'none', palette.accent, 1.8));
      }
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
