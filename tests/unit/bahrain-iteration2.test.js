import { withoutStartLightsSource } from "../helpers/start-lights.js";
import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadArcade, driveBahrain } from "../helpers/arcade.js";
import { createWorld } from "../helpers/world3d.js";
const base = "721022f238e85002d8f285c4015a8f02257c3b50";
it("Iteration 2: erhält 21 Strecken, Originalzeichnung, Rennsysteme und Breite; verschiebt nur den freigegebenen Bahrain-Rücklauf", () => {
  const { api, data } = loadArcade(),
    old = {};
  for (const name of ["arcade-tracks", "arcade-boundaries"])
    runInNewContext(
      execFileSync("git", ["show", `${base}:src/data/${name}.js`]).toString(),
      old,
    );
  for (const id of Object.keys(data.tracks))
    if (id !== "bahrain") {
      expect(JSON.stringify(data.tracks[id])).toBe(
        JSON.stringify(old.CGPArcadeData.tracks[id]),
      );
      expect(JSON.stringify(data.boundaries[id])).toBe(
        JSON.stringify(old.CGPArcadeData.boundaries[id]),
      );
    }
  const model = data.tracks.bahrain,
    original = old.CGPArcadeData.tracks.bahrain,
    before = api.Surface.create(original),
    after = api.Surface.create(model),
    [start, end] = model.pov.sourceSection;
  for (const key of ["points", "width", "pit", "sectorU", "bridgeU"])
    expect(JSON.stringify(model[key])).toBe(JSON.stringify(original[key]));
  expect(after.g.width).toBe(before.g.width);
  expect(after.at(0)).toEqual(before.at(0));
  for (let i = 0; i < before.g.pts.length; i++)
    if (
      before.g.cum[i] < start * before.g.len ||
      before.g.cum[i] > end * before.g.len
    )
      expect(
        after.g.pts.some(
          (p) => p.x === before.g.pts[i].x && p.y === before.g.pts[i].y,
        ),
      ).toBe(true);
  for (const file of [
    "physics",
    "opponents",
    "timing",
    "vehicle-contacts",
    "slipstream",
    "catchup",
    "race-session",
  ])
    expect(
      (file === "race-session" ? withoutStartLightsSource(readFileSync(`src/racing/${file}.js`, "utf8")) : readFileSync(`src/racing/${file}.js`, "utf8")) ===
        execFileSync("git", ["show", `${base}:src/racing/${file}.js`]).toString(),
    ).toBe(true);
});
it("Iteration 2: fährt zwei gültige Runden mit unveränderter Physik und normalen binären Befehlen", () => {
  const { api } = loadArcade(),
    s = api.Session.create(api.TrackCatalog.get("bahrain"));
  const report = driveBahrain(s, { laps: 2, maxSeconds: 180 });
  expect(report.lapTimes).toHaveLength(2);
  expect(report.lapTimes.every((l) => l.valid)).toBe(true);
  expect(report.contacts).toBe(0);
});
it("Iteration 2: echte Boxen-Durchfahrt bleibt innerhalb der Seile und zählt die Ziellinie", () => {
  const { api } = loadArcade(),
    surface = api.Surface.create(api.TrackCatalog.get("bahrain")),
    pit = surface.g.pit,
    cum = [0];
  pit
    .slice(1)
    .forEach((p, i) =>
      cum.push(cum.at(-1) + Math.hypot(p.x - pit[i].x, p.y - pit[i].y)),
    );
  function pathAt(s) {
    let i = 0;
    while (i < pit.length - 2 && cum[i + 1] < s) i++;
    const f = Math.max(0, Math.min(1, (s - cum[i]) / (cum[i + 1] - cum[i]))),
      a = pit[i],
      b = pit[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  let car = {
      ...api.Physics.spawn(surface, surface.project(pit[0]).s),
      heading: Math.atan2(pit[1].y - pit[0].y, pit[1].x - pit[0].x),
    },
    timing = { ...api.Timing.create(), started: true, lapStart: 0 },
    progress = 0,
    hits = 0;
  for (let frame = 0; frame < 120 * 60; frame++) {
    let nearest = Infinity;
    for (let i = 0; i < pit.length - 1; i++) {
      const a = pit[i],
        b = pit[i + 1],
        dx = b.x - a.x,
        dy = b.y - a.y,
        f = Math.max(
          0,
          Math.min(
            1,
            ((car.x - a.x) * dx + (car.y - a.y) * dy) / (dx * dx + dy * dy),
          ),
        ),
        distance = Math.hypot(car.x - a.x - f * dx, car.y - a.y - f * dy);
      if (distance < nearest) {
        nearest = distance;
        progress = cum[i] + f * (cum[i + 1] - cum[i]);
      }
    }
    const target = pathAt(progress + 10),
      angle = Math.atan2(
        Math.sin(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
        Math.cos(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
      ),
      limit =
        api.Physics.parameters.maxSteer /
        (1 +
          api.Physics.parameters.steerSpeedReduction *
            (car.speed / api.Physics.parameters.steerSpeedReference) ** 2),
      desired = Math.atan2(
        2 * api.Physics.parameters.wheelbase * Math.sin(angle),
        10,
      ),
      steer =
        Math.abs(desired) > 0.003 &&
        car.steering * Math.sign(desired) < Math.abs(desired) - 0.002
          ? Math.sign(desired)
          : 0;
    const next = api.Physics.step(
      car,
      {
        throttle: Number(car.speed < 20),
        brake: Number(car.speed > 23),
        steer,
      },
      surface,
    );
    if (next.hitWall) hits++;
    timing = api.Timing.step(timing, car, next, surface, 1 / 120);
    car = next;
    if (progress > cum.at(-1) - 5) break;
  }
  expect(progress).toBeGreaterThan(cum.at(-1) - 6);
  expect(hits).toBe(0);
  expect(timing.completed).toBe(1);
  expect(surface.project(car).distance).toBeLessThan(surface.roadRadius);
});
it("Iteration 2: Bett bleibt sichtbar; Kamera und Sichtstrahl passen unter Rahmen und um den Bettpfosten", () => {
  const { api, surface, world, materials, THREE } = createWorld(),
    cfg = api.EnvironmentScenes.get("bahrain"),
    rig = api.Camera3D.create(cfg.camera),
    camera = new THREE.PerspectiveCamera(55, 1, 0.3, 2100),
    bed = world.group.getObjectByName("bed");
  world.group.updateMatrixWorld(true);
  let covered = 0;
  for (
    let s = surface.g.cum[surface.g.layout.underbed.startIndex];
    s < surface.g.cum[surface.g.layout.underbed.endIndex];
    s += 5
  ) {
    for (const lane of [-20, 0, 20]) {
      const p = surface.at(s, lane);
      if (p.x > 154 || p.y > 651 || p.y < 269) continue;
      covered++;
      const pose = { x: p.x, y: p.y, heading: p.ang, speed: 25 },
        view = rig.update(pose, surface, 0, { reset: true });
      camera.position.set(view.position.x, view.position.y, view.position.z);
      world.update(camera, pose, false, {});
      expect(bed.visible).toBe(true);
      const car = new THREE.Vector3(p.x, 1.5, p.y),
        ray = new THREE.Raycaster(
          camera.position,
          car.clone().sub(camera.position).normalize(),
          0.3,
          camera.position.distanceTo(car) - 0.4,
        );
      const hits = ray
        .intersectObject(bed, true)
        .filter((h) => h.object.visible && !h.object.material.transparent);
      expect(hits, `s=${s},lane=${lane}`).toHaveLength(0);
    }
  }
  expect(covered).toBeGreaterThan(20);
  expect(world.group.getObjectByName("parallel-pitlane-carpet")).toBeTruthy();
  expect(world.group.getObjectByName("paddock-team-area")).toBeTruthy();
  expect(world.layout.objects.some((o) => o.id.startsWith("parked-car-"))).toBe(
    false,
  );
  world.dispose();
  materials.dispose();
});

it("Iteration 2: beschleunigte Dekorationsprüfung liefert dieselben Abstände wie der vollständige frühere Scan", () => {
  const { api, surface, world, materials } = createWorld(),
    old = { ...api };
  runInNewContext(
    execFileSync("git", [
      "show",
      "2891e85003168e05895f5b6a1b48be96fc18364a:src/rendering/bahrain-layout.js",
    ]).toString(),
    { CGPArcade: old },
  );
  const original = old.BahrainLayout.create(surface);
  expect(JSON.stringify(world.layout.objects)).toBe(
    JSON.stringify(original.objects),
  );
  for (const [x, y, w, d] of [
    [710, 110, 40, 15],
    [580, 170, 15, 12],
    [100, 620, 18, 20],
    [1000, 600, 60, 30],
    [500, 300, 22, 15],
    [700, 145, 20, 10],
  ])
    expect(world.layout.clearance({ x, y, ang: 0.17 }, w, d)).toBe(
      original.clearance({ x, y, ang: 0.17 }, w, d),
    );
  world.dispose();
  materials.dispose();
});
