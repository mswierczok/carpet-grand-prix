// Build-time polygon union only. Players receive coordinates, not this library.
import clipping from "polygon-clipping";
import ClipperLib from "clipper-lib";
import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { arcadeData } from "./export-arcade-data.js";
import { automaticDividers } from "./lib/pov-dividers.js";
import { bridgeBoundaries } from "./lib/pov-bridges.js";
const root = new URL("../", import.meta.url);

// Bahrain-only separator guides in the same normalized coordinates as Surface.
// They follow the dark space between nearby arms, never the light racing line.
// Their visible ends are clipped to the existing closed rope contours below.
const dividerGuides = [
  {
    id: "hairpin-straight",
    points: [
      [485, 230],
      [495, 227],
      [505, 225.5],
      [515, 224.5],
      [535, 224.5],
      [545, 225],
      [555, 227.5],
      [565, 231],
      [570, 235],
    ],
  },
  {
    id: "central-return",
    points: [
      [505, 395],
      [503, 385],
      [503, 365],
      [505.5, 355],
      [510, 345],
      [516, 335],
      [523.5, 325],
      [533, 315],
      [543, 305.5],
      [553, 298],
      [563, 291],
      [573, 284],
      [585, 280],
    ],
  },
];

function clipDivider(guide, field, surface, split = false) {
  let points = [];
  const pieces = [],
    cross2 = (a, b) => a[0] * b[1] - a[1] * b[0],
    minus = (a, b) => [a[0] - b[0], a[1] - b[1]],
    edges = field.loops.flatMap((r) =>
      r.slice(0, -1).map((a, i) => [a, r[i + 1]]),
    );
  let ended = false;
  for (let i = 0; i < guide.length - 1; i++) {
    const a = guide[i],
      b = guide[i + 1],
      direction = minus(b, a),
      cuts = [0, 1];
    const at = (t) => [a[0] + direction[0] * t, a[1] + direction[1] * t];
    for (const [c, d] of edges) {
      const edge = minus(d, c),
        divisor = cross2(direction, edge);
      if (Math.abs(divisor) < 1e-10) continue;
      const delta = minus(c, a),
        t = cross2(delta, edge) / divisor,
        u = cross2(delta, direction) / divisor;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
    }
    cuts.sort((a, b) => a - b);
    for (let j = 0; j < cuts.length - 1; j++) {
      if (cuts[j + 1] - cuts[j] < 1e-9) continue;
      const middle = at((cuts[j] + cuts[j + 1]) / 2);
      if (!field.contains({ x: middle[0], y: middle[1] })) {
        if (points.length) ended = true;
        continue;
      }
      if (ended) {
        if (!split)
          throw Error("Seiltrenner hat mehrere getrennte Fahrflächenstücke.");
        pieces.push(points);
        points = [];
        ended = false;
      }
      if (!points.length) points.push(at(cuts[j]));
      points.push(at(cuts[j + 1]));
    }
  }
  if (points.length) pieces.push(points);
  if (!pieces.length || pieces.some((part) => part.length < 2))
    throw Error("Seiltrenner erreicht keine Fahrfläche.");
  // Fail loudly if future track edits move the guide onto the light road.
  for (const points of pieces)
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1],
        steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
      for (let k = 0; k <= steps; k++) {
        const p = {
          x: a[0] + ((b[0] - a[0]) * k) / steps,
          y: a[1] + ((b[1] - a[1]) * k) / steps,
        };
        if (
          surface.project(p).distance <
          surface.roadRadius + field.railRadius + 1
        )
          throw Error("Seiltrenner liegt zu nahe an der hellen Fahrbahn.");
      }
    }
  const rounded = pieces.map((points) =>
    points.map((p) => p.map((v) => Math.round(v * 1e6) / 1e6)),
  );
  return split ? rounded : rounded[0];
}

function simplifyRing(ring, epsilon = 0.08) {
  const points = ring.slice(0, -1);
  let split = 1;
  for (let i = 2; i < points.length; i++)
    if (
      Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]) >
      Math.hypot(
        points[split][0] - points[0][0],
        points[split][1] - points[0][1],
      )
    )
      split = i;
  function simplify(line) {
    const keep = new Set([0, line.length - 1]),
      stack = [[0, line.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(),
        p = line[a],
        q = line[b],
        dx = q[0] - p[0],
        dy = q[1] - p[1],
        len = dx * dx + dy * dy;
      let max = epsilon * epsilon,
        index = -1;
      for (let i = a + 1; i < b; i++) {
        const v = line[i],
          f = Math.max(
            0,
            Math.min(1, ((v[0] - p[0]) * dx + (v[1] - p[1]) * dy) / (len || 1)),
          ),
          d = (v[0] - p[0] - f * dx) ** 2 + (v[1] - p[1] - f * dy) ** 2;
        if (d > max) {
          max = d;
          index = i;
        }
      }
      if (index >= 0) {
        keep.add(index);
        stack.push([a, index], [index, b]);
      }
    }
    return [...keep].sort((a, b) => a - b).map((i) => line[i]);
  }
  return [
    ...simplify(points.slice(0, split + 1)).slice(0, -1),
    ...simplify([...points.slice(split), points[0]]),
  ];
}
function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function crosses(a, b, c, d) {
  return (
    cross(a, b, c) * cross(a, b, d) < -1e-12 &&
    cross(c, d, a) * cross(c, d, b) < -1e-12
  );
}
function simple(polygons) {
  const edges = polygons.flatMap((p) =>
    p.flatMap((r) => r.slice(0, -1).map((a, i) => [a, r[i + 1]])),
  );
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++)
      if (crosses(...edges[i], ...edges[j])) return false;
  return true;
}

