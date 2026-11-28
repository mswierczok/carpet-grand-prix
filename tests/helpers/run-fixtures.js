// Domain/save fixtures, not lap-time or physics evidence. First obtain a real
// 13-car finish. Reorder its finish-time DTOs only to exercise exact rank gates;
// retarget cloned checkpoints for graph validation. Never installed in the app.
import { loadArcade } from './arcade.js';
import {retargetDriverDTO} from './driver-fixtures.js';
export const clone = v => JSON.parse(JSON.stringify(v));
export function setupRun() {
  const { api: A } = loadArcade({ race: true });
  return { A, run: A.RogueliteRun.create({ id: 'run-rules-00000001', seed: 42, driverId: 'd012', difficulty: 'beginner' }) };
}
export function driveNative(A, weekend, stop, maxSeconds = 400) {
  const driver = A.Opponents.create(weekend.surface, weekend.parameters, { difficulty: 'expert' }), memory = driver.memory(12, -6);
  for (let frame = 0; frame < maxSeconds * 30; frame++) {
    const s = weekend.snapshot(); if (stop(s)) return s;
    const traffic = driver.prepare((s.visibleEntries || s.entries).map(e => ({ ...e.car, id: e.id, slipstream: e.slipstream }))), car = traffic.find(e => e.id === s.race.playerTeam);
    weekend.advance(driver.input(car, traffic, memory), 1 / 30);
  }
  throw Error('Native Run-Testfahrt nicht abgeschlossen');
}
export function finishDTO(A, template, trackId, position) {
  const w = clone(template);
  w.trackId = w.session.trackId = trackId; w.session.signature = A.POVCheckpoint.signature(trackId);
  if(w.config.driving) {
    // This is explicitly a retargeted domain DTO, not a driven result. Keep
    // the new identity contract consistent with the destination's real lineup.
    const lineup=A.CampaignConfig.lineup(w.config.playerTeam,w.config.driving.lineup[w.config.playerTeam],trackId);
    retargetDriverDTO(A,w,lineup);
  }
  // Bridge DTOs require explicit elevation/pitch, unlike the flat Bahrain seed.
  if (A.TrackCatalog.get(trackId).bridgeU?.length) for (const e of w.session.state.entries) {
    Object.assign(e.car, { elevation: 0, pitch: 0 }); Object.assign(e.previous, { elevation: 0, pitch: 0 });
  }
  const times = w.session.state.entries.map(e => e.finishTime).sort((a, b) => a - b), entries = w.session.state.entries;
  const own = entries.find(e => e.id === w.config.playerTeam), order = entries.filter(e => e !== own);
  order.splice(position - 1, 0, own);
  order.forEach((e, i) => { e.finishTime = e.timing.lapStart = times[i]; e.timing.elapsed = Math.max(e.timing.elapsed, times[i]); });
  A.POVCheckpoint.weekend(w, false);
  return w;
}
export function advanceFixture(A, run, template, position) {
  const entered = A.RogueliteRun.beginRace(run);
  // Every map route also initializes its real native track/weekend, including
  // Korea/Russia bridge starts. The DTO below exercises exact result ranks.
  const native = A.RunWeekend.create(entered);
  if (native.pause(false) !== false) throw Error("Pflichtqualifying umgangen");
  A.POVCheckpoint.weekend(native.exportState(), false);
  return A.RogueliteRun.capture(entered, finishDTO(A, template, entered.campaign.trackId, position), 2000 + entered.route.length);
}
