import { withoutEnvironmentCameraOptions } from "../helpers/environment-camera.js";
import { withoutMainEntry } from "../helpers/legacy-entry.js";
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT, plain } from "../helpers/game.js";

const baseline = "31003409aa5af06939e352a72bad1b823c1a3106";
const published = (path) =>
  execFileSync("git", ["show", `${baseline}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
function before() {
  const scope = {};
  for (const name of [
    "data/arcade-tracks",
    "data/arcade-boundaries",
    "data/arcade-roster",
    "racing/boundary-field",
    "racing/bridge-surface",
    "racing/track-surface",
  ])
    runInNewContext(published(`src/${name}.js`), scope);
  return { api: scope.CGPArcade, data: scope.CGPArcadeData };
}

it("südliche Verlängerungen erhalten die anderen 20 Strecken samt Seilen sowie Originalspiel, Fahrer und Fahrphysik exakt", () => {
  const old = before(),
    current = loadArcade({historicalBahrain:true});
  for (const id of Object.keys(old.data.tracks)) {
    if (["england", "portugal"].includes(id)) continue;
    expect(plain(current.data.tracks[id])).toEqual(plain(old.data.tracks[id]));
    expect(plain(current.data.boundaries[id])).toEqual(
      plain(old.data.boundaries[id]),
    );
    const a = old.api.Surface.create(old.data.tracks[id]),
      b = current.api.Surface.create(current.data.tracks[id]);
    expect(plain(b.g)).toEqual(plain(a.g));
  }
  expect(plain(current.data.roster)).toEqual(plain(old.data.roster));
  for (const path of [
    "index.html",
    "src/racing/physics.js",
    "src/racing/bridge-physics.js",
    "src/racing/timing.js",
    "src/rendering/camera3d.js",
    "src/rendering/vehicles3d.js",
  ]) {
    const current = readFileSync(new URL(path, ROOT), "utf8");
    expect(
      path === "index.html"
        ? withoutMainEntry(current)
        : path === "src/rendering/camera3d.js"
          ? withoutEnvironmentCameraOptions(current)
          : current,
    ).toBe(published(path));
  }
});

it.each(["england", "portugal"])(
  "südliche Kehre in %s kommt später und erhält Form, Breite, Norden und Sektororte",
  (id) => {
    const old = before(),
      { api, data } = loadArcade(),
      a = old.api.Surface.create(old.data.tracks[id]),
      b = api.Surface.create(data.tracks[id]),
      settings = data.tracks[id].pov.southExtension,
      ys = a.g.pts.map((p) => p.y),
      lo = Math.min(...ys),
      hi = Math.max(...ys),
      from = lo + (hi - lo) * settings.start,
      to = lo + (hi - lo) * settings.end;
    expect(settings.distance).toBe(140);
    expect(Math.max(...b.g.pts.map((p) => p.y))).toBeCloseTo(hi + 140, 8);
    expect(Math.min(...b.g.pts.map((p) => p.y))).toBe(lo);
    expect(b.g.width).toBe(a.g.width);
    expect(b.g.scale).toBe(a.g.scale);
    expect(b.g.len - a.g.len).toBeGreaterThan(250);
    expect(b.g.len - a.g.len).toBeLessThan(300);
    expect(plain(b.g.pit)).toEqual(plain(a.g.pit));
    // A rigidly translated curve keeps its radii; the transition extends only
    // its approaches. Original vertices elsewhere remain at the same locations.
    let translated = 0,
      unchanged = 0;
    for (const [i, p] of a.g.pts.entries()) {
      const active =
        a.g.cum[i] / a.g.len >= settings.section[0] &&
        a.g.cum[i] / a.g.len <= settings.section[1];
      if (active && p.y >= to) {
        expect(
          b.g.pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y - 140) < 1e-7),
        ).toBe(true);
        translated++;
      } else if (!active || p.y <= from) {
        expect(
          b.g.pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-7),
        ).toBe(true);
        unchanged++;
      }
    }
    expect(translated).toBeGreaterThan(10);
    expect(unchanged).toBeGreaterThan(a.g.pts.length * 0.7);
    for (const [i, p] of a.checkpoints.entries()) {
      const active =
          p.s / a.g.len >= settings.section[0] &&
          p.s / a.g.len <= settings.section[1],
        t = Math.max(0, Math.min(1, (p.y - from) / (to - from))),
        delta = active ? 140 * t * t * t * (10 + t * (-15 + 6 * t)) : 0,
        next = b.checkpoints[i];
      expect(next.x).toBeCloseTo(p.x, 8);
      expect(next.y).toBeCloseTo(p.y + delta, 8);
      expect(b.boundary.contains(next)).toBe(true);
    }
    expect(plain(b.g.sectors)).not.toEqual(plain(a.g.sectors));
    // The unchanged sector rule must count a lap over the whole new corridor.
    for (const side of [-1, 1]) {
      let timing = api.Timing.create();
      for (const index of [0, 1, 2, 0]) {
        const cp = b.checkpoints[index],
          lane = side < 0 ? cp.minLane + 4 : cp.maxLane - 4,
          x = cp.x - Math.sin(cp.ang) * lane,
          y = cp.y + Math.cos(cp.ang) * lane,
          dx = Math.cos(cp.ang) * 0.2,
          dy = Math.sin(cp.ang) * 0.2;
        expect(b.boundary.contains({ x, y })).toBe(true);
        timing = api.Timing.step(
          timing,
          { x: x - dx, y: y - dy },
          { x: x + dx, y: y + dy, offroad: true, longitudinalSpeed: 10 },
          b,
          1,
        );
      }
      expect(timing.completed).toBe(1);
      expect(timing.lastLap.valid).toBe(true);
    }
  },
);
