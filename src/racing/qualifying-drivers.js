(() => {
  "use strict";
  const A = globalThis.CGPArcade, clamp = (v) => Math.max(0, Math.min(1, v));
  function hash(id) {
    let h = 2166136261;
    for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function create(teams) {
    return Object.freeze(Object.fromEntries(teams.map((team) => {
      const seed = hash(team.id), skill = clamp(((Number.isFinite(team.baseStrength) ? team.baseStrength : 75) - 64) / 23),
        style = (seed % 997) / 997;
      return [team.id, Object.freeze({
        brakeLead: (1 - skill) * 4 + ((seed >>> 8) % 1000) / 1000 * 0.5,
        caution: 0.003 + (1 - skill) * 0.18 + style * 0.01,
        execution: 0.004 + (1 - skill) * 0.012,
        phase: ((seed >>> 16) % 1000) / 1000 * 2 * Math.PI,
        rhythm: 1.3 + ((seed >>> 2) % 1000) / 1000 * 0.7,
      })];
    })));
  }
  function at(driver, progress) {
    // Continuous execution through successive corners/laps. These affect only
    // ordinary driving targets, never the vehicle's speed, grip or lap clock.
    const wave = Math.sin(progress * 2 * Math.PI * driver.rhythm + driver.phase);
    return {
      brakeLead: Math.max(0, driver.brakeLead + 0.25 * wave),
      cornerScale: 1 - Math.max(0.001, Math.min(0.22, driver.caution + driver.execution * wave)),
    };
  }
  A.QualifyingDrivers = Object.freeze({ create, at });
})();
