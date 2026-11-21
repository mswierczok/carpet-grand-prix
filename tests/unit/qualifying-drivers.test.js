import { it, expect } from "vitest";
import { loadArcade } from "../helpers/arcade.js";
import { plain } from "../helpers/project.js";

it("erzeugt feste individuelle Fahrstile aus Team-IDs, lässt Stammdaten unverändert und variiert die Kurvenausführung über Runden", () => {
  const { api, data } = loadArcade({ race: true }), teams = data.roster.teams,
    before = JSON.stringify(teams), styles = api.QualifyingDrivers.create(teams),
    reversed = api.QualifyingDrivers.create([...teams].reverse());
  expect(new Set(Object.values(styles).map((style) => JSON.stringify(style))).size).toBe(13);
  for (const team of teams) {
    expect(plain(styles[team.id])).toEqual(plain(reversed[team.id]));
    expect(Object.isFrozen(styles[team.id])).toBe(true);
    const samples = [0, 0.2, 0.7, 1, 1.2, 2.2, 3].map((s) => api.QualifyingDrivers.at(styles[team.id], s));
    for (const sample of samples) {
      expect(sample.brakeLead).toBeGreaterThanOrEqual(0);
      expect(sample.brakeLead).toBeLessThan(5);
      expect(sample.cornerScale).toBeGreaterThanOrEqual(0.78);
      expect(sample.cornerScale).toBeLessThanOrEqual(0.999);
    }
    expect(new Set(samples.map((s) => s.cornerScale)).size).toBeGreaterThan(3);
  }
  expect(JSON.stringify(teams)).toBe(before);
});

it("lässt verschiedene Fahrer tatsächlich unterschiedlich bremsen, bei gleicher Physik und vollem Geradentempo", () => {
  const { api, data } = loadArcade({ race: true }), p = api.Physics.parameters,
    surface = api.Surface.create(api.TrackCatalog.get("bahrain")),
    controller = api.Opponents.create(surface, p, { difficulty: "expert", diagnostics: true }),
    styles = api.QualifyingDrivers.create(data.roster.teams);
  let straight = 0, different = 0;
  for (const speed of [40, 50, 60, 70, 80, 90, 100, 110]) for (let s = 0; s < surface.g.len; s += 20) {
    const pose = api.Physics.spawn(surface, s), car = { ...pose, id: "car", vx: speed * Math.cos(pose.heading),
      vy: speed * Math.sin(pose.heading), speed, longitudinalSpeed: speed },
      traffic = controller.prepare([car]), results = ["t03", "t12"].map((id) => {
        const memory = { ...controller.memory(0), qualifying: styles[id] },
          input = controller.input(traffic[0], traffic, memory);
        return { input, target: controller.diagnostics(memory).desiredSpeed };
      });
    if (results.every((r) => r.target === p.maxSpeed)) {
      straight++;
      expect(results.every((r) => r.input.throttle === 1 && r.input.brake === 0)).toBe(true);
    }
    if (results[0].input.brake !== results[1].input.brake) different++;
  }
  expect(straight).toBeGreaterThan(0);
  expect(different).toBeGreaterThan(0);
  expect(p.maxSpeed).toBe(110);
  expect(p.maxLateralAcceleration).toBe(210);
});

it("löst die nahezu gleichen Expertenzeiten mit realen unterschiedlichen Solo-Runden ohne Spieler-Kalibrierung auf", () => {
  const { api } = loadArcade({ race: true }), q = api.QualifyingSession.create(api.TrackCatalog.get("bahrain"),
    { difficulty: "expert" }), kmh = q.parameters.metersPerUnit * 3.6;
  q.pause(false);
  let snap, walls = 0, peak = 0;
  for (let frame = 0; frame < 180 * 30; frame++) {
    q.advance({ throttle: 0, brake: 0, steer: 0 }, 1 / 30);
    snap = q.snapshot();
    for (const e of snap.entries.filter((e) => !e.player)) {
      walls += Number(e.car.hitWall);
      peak = Math.max(peak, e.car.longitudinalSpeed * kmh);
    }
    if (snap.race.finished === 12) break;
  }
  const drivers = snap.qualifying.standings.filter((e) => !e.player), times = drivers.map((e) => e.bestLap);
  expect(snap.race.finished).toBe(12);
  expect(snap.qualifying.player.bestLap).toBeNull();
  expect(snap.visibleEntries).toHaveLength(1);
  expect(drivers.every((e) => e.laps.length === 2 && e.bestLap === Math.min(...e.laps))).toBe(true);
  expect(new Set(times.map((t) => t.toFixed(3))).size).toBeGreaterThanOrEqual(10);
  expect(Math.max(...times) - Math.min(...times)).toBeGreaterThan(0.3);
  expect(drivers.filter((e) => Math.abs(e.laps[0] - e.laps[1]) > 0.001).length).toBeGreaterThanOrEqual(8);
  expect(walls).toBe(0);
  expect(peak).toBeCloseTo(118.8, 5);
}, 120000);
