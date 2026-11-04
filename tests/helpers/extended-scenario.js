import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, completeQualifying, ROOT, plain } from './game.js';
import { raceSummary } from './reference.js';

const fixture = name => JSON.parse(readFileSync(new URL(`tests/fixtures/${name}.json`, ROOT)));
const { game } = createGame();
if (process.argv[2] === 'reference-race') {
  completeQualifying(game);
  const r = game.runRaceToEnd(game.createRace(0, 42));
  assert.deepEqual(plain(raceSummary(game, r)), fixture('reference').finishedRace);
  game.recordRace(r); game.save();
  assert.deepEqual(plain(game.state), fixture('completedWeekend'));
  game.validateV06State(game.state);
  console.log('Referenzrennen: Ergebnis, Punkte und Spielstand identisch.');
} else if (process.argv[2] === 'season') {
  game.state.mode = 'observer';
  for (let i = 0; i < 22; i++) {
    completeQualifying(game);
    const r = game.runRaceToEnd(game.createRace(i, 1000 + i));
    assert.equal(r.finished, true);
    game.recordRace(r);
    assert.equal(game.state.round, i + 1);
    game.validateV06State(game.state);
    console.log(`Saisonprüfung: ${i + 1}/22 Rennen abgeschlossen und validiert.`);
  }
  game.finishSeason();
  assert.equal(game.state.history.length, 1);
  assert.equal(game.state.history[0].roundWins.length, 22);
  const bank = plain(game.state.teams.map(t => [t.bank, t.lab]));
  game.finishSeason();
  assert.deepEqual(plain(game.state.teams.map(t => [t.bank, t.lab])), bank);
  assert.equal(game.startNextSeason(), true);
  assert.equal(game.state.season, 2);
  assert.equal(game.state.round, 0);
  assert.equal(game.state.drivers.length, 26);
  game.validateV06State(game.state);
  console.log('Saisonprüfung: Titel, einmalige Prämien und Wechsel in Saison 2 geprüft.');
} else {
  throw Error('Unbekanntes erweitertes Testszenario.');
}
