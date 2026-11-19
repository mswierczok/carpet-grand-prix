import { withoutStartLights } from "../helpers/start-lights.js";
import { withoutMainEntry } from "../helpers/legacy-entry.js";
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT, plain, createGame } from "../helpers/game.js";
import { povIds, newPovIds } from "../helpers/pov-catalog.js";
const baseline = "57fb54422c0f70eb032bd82b85ab828a4e1e3dc8";
const published = (path) =>
  execFileSync("git", ["show", `${baseline}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
  });

it.each(newPovIds.filter((id) => id === "korea" || id === "russia"))(
  "zeichnet auf %s zwei echte Fahrbahnhöhen und Seile statt einer flachen Kreuzung",
  (id) => {
    const { api, data } = loadArcade(),
      s = api.Surface.create(data.tracks[id]);
    runInNewContext(
      readFileSync(new URL("src/rendering/tracks3d.js", ROOT), "utf8"),
      { CGPArcade: api, CGPThree: THREE },
    );
    const geometry = api.Tracks3D.roadGeometry(s, s.roadRadius, 0.07),
      material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      mesh = new THREE.Mesh(geometry, material),
      ray = new THREE.Raycaster();
    mesh.updateMatrixWorld();
    for (const b of s.bridge.specs) {
      const point = s.at(b.center);
      ray.set(
        new THREE.Vector3(point.x, 80, point.y),
        new THREE.Vector3(0, -1, 0),
      );
      const heights = ray.intersectObject(mesh).map((h) => h.point.y);
      expect(heights.some((y) => Math.abs(y - 24.07) < 0.01)).toBe(true);
      expect(heights.some((y) => Math.abs(y - 0.07) < 0.01)).toBe(true);
    }
    expect(
      s.boundary.rails.some((r) => r.points.some((p) => p[2] === 24)),
    ).toBe(true);
    expect(
      s.boundary.rails.every((r) =>
        r.points.every((p) => p.every(Number.isFinite)),
      ),
    ).toBe(true);
    geometry.dispose();
    material.dispose();
  },
);

it("enthält alle 22 Kalenderstrecken, unveränderte Originalzeichnungen und die vier historischen Geometriereferenzen", () => {
  const { api, data } = loadArcade({historicalBahrain:true}),
    { game } = createGame(),
    scope = {};
  for (const name of ["arcade-tracks", "arcade-boundaries", "arcade-roster"])
    runInNewContext(published(`src/data/${name}.js`), scope);
  expect(api.TrackCatalog.tracks.map((t) => t.id)).toEqual(povIds);
  for (const [index, id] of povIds.entries()) {
    const t = api.TrackCatalog.get(id);
    expect(t.index).toBe(index);
    for (const key of ["points", "width", "pit", "sectorU", "bridgeU"])
      expect(plain(t[key])).toEqual(plain(game.digitizedTracks[index][key]));
    expect(Object.isFrozen(t.points[0])).toBe(true);
    if (index < 4) {
      expect(plain(t)).toEqual(plain(scope.CGPArcadeData.tracks[id]));
      expect(plain(data.boundaries[id])).toEqual(
        plain(scope.CGPArcadeData.boundaries[id]),
      );
    }
  }
  expect(plain(data.roster)).toEqual(plain(scope.CGPArcadeData.roster));
  expect(withoutMainEntry(readFileSync(new URL("index.html", ROOT), "utf8"))).toBe(
    published("index.html"),
  );
});

it("liefert auf den vier abgenommenen Strecken dieselben Rennen trotz optionaler Brückenunterstützung", () => {
  const after = loadArcade({ race: true, historicalBahrain:true }),
    scope = {};
  for (const path of [
    "data/arcade-tracks",
    "data/arcade-roster",
    "data/arcade-boundaries",
    "racing/boundary-field",
    "racing/track-surface",
    "racing/physics",
    "racing/timing",
    "racing/vehicle-contacts",
    "racing/opponent-line",
    "racing/opponents",
    "racing/race-session",
  ])
    runInNewContext(published(`src/${path}.js`), scope);
  expect(plain(after.api.Physics.parameters)).toEqual(
    plain(scope.CGPArcade.Physics.parameters),
  );
  // Isolate the original bridge-adapter regression from the explicitly
  // authorized new AI. Both kernels replay the same published controller.
  after.api.Opponents = scope.CGPArcade.Opponents;
  for (const id of povIds.slice(0, 4)) {
    const a = scope.CGPArcade.RaceSession.create(
        scope.CGPArcadeData.tracks[id],
      ),
      b = after.api.RaceSession.create(after.data.tracks[id], { laps: 3, slipstream: false, catchup: false });
    a.pause(false);
    b.pause(false);
    for (let frame = 0; frame < 20 * 30; frame++) {
      const input = {
        throttle: Number(frame % 180 < 140),
        brake: Number(frame % 180 >= 140),
        steer: Math.sin(frame / 120),
      };
      a.advance(input, 1 / 30);
      b.advance(input, 1 / 30);
      if (frame % 30 === 0) {
        const current = withoutStartLights(b.snapshot());
        delete current.race.difficulty;
        expect(current).toEqual(withoutStartLights(a.snapshot()));
      }
    }
  }
}, 120000);

it.each(newPovIds)(
  "hat auf %s freie Startplätze, gültige Sektoren und vollständig sichtbare Übersicht",
  (id) => {
    const { api, data } = loadArcade({ race: true }),
      race = api.RaceSession.create(data.tracks[id]),
      s = race.surface;
    expect(s.g.width).toBeGreaterThanOrEqual(31.9);
    for (const e of race.snapshot().entries)
      expect(
        s.boundary.blocksFootprint(
          api.VehicleContacts.footprint(e.car, race.parameters),
          e.car.s,
        ),
      ).toBe(false);
    expect(s.checkpoints.map((p) => p.s)).toEqual([
      0,
      ...s.g.sectors.map((u) => u * s.g.len),
    ]);
    for (const cp of s.checkpoints) {
      expect(cp.minLane).toBeLessThan(-s.roadRadius);
      expect(cp.maxLane).toBeGreaterThan(s.roadRadius);
    }
    runInNewContext(
      readFileSync(new URL("src/rendering/camera3d.js", ROOT), "utf8"),
      { CGPArcade: api },
    );
    for (const aspect of [0.4, 2.2]) {
      const rig = api.Camera3D.create().update(
          { x: 0, y: 0, heading: 0 },
          s,
          0,
          { overview: true, aspect },
        ),
        camera = new THREE.PerspectiveCamera(55, aspect, 50, 6000);
      camera.position.set(rig.position.x, rig.position.y, rig.position.z);
      camera.lookAt(rig.target.x, rig.target.y, rig.target.z);
      camera.updateMatrixWorld();
      for (let i = 0; i < 100; i++)
        for (const lane of [-s.outerRadius, s.outerRadius]) {
          const d = (i * s.g.len) / 100,
            p = s.at(d, lane),
            v = new THREE.Vector3(p.x, s.bridge?.heightAt(d) || 0, p.y).project(
              camera,
            );
          expect(Math.abs(v.x)).toBeLessThan(1);
          expect(Math.abs(v.y)).toBeLessThan(1);
          expect(v.z).toBeLessThan(1);
        }
    }
  },
);

it.each(newPovIds)(
  "beendet auf %s drei gültige Runden mit dem ganzen Feld ohne Seildurchdringung",
  (id) => {
    const { api, data } = loadArcade({ race: true }),
      race = api.RaceSession.create(data.tracks[id], { laps: 3 }),
      driver = api.Opponents.create(race.surface, race.parameters),
      memory = driver.memory(0, -6);
    race.pause(false);
    let snap = race.snapshot();
    for (let frame = 0; frame < 300 * 30; frame++) {
      const traffic = driver.prepare(
        snap.entries.map((e) => ({ ...e.car, id: e.id })),
      );
      race.advance(
        driver.input(
          traffic.find((e) => e.id === snap.race.playerTeam),
          traffic,
          memory,
        ),
        1 / 30,
      );
      snap = race.snapshot();
      if (frame % 30 === 0)
        for (const e of snap.entries) {
          expect(
            Object.values(e.car)
              .filter((v) => typeof v === "number")
              .every(Number.isFinite),
          ).toBe(true);
          expect(
            race.surface.boundary.blocksFootprint(
              api.VehicleContacts.footprint(e.car, race.parameters),
              e.car.s,
            ),
          ).toBe(false);
        }
      if (snap.race.phase === "finished") break;
    }
    expect(
      snap.race.phase,
      JSON.stringify(
        snap.entries.map((e) => ({
          id: e.id,
          s: e.car.s,
          laps: e.timing.completed,
          speed: e.car.speed,
        })),
      ),
    ).toBe("finished");
    expect(snap.race.finished).toBe(13);
    expect(
      snap.entries.every(
        (e) =>
          e.timing.completed === 3 &&
          e.timing.lastLap.valid &&
          Number.isFinite(e.finishTime),
      ),
    ).toBe(true);
  },
  120000,
);

it.each(newPovIds.filter((id) => id === "korea" || id === "russia"))(
  "trennt auf %s Kreuzungsebenen, Seile und Rampen ohne neue Fahrparameter",
  (id) => {
    const { api, data } = loadArcade({ race: true }),
      surface = api.Surface.create(data.tracks[id]),
      p = api.Physics.parameters;
    expect(surface.bridge.specs).toHaveLength(id === "korea" ? 1 : 2);
    for (const b of surface.bridge.specs) {
      const over = api.Physics.spawn(surface, b.center),
        under = api.Physics.spawn(surface, b.under);
      expect(over.elevation).toBe(24);
      expect(under.elevation).toBe(0);
      expect(
        api.VehicleContacts.overlap(
          over,
          { ...under, x: over.x, y: over.y },
          p,
        ),
      ).toBe(null);
      expect(api.VehicleContacts.overlap(over, { ...over }, p)).not.toBe(null);
      for (const d of [-1, 1]) {
        const start = b.center + d * (b.plateau + b.ramp);
        expect(surface.bridge.heightAt(start)).toBeCloseTo(0, 10);
        expect(surface.bridge.pitchAt(start)).toBeCloseTo(0, 3);
      }
      for (const distance of [b.center, b.under]) {
        let car = api.Physics.spawn(surface, distance - 40),
          hit = 0;
        for (let i = 0; i < 240; i++) {
          const target = surface.at(car.s + 15),
            error = Math.atan2(
              Math.sin(target.ang - car.heading),
              Math.cos(target.ang - car.heading),
            );
          const next = api.Physics.step(
            car,
            {
              throttle: Number(car.speed < 40),
              brake: Number(car.speed > 45),
              steer: Math.max(-1, Math.min(1, error * 2)),
            },
            surface,
          );
          expect(Math.abs(next.s - car.s)).toBeLessThan(p.maxSpeed / 120 + 1);
          expect(next.elevation).toBe(surface.bridge.heightAt(next.s));
          hit += Number(next.hitWall);
          car = next;
        }
        expect(car.s).toBeGreaterThan(distance + 5);
        expect(hit).toBe(0);
      }
      for (const center of [b.center, b.under])
        for (const side of [-1, 1])
          for (const gear of [-1, 1]) {
            const pose = surface.at(center),
              heading =
                pose.ang + (side * Math.PI) / 2 + (gear < 0 ? Math.PI : 0),
              speed = gear < 0 ? p.maxReverseSpeed : p.maxSpeed;
            let car = {
                ...api.Physics.spawn(surface, center),
                heading,
                vx: side * -Math.sin(pose.ang) * speed,
                vy: side * Math.cos(pose.ang) * speed,
                longitudinalSpeed: gear * speed,
                speed,
              },
              contacts = 0;
            for (let i = 0; i < 480; i++) {
              car = api.Physics.step(
                car,
                {
                  throttle: Number(gear > 0),
                  brake: Number(gear < 0),
                  steer: 0,
                },
                surface,
              );
              contacts += Number(car.hitWall);
            }
            expect(contacts).toBeGreaterThan(0);
            expect(
              surface.boundary.blocksFootprint(
                api.VehicleContacts.footprint(car, p),
                car.s,
              ),
            ).toBe(false);
            expect(Math.abs(surface.gap(center, car.s))).toBeLessThan(
              surface.g.width,
            );
          }
    }
  },
);
