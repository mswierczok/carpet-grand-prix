import { beforeAll, expect, it } from 'vitest';
import { setupRun, driveNative, finishDTO, advanceFixture, clone } from '../helpers/run-fixtures.js';
let A, initial, template, qualified, actualFinished;
beforeAll(() => {
  ({ A, run: initial } = setupRun());
  const native = A.RaceWeekend;
  A.RaceWeekend = { ...native, create: (track, options = {}) => native.create(track, { ...options, laps: 1 }) };
  let run = A.RogueliteRun.beginRace(A.RogueliteRun.chooseAbility(initial, initial.startOffers[0]));
  const w = A.RunWeekend.create(run);
  expect(w.pause(false)).toBe(false); expect(w.startQualifying()).toBe(true);
  driveNative(A, w, s => !!s.qualifyingResult);
  qualified = A.RogueliteRun.capture(run, w.exportState(), 1000);
  expect(w.snapshot().paused).toBe(true); expect(w.snapshot().qualifyingResult).toHaveLength(13);
  w.pause(false); expect(w.canRestart()).toBe(false);
  driveNative(A, w, s => s.race.phase === 'finished');
  template = w.exportState(); actualFinished = A.RogueliteRun.capture(qualified, template, 2000);
}, 240000);
function start() { return A.RogueliteRun.chooseAbility(initial, initial.startOffers[0]); }
const routes = [
  ['bahrain','event-a','canada','event-c','france','event-f','italy'],
  ['bahrain','event-a','canada','event-d','england','event-f','italy'],
  ['bahrain','event-a','canada','event-d','england','event-g','japan'],
  ['bahrain','event-b','korea','event-d','england','event-f','italy'],
  ['bahrain','event-b','korea','event-d','england','event-g','japan'],
  ['bahrain','event-b','korea','event-e','russia','event-g','japan'],
];
it('enthält exakt acht Rennknoten, sieben Events, die verbindlichen Kanten und genau sechs vollständige Routen', () => {
  const M = A.RunMap, paths = [];
  const visit = path => { const children = M.outgoing(path.at(-1)); if (!children.length) paths.push(path); else children.forEach(id => visit([...path, id])); };
  visit(['bahrain']); expect(paths).toEqual(routes);
  expect(M.phase.nodes.filter(n => n.kind === 'race')).toHaveLength(8); expect(M.phase.nodes.filter(n => n.kind === 'event')).toHaveLength(7);
  expect(M.phase.edges).toHaveLength(17);
});
for (const path of routes) it('gewinnt die gültige Route ' + path.filter(id => !id.startsWith('event')).join(' → '), () => {
  let run = start();
  for (const id of path) {
    if (A.RunMap.get(id).kind === 'event') {
      run = A.RogueliteRun.enterEvent(run, id);
      const locked = clone(run);
      expect(() => A.RogueliteRun.enterEvent(run, id === 'event-a' ? 'event-b' : 'event-a')).toThrow();
      expect(run).toEqual(locked);
      run = A.RogueliteRun.completeEvent(run, run.eventContents[id].offers[0].id);
    } else {
      expect(run.phase.currentNode).toBe(id);
      run = advanceFixture(A, run, template, A.RunMap.get(id).cutoff);
    }
  }
  expect(run.status).toBe('won'); expect(run.phase.status).toBe('completed'); expect(run.outcome.reason).toBe('prototype-complete');
  expect(run.campaign.completed).toHaveLength(4); expect(run.decisions).toHaveLength(3); expect(run.visited).toEqual(path);
  expect(run.phaseHistory[0].results).toHaveLength(4); expect(A.RogueliteRun.reachable(run)).toEqual([]);
  expect(run.build).toEqual(initial.build); expect(run.startAbility).toBe(initial.startOffers[0]); expect(run.teamAbility).toBe(initial.teamAbility);
});
for (const [track, pass, fail] of [['bahrain',10,11],['canada',8,9],['korea',8,9],['france',5,6],['england',5,6],['russia',5,6],['italy',1,2],['japan',1,2]]) {
  it(`${track}: P${pass} führt weiter, P${fail} beendet unwiderruflich den Run`, () => {
    const path = routes.find(p => p.includes(track)); let run = start();
    for (const id of path) {
      if (id === track) break;
      if (A.RunMap.get(id).kind === 'event') {
        run = A.RogueliteRun.enterEvent(run, id); run = A.RogueliteRun.completeEvent(run, run.eventContents[id].offers[0].id);
      } else run = advanceFixture(A, run, template, 1);
    }
    const good = advanceFixture(A, run, template, pass), bad = advanceFixture(A, run, template, fail);
    expect(good.status).toBe(A.RunMap.get(track).final ? 'won' : 'active');
    expect(bad.status).toBe('failed'); expect(bad.outcome).toMatchObject({ position: fail, required: pass, nodeId: track, reason: 'eliminated' });
    expect(A.RogueliteRun.reachable(bad)).toEqual([]); expect(A.RogueliteRun.canRestart(bad)).toBe(false);
    expect(() => A.RogueliteRun.enterEvent(bad, 'event-a')).toThrow(); expect(() => A.RogueliteRun.beginRace(bad)).toThrow();
    const twice = A.RogueliteRun.capture(bad, bad.campaign.weekend, 99999);
    expect(twice).toEqual(bad); expect(twice.campaign.completed).toHaveLength(bad.campaign.completed.length);
    expect(() => A.RogueliteRun.capture(bad, finishDTO(A, template, track, pass), 100000)).toThrow();
    const rollback = clone(bad); rollback.status = 'active'; expect(() => A.RogueliteRun.validate(rollback)).toThrow();
  });
}
it('weist übersprungene Knoten, neue Angebote, doppelte Entscheidungen und fehlende besuchte Rennen ab', () => {
  const run = start();
  expect(() => A.RogueliteRun.enterEvent(run, 'event-d')).toThrow(); expect(() => A.RogueliteRun.enterEvent(run, 'event-a')).toThrow();
  const missing = clone(actualFinished); missing.visited = []; expect(() => A.RogueliteRun.validate(missing)).toThrow();
  const rolled = clone(initial); rolled.eventContents['event-a'].typeId = 'unknown'; expect(() => A.RogueliteRun.validate(rolled)).toThrow();
  expect(() => A.RogueliteRun.chooseAbility(run, initial.startOffers[1])).toThrow();
});
it('übernimmt ein echtes Qualifying einmalig und sperrt den Neustart auch auf API-Ebene beim Rennstart und nach Reload', () => {
  expect(actualFinished.campaign.result.order).toHaveLength(13);
  const w = A.RunWeekend.create(qualified); expect(w.startQualifying()).toBe(false); expect(w.cancelQualifying()).toBe(false);
  expect(w.canRestart()).toBe(true); expect(w.pause(false)).not.toBe(false);
  const committed = A.RogueliteRun.capture(qualified, w.exportState()); expect(committed.raceCommitted).toBe(true);
  const before = clone(w.exportState()); expect(w.restart()).toBe(false); expect(w.exportState()).toEqual(before);
  const restored = A.RunWeekend.create(committed); expect(restored.canRestart()).toBe(false); expect(restored.restart()).toBe(false);
  expect(restored.snapshot().paused).toBe(true); expect(restored.snapshot().qualifyingResult).toEqual(w.snapshot().qualifyingResult);
});
it('bewahrt Angebote, Route, Entscheidungen, Ergebnisse und frühere Runs atomar in einem getrennten Speicher', () => {
  const S = A.RunStore, values = new Map([['carpet_gp_campaign_v1','alte Kampagne'],['carpet_gp_pov_game_v1','Meisterschaft']]);
  const storage = { getItem:k => values.get(k) ?? null, setItem:(k,v) => values.set(k,v) };
  expect(S.load(storage).status).toBe('empty'); expect(S.save(initial, { storage })).toBe(true);
  const first = S.load(storage); expect(first.game.startOffers).toEqual(initial.startOffers); expect(first.game.eventContents).toEqual(initial.eventContents);
  const failed = advanceFixture(A, start(), template, 11);
  expect(S.save(failed, { storage })).toBe(true); expect(S.save(initial, { storage })).toBe(false);
  const raw = S.raw(storage); expect(S.replace(initial, raw, { storage })).toBe(false); expect(S.raw(storage)).toBe(raw);
  const next = A.RogueliteRun.create({ id:'run-another-00000002',seed:123,driverId:'d035' });
  expect(S.replace(next, raw, { storage })).toBe(true); expect(S.load(storage).archive[0]).toEqual({ ...failed, savedAt: expect.any(Number) });
  expect(values.get('carpet_gp_campaign_v1')).toBe('alte Kampagne'); expect(values.get('carpet_gp_pov_game_v1')).toBe('Meisterschaft');
  const after = S.raw(storage); values.set(S.key, after + ' '); expect(S.save(next, { storage })).toBe(false);
  for (const text of ['{bad','{"version":99}']) { values.set(S.key,text); expect(S.load(storage).status).toBe('invalid'); expect(S.save(initial,{storage})).toBe(false); expect(values.get(S.key)).toBe(text); }
});
it('färbt ausschließlich tatsächliche Run-Rennpositionen; Qualifying und freie Rennen bleiben neutral', () => {
  const surface = A.Surface.create(A.TrackCatalog.get('bahrain')), native = A.RaceWeekend.create(A.TrackCatalog.get('bahrain'), { playerTeam:'t13' });
  for (const track of ['bahrain','canada','france','italy']) {
    const run = { startAbility:initial.startOffers[0], phase:{currentNode:track}, campaign: initial.campaign };
    const P = A.RacePresentation.create({ track:()=>surface, getRun:()=>run });
    const s = native.snapshot(); s.race.phase = 'racing'; s.campaignPhase = 'race';
    const m = P.update(s), cutoff = A.RunMap.get(track).cutoff;
    expect(m.rows.filter(r=>r.eliminated).map(r=>r.position)).toEqual(Array.from({length:13-cutoff},(_,i)=>cutoff+i+1));
    s.campaignPhase='qualifying-ready'; expect(P.update(s).rows.some(r=>r.eliminated)).toBe(false);
    s.qualifying = { standings:s.race.standings.map(e=>({...e,bestLap:null})),player:{bestLap:null},timedLaps:2 };
    expect(P.update(s).rows.some(r=>r.eliminated)).toBe(false);
    expect(A.RacePresentation.create({track:()=>surface}).update(native.snapshot()).rows.some(r=>r.eliminated)).toBe(false);
  }
});

it('übernimmt keine alte Qualifying-Ausnahme in einen Run', () => {
  const old = A.CampaignV1.create({ driverId:'d012' });
  const w = A.RaceWeekend.create(A.TrackCatalog.get('bahrain'), { playerTeam:'t13', performance:null, qualifyingFormat:null });
  w.pause(false); w.advance({},.1);
  const migrated = A.Campaign.migrate(A.CampaignV1.capture(old,w.exportState()));
  expect(migrated.legacyWeekend).toBe(true);
  const run = A.RogueliteRun.beginRace(start()); run.campaign = migrated; run.raceCommitted = true;
  expect(() => A.RogueliteRun.validate(run)).toThrow(/Qualifying/);
});
