import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { ROOT } from "../helpers/game.js";
import { withoutMainEntry } from "../helpers/legacy-entry.js";
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
  expect(p.load(storage)).toEqual({ difficulty: "hard", quality: "auto", catchup: true });
  expect(p.update({ quality: "low", catchup: false }, storage)).toBe(true);
  expect(p.save("expert", storage)).toBe(true);
  expect(p.load(storage)).toEqual({ difficulty: "expert", quality: "low", catchup: false });
  expect(JSON.parse(storage.getItem(p.key)).future).toBe("keep");
  const before = storage.getItem(p.key);
  for (const patch of [{ difficulty: "toString" }, { quality: "ultra" }, { catchup: "false" }, { unknown: 1 }])
    expect(() => p.update(patch, storage)).toThrow();
  expect(storage.getItem(p.key)).toBe(before);
});
it("ändert am alten Spiel ausschließlich die genehmigte Weiterleitung zum POV-Hauptmenü", () => {
  expect(withoutMainEntry(read("index.html"))).toBe(execFileSync("git", ["show", "590f57a14328e9b7ab505b6f7e125705b63446ad:index.html"], { cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));
});
