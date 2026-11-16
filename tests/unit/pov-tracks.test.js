import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
import { createGame, ROOT, plain } from "../helpers/game.js";

const baseline = "6348eb32e6c8acc403829f3c083c23adcfc45166";
const ids = ["bahrain", "luxembourg", "canada", "france"];
function published(path) {
  return execFileSync("git", ["show", `${baseline}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

it("lädt veränderte Laufzeitmodule unter neuen URLs statt alte Bahrain-Module aus dem Browsercache zu mischen", () => {
  const references =
    /(?:src|href)="\.\/(src\/[^"?]+|styles\/[^"?]+)(\?[^" ]*)?"/g;
  for (const page of ["arcade.html", "arcade3d.html", "race.html"]) {
    const before = new Map(
        [...published(page).matchAll(references)].map((m) => [m[1], m[0]]),
      ),
      after = readFileSync(new URL(page, ROOT), "utf8");
    for (const match of after.matchAll(references)) {
      if (!before.has(match[1])) continue;
      const source = readFileSync(new URL(match[1], ROOT), "utf8");
      if (source !== published(match[1]))
        expect(match[0], `${page}: ${match[1]}`).not.toBe(before.get(match[1]));
    }
  }
});

it("erhält Originalzeichnungen, Kalender und Sektoren; entzerrt nur die freigegebenen POV-Geometrien", () => {
  const { api, data } = loadArcade(),
    { game } = createGame();
  expect(api.TrackCatalog.tracks.slice(0, 4).map((t) => t.id)).toEqual(ids);
  for (const [index, id] of ids.entries()) {
    const track = api.TrackCatalog.get(id),
      surface = api.Surface.create(track),
      classic = game.makeGeometry(game.trackDefs[index]);
    expect(track.index).toBe(index);
    expect(surface.id).toBe(id);
    expect(plain(surface.g.sectors)).toEqual(plain(classic.sectors));
    const original = game.digitizedTracks[index];
    // Raw drawings stay untouched, including pit and sector fractions.
    for (const key of ["points", "pit", "width", "sectorU", "bridgeU"])
      expect(plain(track[key])).toEqual(plain(original[key]));
    if (id === "bahrain" || id === "canada") {
      expect(plain(surface.g.pts)).toEqual(plain(classic.pts));
      expect(plain(surface.g.cum)).toEqual(plain(classic.cum));
      expect(surface.g.width).toBe(classic.width);
      expect(plain(surface.g.pit)).toEqual(plain(classic.pit));
    }
    expect(Object.isFrozen(data.tracks[id].points[0])).toBe(true);
    expect(Object.isFrozen(data.boundaries[id].polygons[0][0][0])).toBe(true);
  }
  expect(() => api.TrackCatalog.get("atlantis")).toThrow();
  expect(api.TrackCatalog.get("korea").index).toBe(9);
  expect(api.TrackCatalog.get("russia").index).toBe(16);
  expect(() => api.TrackCatalog.get("__proto__")).toThrow();
});

it("öffnet alle französischen Kurven deutlicher als die luxemburgischen und verbreitert nur Frankreich", () => {
  const { api, data } = loadArcade(),
    scope = {};
  runInNewContext(published("src/data/arcade-tracks.js"), scope);
  for (const [id, layout, width] of [
    ["france", 1.4, 1.2],
    ["luxembourg", 1.15, 1],
  ]) {
    const before = api.Surface.create(scope.CGPArcadeData.tracks[id]),
      after = api.Surface.create(data.tracks[id]);
    expect(after.g.len / before.g.len).toBeCloseTo(layout, 10);
    expect(after.g.width / before.g.width).toBeCloseTo(width, 10);
    // Every segment and bend keeps its direction. Fixed-size cars have more
    // space at ALL bends; this is physical geometry, not just camera zoom.
    for (let i = 0; i < before.g.pts.length; i++) {
      const a = before.g.pts[i],
        b = before.g.pts[(i + 1) % before.g.pts.length],
        c = after.g.pts[i],
        d = after.g.pts[(i + 1) % after.g.pts.length];
      expect(
        Math.hypot(d.x - c.x, d.y - c.y) / Math.hypot(b.x - a.x, b.y - a.y),
      ).toBeCloseTo(layout, 8);
      expect(Math.atan2(d.y - c.y, d.x - c.x)).toBeCloseTo(
        Math.atan2(b.y - a.y, b.x - a.x),
        8,
      );
      const prev = (i - 1 + before.g.pts.length) % before.g.pts.length;
      function radius(points) {
        const p = points[prev],
          q = points[i],
          r = points[(i + 1) % points.length],
          cross = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
        return (
          (Math.hypot(q.x - p.x, q.y - p.y) *
            Math.hypot(r.x - q.x, r.y - q.y) *
            Math.hypot(r.x - p.x, r.y - p.y)) /
          (2 * Math.abs(cross))
        );
      }
      const oldRadius = radius(before.g.pts);
      if (Number.isFinite(oldRadius) && oldRadius < 10000)
        expect(radius(after.g.pts) / oldRadius).toBeCloseTo(layout, 7);
    }
    // Sector and pit locations scale with the circuit, never across an arm.
    for (const u of [0, ...before.g.sectors]) {
      const a = before.at(u * before.g.len),
        b = after.at(u * after.g.len);
      expect(b.x).toBeCloseTo(590 + (a.x - 590) * layout, 8);
      expect(b.y).toBeCloseTo(374 + (a.y - 374) * layout, 8);
    }
    for (const [i, a] of before.g.pit.entries()) {
      expect(after.g.pit[i].x).toBeCloseTo(590 + (a.x - 590) * layout, 8);
      expect(after.g.pit[i].y).toBeCloseTo(374 + (a.y - 374) * layout, 8);
    }
    expect(after.outerRadius - after.roadRadius).toBeGreaterThan(
      api.Physics.parameters.halfWidth,
    );
  }
});

it("erhält Bahrain und Kanada samt Seilen sowie gemeinsame Physik, Steuerung und Sektorregel bytegenau", () => {
  const { data } = loadArcade(),
    scope = {};
  for (const file of ["arcade-tracks", "arcade-boundaries", "arcade-roster"])
    runInNewContext(published(`src/data/${file}.js`), scope);
  for (const id of ["bahrain", "canada"]) {
    expect(plain(data.tracks[id])).toEqual(
      plain(scope.CGPArcadeData.tracks[id]),
    );
    expect(plain(data.boundaries[id])).toEqual(
      plain(scope.CGPArcadeData.boundaries[id]),
    );
  }
  expect(plain(data.roster)).toEqual(plain(scope.CGPArcadeData.roster));
  for (const path of [
    "src/racing/physics.js",
    "src/racing/controls.js",
    "src/racing/timing.js",
  ])
    expect(readFileSync(new URL(path, ROOT), "utf8")).toBe(published(path));
});

it("behält auf Bahrain exakt die abgenommenen KI-Befehle bei", () => {
  const { api, data } = loadArcade({ race: true }),
    scope = {
      CGPArcade: {
        OpponentLine: api.OpponentLine,
        VehicleContacts: api.VehicleContacts,
      },
    },
    surface = api.Surface.create(data.tracks.bahrain),
    p = api.Physics.parameters;
  runInNewContext(published("src/racing/opponents.js"), scope);
  const before = scope.CGPArcade.Opponents.create(surface, p),
    after = api.Opponents.create(surface, p),
    a = before.memory(0),
    b = after.memory(0);
  let car = { ...api.Physics.spawn(surface, -22), id: "reference" };
  for (let frame = 0; frame < 40 * 30; frame++) {
    const traffic = after.prepare([car]),
      input = after.input(traffic[0], traffic, b);
    expect(plain(input)).toEqual(plain(before.input(traffic[0], traffic, a)));
    for (let step = 0; step < 4; step++)
      car = { ...api.Physics.step(car, input, surface), id: "reference" };
  }
});

it.each(ids)(
  "hält auf %s Seile außerhalb der Fahrbahn und alle 13 Startplätze frei",
  (id) => {
    const { api, data } = loadArcade({ race: true }),
      race = api.RaceSession.create(data.tracks[id]),
      surface = race.surface,
      entries = race.snapshot().entries,
      p = race.parameters;
    expect(surface.boundary).not.toBe(null);
    for (let i = 0; i < entries.length; i++) {
      expect(
        surface.boundary.blocksFootprint(
          api.VehicleContacts.footprint(entries[i].car, p),
        ),
      ).toBe(false);
      for (let j = i + 1; j < entries.length; j++)
        expect(
          api.VehicleContacts.overlap(entries[i].car, entries[j].car, p),
        ).toBe(null);
    }
    for (const { points } of surface.boundary.dividers)
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          n = Math.max(1, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1])));
        for (let k = 0; k <= n; k++)
          expect(
            surface.project({
              x: a[0] + ((b[0] - a[0]) * k) / n,
              y: a[1] + ((b[1] - a[1]) * k) / n,
            }).distance,
          ).toBeGreaterThan(
            surface.roadRadius + surface.boundary.railRadius + 0.99,
          );
      }
    for (let i = 0; i < 200; i++) {
      const pose = surface.at((i * surface.g.len) / 200);
      expect(
        surface.boundary.blocksFootprint(
          api.VehicleContacts.footprint({ ...pose, heading: pose.ang }, p),
        ),
      ).toBe(false);
    }
  },
);

it.each(ids)(
  "zählt auf %s nur die drei echten Sektor-/Ziellinien über deren volle Seilbreite",
  (id) => {
    const { api, data } = loadArcade(),
      surface = api.Surface.create(data.tracks[id]);
    expect(surface.checkpoints.map((p) => p.s)).toEqual([
      0,
      ...surface.g.sectors.map((u) => u * surface.g.len),
    ]);
    for (const side of [-1, 1]) {
      let timing = api.Timing.create();
      for (const index of [0, 1, 2, 0]) {
        const point = surface.checkpoints[index],
          lane = side < 0 ? point.minLane + 4 : point.maxLane - 4,
          x = point.x - Math.sin(point.ang) * lane,
          y = point.y + Math.cos(point.ang) * lane,
          dx = Math.cos(point.ang) * 0.2,
          dy = Math.sin(point.ang) * 0.2;
        expect(surface.boundary.contains({ x, y })).toBe(true);
        timing = api.Timing.step(
          timing,
          { x: x - dx, y: y - dy },
          { x: x + dx, y: y + dy, offroad: true, longitudinalSpeed: 10 },
          surface,
          1,
        );
      }
      expect(timing.completed).toBe(1);
      expect(timing.lastLap.valid).toBe(true);
    }
  },
);

it.each(ids)(
  "zeichnet auf %s dieselbe endliche 3D-Fläche wie die physische Begrenzung",
  (id) => {
    const { api, data } = loadArcade(),
      surface = api.Surface.create(data.tracks[id]);
    runInNewContext(
      readFileSync(new URL("src/rendering/tracks3d.js", ROOT), "utf8"),
      { CGPArcade: api, CGPThree: THREE },
    );
    const geometry = api.Tracks3D.boundaryGeometry(surface),
      material = new THREE.MeshBasicMaterial(),
      mesh = new THREE.Mesh(geometry, material),
      ray = new THREE.Raycaster();
    mesh.updateMatrixWorld();
    const xs = surface.g.pts.map((p) => p.x),
      ys = surface.g.pts.map((p) => p.y),
      left = Math.min(...xs) - surface.outerRadius,
      right = Math.max(...xs) + surface.outerRadius,
      top = Math.min(...ys) - surface.outerRadius,
      bottom = Math.max(...ys) + surface.outerRadius;
    for (let i = 0; i <= 14; i++)
      for (let j = 0; j <= 11; j++) {
        const x = left + ((right - left) * i) / 14,
          y = top + ((bottom - top) * j) / 11;
        ray.set(new THREE.Vector3(x, 10, y), new THREE.Vector3(0, -1, 0));
        expect(ray.intersectObject(mesh).length > 0).toBe(
          surface.boundary.contains({ x, y }),
        );
      }
    expect([...geometry.attributes.position.array].every(Number.isFinite)).toBe(
      true,
    );
    geometry.dispose();
    material.dispose();
  },
);

it.each(["france", "luxembourg"])(
  "passt die vergrößerte %s-Fahrfläche auch mobil vollständig in die Übersicht",
  (id) => {
    const { api, data } = loadArcade(),
      surface = api.Surface.create(data.tracks[id]);
    runInNewContext(
      readFileSync(new URL("src/rendering/camera3d.js", ROOT), "utf8"),
      { CGPArcade: api },
    );
    for (const aspect of [0.4, 1, 2.2]) {
      const rig = api.Camera3D.create().update(
          { x: 0, y: 0, heading: 0 },
          surface,
          0,
          { overview: true, aspect },
        ),
        camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 6000);
      camera.position.set(rig.position.x, rig.position.y, rig.position.z);
      camera.lookAt(rig.target.x, rig.target.y, rig.target.z);
      camera.updateMatrixWorld();
      for (const ring of surface.boundary.loops)
        for (const [x, y] of ring) {
          const projected = new THREE.Vector3(x, 0, y).project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(1);
          expect(Math.abs(projected.y)).toBeLessThan(1);
          expect(projected.z).toBeLessThan(1);
        }
    }
  },
);

it.each(ids.slice(1))(
  "schließt auf %s die vorher befahrbaren Zwischenräume auch rückwärts",
  (id) => {
    const { api, data } = loadArcade({ race: true }),
      surface = api.Surface.create(data.tracks[id]),
      p = api.Physics.parameters,
      old = {
        ...surface,
        boundary: api.BoundaryField.create({
          ...data.boundaries[id],
          dividers: [],
        }),
      };
    function start(at, side, gear) {
      const heading =
          Math.atan2(side * at.ny, side * at.nx) + (gear < 0 ? Math.PI : 0),
        speed = gear < 0 ? p.maxReverseSpeed : p.maxSpeed,
        car = {
          ...api.Physics.spawn(surface),
          x: at.x - side * 12 * at.nx,
          y: at.y - side * 12 * at.ny,
          heading,
          vx: side * at.nx * speed,
          vy: side * at.ny * speed,
          speed,
          longitudinalSpeed: gear * speed,
        };
      car.s = surface.project(car).s;
      return car;
    }
    function drive(field, at, side, gear) {
      let car = start(at, side, gear),
        maximum = -12,
        contacts = 0;
      for (let i = 0; i < 480; i++) {
        car = api.Physics.step(
          car,
          { throttle: Number(gear > 0), brake: Number(gear < 0), steer: 0 },
          field,
        );
        maximum = Math.max(
          maximum,
          side * ((car.x - at.x) * at.nx + (car.y - at.y) * at.ny),
        );
        contacts += Number(car.hitWall);
      }
      return { maximum, contacts };
    }
    const count = surface.boundary.loops.length,
      parents = Array.from({ length: count }, (_, i) => i),
      find = (i) => (parents[i] === i ? i : (parents[i] = find(parents[i])));
    expect(surface.boundary.dividers.length).toBe(count - 2);
    for (const divider of surface.boundary.dividers) {
      const [a, b] = divider.connects;
      parents[find(a)] = find(b);
      const candidates = divider.points.slice(1).flatMap((b, i) => {
        const a = divider.points[i],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          length = Math.hypot(dx, dy);
        if (length < 2) return [];
        return [0.5, 0.25, 0.75].map((t) => ({
          x: a[0] + dx * t,
          y: a[1] + dy * t,
          nx: -dy / length,
          ny: dx / length,
        }));
      });
      const passage = candidates.find((at) =>
        [-1, 1].every(
          (side) =>
            !old.boundary.blocksFootprint(
              api.VehicleContacts.footprint(start(at, side, 1), p),
            ) && drive(old, at, side, 1).maximum > 6.5,
        ),
      );
      expect(
        passage,
        `${id}/${divider.id}: tatsächliche befahrbare Öffnung`,
      ).toBeDefined();
      for (const side of [-1, 1])
        for (const gear of [-1, 1]) {
          expect(drive(old, passage, side, gear).maximum).toBeGreaterThan(6.5);
          const blocked = drive(surface, passage, side, gear);
          expect(blocked.maximum).toBeLessThan(0);
          expect(blocked.contacts).toBeGreaterThan(0);
        }
    }
    // A simple closed track separates two background regions: inside/outside.
    expect(new Set(parents.map((_, i) => find(i))).size).toBe(2);
  },
);

it.each(ids.slice(1))(
  "beendet auf %s drei echte Runden mit allen 13 Autos und unveränderten Fahrzeuggrenzen",
  (id) => {
    const { api, data } = loadArcade({ race: true }),
      race = api.RaceSession.create(data.tracks[id]),
      p = race.parameters,
      driver = api.Opponents.create(race.surface, p),
      memory = driver.memory(0, -6);
    expect(p).toBe(api.Physics.parameters);
    race.pause(false);
    let snapshot = race.snapshot();
    for (let frame = 0; frame < 300 * 30; frame++) {
      const traffic = driver.prepare(
        snapshot.entries.map((e) => ({ ...e.car, id: e.id })),
      );
      race.advance(
        driver.input(
          traffic.find((e) => e.id === snapshot.race.playerTeam),
          traffic,
          memory,
        ),
        1 / 30,
      );
      snapshot = race.snapshot();
      if (frame % 30 === 0)
        for (const e of snapshot.entries) {
          expect(
            Object.values(e.car)
              .filter((v) => typeof v === "number")
              .every(Number.isFinite),
          ).toBe(true);
          expect(
            race.surface.boundary.blocksFootprint(
              api.VehicleContacts.footprint(e.car, p),
            ),
          ).toBe(false);
        }
      if (snapshot.race.phase === "finished") break;
    }
    expect(
      snapshot.race.phase,
      JSON.stringify(
        snapshot.entries.map((e) => ({
          id: e.id,
          lap: e.timing.completed,
          s: e.car.s,
          speed: e.car.speed,
        })),
      ),
    ).toBe("finished");
    expect(snapshot.race.finished).toBe(13);
    expect(
      snapshot.entries.every(
        (e) =>
          e.timing.completed === 3 &&
          e.timing.lastLap.valid &&
          Number.isFinite(e.finishTime),
      ),
    ).toBe(true);
  },
  120000,
);
