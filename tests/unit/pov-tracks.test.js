import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
import { createGame, ROOT, plain } from "../helpers/game.js";

const baseline = "e50dee17a07a315321485328f8625d4d660f18ce";
const ids = ["bahrain", "luxembourg", "canada", "france"];
function published(path) {
  return execFileSync("git", ["show", `${baseline}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

it("übernimmt vier Originalstrecken samt Kalenderindex, Sektoren und Boxengasse exakt", () => {
  const { api, data } = loadArcade(),
    { game } = createGame();
  expect(api.TrackCatalog.tracks.map((t) => t.id)).toEqual(ids);
  for (const [index, id] of ids.entries()) {
    const track = api.TrackCatalog.get(id),
      surface = api.Surface.create(track),
      classic = game.makeGeometry(game.trackDefs[index]);
    expect(track.index).toBe(index);
    expect(surface.id).toBe(id);
    expect(plain(surface.g.pts)).toEqual(plain(classic.pts));
    expect(plain(surface.g.cum)).toEqual(plain(classic.cum));
    expect(surface.g.width).toBe(classic.width);
    expect(plain(surface.g.sectors)).toEqual(plain(classic.sectors));
    expect(plain(surface.g.pit)).toEqual(plain(classic.pit));
    expect(Object.isFrozen(data.tracks[id].points[0])).toBe(true);
    expect(Object.isFrozen(data.boundaries[id].polygons[0][0][0])).toBe(true);
  }
  expect(() => api.TrackCatalog.get("korea")).toThrow();
  expect(() => api.TrackCatalog.get("russia")).toThrow();
  expect(() => api.TrackCatalog.get("__proto__")).toThrow();
});

it("erhält Bahrain-Daten und Seile sowie gemeinsame Physik, Steuerung und Sektorregel bytegenau", () => {
  const { data } = loadArcade(),
    scope = {};
  for (const file of ["arcade-tracks", "arcade-boundaries", "arcade-roster"])
    runInNewContext(published(`src/data/${file}.js`), scope);
  expect(plain(data.tracks.bahrain)).toEqual(
    plain(scope.CGPArcadeData.tracks.bahrain),
  );
  expect(plain(data.boundaries.bahrain)).toEqual(
    plain(scope.CGPArcadeData.boundaries.bahrain),
  );
  expect(plain(data.roster)).toEqual(plain(scope.CGPArcadeData.roster));
  for (const path of [
    "src/racing/physics.js",
    "src/racing/controls.js",
    "src/racing/timing.js",
    "src/racing/race-session.js",
    "src/rendering/vehicles3d.js",
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
    for (let x = 180; x < 1010; x += 61)
      for (let y = 100; y < 680; y += 57) {
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
