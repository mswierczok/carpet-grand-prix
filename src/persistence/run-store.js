(() => {
  "use strict";
  const A = globalThis.CGPArcade, key = "carpet_gp_roguelite_run_v1", maxBytes = 8 * 1024 * 1024;
  let knownRaw, knownValid = false;
  const raw = storage => { try { return (storage || globalThis.localStorage).getItem(key); } catch { return null; } };
  function inspect(text) {
    if (typeof text !== "string" || text.length > maxBytes) throw Error("Run-Sicherung fehlt oder ist zu groß.");
    const value = JSON.parse(text);
    if (value?.version > 1) throw Error("Diese Run-Sicherung stammt aus einer neueren Version.");
    if (value?.version !== 1 || value.kind !== "roguelite-save" || Object.keys(value).length !== 4 || !Array.isArray(value.archive)) throw Error("Die Run-Sicherung ist beschädigt oder nicht kompatibel.");
    if (value.active?.version > A.RogueliteRun.version || value.active?.configVersion > A.RunMap.version) throw Error("Diese Run-Sicherung stammt aus einer neueren Version.");
    A.RogueliteRun.validate(value.active, false);
    for (const run of value.archive) A.RogueliteRun.validate(run, false);
    if (new Set([value.active.id, ...value.archive.map(r => r.id)]).size !== value.archive.length + 1) throw Error("Doppelte Run-Kennungen in der Sicherung.");
    return value;
  }
  const parse = text => inspect(text).active;
  function load(storage) {
    try {
      const text = (storage || globalThis.localStorage).getItem(key);
      knownRaw = text; knownValid = text === null;
      if (text === null) return { status: "empty", game: null, archive: [], message: "Dein erster Run wartet." };
      try { const value = inspect(text); knownValid = true; return { status: "valid", game: value.active, archive: value.archive, message: "Run bereit." }; }
      catch (error) { return { status: "invalid", game: null, archive: [], message: error.message + " Der gespeicherte Inhalt bleibt erhalten." }; }
    } catch { knownValid = false; return { status: "unavailable", game: null, archive: [], message: "Browserspeicher ist nicht verfügbar. Ein fortsetzbarer Run benötigt einen sicheren Speicherplatz." }; }
  }
  function write(gameOrFile, expectedRaw, { storage, now = Date.now() } = {}) {
    try {
      const target = storage || globalThis.localStorage, previous = target.getItem(key);
      if (previous !== expectedRaw) return false;
      const imported = gameOrFile?.kind === "roguelite-save" ? inspect(JSON.stringify(gameOrFile)) : null;
      const value = A.RogueliteRun.validate({ ...(imported?.active || gameOrFile), savedAt: now }, false);
      let before;
      if (previous !== null) { try { before = inspect(previous); } catch { /* Only explicit replacement may replace invalid raw data. */ } }
      const runs = new Map();
      for (const r of [...(before?.archive || []), ...(before ? [before.active] : []), ...(imported?.archive || [])]) {
        const old = runs.get(r.id);
        if (old && !A.RogueliteRun.compatibleProgress(old, r) && !A.RogueliteRun.compatibleProgress(r, old)) return false;
        if (!old || A.RogueliteRun.compatibleProgress(old, r)) runs.set(r.id, r);
      }
      const old = runs.get(value.id);
      if (old && !A.RogueliteRun.compatibleProgress(old, value)) return false;
      runs.delete(value.id);
      const text = JSON.stringify({ version: 1, kind: "roguelite-save", active: value, archive: [...runs.values()] });
      if (text.length > maxBytes) return false;
      target.setItem(key, text); knownRaw = text; knownValid = true; return true;
    } catch { return false; }
  }
  const save = (game, options) => knownValid && write(game, knownRaw, options);
  A.RunStore = Object.freeze({ key, maxBytes, raw, parse, inspect, load, save, replace: write });
})();
