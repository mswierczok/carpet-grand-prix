// Build-time polygon union only. Players receive coordinates, not this library.
import clipping from "polygon-clipping";
import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { arcadeData } from "./export-arcade-data.js";
const root = new URL("../", import.meta.url);

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

export function boundaryData() {
  const track = arcadeData().track,
    scope = {};
  runInNewContext(
    readFileSync(new URL("src/racing/track-surface.js", root), "utf8"),
    scope,
  );
  const surface = scope.CGPArcade.Surface.create(track),
    pts = surface.g.pts,
    r = surface.outerRadius;
  const polygons = [];
  for (let i = 0; i < pts.length; i++) {
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
    polygons.push([ring]);
  }
  const exact = clipping.union(...polygons),
    simplified = exact.map((p) => p.map((r) => simplifyRing(r)));
  const chosen = simple(simplified) ? simplified : exact;
  const polygonsUnion = chosen.map((polygon) =>
    polygon.map((ring) =>
      ring.map((point) => point.map((n) => Math.round(n * 1e6) / 1e6)),
    ),
  );
  return {
    version: 1,
    id: track.id,
    sourceSHA256: createHash("sha256")
      .update(
        JSON.stringify({
          points: track.points,
          pit: track.pit,
          width: track.width,
        }),
      )
      .digest("hex"),
    radius: r,
    polygons: polygonsUnion,
  };
}
export function boundaryScript() {
  return `/* Closed driving-area boundary. Regenerate: npm run build:arcade-boundaries */\n(()=>{const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};globalThis.CGPArcadeData=globalThis.CGPArcadeData||{};CGPArcadeData.boundaries=freeze(${JSON.stringify({ bahrain: boundaryData() })});})();\n`;
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
