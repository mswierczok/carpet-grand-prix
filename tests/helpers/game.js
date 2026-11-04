// Test-only adapter for the original closed IIFE. index.html is never rewritten.
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';

export const ROOT = new URL('../../', import.meta.url);
export const html = readFileSync(new URL('index.html', ROOT), 'utf8');

export function createGame(seed = 12345) {
  const storage = new Map();
  const notices = [];
  let rng = seed >>> 0;
  const math = Object.create(Math);
  math.random = () => ((rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296);
  const element = () => ({ hidden: false, value: '', innerHTML: '', textContent: '',
    classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {} });
  const context = createContext({
    Math: math, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
    document: { getElementById: element, querySelector: element, addEventListener() {} },
    window: { addEventListener() {} },
    performance: { now: () => 0 },
    setTimeout() {}, clearTimeout() {}, requestAnimationFrame() {},
    confirm: () => true,
    __notice: message => notices.push(message),
  });
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw Error('Testadapter an die neue Scriptstruktur anpassen.');
  const source = scripts[0][1];
  const end = source.lastIndexOf('})();');
  if (end < 0) throw Error('Abschluss der Spiel-IIFE fehlt.');
  const exposed = `
    render = () => {}; refreshLive = () => {}; notify = __notice;
    globalThis.game = {
      newState, validateV06State, validateSavedRace, importV06Data, safeClone,
      ensureV3, ensureV4, ensureCalendar, save, strength, upgradeCost, developGain,
      buyPart, buyStudy, repairPart, prepareRegulation, buyConceptRefit,
      createQualSession, qualStep, concludeQualSession, qualifyingDone,
      createRace, stepRace, runRaceToEnd, raceResults, recordRace,
      finishSeason, startNextSeason, makeWearPlan, makeRegulationPlan,
      makeGeometry, raceMeta, raceGrid, bodyContact, racePose, trafficBlocks,
      officialSeconds, raceOrder, safeLaneChange,
      MASTER, trackDefs, digitizedTracks, STORAGE, RACE_STEP, RACE_LAPS,
      get state() { return s; },
      set state(value) { s = safeClone(value); anim = null; qualAnim = null; },
      activate() { gameSessionActive = true; },
      get readProblem() { return storageReadProblem; },
    };
  `;
  new Script(source.slice(0, end) + exposed + source.slice(end), { filename: 'index.html:test-copy' }).runInContext(context);
  // Rewind randomness after bootstrap so fixtures don't depend on its unused preview.
  rng = seed >>> 0;
  const game = context.game;
  game.state = game.newState();
  game.ensureCalendar(); game.ensureV3(); game.ensureV4(); game.activate();
  return { game, storage, notices };
}

export function completeQualifying(game) {
  for (const phase of ['Q1', 'Q2', 'Q3']) {
    const q = game.createQualSession(phase, 202600 + ['Q1', 'Q2', 'Q3'].indexOf(phase));
    let ticks = 0;
    while (!q.finished && ticks++ < 24000) game.qualStep(q);
    if (!q.finished) throw Error('Qualifying-Zeitlimit erreicht.');
    game.concludeQualSession(q);
  }
}

export const plain = value => JSON.parse(JSON.stringify(value));
