import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadArcade } from "../helpers/arcade.js";

function storage() {
  const values = new Map([
    ["carpet_gp_v072", "classic"],
    ["carpet_gp_pov_game_v1", "championship"],
  ]);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
const setup = () => {
  const { api: A, data } = loadArcade({ race: true });
  return {
    A,
    data,
    C: A.CampaignConfig,
    g: A.Campaign.create({ driverId: "d012" }),
  };
};
it("hält den achtteiligen Streckenpool getrennt vom vollständigen Kalender", () => {
  const { A, C, g } = setup();
  expect(C.tracks.map((t) => t.id)).toEqual([
    "bahrain",
    "canada",
    "russia",
    "korea",
    "france",
    "japan",
    "england",
    "italy",
  ]);
  expect(A.TrackCatalog.tracks).toHaveLength(22);
  for (const t of A.TrackCatalog.tracks)
    expect(A.TrackCatalog.get(t.id)).toBe(t);
  expect(g.trackId).toBe("bahrain");
  expect(g).not.toHaveProperty("runLength");
  expect(
    A.POVCareer.create({ mode: "championship", teamId: "t01" }).career.results,
  ).toHaveLength(0);
});
it("schaltet nur Redwood frei und tauscht Teamprofilwerte ausschließlich in der Kampagne", () => {
  const { C, data, A, g } = setup();
  expect(C.teams.filter((t) => t.initiallyUnlocked).map((t) => t.id)).toEqual([
    "t13",
  ]);
  expect(g.unlocked.teamIds).toEqual(["t13"]);
  expect(C.getTeam("t13").baseStrength).toBe(64);
  expect(C.getTeam("t12").baseStrength).toBe(72);
  expect(data.roster.teams.find((t) => t.id === "t13").baseStrength).toBe(72);
  expect(data.roster.teams.find((t) => t.id === "t12").baseStrength).toBe(64);
  expect(() =>
    A.Campaign.create({ teamId: "t01", driverId: "d001" }),
  ).toThrow();
  for (const team of C.teams)
    expect([team.ability, team.vehicleCharacter, team.unlockCondition]).toEqual(
      [null, null, null],
    );
});
it("erhält alle 92 historischen Identitäten und ordnet 39 eindeutige Fahrer fest 13 Teams zu", () => {
  const { C, data, g } = setup();
  expect(data.roster.drivers).toHaveLength(92);
  expect(C.drivers).toHaveLength(39);
  expect(new Set(Object.values(g.rosters).flat()).size).toBe(39);
  for (const team of C.teams) {
    expect(g.rosters[team.id]).toHaveLength(3);
    for (const id of g.rosters[team.id])
      expect(C.getDriver(id).teamId).toBe(team.id);
  }
  expect(C.starters).toEqual(["d012", "campaign-veteran-001", "d035"]);
  const ages = C.starters.map((id) => C.getDriver(id).age);
  expect(ages).toEqual([18, 38, 25]);
  for (const d of C.drivers.filter((d) => d.sourceId)) {
    const original = data.roster.drivers.find((o) => o.id === d.sourceId);
    expect([d.age, d.name, d.countryCode]).toEqual([
      original.age,
      original.name,
      original.countryCode,
    ]);
  }
  expect(C.getDriver("campaign-veteran-001").sourceId).toBeNull();
  expect(data.roster.drivers.some((d) => d.id === "campaign-veteran-001")).toBe(
    false,
  );
  for (const id of C.starters) {
    const profile = C.getDriver(id).profile;
    expect(profile.entryStrength).toBeLessThanOrEqual(60);
    expect(profile.strengths.length).toBeGreaterThan(0);
    expect(profile.weaknesses.length).toBeGreaterThan(0);
  }
});
it("nutzt 35 eindeutige Originalillustrationen und weist vier fehlende Porträts explizit aus", () => {
  const { C } = setup(),
    illustrated = C.drivers.filter((d) => d.portrait);
  expect(illustrated).toHaveLength(35);
  expect(new Set(illustrated.map((d) => d.portrait)).size).toBe(35);
  for (const d of illustrated) {
    expect(existsSync(d.portrait)).toBe(true);
    expect(existsSync(`assets/drivers/portraits/${d.id}.png`)).toBe(true);
  }
  expect(
    C.drivers
      .filter((d) => !d.portrait)
      .map((d) => d.id)
      .sort(),
  ).toEqual(["campaign-veteran-001", "d036", "d037", "d038"]);
});
it("wählt KI-Fahrer nachvollziehbar nach Strecke und hält Teamzuordnungen sowie Spieleridentität stabil", () => {
  const { C, g } = setup();
  const selections = C.tracks.map((t) =>
    C.lineup(g.teamId, g.driverId, t.id, g.rosters),
  );
  for (const [i, lineup] of selections.entries()) {
    expect(lineup).toEqual(
      C.lineup(g.teamId, g.driverId, C.tracks[i].id, g.rosters),
    );
    expect(lineup.t13).toBe(g.driverId);
    for (const team of C.teams)
      expect(g.rosters[team.id]).toContain(lineup[team.id]);
  }
  expect(new Set(selections.map((l) => l.t01)).size).toBe(3);
  // All-round Bahrain has a score tie: the saved pool order decides.
  expect(selections[0].t01).toBe(g.rosters.t01[0]);
});
it("prüft Zuordnungen, Fahrer, Version und JSON ohne Abhängigkeit von Schlüsselreihenfolgen", () => {
  const { A, g } = setup();
  const sorted = JSON.stringify(g, (_, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );
  expect(A.Campaign.validate(JSON.parse(sorted))).toEqual(g);
  for (const change of [
    (v) => (v.rosters.t01[0] = v.rosters.t02[0]),
    (v) => (v.lineup.t01 = "d035"),
    (v) => (v.driverId = "d001"),
    (v) => (v.version = 2),
    (v) => (v.result = {}),
  ]) {
    const bad = JSON.parse(JSON.stringify(g));
    change(bad);
    expect(() => A.Campaign.validate(bad)).toThrow();
  }
});
it("speichert atomar und unabhängig von Klassik und Meisterschaft", () => {
  const { A, g } = setup(),
    S = A.CampaignStore,
    s = storage(),
    before = [...s.values];
  expect(S.load(s).status).toBe("empty");
  expect([...s.values]).toEqual(before);
  expect(S.save(g, { storage: s, now: 123 })).toBe(true);
  expect(S.load(s).game).toEqual({ ...g, savedAt: 123 });
  for (const [key, value] of before) expect(s.getItem(key)).toBe(value);
  const checkpoint = s.getItem(S.key);
  expect(
    S.save(g, {
      storage: {
        getItem: s.getItem,
        setItem() {
          throw Error("Quota");
        },
      },
    }),
  ).toBe(false);
  expect(s.getItem(S.key)).toBe(checkpoint);
});
it("erhält beschädigte und neuere Daten und verhindert Überschreiben durch einen anderen Tab", () => {
  const { A, g } = setup(),
    S = A.CampaignStore,
    s = storage();
  for (const raw of [
    "{broken",
    '{"version":2}',
    '{"version":1,"configVersion":2}',
  ]) {
    s.setItem(S.key, raw);
    expect(S.load(s).status).toBe("invalid");
    expect(S.save(g, { storage: s })).toBe(false);
    expect(s.getItem(S.key)).toBe(raw);
    expect(() => S.parse(raw)).toThrow();
  }
  const damaged = s.getItem(S.key);
  expect(S.replace(g, "wrong-slot", { storage: s })).toBe(false);
  expect(S.replace(g, damaged, { storage: s, now: 11 })).toBe(true);
  S.load(s);
  s.setItem(S.key, JSON.stringify({ ...g, savedAt: 12 }));
  const newer = s.getItem(S.key);
  expect(S.save(g, { storage: s })).toBe(false);
  expect(s.getItem(S.key)).toBe(newer);
  expect(
    S.load({
      getItem() {
        throw Error("Blocked");
      },
    }).status,
  ).toBe("unavailable");
});
it("setzt ein natives Rennfeld und Qualifying pausiert fort, ohne eigene Physik oder Tempoboni", () => {
  const { A, g } = setup(),
    track = A.TrackCatalog.get(g.trackId),
    p = { ...A.Physics.parameters };
  const w = A.RaceWeekend.create(track, { playerTeam: g.teamId, ...g.options });
  expect(w.snapshot().entries).toHaveLength(13);
  w.selectDifficulty("expert");
  w.selectCatchup(false);
  w.pause(false);
  for (let i = 0; i < 160; i++)
    w.advance({ throttle: 1, brake: 0, steer: 0 }, 1 / 30);
  const captured = A.Campaign.capture(g, w.exportState());
  expect(captured.options.difficulty).toBe("expert");
  expect(captured.options.catchup).toBe(false);
  const resumed = A.RaceWeekend.restore(captured.weekend);
  expect(resumed.snapshot().entries.map((e) => e.car)).toEqual(
    w.snapshot().entries.map((e) => e.car),
  );
  expect(resumed.snapshot().paused).toBe(true);
  const q = A.RaceWeekend.create(track, { playerTeam: g.teamId, ...g.options });
  q.startQualifying();
  for (let i = 0; i < 160; i++)
    q.advance({ throttle: 1, brake: 0, steer: 0 }, 1 / 30);
  const qualifying = A.Campaign.capture(g, q.exportState()),
    restored = A.RaceWeekend.restore(qualifying.weekend);
  expect(restored.snapshot().qualifying).toEqual(q.snapshot().qualifying);
  expect(qualifying.stage).toBe("weekend");
  expect(qualifying.result).toBeNull();
  expect(A.Physics.parameters).toEqual(p);
});
it("leitet aus einem vollständig gefahrenen 13er-Feld einen wiederholbaren Zwischenstand ohne Belohnungen ab", () => {
  const { A, g } = setup(),
    w = A.RaceWeekend.create(A.TrackCatalog.get(g.trackId), {
      playerTeam: g.teamId,
      ...g.options,
      laps: 1,
    });
  const driver = A.Opponents.create(w.surface, w.parameters),
    memory = driver.memory(12);
  w.pause(false);
  for (let i = 0; i < 200 * 30 && w.snapshot().race.phase !== "finished"; i++) {
    const snap = w.snapshot(),
      traffic = driver.prepare(
        snap.entries.map((e) => ({ ...e.car, id: e.id })),
      ),
      car = traffic.find((c) => c.id === g.teamId);
    w.advance(driver.input(car, traffic, memory), 1 / 30);
  }
  expect(w.snapshot().race.phase).toBe("finished");
  const next = A.Campaign.capture(g, w.exportState());
  expect(next.stage).toBe("interim");
  expect(next.result.order).toHaveLength(13);
  expect(new Set(next.result.order.map((e) => e.driverId)).size).toBe(13);
  expect(next.result.order.find((e) => e.teamId === g.teamId).driverId).toBe(
    g.driverId,
  );
  expect(A.Campaign.capture(next, w.exportState())).toEqual(next);
  expect(next).not.toHaveProperty("credits");
  expect(next).not.toHaveProperty("career");
  expect(next.trackId).toBe("bahrain");
  expect(next.result.qualifying).toBeNull();
}, 120000);
it("ändert keine Renn-, KI-, Kamera-, Team-, Strecken- oder bestehenden Speichermodule", () => {
  const files = [
    "src/racing/physics.js",
    "src/racing/rope-contact.js",
    "src/racing/opponents.js",
    "src/racing/ai-difficulty.js",
    "src/racing/race-session.js",
    "src/racing/race-weekend.js",
    "src/racing/qualifying-session.js",
    "src/rendering/camera3d.js",
    "src/data/arcade-roster.js",
    "src/data/arcade-tracks.js",
    "src/championship/pov-career.js",
    "src/persistence/pov-game-store.js",
    "src/persistence/pov-checkpoint.js",
  ];
  for (const file of files) {
    const baseline = execFileSync(
      "git",
      ["show", `414ce81b057fe52138e7a4ba165677ef190609e6:${file}`],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    expect(readFileSync(file).equals(baseline), file).toBe(true);
  }
});
