// Controlled reproduction of the reported small gain, using the actual
// aerodynamic detector and force integration before/after the correction.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { loadArcade } from "../tests/helpers/arcade.js";

const baseline = "a158c92f5f3d3cc8342da1bada9e2df5d7868fe5",
  path = "src/racing/slipstream.js",
  priorSource = execFileSync("git", ["show", `${baseline}:${path}`], { encoding: "utf8" }),
  hash = (value) => createHash("sha256").update(value).digest("hex"),
  files = [path, "src/racing/physics.js", "src/racing/bridge-physics.js",
    "src/racing/catchup.js", "tests/helpers/arcade.js", "scripts/measure-close-wake.js"],
  hashes = () => Object.fromEntries(files.map((file) => [file, hash(readFileSync(file))])),
  sources = hashes();

function surface() {
  return { g: { len: 100000, width: 40 }, roadRadius: 20,
    at: (s) => ({ x: s, y: 0, s, ang: 0 }), gap: (a, b) => b - a,
    project: (p) => ({ x: p.x, y: 0, s: p.x, distance: Math.abs(p.y), ang: 0 }),
    boundary: { contains: (p) => Math.abs(p.y) < 32,
      blocksFootprint: (corners) => corners.some((p) => Math.abs(p.y) >= 32) } };
}
function probe(legacy, offset) {
  let { api } = loadArcade({ race: true });
  if (legacy) {
    // Replace only the wind module in an isolated VM; shared physics is the
    // unchanged free-driving kernel, not another stacked wind adapter.
    api = { ...api, Physics: loadArcade().api.Physics };
    runInNewContext(priorSource, { CGPArcade: api });
  }
  const s = surface(), p = api.Physics.parameters, dt = 1 / 120,
    kmh = p.metersPerUnit * 3.6, gas = { throttle: 1, brake: 0, steer: 0 },
    make = (id, x, y) => ({ id, finishTime: null, slipstream: api.Slipstream.empty(),
      car: { ...api.Physics.spawn(s, x), y, vx: p.maxSpeed,
        speed: p.maxSpeed, longitudinalSpeed: p.maxSpeed } }),
    follower = make("follower", 0, offset), leader = make("leader", 6 * p.halfLength, 0),
    samples = [];
  let peakStepKmh = 0, peakGainKmh = 0;
  for (let tick = 1; tick <= 240; tick++) {
    const wakes = api.Slipstream.update([follower, leader], s, p, dt);
    [follower, leader].forEach((e, i) => {
      e.slipstream = wakes[i];
      const before = e.car;
      e.car = api.Physics.step(before, gas, s, p, dt, wakes[i]);
      peakStepKmh = Math.max(peakStepKmh, (e.car.speed - before.speed) * kmh);
      if (e.car.hitWall || e.car.offroad || !Number.isFinite(e.car.speed))
        throw Error("Invalid controlled run");
    });
    const gainKmh = (follower.car.speed - leader.car.speed) * kmh;
    peakGainKmh = Math.max(peakGainKmh, gainKmh);
    if (tick % 60 === 0) samples.push({ seconds: tick * dt,
      followerKmh: follower.car.speed * kmh, leaderKmh: leader.car.speed * kmh, gainKmh,
      strength: follower.slipstream.strength,
      distanceLengths: (leader.car.x - follower.car.x) / (2 * p.halfLength) });
  }
  return { legacy, lateralOffset: offset, settings: { ...api.Slipstream.settings },
    peakStepKmh, peakGainKmh, samples };
}
const runs = [];
for (const offset of [-3.9, -2, 0, 2, 3.9]) for (const legacy of [true, false])
  runs.push(probe(legacy, offset));
if (JSON.stringify(sources) !== JSON.stringify(hashes())) throw Error("Sources changed during measurement");
mkdirSync("docs/slipstream-full", { recursive: true });
writeFileSync("docs/slipstream-full/close-gain.json", JSON.stringify({ measuredAt: new Date().toISOString(),
  baseline, priorWindSha256: hash(priorSource), hashes: sources,
  protocol: "Two actual cars, both initially 118.8 km/h, three centre-to-centre lengths apart, full throttle, 120 Hz. No held poses, no speed writes during integration, no catch-up. Legacy changes only the wind adapter. Straight road isolates lateral offset and rise time; not a lap-time or human-performance claim.",
  runs }, null, 2) + "\n");
for (const run of runs) console.log(`${run.legacy ? "before" : "after"} offset ${run.lateralOffset}: ${run.samples.at(-1).gainKmh.toFixed(6)} km/h after 2 s`);
