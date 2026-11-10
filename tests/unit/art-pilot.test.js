import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
import { ROOT, createGame } from '../helpers/game.js';
const scope = createContext({});
for (const file of ['race-sprites', 'pilot-vehicles', 'pilot-world', 'render-motion']) new Script(readFileSync(new URL(`src/rendering/${file}.js`, ROOT), 'utf8')).runInContext(scope);

it('erzeugt vier transparente Illustrationen reproduzierbar und erhält alle gemeinsamen Geometriepfade', () => {
  const api = scope.CGPPilotVehicles;
  expect([...api.ids]).toEqual(['t01','t04','t10','t05']);
  for (const id of api.ids) {
    const top = api.svg(id), showroom = api.showroomSvg(id);
    expect(top + '\n').toBe(readFileSync(new URL(`assets/cars/illustrated/topdown-${id}.svg`, ROOT), 'utf8'));
    expect(showroom + '\n').toBe(readFileSync(new URL(`assets/cars/illustrated/team-${id}.svg`, ROOT), 'utf8'));
    for (const d of Object.values(scope.CGPRaceSprites.geometry)) expect(top).toContain(`d="${d}"`);
    expect(top).toContain('viewBox="-140 -60 280 120"');
    expect(showroom).toContain('width="2172" height="555"');
    expect(top + showroom).not.toMatch(/<image|<script|(?:href|src)="https?:|<rect[^>]+width="100%"/);
  }
  for (const id of Object.keys(scope.CGPRaceSprites.teams).filter(id => !api.ids.includes(id))) {
    expect(api.svg(id)).toBeNull();
    expect(scope.CGPRaceSprites.svg(id) + '\n').toBe(readFileSync(new URL(`assets/cars/topdown/team-${id}.svg`, ROOT), 'utf8'));
  }
});

it('platziert Bahrain-Requisiten deterministisch außerhalb der Fahr- und Boxenkorridore ohne Geometrieänderungen', () => {
  const { game } = createGame(), g = game.makeGeometry(game.trackDefs[0]), before = JSON.stringify(g);
  const objects = scope.CGPPilotWorld.layout(g, game.trackAt);
  expect(objects.length).toBeGreaterThan(3);
  expect(objects.length).toBeLessThan(18);
  expect(objects.some(o => o.type === 'bear')).toBe(true);
  for (const o of objects) expect(scope.CGPPilotWorld.clear(g, o, o.radius)).toBe(true);
  expect(scope.CGPPilotWorld.layout(g, game.trackAt)).toEqual(objects);
  expect(JSON.stringify(g)).toBe(before);
  // Other environments retain their original renderer.
  for (let index = 1; index < 22; index++) expect(scope.CGPPilotWorld.draw(null,index,null,null)).toBe(false);
});

it('interpoliert nur sichtbare Posen und dreht über die kurze Winkelverbindung ohne Spielzustand zu verändern', () => {
  const api = scope.CGPRenderMotion, session = Object.freeze({}), cars = Object.freeze([Object.freeze({id:'a'})]);
  const old = Object.freeze({ x: 10, y: 20, ang: Math.PI-.1, level: 0 });
  const current = Object.freeze({ x: 20, y: 30, ang: -Math.PI+.1, level: 0, extra:'preserved' });
  api.remember(session,cars,()=>old);
  const halfway = api.sample(session,'a',current,.5);
  expect([halfway.x,halfway.y]).toEqual([15,25]);
  expect(halfway.ang).toBeCloseTo(Math.PI);
  expect(halfway.extra).toBe('preserved');
  expect(api.sample(session,'unknown',current,.5)).toBe(current);
  const jump = {...current,x:500}; expect(api.sample(session,'a',jump,.5)).toBe(jump);
  const bridge = {...current,level:1}; expect(api.sample(session,'a',bridge,.5)).toBe(bridge);
  expect(api.sample(session,'a',current,1)).toBe(current);
  expect(api.sample(session,'a',current,.1)).toBe(current); // No backward movement on resume.
  expect([old.x,current.x]).toEqual([10,20]);
  expect(Object.keys(session)).toEqual([]);
});
