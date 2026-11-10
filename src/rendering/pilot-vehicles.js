/* Four-team illustrated pilot. All geometry/liveries come from the approved model. */
(() => {
  'use strict';
  const original = globalThis.CGPRaceSprites;
  if (!original?.svg('t01')) return;
  const ids = Object.freeze(['t01', 't04', 't10', 't05']);
  const assets = Object.freeze({ t01: './assets/cars/illustrated/team-t01.svg', t04: './assets/cars/illustrated/team-t04.svg',
    t10: './assets/cars/illustrated/team-t10.svg', t05: './assets/cars/illustrated/team-t05.svg' });
  const cache = new Map();
  const source = () => original;
  function svg(id, retired = false) {
    if (!ids.includes(id)) return null;
    const base = source().svg(id, retired);
    const extra = '<g stroke-linejoin="round" stroke-linecap="round"><path d="M-106 17L-29 19L-10 37L-29 48L-103 48Z" fill="#26333c" opacity=".15"/><path d="M-106-46L-32-46L-12-35M42-10L124-3" fill="none" stroke="#fff9e8" stroke-width="2.3" opacity=".65"/><path d="M-110 11L-34 13" fill="none" stroke="#26333c" stroke-width="2" opacity=".3"/></g>';
    return base.replace('<svg ', '<svg data-pilot-art="true" ').replaceAll('stroke="#14202b"', 'stroke="#26323b"').replaceAll('stroke-width="1.6"', 'stroke-width="2.2"').replace('</svg>', extra + '</svg>');
  }
  function draw(ctx, pose, id, scale = 1, retired = false) {
    if (!ids.includes(id)) return false;
    const key = id + ':' + !!retired;
    if (!cache.has(key)) {
      const documentSVG = new DOMParser().parseFromString(svg(id, retired), 'image/svg+xml');
      const canvas = document.createElement('canvas'); canvas.width = 280; canvas.height = 120;
      const paint = canvas.getContext('2d'); paint.translate(140, 60); paint.lineJoin = 'round'; paint.lineCap = 'round';
      for (const node of documentSVG.querySelectorAll('path,rect,ellipse')) {
        paint.save(); const get = name => Number(node.getAttribute(name) || 0);
        paint.globalAlpha = Number(node.getAttribute('opacity') || node.parentElement.getAttribute('opacity') || 1);
        const path = new Path2D();
        if (node.tagName === 'path') path.addPath(new Path2D(node.getAttribute('d')));
        if (node.tagName === 'rect') path.roundRect(get('x'), get('y'), get('width'), get('height'), get('rx'));
        if (node.tagName === 'ellipse') path.ellipse(get('cx'), get('cy'), get('rx'), get('ry'), 0, 0, Math.PI * 2);
        const fill = node.getAttribute('fill') || 'none', stroke = node.getAttribute('stroke') || 'none';
        if (fill !== 'none') { paint.fillStyle = fill; paint.fill(path); }
        if (stroke !== 'none') { paint.strokeStyle = stroke; paint.lineWidth = get('stroke-width') || 1; paint.stroke(path); }
        paint.restore();
      }
      cache.set(key, canvas);
    }
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.ang); ctx.scale(scale, scale);
    ctx.drawImage(cache.get(key), -10, -23 * 120 / 280 / 2, 23, 23 * 120 / 280); ctx.restore();
    return true;
  }
  function showroomSvg(id) {
    if (!ids.includes(id)) return null;
    const t = source().teams[id], geometry = source().geometry, project = 'matrix(1.35 .10 -.45 .50 0 0)';
    const wheel = (x, y) => { const px = x * 1.35 - y * .45, py = x * .1 + y * .5 + 10;
      return `<g transform="translate(${px} ${py}) rotate(4)"><ellipse rx="27" ry="18" fill="#202931" stroke="#18212a" stroke-width="2.6"/><ellipse rx="18" ry="12" fill="#c8c7b7" stroke="#4d5860" stroke-width="2"/><ellipse rx="6" ry="5" fill="#42505a"/><path d="M-14 0H14M0-9V9M-10-6L10 6M-10 6L10-6" stroke="#727b7c" stroke-width="1.8"/></g>`; };
    const badge = {
      t01: '<path d="M-132 23L-45 23L-54 41L-127 39Z" fill="#102b56"/><text x="-90" y="35" fill="#ffdf46">VOLTIER</text>',
      t04: '<ellipse cx="-89" cy="31" rx="30" ry="12" fill="#fff3da" stroke="#a31c28" stroke-width="1.3"/><text x="-89" y="34" fill="#b71927">ORVIA</text>',
      t10: '<path d="M-135 21L-40 22L-48 41L-132 39Z" fill="#f5f0d9"/><path d="M-127 25L-122 25L-125 35L-130 35ZM-119 25L-114 25L-117 35L-122 35ZM-111 25L-106 25L-109 35L-114 35Z" fill="#ca2936"/><text x="-76" y="34" fill="#3f6419">VERDAN</text>',
      t05: '<path d="M-135 21L-39 22L-47 41L-133 39Z" fill="#fff0d3"/><path d="M-121 24L-108 24L-119 30L-108 36L-121 36L-110 30Z" fill="#163c91"/><text x="-75" y="34" fill="#163c91">SYRO</text>' }[id];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="2172" height="555" viewBox="-225 -42 450 115" role="img" aria-label="Illustriertes Fahrzeug von ${t.name}"><ellipse cx="-5" cy="49" rx="199" ry="12" fill="#29373c" opacity=".16"/>${wheel(-104.5, -48)}${wheel(81.5, -48)}<g transform="translate(0 13)"><path transform="${project}" d="${geometry.body}" fill="${t.body}" stroke="#26323b" stroke-width="2.5"/><path transform="${project}" d="${geometry.body}" fill="#26333c" opacity=".24"/></g><g transform="${project}">${svg(id).replace('<svg ', '<svg x="-140" y="-60" aria-hidden="true" ')}</g><g font-family="Arial,sans-serif" font-weight="900" font-size="8" text-anchor="middle" transform="rotate(4 -90 30)">${badge}</g>${wheel(-104.5, 48)}${wheel(81.5, 48)}</svg>`;
  }
  globalThis.CGPPilotVehicles = Object.freeze({ ids, assets, svg, draw, showroomSvg });
  globalThis.CGPRaceSprites = Object.freeze({ ...original,
    svg: (id, retired = false) => svg(id, retired) || original.svg(id, retired),
    draw: (...args) => draw(...args) || original.draw(...args) });
})();
