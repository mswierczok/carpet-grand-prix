(() => {
  "use strict";
  const A = globalThis.CGPArcade, key = "carpet_gp_pov_preferences_v1";
  function read(storage) {
    const raw = (storage || globalThis.localStorage).getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }
  function load(storage) {
    try {
      const value = read(storage);
      if (value?.version === 1 && A.AIDifficulty.profiles.some((p) => p.id === value.difficulty))
        return Object.freeze({ difficulty: value.difficulty });
    } catch { /* Unavailable storage or damaged preferences: keep the save intact. */ }
    return Object.freeze({ difficulty: A.AIDifficulty.defaultId });
  }
  function save(difficulty, storage) {
    A.AIDifficulty.get(difficulty);
    try {
      let old;
      try { old = read(storage); } catch { old = null; }
      if (old && (old.version !== 1 || typeof old !== "object" || Array.isArray(old)))
        return false;
      (storage || globalThis.localStorage).setItem(key,
        JSON.stringify({ ...old, version: 1, difficulty }));
      return true;
    } catch { return false; }
  }
  A.POVPreferences = Object.freeze({ key, load, save });
})();
