import { withoutStartLightsSource } from "./start-lights.js";
import { runInNewContext } from "node:vm";
import { execFileSync } from "node:child_process";
// Only the explicitly authorized Bahrain data and optional geometry adapter
// are normalized. New tests independently guard the changed route, all other
// 21 tracks, the regenerated boundaries, driving and camera clearance.
export function withoutBahrainIteration2(path, source, baseline) {
  if (
    path === "src/data/arcade-tracks.js" ||
    path === "src/data/arcade-boundaries.js"
  ) {
    const key = path.includes("boundaries") ? "boundaries" : "tracks",
      now = {},
      old = {};
    runInNewContext(source, now);
    runInNewContext(
      execFileSync("git", ["show", `${baseline}:${path}`], {
        maxBuffer: 8 * 1024 * 1024,
      }).toString(),
      old,
    );
    return source.replace(
      JSON.stringify(now.CGPArcadeData[key].bahrain),
      JSON.stringify(old.CGPArcadeData[key].bahrain),
    );
  }
  if (path === "src/racing/track-surface.js")
    return source
      .replace(
        "pts = model.pov?.routePoints\n        ? model.pov.routePoints.map(([x, y]) => Object.freeze({ x, y }))\n        : shape?.points || originalPoints,",
        "pts = shape?.points || originalPoints,",
      )
      .replace(": model.pov?.sectorU || model.sectorU,", ": model.sectorU,")
      .replace(
        "pit: model.pov?.pitPoints\n        ? Object.freeze(model.pov.pitPoints.map(([x, y]) => Object.freeze({ x, y })))\n        : shape?.pit || Object.freeze(model.pit.map(convert)),\n      ...(model.pov?.layoutVersion ? {pitRadius:model.pov.pitRadius, layout:model.pov} : {}),",
        "pit: shape?.pit || Object.freeze(model.pit.map(convert)),",
      )
      .replace(
        /      \/\/ BEGIN BAHRAIN PIT FINISH\n[\s\S]*?      \/\/ END BAHRAIN PIT FINISH\n/,
        "",
      );
  return path === "src/racing/race-session.js" ? withoutStartLightsSource(source) : source;
}
