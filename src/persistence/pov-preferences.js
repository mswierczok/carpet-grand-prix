(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {}), key = "carpet_gp_pov_preferences_v1";
  function read(storage) {
    const raw = (storage || globalThis.localStorage).getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }
  function load(storage) {
    const defaults = { difficulty: A.AIDifficulty.defaultId, quality: "auto", catchup: true };
    try {
      const value = read(storage);
      if (value?.version === 1) {
        if (A.AIDifficulty.profiles.some((p) => p.id === value.difficulty)) defaults.difficulty = value.difficulty;
        if (["auto", "low"].includes(value.quality)) defaults.quality = value.quality;
        if (typeof value.catchup === "boolean") defaults.catchup = value.catchup;
      }
    } catch { /* Unavailable storage or damaged preferences: keep the save intact. */ }
    return Object.freeze(defaults);
  }
  function update(patch, storage) {
    for (const [name, value] of Object.entries(patch)) {
      if (name === "difficulty") A.AIDifficulty.get(value);
      else if (name === "quality" && ["auto", "low"].includes(value)) continue;
      else if (name === "catchup" && typeof value === "boolean") continue;
      else throw Error("Ungültige POV-Einstellung: " + name);
    }
    try {
      let old;
      try { old = read(storage); } catch { old = null; }
      if (old && (old.version !== 1 || typeof old !== "object" || Array.isArray(old)))
        return false;
      (storage || globalThis.localStorage).setItem(key,
        JSON.stringify({ ...old, version: 1, ...patch }));
      return true;
    } catch { return false; }
  }
  const save = (difficulty, storage) => update({ difficulty }, storage);
  A.POVPreferences = Object.freeze({ key, load, save, update });
})();
