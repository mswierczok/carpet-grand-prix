(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function create({ g, at, project, gap, definition }) {
    const specs = definition.bridgeSpecs,
      patches = definition.patches.map((p) => ({
        ...p,
        field: A.BoundaryField.create({ polygons: p.polygons }),
      }));
    function heightAt(s) {
      for (const b of specs) {
        const d = Math.abs(gap(b.center, s));
        if (d <= b.plateau) return b.height;
        if (d < b.plateau + b.ramp)
          return (
            (b.height * (1 + Math.cos((Math.PI * (d - b.plateau)) / b.ramp))) /
            2
          );
      }
      return 0;
    }
    function pitchAt(s) {
      for (const b of specs) {
        const signed = gap(b.center, s),
          d = Math.abs(signed);
        if (d > b.plateau && d < b.plateau + b.ramp)
          return Math.atan(
            ((-Math.sign(signed) * b.height * Math.PI) / (2 * b.ramp)) *
              Math.sin((Math.PI * (d - b.plateau)) / b.ramp),
          );
      }
      return 0;
    }
    function fieldAt(s) {
      const deck = specs.findIndex(
        (b) => Math.abs(gap(b.center, s)) <= b.plateau + b.ramp + 10,
      );
      if (deck >= 0)
        return patches.find((p) => p.kind === "deck" && p.bridge === deck)
          .field;
      const ground = patches.find(
        (p) =>
          p.kind === "ground" &&
          p.from + ((((s - p.from) % g.len) + g.len) % g.len) <= p.to + 1e-8,
      );
      if (!ground) throw Error("Brücken-Fahrbahnebene fehlt.");
      return ground.field;
    }
    const boundary = Object.freeze({
      polygons: definition.polygons,
      loops: definition.polygons.flat(),
      dividers: [],
      rails: definition.patches.flatMap((p) =>
        p.rails.map((points) => ({ points, closed: false })),
      ),
      railRadius: patches[0].field.railRadius,
      contains(p, s = null) {
        return s === null
          ? patches.some((patch) => patch.field.contains(p))
          : fieldAt(s).contains(p);
      },
      blocksFootprint(corners, s = null) {
        if (s === null)
          s = project({
            x: corners.reduce((v, p) => v + p.x, 0) / corners.length,
            y: corners.reduce((v, p) => v + p.y, 0) / corners.length,
          }).s;
        return (
          fieldAt(s).blocksFootprint(corners) ||
          corners.some(
            (p) =>
              project(p, s).distance >
              g.width * 0.85 - patches[0].field.railRadius,
          )
        );
      },
    });
    function covered(pose) {
      return specs.some((b) => {
        if (heightAt(pose.s) > b.height - 6) return false;
        const over = project(pose, b.center);
        return (
          over &&
          Math.abs(gap(b.center, over.s)) < b.plateau &&
          over.distance < g.width * 0.85
        );
      });
    }
    return Object.freeze({
      specs,
      boundary,
      heightAt,
      pitchAt,
      fieldAt,
      covered,
    });
  }
  A.BridgeSurface = Object.freeze({ create });
})();
