import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createGame, completeQualifying, ROOT, plain } from '../helpers/game.js';
import { raceSummary } from '../helpers/reference.js';

it('beendet das Referenzrennen mit unveränderter Klassifikation und Wertung', () => {
  const { game } = createGame();
  const reference = JSON.parse(readFileSync(new URL('tests/fixtures/reference.json', ROOT)));
  completeQualifying(game);
  const r = game.runRaceToEnd(game.createRace(0, 42));
  expect(raceSummary(game, r)).toEqual(reference.finishedRace);
  game.recordRace(r);
  game.save();
  expect(plain(game.state)).toEqual(JSON.parse(readFileSync(new URL('tests/fixtures/completedWeekend.json', ROOT))));
  expect(() => game.validateV06State(game.state)).not.toThrow();
});

it('beendet 22 Rennwochenenden, vergibt Titel und beginnt die Folgesaison', () => {
  const { game } = createGame();
  game.state.mode = 'observer';
  for (let i = 0; i < 22; i++) {
    completeQualifying(game);
    const r = game.runRaceToEnd(game.createRace(i, 1000 + i));
    expect(r.finished).toBe(true);
    game.recordRace(r);
    expect(game.state.round).toBe(i + 1);
    expect(() => game.validateV06State(game.state)).not.toThrow();
    console.log(`Saisonprüfung: ${i + 1}/22 Rennen abgeschlossen und validiert.`);
  }
  game.finishSeason();
  expect(game.state.history).toHaveLength(1);
  expect(game.state.history[0].roundWins).toHaveLength(22);
  const bank = plain(game.state.teams.map(t => [t.bank, t.lab]));
  game.finishSeason();
  expect(plain(game.state.teams.map(t => [t.bank, t.lab]))).toEqual(bank);
  expect(game.startNextSeason()).toBe(true);
  expect(game.state.season).toBe(2);
  expect(game.state.round).toBe(0);
  expect(game.state.drivers).toHaveLength(26);
  expect(() => game.validateV06State(game.state)).not.toThrow();
});
