import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { ROOT } from "../helpers/project.js";
const read = path => readFileSync(new URL(path, ROOT), "utf8");
function setup(initial = {}) {
  const context = {};
  for (const file of ["data/arcade-roster", "data/arcade-tracks", "persistence/pov-preferences", "racing/ai-difficulty", "persistence/pov-selection"])
    runInNewContext(read("src/" + file + ".js"), context);
  const values = new Map(Object.entries(initial)),
    storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)) };
  return { ...context.CGPArcade, storage, values };
}
it("speichert Team und Strecke getrennt von vorhandenen Meisterschaften und liest ohne Schreibzugriff", () => {
  const { POVSelection: s, storage, values } = setup({ carpet_gp_v072: "existing-classic-save" });
  const before = [...values];
  expect(s.load(storage)).toEqual({ teamId: "t01", trackId: "bahrain", hasSaved: false });
  expect([...values]).toEqual(before);
  expect(s.save({ teamId: "t05", trackId: "france" }, storage)).toBe(true);
  expect(s.load(storage)).toEqual({ teamId: "t05", trackId: "france", hasSaved: true });
  expect(storage.getItem("carpet_gp_v072")).toBe("existing-classic-save");
  for (const value of [{ teamId: "t99", trackId: "france" }, { teamId: "t01", trackId: "toString" }])
    expect(() => s.save(value, storage)).toThrow("Ungültige");
});
it("bewahrt defekte oder neuere Auswahl beim Lesen und lässt Speicherfehler nicht ins Spiel durchschlagen", () => {
  const { POVSelection: s, storage } = setup();
  for (const raw of ["{broken", '{"version":2,"teamId":"t01","trackId":"bahrain"}', '{"version":1,"teamId":"t99","trackId":"france"}']) {
    storage.setItem(s.key, raw);
    expect(s.load(storage).hasSaved).toBe(false);
    expect(storage.getItem(s.key)).toBe(raw);
  }
  storage.setItem(s.key, '{"version":2,"future":"keep"}');
  expect(s.save({ teamId: "t01", trackId: "bahrain" }, storage)).toBe(false);
  expect(storage.getItem(s.key)).toContain('"future":"keep"');
  expect(s.load({ getItem() { throw Error("SecurityError"); } }).hasSaved).toBe(false);
  expect(s.save({ teamId: "t01", trackId: "bahrain" }, { getItem: () => null, setItem() { throw Error("Quota"); } })).toBe(false);
});
it("ergänzt Grafik und Aufholhilfe kompatibel zur bisherigen POV-Schwierigkeit und erhält fremde Felder", () => {
  const { POVPreferences: p, storage } = setup();
  storage.setItem(p.key, JSON.stringify({ version: 1, difficulty: "hard", future: "keep" }));
  expect(p.load(storage)).toEqual({ difficulty: "hard", quality: "auto", catchup: true, steeringSensitivity: 100 });
  expect(p.update({ quality: "low", catchup: false }, storage)).toBe(true);
  expect(p.save("expert", storage)).toBe(true);
  expect(p.load(storage)).toEqual({ difficulty: "expert", quality: "low", catchup: false, steeringSensitivity: 100 });
  expect(JSON.parse(storage.getItem(p.key)).future).toBe("keep");
  const before = storage.getItem(p.key);
  for (const patch of [{ difficulty: "toString" }, { quality: "ultra" }, { catchup: "false" }, { unknown: 1 }])
    expect(() => p.update(patch, storage)).toThrow();
  expect(storage.getItem(p.key)).toBe(before);
});
it("verwendet einen schlanken Einstieg ohne eingebettete Simulation oder alte Styles", () => {
  const html = read("index.html");
  expect(Buffer.byteLength(html)).toBeLessThan(1000);
  expect(html).toContain("./play.html");
  expect(html).toContain("./archive.html");
  expect(html).not.toMatch(/const MASTER|digitizedTracks|createRace|stylesheet/);
});

it("ergänzt die Lenkempfindlichkeit ohne Spielstandmigration und verwirft ungültige Prozentwerte", () => {
  const { POVPreferences: p, storage } = setup();
  const old = { version: 1, difficulty: "expert", quality: "low", catchup: false, future: "keep" };
  storage.setItem(p.key, JSON.stringify(old));
  expect(p.load(storage).steeringSensitivity).toBe(100);
  expect(JSON.parse(storage.getItem(p.key))).toEqual(old);
  for (const value of [40, 65, 100]) {
    expect(p.update({ steeringSensitivity: value }, storage)).toBe(true);
    expect(p.load(storage)).toEqual({ difficulty: "expert", quality: "low", catchup: false, steeringSensitivity: value });
    expect(JSON.parse(storage.getItem(p.key)).future).toBe("keep");
  }
  for (const value of [null, "60", 0, 35, 41, 105, NaN, Infinity]) {
    expect(p.isSteeringSensitivity(value)).toBe(false);
    const before = storage.getItem(p.key);
    expect(() => p.update({ steeringSensitivity: value }, storage)).toThrow();
    expect(storage.getItem(p.key)).toBe(before);
    storage.setItem(p.key, JSON.stringify({ ...old, steeringSensitivity: value }));
    expect(p.load(storage).steeringSensitivity).toBe(100);
  }
  const newer = JSON.stringify({ version: 2, steeringSensitivity: 60 });
  storage.setItem(p.key, newer);
  expect(p.update({ steeringSensitivity: 60 }, storage)).toBe(false);
  expect(storage.getItem(p.key)).toBe(newer);
  expect(p.load({ getItem() { throw Error("SecurityError"); } }).steeringSensitivity).toBe(100);
});
