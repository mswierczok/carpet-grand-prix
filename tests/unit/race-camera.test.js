import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
import { createGame, ROOT } from '../helpers/game.js';

const math = Object.create(Math); math.random = () => { throw Error('Kamera darf keinen Zufall verbrauchen.'); };
const scope = createContext({ Math: math });
new Script(readFileSync(new URL('src/rendering/race-camera.js', ROOT), 'utf8')).runInContext(scope);
const camera = scope.CGPRaceCamera;

it('vergrößert alle 22 Strecken und passt den vollständigen Zeichenrahmen ins Canvas', () => {
  const { game } = createGame();
  expect(game.trackDefs).toHaveLength(22);
  for (const track of game.trackDefs) {
    const g = game.makeGeometry(track), before = JSON.stringify(g);
    for (const [width, height] of [[1180, 740], [900, 600]]) {
      const c = camera.fit(g, width, height, game.trackAt), b = c.bounds, v = c.viewport;
      expect(Number.isFinite(c.scale)).toBe(true);
      if (width === 1180) expect(c.scale).toBeGreaterThan(1.2);
      expect(b.left * c.scale + c.x).toBeGreaterThanOrEqual(v.left - 1e-8);
      expect(b.right * c.scale + c.x).toBeLessThanOrEqual(v.right + 1e-8);
      expect(b.top * c.scale + c.y).toBeGreaterThanOrEqual(v.top - 1e-8);
      expect(b.bottom * c.scale + c.y).toBeLessThanOrEqual(v.bottom + 1e-8);
      const fillsWidth = Math.abs((b.right - b.left) * c.scale - (v.right - v.left)) < 1e-8;
      const fillsHeight = Math.abs((b.bottom - b.top) * c.scale - (v.bottom - v.top)) < 1e-8;
      expect(fillsWidth || fillsHeight).toBe(true);
      expect(camera.fit(g, width, height, game.trackAt)).toBe(c);
    }
    expect(JSON.stringify(g)).toBe(before);
  }
});

it('umfasst Straßenränder, Boxengassen und die vorhandenen Sektor-Beschriftungen', () => {
  const { game } = createGame();
  for (const track of game.trackDefs) {
    const g = game.makeGeometry(track), { bounds: b } = camera.fit(g, 1180, 740, game.trackAt);
    for (const [points, radius] of [[g.pts, g.width * .64], [g.pit, g.width * .24]]) {
      for (const p of points) {
        expect(p.x - radius).toBeGreaterThanOrEqual(b.left);
        expect(p.x + radius).toBeLessThanOrEqual(b.right);
        expect(p.y - radius).toBeGreaterThanOrEqual(b.top);
        expect(p.y + radius).toBeLessThanOrEqual(b.bottom);
      }
    }
    for (const [i, u] of [0, ...g.sectors].entries()) {
      const p = game.trackAt(g, u), sign = i ? -1 : 1, d = g.width * .7 + 8;
      const x = p.x + sign * Math.sin(p.ang) * d, y = p.y - sign * Math.cos(p.ang) * d;
      expect(x - 16).toBeGreaterThanOrEqual(b.left);
      expect(x + 16).toBeLessThanOrEqual(b.right);
      expect(y - 14).toBeGreaterThanOrEqual(b.top);
      expect(y + 4).toBeLessThanOrEqual(b.bottom);
    }
  }
});

it('verwendet ausschließlich einen gleichmäßigen Canvas-Zoom ohne Geometrieänderung', () => {
  const { game } = createGame(), g = game.makeGeometry(game.trackDefs[0]), calls = [];
  const c = camera.apply({ translate: (...args) => calls.push(['translate', ...args]), scale: (...args) => calls.push(['scale', ...args]) }, g, 1180, 740, game.trackAt);
  expect(calls).toEqual([['translate', c.x, c.y], ['scale', c.scale, c.scale]]);
});

it('passt auch das bisherige Ersatzoval ohne Quelldaten-Modell ein', () => {
  const g = { pts: Array.from({ length: 360 }, (_, i) => ({ x: 590 + 360 * Math.cos(i * Math.PI / 180), y: 370 + 224 * Math.sin(i * Math.PI / 180) })),
    pit: [{ x: 930, y: 290 }, { x: 1010, y: 335 }, { x: 1010, y: 405 }, { x: 930, y: 450 }], width: 44, sectors: [1 / 3, 2 / 3] };
  const c = camera.fit(g, 1180, 740);
  expect(c.scale).toBeGreaterThan(1);
  expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
});
