(() => {
  "use strict";
  const A = globalThis.CGPArcade, key = "carpet_gp_pov_selection_v1";
  const valid = (value) => {
    const data = globalThis.CGPArcadeData;
    return data.roster.teams.some(t => t.id === value?.teamId) &&
      Object.hasOwn(data.tracks, value?.trackId);
  };
  function load(storage) {
    try {
      const value = JSON.parse((storage || globalThis.localStorage).getItem(key));
      if (value?.version === 1 && valid(value))
        return Object.freeze({ teamId: value.teamId, trackId: value.trackId, hasSaved: true });
    } catch { /* Read-only fallback; never change existing saves on load. */ }
    return Object.freeze({ teamId: globalThis.CGPArcadeData.roster.teams[0].id,
      trackId: "bahrain", hasSaved: false });
  }
  function save(selection, storage) {
    if (!valid(selection)) throw Error("Ungültige Team- oder Streckenauswahl.");
    try {
      const target = storage || globalThis.localStorage;
      let old;
      try { old = JSON.parse(target.getItem(key)); } catch { old = null; }
      if (old && (old.version !== 1 || typeof old !== "object" || Array.isArray(old))) return false;
      target.setItem(key, JSON.stringify({ ...old, version: 1,
        teamId: selection.teamId, trackId: selection.trackId }));
      return true;
    } catch { return false; }
  }
  A.POVSelection = Object.freeze({ key, load, save });
})();
