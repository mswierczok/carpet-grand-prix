import { beforeAll, expect, it } from "vitest";
import { loadArcade } from "../helpers/arcade.js";
const clone = (value) => JSON.parse(JSON.stringify(value));
let A, game, finished, qualified, oldFinished, oldLive;
function drive(weekend, stop, maxSeconds = 210) {
  const driver = A.Opponents.create(weekend.surface, weekend.parameters),
    memory = driver.memory(12, -6);
  for (let frame = 0; frame < maxSeconds * 30; frame++) {
    const s = weekend.snapshot();
    if (stop(s)) return s;
    const traffic = driver.prepare(
        (s.visibleEntries || s.entries).map((e) => ({
          ...e.car,
          id: e.id,
          ...(e.slipstream ? { slipstream: e.slipstream } : {}),
        })),
      ),
      car = traffic.find((e) => e.id === s.race.playerTeam);
    weekend.advance(driver.input(car, traffic, memory), 1 / 30);
  }
  throw Error("Echte Testfahrt nicht abgeschlossen");
}
beforeAll(() => {
  A = loadArcade({ race: true }).api;
  const native = A.RaceWeekend;
  A.RaceWeekend = {
    ...native,
    create: (track, options = {}) =>
      native.create(track, { ...options, laps: 1 }),
  };
  const old = A.CampaignV1.create({ driverId: "d035" }),
    legacy = A.RaceWeekend.create(A.TrackCatalog.get("bahrain"), {
      playerTeam: old.teamId,
      ...old.options, performance:null, qualifyingFormat:null,
    });
  legacy.pause(false);
  legacy.advance({ throttle: 1, brake: 0, steer: 0 }, 0.1);
  oldLive = A.CampaignV1.capture(old, legacy.exportState());
  drive(legacy, (s) => s.race.phase === "finished");
  oldFinished = A.CampaignV1.capture(old, legacy.exportState());
  game = A.Campaign.create({ driverId: "d035" });
  const w = A.CampaignWeekend.create(game, { diagnostics: true });
  expect(w.exportState().config.diagnostics).toBe(true);
  expect(w.pause(false)).toBe(false);
  expect(w.snapshot().race.phase).toBe("grid");
  expect(w.startQualifying()).toBe(true);
  drive(w, (s) => !!s.qualifyingResult);
  qualified = A.Campaign.capture(game, w.exportState(), 1000);
  w.pause(false);
  drive(w, (s) => s.race.phase === "finished");
  finished = A.Campaign.capture(qualified, w.exportState(), 2000);
}, 240000);
it("erzwingt das Qualifying, übernimmt alle 13 Zeiten genau einmal und wartet auf ausdrücklichen Rennstart", () => {
  expect(qualified.weekend.qualifying).toBe(false);
  expect(qualified.weekend.result).toHaveLength(13);
  expect(qualified.weekend.session.state.phase).toBe("grid");
  expect(qualified.weekend.session.state.paused).toBe(true);
  expect(qualified.weekend.session.state.entries.map((e) => e.id)).toEqual(
    qualified.weekend.result.map((e) => e.id),
  );
  const w = A.CampaignWeekend.create(qualified),
    before = w.exportState();
  expect(w.snapshot().campaignPhase).toBe("race");
  expect(w.startQualifying()).toBe(false);
  expect(w.cancelQualifying()).toBe(false);
  expect(w.acceptQualifying()).toBe(false);
  expect(w.selectDifficulty("expert")).toBe(false);
  expect(w.selectCatchup(false)).toBe(false);
  for (let i = 0; i < 10; i++) w.advance({}, 1 / 30);
  expect(w.exportState()).toEqual(before);
  w.pause(false);
  expect(w.snapshot().race.phase).toBe("countdown");
});
it("speichert ein echtes vollständiges 13er-Ergebnis mit eingefrorenen Fahrer- und Teamnamen", () => {
  expect(finished.stage).toBe("interim");
  expect(finished.completed).toHaveLength(1);
  const r = finished.completed[0];
  expect(r.recordedAt).toBe(2000);
  expect(r.qualifying).toHaveLength(13);
  expect(r.order).toHaveLength(13);
  for (const entry of r.order) {
    expect(entry.driverName).toBe(
      A.CampaignConfig.getDriver(entry.driverId).name,
    );
    expect(entry.startPosition).toBe(
      r.qualifying.find((q) => q.teamId === entry.teamId).position,
    );
  }
  expect(A.Campaign.validate(clone(finished))).toEqual(finished);
  expect(A.Campaign.capture(finished, finished.weekend, 9999)).toEqual(
    finished,
  );
});
it("setzt mit unverändertem Spieler auf Kanada fort und bewahrt Bahrain vollständig", () => {
  const before = JSON.stringify(finished.completed),
    next = A.Campaign.next(finished, "canada");
  expect(next.trackId).toBe("canada");
  expect(next.teamId).toBe(finished.teamId);
  expect(next.driverId).toBe(finished.driverId);
  expect(next.stage).toBe("ready");
  expect(next.weekend).toBeNull();
  expect(next.result).toBeNull();
  expect(JSON.stringify(next.completed)).toBe(before);
  expect(A.Campaign.next(finished, "japan").lineup).not.toEqual(
    finished.lineup,
  );
  expect(A.CampaignWeekend.create(next).snapshot().campaignPhase).toBe(
    "qualifying-ready",
  );
  expect(A.Campaign.next(finished, "bahrain")).toBeNull();
  expect(A.Campaign.next(next, "japan")).toBeNull();
  expect(A.Campaign.next(finished, "toString")).toBeNull();
});
it("migriert v1-Bahrain-Zwischenstände samt echten Rennzeiten, ohne Qualifying-Daten zu erfinden", () => {
  const raw = JSON.stringify(oldFinished),
    migrated = A.CampaignStore.parse(raw);
  expect(JSON.stringify(oldFinished)).toBe(raw);
  expect(migrated.version).toBe(2);
  expect(migrated.completed).toHaveLength(1);
  expect(migrated.result.qualifying).toBeNull();
  expect(migrated.completed[0].order.map((e) => e.finishTime)).toEqual(
    oldFinished.result.order.map((e) => e.finishTime),
  );
  expect(A.Campaign.next(migrated, "canada").legacyWeekend).toBe(false);
  const migratedAgain = A.CampaignStore.parse(JSON.stringify(migrated));
  expect(migratedAgain).toEqual(migrated);
});
it("erhält alte laufende Rennen, erzwingt aber bei einem neuen Wochenende und Neustart das Qualifying", () => {
  const migrated = A.CampaignStore.parse(JSON.stringify(oldLive)),
    w = A.CampaignWeekend.create(migrated);
  expect(migrated.legacyWeekend).toBe(true);
  expect(w.snapshot().race.phase).toBe("countdown");
  expect(w.restart()).toBe(true);
  expect(w.snapshot().campaignPhase).toBe("qualifying-ready");
  const restarted = A.Campaign.capture(migrated, w.exportState());
  expect(restarted.legacyWeekend).toBe(false);
  expect(w.pause(false)).toBe(false);
  expect(w.startQualifying()).toBe(true);
  expect(A.CampaignWeekend.create(finished).restart()).toBe(false);
});
it("erhält archivierte Identitäten auch bei späteren Startlistenwechseln und akzeptiert keine falschen Teamfahrer", () => {
  const next = A.Campaign.next(finished, "canada"),
    historical = clone(next.completed[0]);
  // A stored display name is a historical snapshot, not a live roster lookup.
  next.completed[0].order[0].driverName = "Historisch gespeicherter Name";
  next.completed[0].qualifying.find(
    (q) => q.teamId === next.completed[0].order[0].teamId,
  ).driverName = "Historisch gespeicherter Name";
  expect(A.Campaign.validate(next).completed[0].order[0].driverName).toBe(
    "Historisch gespeicherter Name",
  );
  expect(finished.completed[0]).toEqual(historical);
  for (const mutate of [
    (g) => g.completed.push(clone(g.completed[0])),
    (g) => (g.completed[0].order[0].driverId = "d035"),
    (g) => (g.completed[0].order[0].finishTime = -1),
    (g) => (g.completed[0].qualifying[0].position = 12),
  ]) {
    const bad = clone(finished);
    mutate(bad);
    expect(() => A.Campaign.validate(bad)).toThrow();
  }
});
it("zählt nach acht archivierten Strecken keine zusätzliche Station, Punkte oder Belohnung hinzu", () => {
  // Synthetic archive-shape coverage; actual Bahrain/Canada drives are browser tests.
  const all = clone(finished);
  all.completed = A.CampaignConfig.tracks.map((t) => ({
    ...clone(finished.result),
    id: "gp-" + t.id,
    trackId: t.id,
  }));
  all.trackId = "italy";
  all.lineup = A.CampaignConfig.lineup(
    all.teamId,
    all.driverId,
    all.trackId,
    all.rosters,
  );
  all.weekend.trackId = all.weekend.session.trackId = "italy";
  all.weekend.session.signature = A.POVCheckpoint.signature("italy");
  const last = all.completed.at(-1);
  for (const row of [...last.order, ...last.qualifying]) {
    row.driverId = all.lineup[row.teamId];
    row.driverName = A.CampaignConfig.getDriver(row.driverId).name;
  }
  all.result = clone(last);
  expect(A.Campaign.validate(all).completed).toHaveLength(8);
  for (const track of A.CampaignConfig.tracks)
    expect(A.Campaign.next(all, track.id)).toBeNull();
  expect(all).not.toHaveProperty("credits");
  expect(all).not.toHaveProperty("victory");
});
it("schützt alte, defekte und neuere Rohdaten sowie andere Spielmodi beim Speichern und bei Migration", () => {
  const S = A.CampaignStore,
    values = new Map([
      [S.key, JSON.stringify(oldFinished)],
      ["carpet_gp_pov_game_v1", "unverändert"],
      ["carpet_gp_v072", "klassisch"],
    ]),
    storage = {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
    },
    before = values.get(S.key);
  const loaded = S.load(storage);
  expect(loaded.status).toBe("valid");
  expect(loaded.game.version).toBe(2);
  expect(values.get(S.key)).toBe(before);
  expect(S.save(loaded.game, { storage, now: 3000 })).toBe(true);
  expect(JSON.parse(values.get(S.key)).version).toBe(2);
  for (const raw of ['{"version":3}', "{bad"]) {
    values.set(S.key, raw);
    expect(S.load(storage).status).toBe("invalid");
    expect(S.save(finished, { storage })).toBe(false);
    expect(values.get(S.key)).toBe(raw);
  }
  expect(values.get("carpet_gp_pov_game_v1")).toBe("unverändert");
  expect(values.get("carpet_gp_v072")).toBe("klassisch");
});