function corridorPolygons(pts, r, track, closed = true) {
  const polygons = [];
  for (let i = 0; i < (closed ? pts.length : pts.length - 1); i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length],
      angle = Math.atan2(b.y - a.y, b.x - a.x),
      ring = [];
    for (let j = 0; j <= 48; j++) {
      const t = angle - Math.PI / 2 + (j * Math.PI) / 48;
      ring.push([b.x + Math.cos(t) * r, b.y + Math.sin(t) * r]);
    }
    for (let j = 0; j <= 48; j++) {
      const t = angle + Math.PI / 2 + (j * Math.PI) / 48;
      ring.push([a.x + Math.cos(t) * r, a.y + Math.sin(t) * r]);
    }
    ring.push(ring[0]);
    // Shared cap vertices on dense new drawings need a stable build-time grid
    // for polygon union. Keep the accepted Bahrain boundary byte-identical.
    polygons.push([
      track.id === "bahrain"
        ? ring
        : ring.map((point) => point.map((v) => Math.round(v * 1e6) / 1e6)),
    ]);
  }
  let exact;
  if (track.index < 4) exact = clipping.union(...polygons);
  else {
    // A fixed integer grid avoids unstable floating sweep intersections on
    // dense new drawings. Build dependency only; preserve accepted tracks.
    const clipper = new ClipperLib.Clipper(),
      tree = new ClipperLib.PolyTree(),
      unit = 1e5;
    clipper.AddPaths(
      polygons.map((p) =>
        p[0].slice(0, -1).map(([x, y]) => ({
          X: Math.round(x * unit),
          Y: Math.round(y * unit),
        })),
      ),
      ClipperLib.PolyType.ptSubject,
      true,
    );
    if (
      !clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        tree,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero,
      )
    )
      throw Error(`${track.id}: Seilkontur konnte nicht geschlossen werden.`);
    exact = [];
    const ring = (node) => {
      const points = node.Contour().map((p) => [p.X / unit, p.Y / unit]);
      return [...points, points[0]];
    };
    function collect(node) {
      if (node.Contour().length && !node.IsHole())
        exact.push([
          ring(node),
          ...node
            .Childs()
            .filter((n) => n.IsHole())
            .map(ring),
        ]);
      node.Childs().forEach(collect);
    }
    collect(tree);
    if (!exact.length) throw Error(`${track.id}: Leere Fahrfläche.`);
  }
  const simplified = exact.map((p) => p.map((r) => simplifyRing(r)));
  const chosen = simple(simplified) ? simplified : exact;
  return chosen.map((polygon) =>
    polygon.map((ring) =>
      ring.map((point) => point.map((n) => Math.round(n * 1e6) / 1e6)),
    ),
  );
}

export function boundaryData(track = arcadeData().track) {
  const scope = {};
  for (const module of ["track-shape", "track-surface"])
    runInNewContext(
      readFileSync(new URL(`src/racing/${module}.js`, root), "utf8"),
      scope,
    );
  const surface = scope.CGPArcade.Surface.create(track),
    pts = surface.g.pts,
    r = surface.outerRadius;
  if (track.bridgeU.length) {
    const content = bridgeBoundaries(track, surface, (points) =>
      corridorPolygons(points, r, track, false),
    );
    return {
      version: 3,
      id: track.id,
      sourceSHA256: createHash("sha256")
        .update(
          JSON.stringify({
            points: track.points,
            pit: track.pit,
            width: track.width,
            pov: track.pov,
            bridgeU: track.bridgeU,
          }),
        )
        .digest("hex"),
      radius: r,
      ...content,
    };
  }
  const polygonsUnion = corridorPolygons(pts, r, track);
  runInNewContext(
    readFileSync(new URL("src/racing/boundary-field.js", root), "utf8"),
    scope,
  );
  const field = scope.CGPArcade.BoundaryField.create({
    polygons: polygonsUnion,
  });
  return {
    version: 2,
    id: track.id,
    sourceSHA256: createHash("sha256")
      .update(
        JSON.stringify({
          points: track.points,
          pit: track.pit,
          width: track.width,
          ...(track.pov ? { pov: track.pov } : {}),
        }),
      )
      .digest("hex"),
    radius: r,
    polygons: polygonsUnion,
    dividers:
      track.id === "bahrain"
        ? dividerGuides.map(({ id, points }) => ({
            id,
            points: clipDivider(points, field, surface),
          }))
        : automaticDividers(surface, field, (guide) =>
            clipDivider(guide, field, surface, true),
          ),
  };
}
export function boundaryScript() {
  const data = Object.fromEntries(
    Object.values(arcadeData().tracks).map((track) => [
      track.id,
      boundaryData(track),
    ]),
  );
  return `/* Closed driving-area boundary. Regenerate: npm run build:arcade-boundaries */\n(()=>{const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};globalThis.CGPArcadeData=globalThis.CGPArcadeData||{};CGPArcadeData.boundaries=freeze(${JSON.stringify(data)});})();\n`;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const source = boundaryScript(),
    path = new URL("src/data/arcade-boundaries.js", root);
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== source)
      throw Error(
        "Seilränder müssen aus den aktuellen Streckendaten neu erzeugt werden.",
      );
  } else writeFileSync(path, source);
  console.log(
    `Geschlossene Fahrflächenränder: ${Buffer.byteLength(source)} Bytes.`,
  );
}
