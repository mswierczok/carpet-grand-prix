import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createGame, ROOT, plain } from '../helpers/game.js';

const fixture = name => JSON.parse(readFileSync(new URL(`tests/fixtures/${name}.json`, ROOT)));

describe('Spielstände und Stammdaten', () => {
  it('erhält die vollständige ursprüngliche Startbesetzung', () => {
    const { game } = createGame();
    expect(plain(game.state)).toEqual(fixture('initial'));
    expect(game.state.teams).toHaveLength(13);
    expect(game.state.drivers).toHaveLength(26);
    expect(game.state.free).toHaveLength(66);
  });
  for (const name of ['initial', 'qualified', 'activeRace', 'activeQualifying', 'completedWeekend']) {
    it(`lädt und speichert den Referenzstand ${name} verlustfrei`, () => {
      const { game, storage } = createGame();
      const data = fixture(name);
      game.state = game.validateV06State(data);
      game.save();
      const restored = JSON.parse(storage.get(game.STORAGE));
      expect(restored).toEqual(data);
      expect(() => game.validateV06State(restored)).not.toThrow();
    });
  }
  for (const mutate of [s => s.teams.pop(), s => s.sourceSHA256 = 'changed', s => s.credits = -1,
    s => s.drivers[0].id = s.drivers[1].id, s => s.driverPoints[s.drivers[0].id] = 25]) {
    it('weist beschädigte Importe zurück und erhält den bisherigen Stand', () => {
      const { game, storage } = createGame();
      game.save();
      const before = plain(game.state), raw = storage.get(game.STORAGE);
      const broken = fixture('initial'); mutate(broken);
      expect(() => game.importV06Data(broken)).toThrow();
      expect(plain(game.state)).toEqual(before);
      expect(storage.get(game.STORAGE)).toBe(raw);
    });
  }
  it('überschreibt den Spielstand bei vollem Browserspeicher nicht', () => {
    const { game, storage, notices } = createGame();
    game.save();
    const before = storage.get(game.STORAGE);
    storage.set = () => { throw Error('QuotaExceededError'); };
    game.state.credits++;
    expect(() => game.save()).not.toThrow();
    expect(storage.get(game.STORAGE)).toBe(before);
    expect(notices.at(-1)).toContain('Speichern fehlgeschlagen');
  });
  it('weist eine beschädigte laufende Rennsimulation zurück', () => {
    const { game } = createGame();
    const broken = fixture('activeRace');
    broken.activeRace.cars[0].progress = null;
    expect(() => game.validateV06State(broken)).toThrow('Rennsimulation');
  });
});

describe('Management und Zeitrechnung', () => {
  it('bucht ein bezahlbares Upgrade und sperrt weitere ohne ausreichende Mittel', () => {
    const { game } = createGame();
    const t = game.state.teams[0], before = t.aero;
    game.state.credits = 60; game.state.research = 40;
    game.buyPart('aero');
    expect(t.aero).toBe(Math.min(before + game.developGain(before), t.designCaps.aero));
    expect(game.state.credits).toBe(0); expect(game.state.research).toBe(0);
    expect(game.state.upgrades).toBe(1);
    const after = plain(game.state);
    game.buyPart('power');
    expect(plain(game.state)).toEqual(after);
  });
  it('trennt offizielle Zeit von der physikalischen Simulation', () => {
    const { game } = createGame();
    const r = game.createRace(0, 42);
    const before = plain(r);
    expect(game.officialSeconds(r, 19.5)).toBe(89);
    expect(plain(r)).toEqual(before);
  });
  it('hält das einmalige Verbuchen eines Rennens ein', () => {
    const { game } = createGame();
    game.state = fixture('completedWeekend');
    const r = game.state.lastRace;
    const before = plain(game.state);
    expect(game.recordRace(r)).toBeNull();
    expect(plain(game.state)).toEqual(before);
  });
});
