import { createHash } from 'node:crypto';
import { createGame, completeQualifying, plain } from './game.js';

export const BASE_COMMIT = 'ea88f1daf238431a1dbac540df7e452dd2a44e54';
export const BASE_HTML_SHA256 = 'b35c4fa0f2170df77597979c1a8fdf11bda9ef1fe306401b7151a6bfc1e5c4d1';
export const round = n => Number(n.toFixed(6));
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function raceSummary(game, r) {
  return { time: round(r.time), ticks: r.ticks, rng: r.rng, finished: r.finished,
    winner: r.winner, eventCount: plain(r.eventCount),
    cars: game.raceOrder(r).map(c => ({ id: c.id, laps: c.laps, progress: round(c.progress),
      lane: round(c.lane), speed: round(c.speed), damage: c.damage,
      pitVisits: c.pitVisits, dnf: c.dnf, aiState: c.aiState, lineMode: c.lineMode,
      bestLap: c.bestLap === null ? null : round(c.bestLap) })) };
}

export function geometrySummary(game) {
  return game.trackDefs.map((track, index) => {
    const g = game.makeGeometry(track), m = game.raceMeta(index);
    return { name: track[0], length: round(g.len), width: round(g.width),
      points: g.pts.length, sectors: plain(g.sectors), bridges: plain(g.bridges),
      routeHash: digest(g.pts.map(p => [round(p.x), round(p.y)])),
      pitHash: digest(g.pit.map(p => [round(p.x), round(p.y)])),
      lineHash: digest(m.idealLine.map(round)) };
  });
}

export function sampleRaces(game) {
  return [0, 9, 16].map(index => {
    const r = game.createRace(index, 42);
    for (let i = 0; i < 300; i++) game.stepRace(r);
    return { index, ...raceSummary(game, r) };
  });
}

export function createReference() {
  const { game } = createGame();
  const initial = plain(game.state);
  const geometry = geometrySummary(game);
  completeQualifying(game);
  const qualified = plain(game.state);
  const samples = sampleRaces(game);
  const r = game.createRace(0, 42);
  for (let i = 0; i < 300; i++) game.stepRace(r);
  r.paused = true;
  game.state.activeRace = r;
  const activeRace = plain(game.state);
  delete game.state.activeRace;
  r.paused = false;
  game.runRaceToEnd(r);
  const finishedRace = raceSummary(game, r);
  game.recordRace(r);
  // Production finalization saves after crediting the weekend. save() synchronizes
  // the selected team's bank with the top-level credits before serialization.
  game.save();
  const completedWeekend = plain(game.state);
  game.validateV06State(completedWeekend);
  const { game: qGame } = createGame();
  const q = qGame.createQualSession('Q1', 202600);
  for (let i = 0; i < 90; i++) qGame.qualStep(q);
  q.paused = true;
  qGame.state.activeQualifying = q;
  return {
    initial, qualified, activeRace, activeQualifying: plain(qGame.state), completedWeekend,
    reference: { baseCommit: BASE_COMMIT, htmlSHA256: BASE_HTML_SHA256,
      seed: 12345, qualifyingSeeds: [202600, 202601, 202602], raceSeed: 42,
      geometry, samples, finishedRace,
      qualifying: plain(game.state.results[0].qualifyingResults) },
  };
}
