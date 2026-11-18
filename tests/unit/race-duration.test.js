import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT } from "../helpers/game.js";
const baseline = "c2e90fa61c18506d6832f1c22b6aadacc4d16b0f";
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");

it("verwendet auf allen 22 Strecken feste dokumentierte Rennlängen nahe 210 Sekunden", () => {
  const { api } = loadArcade({ race: true }),
    settings = api.RaceFormats.settings,
    reference = JSON.parse(read("docs/race-duration/clean-reference.json"));
  expect(Object.keys(settings.tracks)).toEqual(api.TrackCatalog.tracks.map((t) => t.id));
  expect(reference.tracks).toHaveLength(22);
  for (const track of api.TrackCatalog.tracks) {
    const format = api.RaceFormats.get(track.id),
      sample = reference.tracks.find((t) => t.id === track.id).keyboard,
      expected = track.id === "bahrain" ? 8 : Math.max(settings.minLaps,
        Math.min(settings.maxLaps, Math.round((settings.targetSeconds - sample.launchSeconds) / sample.referenceSeconds)));
    expect(format.laps).toBe(expected);
    expect(format.estimatedSeconds).toBeGreaterThanOrEqual(180);
    expect(format.estimatedSeconds).toBeLessThanOrEqual(240);
    expect(sample.cleanLapSeconds).toHaveLength(3);
    expect(sample.cleanLapSeconds.every((n) => n > 0 && Number.isFinite(n))).toBe(true);
    expect(sample.referenceSeconds).toBeCloseTo(sample.cleanLapSeconds.reduce((a, b) => a + b) / 3, 5);
    expect(api.RaceSession.create(track).snapshot().race.laps).toBe(format.laps);
    expect(Object.isFrozen(format)).toBe(true);
  }
  expect(() => api.RaceFormats.get("missing")).toThrow();
  expect(() => api.RaceFormats.get("toString")).toThrow();
  for (const [file, hash] of Object.entries(reference.hashes))
    expect(createHash("sha256").update(execFileSync("git", ["show", `${reference.sourceCommit}:${file}`],
      { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 })).digest("hex"), file).toBe(hash);
});

it("erhält Neustart, Teamwechsel und explizite Test-Rundenzahlen ohne Speicherzugriff", () => {
  const { api } = loadArcade({ race: true }),
    track = api.TrackCatalog.get("bahrain"),
    race = api.RaceSession.create(track);
  expect(race.snapshot().race.laps).toBe(8);
  race.selectTeam("t05");
  race.pause(false);
  race.advance({ throttle: 1, brake: 0, steer: 0 }, 0.1);
  race.restart();
  expect(race.snapshot().race.laps).toBe(8);
  expect(race.snapshot().race.playerTeam).toBe("t05");
  expect(api.RaceSession.create(track, { laps: 3 }).snapshot().race.laps).toBe(3);
  for (const laps of [0, -1, 1.5, NaN, Infinity])
    expect(() => api.RaceSession.create(track, { laps })).toThrow("Rundenzahl");
});

it("schützt Physik, Grafik, Daten und Originalspiel trotz freigegebener KI-Änderungen bytegenau", () => {
  const files = ["index.html", "src/racing/physics.js", "src/racing/bridge-physics.js", "src/racing/vehicle-contacts.js", "src/racing/track-surface.js", "src/racing/bridge-surface.js", "src/racing/track-shape.js", "src/racing/timing.js", "src/data/arcade-roster.js", "src/data/arcade-tracks.js", "src/data/arcade-boundaries.js", "src/rendering/camera3d.js", "src/rendering/vehicles3d.js"];
  for (const file of files) {
    const current = read(file),
      original = execFileSync("git", ["show", `${baseline}:${file}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect(current).toBe(original);
  }
});

it("reproduziert die versionierte Rundentabelle aus den protokollierten sauberen Referenzrunden", () => {
  expect(() => execFileSync(process.execPath, ["scripts/build-race-formats.js", "--check"], { cwd: ROOT })).not.toThrow();
});
