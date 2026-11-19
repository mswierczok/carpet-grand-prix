import { it, expect } from "vitest";
import { loadArcade, driveBahrain } from "../helpers/arcade.js";
const roundtrip = state => JSON.parse(JSON.stringify(state));
const input = { throttle: 1, brake: 0, steer: 0 };
it("setzt Countdown und echtes Rennfeld mit KI, Kontakten und Aufholhistorie pausiert und deterministisch fort", () => {
  const { api } = loadArcade({ race: true }), track = api.TrackCatalog.get("bahrain");
  for (const frames of [40, 430]) {
    const a = api.RaceWeekend.create(track);
    a.pause(false);
    for (let i = 0; i < frames; i++) a.advance(input, 1 / 30);
    a.pause(true);
    const saved = a.exportState(), b = api.RaceWeekend.restore(roundtrip(saved));
    expect(b.snapshot()).toEqual(a.snapshot());
    a.pause(false); b.pause(false);
    for (let i = 0; i < 80; i++) { a.advance(input, 1 / 30); b.advance(input, 1 / 30); }
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.exportState()).toEqual(a.exportState());
  }
}, 120000);
it("erhält eine laufende Qualifikation samt tatsächlich gefahrener Hintergrundrunden", () => {
  const { api } = loadArcade({ race: true }), a = api.RaceWeekend.create(api.TrackCatalog.get("bahrain"));
  a.startQualifying();
  for (let i = 0; i < 1200; i++) a.advance(input, 1 / 30);
  a.pause(true);
  const b = api.RaceWeekend.restore(roundtrip(a.exportState()));
  expect(b.snapshot()).toEqual(a.snapshot());
  expect(b.snapshot().qualifying.standings.some(e => !e.player && e.completed > 0)).toBe(true);
  a.pause(false); b.pause(false);
  for (let i = 0; i < 80; i++) { a.advance(input, 1 / 30); b.advance(input, 1 / 30); }
  expect(b.snapshot()).toEqual(a.snapshot());
}, 120000);
it("weist beschädigte Zeiten, doppelte Fahrzeuge, veränderte Strecke und ungültige KI-Zustände zurück", () => {
  const { api } = loadArcade({ race: true }), session = api.RaceWeekend.create(api.TrackCatalog.get("bahrain")), good = session.exportState();
  for (const mutate of [s => s.session.state.entries[0].car.x = null,
    s => s.session.state.entries[0].timing.nextGate = 7,
    s => s.session.state.entries[1].id = s.session.state.entries[0].id,
    s => s.session.state.entries[0].driver.lane = 800,
    s => s.session.state.entries[0].driver.telemetry = { reason: "straight" },
    s => s.session.signature = "old-geometry", s => s.config.playerTeam = "d001"]) {
    const bad = roundtrip(good); mutate(bad);
    expect(() => api.RaceWeekend.restore(bad)).toThrow();
  }
  const clone = session.exportState(); clone.session.state.entries[0].car.x = -1;
  expect(session.exportState()).toEqual(good);
});

it("erhält die Höhen-/Nickwerte auf Brücken und lehnt unvollständige Höhenzustände ab", () => {
  const { api } = loadArcade({ race: true }), a = api.RaceWeekend.create(api.TrackCatalog.get("russia"));
  a.pause(false); for (let i=0;i<140;i++) a.advance(input,1/30); a.pause(true);
  const saved = a.exportState(), b = api.RaceWeekend.restore(roundtrip(saved));
  expect(b.snapshot()).toEqual(a.snapshot());
  const bad = roundtrip(saved); delete bad.session.state.entries[0].car.elevation;
  expect(() => api.RaceWeekend.restore(bad)).toThrow();
});
