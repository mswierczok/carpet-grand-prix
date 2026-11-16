// Build-time split into overlapping open corridors. Crossing arms never share
// a collision polygon; only the short, level ramp joins overlap.
export function bridgeBoundaries(track, surface, union) {
  const { g } = surface,
    specs = track.bridgeU
      .map((b) => {
        const over = surface.at(b.over * g.len),
          under = surface.at(b.under * g.len),
          sine = Math.max(0.25, Math.abs(Math.sin(over.ang - under.ang)));
        return {
          center: b.over * g.len,
          under: b.under * g.len,
          plateau: surface.outerRadius / sine + 18,
          ramp: 100,
          height: 24,
        };
      })
      .sort((a, b) => a.center - b.center),
    heightAt = (s) => {
      for (const b of specs) {
        const d = Math.abs(surface.gap(b.center, s));
        if (d <= b.plateau) return b.height;
        if (d < b.plateau + b.ramp)
          return (
            (b.height * (1 + Math.cos((Math.PI * (d - b.plateau)) / b.ramp))) /
            2
          );
      }
      return 0;
    },
    patches = [];
  function pointsBetween(from, to) {
    const distances = [from, to];
    for (const shift of [-g.len, 0, g.len, g.len * 2])
      for (const s of g.cum.slice(0, -1))
        if (s + shift > from + 1e-8 && s + shift < to - 1e-8)
          distances.push(s + shift);
    return distances
      .sort((a, b) => a - b)
      .map((s) => ({ ...surface.at(s), s }));
  }
  function patch(from, to, kind, bridge = null) {
    const points = pointsBetween(from, to),
      polygons = union(points);
    if (polygons.length !== 1 || polygons[0].length !== 1)
      throw Error(
        `${track.id}: Brückenkorridor hat zusätzliche Fahrflächenöffnungen.`,
      );
    const ring = polygons[0][0];
    // Remove only the semicircular end caps from visible rails. Collision
    // switches corridors inside their overlap, safely away from both caps.
    function projection(p) {
      let best = null;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          dx = b.x - a.x,
          dy = b.y - a.y,
          t = Math.max(
            0,
            Math.min(
              1,
              ((p[0] - a.x) * dx + (p[1] - a.y) * dy) / (dx * dx + dy * dy),
            ),
          ),
          distance = Math.hypot(p[0] - a.x - t * dx, p[1] - a.y - t * dy),
          s = a.s + t * (b.s - a.s);
        if (!best || distance < best.distance) best = { distance, s };
      }
      return best.s;
    }
    const projected = ring.slice(0, -1).map((p) => ({ p, s: projection(p) })),
      rails = [];
    let line = [];
    const cap = (s) => Math.abs(s - from) < 1e-5 || Math.abs(s - to) < 1e-5;
    // Start immediately after a cap so a rail crossing ring index zero stays whole.
    const start = projected.findIndex(
      (p, i) => cap(p.s) && cap(projected[(i + 1) % projected.length].s),
    );
    if (start < 0) throw Error(`${track.id}: Brückenabschluss fehlt.`);
    for (let k = 1; k <= projected.length; k++) {
      const a = projected[(start + k) % projected.length],
        b = projected[(start + k + 1) % projected.length];
      if (cap(a.s) && cap(b.s)) {
        if (line.length > 1) rails.push(line);
        line = [];
        continue;
      }
      if (!line.length) line.push([...a.p, heightAt(a.s)]);
      line.push([...b.p, heightAt(b.s)]);
    }
    if (line.length > 1) rails.push(line);
    patches.push({ from, to, kind, bridge, polygons, rails });
  }
  for (const [i, b] of specs.entries()) {
    const half = b.plateau + b.ramp;
    patch(b.center - half - 20, b.center + half + 20, "deck", i);
    const next = specs[(i + 1) % specs.length],
      shift = i === specs.length - 1 ? g.len : 0;
    patch(
      b.center + half,
      next.center + shift - next.plateau - next.ramp,
      "ground",
    );
  }
  return {
    kind: "bridges",
    bridgeSpecs: specs,
    patches,
    polygons: patches.flatMap((p) => p.polygons),
    dividers: [],
  };
}
