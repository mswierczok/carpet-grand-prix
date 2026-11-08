import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { ROOT } from '../helpers/game.js';

const source = readFileSync(new URL('src/rendering/race-sprites.js', ROOT), 'utf8');
function renderer() {
  let canvases = 0;
  const destination = [];
  const mock = trace => new Proxy({}, { get: (_, key) => (...args) => trace.push([key, ...args]), set: () => true });
  const math = Object.create(Math); math.random = () => { throw Error('Rendering darf keinen Zufall verbrauchen.'); };
  const context = createContext({ Math: math,
    Path2D: class { constructor(d) { this.d = d; } },
    document: { createElement: () => { canvases++; return { getContext: () => mock([]) }; } },
  });
  new Script(source).runInContext(context);
  return { api: context.CGPRaceSprites, destination, ctx: mock(destination), canvases: () => canvases };
}

it('deckt alle Teams des Spielstands ab und exportiert ihre SVGs reproduzierbar', () => {
  const { api } = renderer();
  const save = JSON.parse(readFileSync(new URL('tests/fixtures/initial.json', ROOT), 'utf8'));
  expect(Object.keys(api.teams).sort()).toEqual(save.teams.map(team => team.id).sort());
  for (const id of Object.keys(api.teams)) {
    expect(api.svg(id) + '\n').toBe(readFileSync(new URL(`assets/cars/topdown/team-${id}.svg`, ROOT), 'utf8'));
    expect(api.svg(id)).not.toMatch(/<text|<image|href=|<script/);
  }
});

it('verwendet für alle 13 Lackierungen dieselben Karosserie-, Flügel-, Cockpit- und Radformen', () => {
  const { api } = renderer();
  for (const id of Object.keys(api.teams)) {
    const svg = api.svg(id);
    for (const d of Object.values(api.geometry)) expect(svg).toContain(`d="${d}"`);
    expect(svg).toContain('viewBox="-140 -60 280 120"');
    expect((svg.match(/<rect /g) || []).length).toBe(4);
  }
  // Ignore names and colors: every livery must also have a distinct pattern.
  const pattern = id => api.svg(id).replace(/ aria-label="[^"]*"/g, '').replace(/(?:fill|stroke)="[^"]*"/g, '');
  expect(new Set(Object.keys(api.teams).map(pattern)).size).toBe(13);
});

it('zeichnet ohne Positionsänderung innerhalb des bisherigen Darstellungsrahmens und nutzt Bitmap-Caches', () => {
  const { api, ctx, destination, canvases } = renderer();
  const pose = Object.freeze({ x: 400, y: 250, ang: 1.2 });
  for (const id of Object.keys(api.teams)) for (const scale of [1, 2]) {
    expect(api.draw(ctx, pose, id, scale)).toBe(true);
  }
  expect(canvases()).toBe(13);
  expect(destination.filter(call => call[0] === 'save')).toHaveLength(26);
  expect(destination.filter(call => call[0] === 'restore')).toHaveLength(26);
  for (const call of destination.filter(call => call[0] === 'drawImage')) {
    expect(call.slice(2)).toEqual([-10, -23 * 120 / 280 / 2, 23, 23 * 120 / 280]);
    expect(call[5]).toBeLessThanOrEqual(14);
  }
  expect(pose).toEqual({ x: 400, y: 250, ang: 1.2 });
});

it('lässt unbekannte Teams beim bisherigen Renderer und behandelt Ausfälle nur als graue Grafikvariante', () => {
  const { api, ctx, destination, canvases } = renderer();
  const pose = { x: 0, y: 0, ang: 0 };
  expect(api.draw(ctx, pose, 'unknown-team')).toBe(false);
  expect(destination).toHaveLength(0);
  expect(canvases()).toBe(0);
  expect(api.draw(ctx, pose, 't01', 1, true)).toBe(true);
  expect(api.svg('t01', true)).not.toContain('#03b6d4');
  expect(api.svg('unknown-team')).toBeNull();
});
