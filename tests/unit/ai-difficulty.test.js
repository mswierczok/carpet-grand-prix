import { it, expect } from "vitest";
import { loadArcade } from "../helpers/arcade.js";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)) };
}

it("liefert vier unveränderliche Fahrkompetenzen ohne andere Fahrzeugphysik oder Rundenformate", () => {
  const { api } = loadArcade({ race: true }), track = api.TrackCatalog.get("bahrain");
  expect(api.AIDifficulty.profiles.map((p) => p.id)).toEqual(["beginner", "normal", "hard", "expert"]);
  for (const profile of api.AIDifficulty.profiles) {
    expect(Object.isFrozen(profile)).toBe(true);
    const race = api.RaceSession.create(track, { difficulty: profile.id });
    expect(race.parameters).toBe(api.Physics.parameters);
    expect(race.snapshot().race.laps).toBe(8);
    expect(race.snapshot().race.difficulty).toBe(profile.id);
    expect(race.snapshot().entries).toHaveLength(13);
    race.selectTeam("t05");
    race.restart();
    expect(race.snapshot().race.difficulty).toBe(profile.id);
  }
  expect(() => api.AIDifficulty.get("toString")).toThrow();
  for (const id of Object.keys(api.AIDifficulty.trackReserves)) {
    expect(api.TrackCatalog.get(id).id).toBe(id);
    const profile = api.AIDifficulty.forTrack("expert", id);
    expect(profile.cornerConfidence).toBe(api.AIDifficulty.trackReserves[id]);
    expect(profile).not.toHaveProperty("maxSpeed");
    expect(Object.isFrozen(profile)).toBe(true);
  }
  for (const [id, line] of Object.entries(api.AIDifficulty.trackLines)) {
    expect(api.TrackCatalog.get(id).id).toBe(id);
    const profile = api.AIDifficulty.forTrack("expert", id);
    for (const [key, value] of Object.entries(line)) expect(profile[key]).toBe(value);
    expect(Object.isFrozen(profile)).toBe(true);
  }
  expect(() => api.RaceSession.create(track, { difficulty: "invalid" })).toThrow();
}, 120000);

it("sperrt Schwierigkeiten ab dem Countdown und erhält die Auswahl beim Neustart", () => {
  const { api } = loadArcade({ race: true }), race = api.RaceSession.create(api.TrackCatalog.get("bahrain"));
  expect(race.selectDifficulty("invalid")).toBe(false);
  expect(race.selectDifficulty("expert")).toBe(true);
  race.pause(false);
  expect(race.selectDifficulty("normal")).toBe(false);
  race.restart();
  expect(race.snapshot().race.difficulty).toBe("expert");
  expect(race.snapshot().race.elapsed).toBe(0);
});

it("speichert nur bewusste POV-Auswahl, erhält klassische Spielstände und unbekannte eigene Einstellungsfelder", () => {
  const { api } = loadArcade({ race: true }), prefs = api.POVPreferences,
    store = storage({ carpet_gp_v072: "classic-save", separatePreference: "keep",
      [prefs.key]: JSON.stringify({ version: 1, difficulty: "normal", futureField: "keep" }) });
  const before = [...store.values];
  expect(prefs.load(store).difficulty).toBe("normal");
  expect([...store.values]).toEqual(before);
  expect(prefs.save("expert", store)).toBe(true);
  expect(prefs.load(store).difficulty).toBe("expert");
  expect(JSON.parse(store.getItem(prefs.key)).futureField).toBe("keep");
  expect(store.getItem("carpet_gp_v072")).toBe("classic-save");
  expect(store.getItem("separatePreference")).toBe("keep");
});

it("überschreibt neuere Speicherformate und fehlgeschlagene Schreibvorgänge nicht und lädt beschädigte Auswahl ohne Absturz", () => {
  const { api } = loadArcade({ race: true }), prefs = api.POVPreferences,
    newer = storage({ [prefs.key]: JSON.stringify({ version: 2, difficulty: "expert" }) }),
    raw = newer.getItem(prefs.key);
  expect(prefs.load(newer).difficulty).toBe("normal");
  expect(prefs.save("hard", newer)).toBe(false);
  expect(newer.getItem(prefs.key)).toBe(raw);
  const broken = storage({ [prefs.key]: "{broken" });
  expect(prefs.load(broken).difficulty).toBe("normal");
  expect(broken.getItem(prefs.key)).toBe("{broken");
  const full = storage();
  full.setItem = () => { throw Error("QuotaExceededError"); };
  expect(prefs.save("expert", full)).toBe(false);
  expect([...full.values]).toEqual([]);
  expect(prefs.load({ getItem() { throw Error("SecurityError"); } }).difficulty).toBe("normal");
});

it("liefert echte Pedal-, Linien- und Verkehrsentscheidungen als kopierte Diagnose ohne Zustandsmanipulation", () => {
  const { api } = loadArcade({ race: true }), surface = api.Surface.create(api.TrackCatalog.get("bahrain")),
    driver = api.Opponents.create(surface, api.Physics.parameters, { difficulty: "hard", diagnostics: true }),
    memory = driver.memory(0), car = { ...api.Physics.spawn(surface, -250), id: "car" },
    traffic = driver.prepare([car]), input = driver.input(traffic[0], traffic, memory),
    info = driver.diagnostics(memory);
  expect(info.speed).toBe(car.speed);
  expect(info.throttle).toBe(input.throttle);
  expect(info.brake).toBe(input.brake);
  expect(info.steer).toBe(input.steer);
  expect(info.desiredSpeed).toBeLessThanOrEqual(api.Physics.parameters.maxSpeed);
  expect(info.desiredSpeed).toBeGreaterThanOrEqual(0);
  info.desiredSpeed = -999;
  expect(driver.diagnostics(memory).desiredSpeed).not.toBe(-999);
  expect(car.speed).toBe(0);
});
