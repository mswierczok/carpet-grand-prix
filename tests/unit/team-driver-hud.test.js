import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
import { createGame, ROOT } from '../helpers/game.js';

const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/activeRace.json', ROOT), 'utf8'));
function setup() { const { game } = createGame(); game.state = fixture; return { game, r: game.state.activeRace }; }

it('zeigt nur die eigenen Fahrer in stabiler Reihenfolge mit den Tower-Intervallen nach vorn und hinten', () => {
  const { game, r } = setup(), order = game.raceOrder(r), cards = game.teamDriverHudCards(r);
  const ids = r.cars.filter(c => c.team === game.state.team).map(c => c.id);
  expect(cards.map(c => c.id)).toEqual(ids);
  for (const card of cards) {
    const i = order.findIndex(c => c.id === card.id), c = order[i];
    expect(card.position).toBe(i + 1);
    expect(card.front).toBe(i ? game.raceInterval(r, c, order[i - 1]) : 'FÜHRT');
    const rear = order.slice(i + 1).find(c => !c.dnf);
    expect(card.rear).toBe(rear ? game.raceInterval(r, rear, c) : '—');
  }
  r.cars.find(c => c.id === ids[0]).progress = Math.max(...r.cars.map(c => c.progress)) + 10;
  expect(game.teamDriverHudCards(r).map(c => c.id)).toEqual(ids);
});

it('behandelt Führung, letzten Platz, Ausfall und Boxenstatus ohne erfundene Abstände', () => {
  const { game, r } = setup(), own = r.cars.filter(c => c.team === game.state.team);
  own[0].progress = Math.max(...r.cars.map(c => c.progress)) + 10;
  own[1].progress = Math.min(...r.cars.map(c => c.progress)) - 10;
  let cards = game.teamDriverHudCards(r);
  expect(cards[0].front).toBe('FÜHRT');
  expect(cards[1].rear).toBe('—');
  own[0].dnf = true; own[1].pit = 0; own[1].repairLeft = 0;
  cards = game.teamDriverHudCards(r);
  expect(cards[0].status).toBe('OUT');
  expect(cards[0].front).toBe('—'); expect(cards[0].rear).toBe('—');
  expect(cards[1].status).toBe('BOX');
});

it('liest den Rennstand nur und blendet Karten außerhalb des eigenen laufenden Rennens aus', () => {
  const { game, r } = setup(), before = JSON.stringify(game.state);
  game.teamDriverHudCards(r); game.teamDriverHudCards(r);
  expect(JSON.stringify(game.state)).toBe(before);
  expect(game.teamDriverHudCards(null)).toHaveLength(0);
  expect(game.teamDriverHudCards({ ...r, finished: true })).toHaveLength(0);
  game.state.mode = 'observer';
  expect(game.teamDriverHudCards(r)).toHaveLength(0);
});

it('rendert sichere Fokus-Schaltflächen und erhält Schätz- und Rundenangaben', () => {
  const context = createContext({});
  new Script(readFileSync(new URL('src/ui/team-driver-hud.js', ROOT), 'utf8')).runInContext(context);
  const card = { id: 'driver"1', name: '<img src=x>', position: 4, color: 'url(evil)', focused: true,
    front: '~1.234', rear: '+1 Rd.' };
  const html = context.CGPTeamDriverHud.render([card]);
  expect(html).toContain('data-action="focus-driver"');
  expect(html).toContain('data-value="driver&quot;1"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('&lt;img src=x&gt;'); expect(html).not.toContain('<img');
  expect(html).not.toContain('url(evil)');
  expect(html).toContain('~1.234 s'); expect(html).toContain('+1 Rd.');
  expect(context.CGPTeamDriverHud.render([{ ...card, front: '+0.123', rear: '—' }])).toContain('+0.123 s');
});
