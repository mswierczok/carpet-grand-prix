/* Bahrain pilot: real geometry, reusable vector objects, deterministic placement. */
(() => {
  'use strict';
  const scenes = new WeakMap(), patterns = new WeakMap();
  const palette = Object.freeze({ ink: '#443f37', carpet: '#c7b28f', road: '#d4c09c', yarn: '#f3e5bf', paper: '#fff3d2', red: '#ad5147', blue: '#526e86', green: '#788c66' });
  const distanceToSegment = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  function clear(g, p, radius) {
    for (let i = 0; i < g.pts.length; i++) if (distanceToSegment(p, g.pts[i], g.pts[(i + 1) % g.pts.length]) < g.width * .9 + radius + 5) return false;
    for (let i = 1; i < g.pit.length; i++) if (distanceToSegment(p, g.pit[i - 1], g.pit[i]) < g.width * .5 + radius + 8) return false;
    return true;
  }
  function layout(g, at) {
    const objects = [], minX = Math.min(...g.pts.map(p => p.x)), maxX = Math.max(...g.pts.map(p => p.x));
    const minY = Math.min(...g.pts.map(p => p.y)), maxY = Math.max(...g.pts.map(p => p.y));
    for (let i = 0; i < 12; i++) {
      const p = at(g, i / 12), side = i % 2 ? -1 : 1, radius = g.width * .45;
      const candidate = { type: 'pencil', x: p.x - Math.sin(p.ang) * g.width * 1.6 * side,
        y: p.y + Math.cos(p.ang) * g.width * 1.6 * side, angle: p.ang, radius, color: i % 3 ? palette.blue : palette.red };
      if (clear(g, candidate, radius)) objects.push(candidate);
    }
    const types = ['bear', 'book', 'blocks', 'drawing', 'ball'];
    for (let y = minY + 35; y < maxY - 25 && types.length; y += 35) for (let x = minX + 35; x < maxX - 25 && types.length; x += 3.50) {
      const p = { x, y }, radius = 25;
      if (clear(g, p, radius) && objects.every(o => Math.hypot(o.x - x, o.y - y) > o.radius + radius + 25)) {
        objects.push({ ...p, type: types.shift(), radius, angle: ((x + y) % 3 - 1) * .12 });
      }
    }
    return Object.freeze(objects.map(Object.freeze));
  }
  function build(g, at) {
    if (scenes.has(g)) return scenes.get(g);
    const road = new Path2D(); g.pts.forEach((p, i) => i ? road.lineTo(p.x, p.y) : road.moveTo(p.x, p.y)); road.closePath();
    const pit = new Path2D(); g.pit.forEach((p, i) => i ? pit.lineTo(p.x, p.y) : pit.moveTo(p.x, p.y));
    const scene = { road, pit, objects: layout(g, at) }; scenes.set(g, scene); return scene;
  }
  function texture(ctx) {
    if (patterns.has(ctx)) return patterns.get(ctx);
    const tile = document.createElement('canvas'); tile.width = tile.height = 64;
    const p = tile.getContext('2d'); p.lineCap = 'round';
    for (let y = 0; y < 64; y += 3) for (let x = 0; x < 64; x += 3.5) {
      const shift = (x * 13 + y * 7) % 5;
      p.strokeStyle = (x + y) % 3 ? '#6d604e18' : '#fff5df38'; p.lineWidth = .45;
      p.beginPath(); p.moveTo(x + shift, y); p.lineTo(x + shift + 1, y + 1.25); p.stroke();
    }
    const pattern = ctx.createPattern(tile, 'repeat'); patterns.set(ctx, pattern); return pattern;
  }
  const ellipse = (ctx, x, y, rx, ry, fill) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  function object(ctx, o, w) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle || 0); ctx.strokeStyle = palette.ink; ctx.lineWidth = 1.6;
    ctx.save(); ctx.translate(2, 3); ctx.fillStyle = '#42392c20'; ctx.beginPath(); ctx.ellipse(0, o.type === 'pencil' ? 1 : 5, o.radius * .75, o.type === 'pencil' ? 2 : o.radius * .4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (o.type === 'pencil') {
      const length = w * .73;
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.roundRect(-length / 2, -2.2, length, 4.4, 1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6c796'; ctx.beginPath(); ctx.moveTo(length / 2, -2.2); ctx.lineTo(length / 2 + 4, 0); ctx.lineTo(length / 2, 2.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff5d46e'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-length / 2 + 2, -1); ctx.lineTo(length / 2 - 1, -1); ctx.stroke();
    } else if (o.type === 'bear') {
      ellipse(ctx, -10, -13, 6, 6, '#a97b53'); ellipse(ctx, 10, -13, 6, 6, '#a97b53');
      ellipse(ctx, -13, 8, 6, 10, '#a97b53'); ellipse(ctx, 13, 8, 6, 10, '#a97b53');
      ellipse(ctx, -8, 18, 6, 5, '#c79b68'); ellipse(ctx, 8, 18, 6, 5, '#c79b68');
      ellipse(ctx, 0, 6, 12, 15, '#c79b68'); ellipse(ctx, 0, -10, 13, 11, '#c79b68');
      ellipse(ctx, 0, -6, 7, 5, '#ebd0a0');
      ctx.fillStyle = palette.ink; ctx.fillRect(-6, -14, 2.3, 2.3); ctx.fillRect(4, -14, 2.3, 2.3); ctx.fillRect(-2, -8, 4, 2.5);
    } else if (o.type === 'book' || o.type === 'drawing') {
      ctx.fillStyle = o.type === 'book' ? palette.blue : palette.paper; ctx.beginPath(); ctx.roundRect(-20, -15, 40, 30, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = palette.paper; ctx.fillRect(-16, -12, 31, 24);
      ctx.strokeStyle = '#9d705c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, -11); ctx.lineTo(-1, 11); ctx.stroke();
      ctx.strokeStyle = palette.green; ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-7, -3); ctx.lineTo(1, 6); ctx.lineTo(7, -7); ctx.lineTo(13, 6); ctx.stroke();
    } else if (o.type === 'blocks') {
      for (const [x, y, color] of [[-18, -13, palette.red], [2, -7, palette.blue], [-8, 6, palette.green]]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, 17, 17, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff1cb45'; ctx.fillRect(x + 2, y + 2, 12, 3);
      }
    } else {
      ellipse(ctx, 0, 0, 16, 16, '#eee2bd'); ctx.fillStyle = palette.blue;
      ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(8, 2); ctx.lineTo(0, 8); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  function draw(ctx, index, g, at) {
    if (index !== 0) return false;
    const scene = build(g, at), m = ctx.getTransform();
    const x = -m.e / m.a, y = -m.f / m.d, width = ctx.canvas.width / m.a, height = ctx.canvas.height / m.d;
    ctx.save(); ctx.fillStyle = palette.carpet; ctx.fillRect(x, y, width, height);
    ctx.fillStyle = texture(ctx); ctx.fillRect(x, y, width, height);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(1.5, 2); ctx.strokeStyle = '#52412f35'; ctx.lineWidth = g.width + 10; ctx.stroke(scene.road); ctx.restore();
    ctx.strokeStyle = palette.ink; ctx.lineWidth = g.width + 6; ctx.stroke(scene.road);
    ctx.strokeStyle = palette.yarn; ctx.lineWidth = g.width + 3.5; ctx.stroke(scene.road);
    ctx.strokeStyle = palette.road; ctx.lineWidth = g.width; ctx.stroke(scene.road);
    ctx.save(); ctx.globalAlpha = .4; ctx.strokeStyle = texture(ctx); ctx.stroke(scene.road); ctx.restore();
    ctx.strokeStyle = palette.ink; ctx.lineWidth = g.width * .48 + 2; ctx.stroke(scene.pit);
    ctx.strokeStyle = '#e8d7b5'; ctx.lineWidth = g.width * .48; ctx.stroke(scene.pit);
    ctx.setLineDash([4, 6]); ctx.strokeStyle = '#9e7659'; ctx.lineWidth = 1; ctx.stroke(scene.pit); ctx.setLineDash([]);
    for (const o of scene.objects) object(ctx, o, g.width);
    // Paper sector tags sit at the original label anchors.
    for (const [i, u] of [0, ...g.sectors].entries()) {
      const p = at(g, u), sign = i ? -1 : 1, d = g.width * .7 + 8;
      const px = p.x + sign * Math.sin(p.ang) * d, py = p.y - sign * Math.cos(p.ang) * d;
      ctx.fillStyle = palette.paper; ctx.strokeStyle = '#73624b'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.roundRect(px - 13, py - 11, 26, 15, 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore(); return true;
  }
  globalThis.CGPPilotWorld = Object.freeze({ palette, layout, clear, draw });
})();
