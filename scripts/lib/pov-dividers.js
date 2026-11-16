// Build-time only. Connect buffer pockets on the same side of the original
// centreline. Outer pockets connect to the exterior, not across the racetrack.
function inside(p, ring) {
  let value = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > p.y !== b[1] > p.y &&
      p.x < ((b[0] - a[0]) * (p.y - a[1])) / (b[1] - a[1]) + a[0]
    )
      value = !value;
  }
  return value;
}
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const a = points[0],
    b = points.at(-1),
    dx = b.x - a.x,
    dy = b.y - a.y;
  let maximum = 0,
    split = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      u = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      ),
      distance = Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy);
    if (distance > maximum) {
      maximum = distance;
      split = i;
    }
  }
  return maximum <= epsilon
    ? [a, b]
    : [
        ...simplify(points.slice(0, split + 1), epsilon).slice(0, -1),
        ...simplify(points.slice(split), epsilon),
      ];
}
export function automaticDividers(surface, field, clip) {
  if (field.polygons.length !== 1)
    throw Error("POV-Fahrfläche ist nicht zusammenhängend.");
  const rings = field.polygons[0];
  if (rings.length <= 2) return [];
  const step = 2,
    pts = surface.g.pts,
    left =
      Math.floor(
        (Math.min(...pts.map((p) => p.x)) - surface.outerRadius - 6) / step,
      ) * step,
    top =
      Math.floor(
        (Math.min(...pts.map((p) => p.y)) - surface.outerRadius - 6) / step,
      ) * step,
    width =
      Math.ceil(
        (Math.max(...pts.map((p) => p.x)) + surface.outerRadius + 6 - left) /
          step,
      ) + 1,
    height =
      Math.ceil(
        (Math.max(...pts.map((p) => p.y)) + surface.outerRadius + 6 - top) /
          step,
      ) + 1,
    count = width * height,
    fineWidth = width * 2 - 1,
    depths = new Float64Array(fineWidth * (height * 2 - 1)).fill(NaN),
    minimum = surface.roadRadius + field.railRadius + 1.2,
    at = (i) => ({
      x: left + (i % width) * step,
      y: top + Math.floor(i / width) * step,
    }),
    index = (p) =>
      Math.round((p.y - top) / step) * width + Math.round((p.x - left) / step);
  function depth(x, y) {
    const i = y * fineWidth + x;
    if (!Number.isFinite(depths[i]))
      depths[i] = surface.project({
        x: left + (x * step) / 2,
        y: top + (y * step) / 2,
      }).distance;
    return depths[i];
  }
  function free(i) {
    return (
      i >= 0 &&
      i < count &&
      depth((i % width) * 2, Math.floor(i / width) * 2) >= minimum
    );
  }
  const inRegion = (p, i) =>
      i === 0 ? !inside(p, rings[0]) : inside(p, rings[i]),
    seeds = rings.map((ring, region) => {
      const result = new Set();
      for (let edge = 0; edge < ring.length - 1; edge++) {
        const a = ring[edge],
          b = ring[edge + 1],
          n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
        for (let k = 0; k <= n; k++) {
          const mid = index({
            x: a[0] + ((b[0] - a[0]) * k) / n,
            y: a[1] + ((b[1] - a[1]) * k) / n,
          });
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const i = mid + dy * width + dx;
              if (free(i) && inRegion(at(i), region)) result.add(i);
            }
        }
      }
      if (!result.size)
        throw Error("Seilbereich hat keinen sicheren Ausgangspunkt.");
      return [...result];
    }),
    centre = pts.map((p) => [p.x, p.y]),
    sides = seeds.map((values, i) => i !== 0 && inside(at(values[0]), centre)),
    candidates = [];
  for (let source = 0; source < rings.length; source++)
    for (let target = source + 1; target < rings.length; target++) {
      if (sides[source] !== sides[target]) continue;
      const ring = rings[target],
        minX = Math.min(...ring.map((p) => p[0])),
        maxX = Math.max(...ring.map((p) => p[0])),
        minY = Math.min(...ring.map((p) => p[1])),
        maxY = Math.max(...ring.map((p) => p[1])),
        distances = new Float64Array(count).fill(Infinity),
        parent = new Int32Array(count).fill(-1),
        heap = [];
      function heuristic(i) {
        const p = at(i);
        return Math.hypot(
          Math.max(minX - p.x, 0, p.x - maxX),
          Math.max(minY - p.y, 0, p.y - maxY),
        );
      }
      function push(i, cost) {
        let k = heap.length;
        heap.push({ i, cost });
        while (k) {
          const p = (k - 1) >> 1;
          if (heap[p].cost <= cost) break;
          heap[k] = heap[p];
          k = p;
        }
        heap[k] = { i, cost };
      }
      function pop() {
        const first = heap[0],
          last = heap.pop();
        if (heap.length) {
          let k = 0;
          while (k * 2 + 1 < heap.length) {
            let child = k * 2 + 1;
            if (
              child + 1 < heap.length &&
              heap[child + 1].cost < heap[child].cost
            )
              child++;
            if (last.cost <= heap[child].cost) break;
            heap[k] = heap[child];
            k = child;
          }
          heap[k] = last;
        }
        return first;
      }
      for (const i of seeds[source]) {
        distances[i] = 0;
        parent[i] = -2;
        push(i, heuristic(i));
      }
      let goal = -1;
      while (heap.length) {
        const entry = pop(),
          i = entry.i;
        if (entry.cost > distances[i] + heuristic(i) + 1e-8) continue;
        if (inRegion(at(i), target)) {
          goal = i;
          break;
        }
        const x = i % width,
          y = Math.floor(i / width);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (
              (!dx && !dy) ||
              x + dx < 0 ||
              x + dx >= width ||
              y + dy < 0 ||
              y + dy >= height
            )
              continue;
            const j = (y + dy) * width + x + dx,
              cost = distances[i] + step * Math.hypot(dx, dy);
            if (
              cost >= distances[j] ||
              !free(j) ||
              depth(x * 2 + dx, y * 2 + dy) < minimum
            )
              continue;
            distances[j] = cost;
            parent[j] = i;
            push(j, cost + heuristic(j));
          }
      }
      if (goal < 0) continue;
      const path = [];
      for (let i = goal; i >= 0; i = parent[i]) path.push(at(i));
      path.reverse();
      candidates.push({ source, target, path, length: distances[goal] });
    }
  // A shortest guide may pass through another background pocket. Clip each
  // crossing separately and use its actual contour endpoints in the graph.
  function endpointRegion(point) {
    let nearest = -1,
      minimum = Infinity;
    for (let ring = 0; ring < rings.length; ring++)
      for (let edge = 0; edge < rings[ring].length - 1; edge++) {
        const a = rings[ring][edge],
          b = rings[ring][edge + 1],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          t = Math.max(
            0,
            Math.min(
              1,
              ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) /
                (dx * dx + dy * dy || 1),
            ),
          ),
          distance = Math.hypot(
            point[0] - a[0] - t * dx,
            point[1] - a[1] - t * dy,
          );
        if (distance < minimum) {
          minimum = distance;
          nearest = ring;
        }
      }
    if (minimum > 1e-5)
      throw Error("Seilende ist nicht im bestehenden Rand verankert.");
    return nearest;
  }
  const crossings = [];
  for (const { path } of candidates) {
    let pieces;
    for (const epsilon of [0.25, 0]) {
      const guide = epsilon ? simplify(path, epsilon) : path;
      try {
        pieces = clip(guide.map((p) => [p.x, p.y]));
        break;
      } catch (error) {
        if (!epsilon) throw error;
      }
    }
    for (const points of pieces) {
      const source = endpointRegion(points[0]),
        target = endpointRegion(points.at(-1));
      if (source === target) continue;
      if (sides[source] !== sides[target])
        throw Error("Seilverbindung kreuzt die Fahrbahn.");
      const length = points
        .slice(1)
        .reduce(
          (sum, p, i) =>
            sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]),
          0,
        );
      crossings.push({ source, target, points, length });
    }
  }
  const parents = rings.map((_, i) => i),
    find = (i) => (parents[i] === i ? i : (parents[i] = find(parents[i]))),
    result = [];
  for (const candidate of crossings.sort(
    (a, b) => a.length - b.length || a.source - b.source || a.target - b.target,
  )) {
    const { source, target, points } = candidate;
    if (find(source) === find(target)) continue;
    parents[find(source)] = find(target);
    result.push({
      id: `auto-${source}-${target}`,
      connects: [source, target],
      points,
    });
  }
  for (const side of [false, true]) {
    const members = sides
      .map((value, i) => (value === side ? find(i) : null))
      .filter((i) => i !== null);
    if (new Set(members).size > 1)
      throw Error(
        "Eine Abkürzung lässt sich nicht außerhalb der Fahrbahn schließen.",
      );
  }
  return result;
}
