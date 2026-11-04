import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createGame, completeQualifying, ROOT, plain } from '../helpers/game.js';
import { geometrySummary, sampleRaces } from '../helpers/reference.js';

const fixture = name => JSON.parse(readFileSync(new URL(`tests/fixtures/${name}.json`, ROOT)));
const reference = fixture('reference');

describe('Verhaltensreferenz vor der Modularisierung', () => {
  it('erhält alle 22 Streckengeometrien, Boxengassen, Brücken und Ideallinien', () => {
    const { game } = createGame();
    expect(geometrySummary(game)).toEqual(reference.geometry);
    for (let i = 0; i < 22; i++) {
      const m = game.raceMeta(i), slots = game.raceGrid(m);
      expect(slots).toHaveLength(26);
      for (let a = 0; a < slots.length; a++) for (let b = a + 1; b < slots.length; b++) {
        expect(game.bodyContact(slots[a].p, slots[b].p, m.g.width)).toBe(false);
      }
    }
  });
  it('erhält Q1, Q2, Q3, Rundenzeiten und die vollständige Startaufstellung', () => {
    const { game } = createGame(); completeQualifying(game);
    expect(game.qualifyingDone()).toBe(true);
    expect(plain(game.state.qualifying)).toEqual(fixture('qualified').qualifying);
    expect(game.state.qualifying.results.Q1).toHaveLength(26);
    expect(game.state.qualifying.results.Q2).toHaveLength(18);
    expect(game.state.qualifying.results.Q3).toHaveLength(10);
    expect(new Set(game.state.qualifying.gridIds).size).toBe(26);
  });
  it('erhält Bewegung, KI-Entscheidungen und Ereignisse auf drei unterschiedlichen Strecken', () => {
    const { game } = createGame(); completeQualifying(game);
    expect(sampleRaces(game)).toEqual(reference.samples);
  });
  it('setzt ein gespeichertes Rennen mit identischem Zufallszustand fort', () => {
    const { game: a } = createGame(), { game: b } = createGame();
    a.state = fixture('activeRace');
    const left = a.state.activeRace;
    b.state = b.validateV06State(plain(a.state));
    const right = b.state.activeRace;
    for (let i = 0; i < 180; i++) { a.stepRace(left); b.stepRace(right); }
    expect(plain(right)).toEqual(plain(left));
  });
  it('setzt gespeichertes Qualifying ohne veränderte Rundenzeiten fort', () => {
    const { game: a } = createGame(), { game: b } = createGame();
    a.state = fixture('activeQualifying'); b.state = plain(a.state);
    const left = a.state.activeQualifying, right = b.state.activeQualifying;
    while (!left.finished) a.qualStep(left);
    while (!right.finished) b.qualStep(right);
    expect(plain(right)).toEqual(plain(left));
  });
});
