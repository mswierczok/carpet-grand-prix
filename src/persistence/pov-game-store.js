(() => {
  "use strict";
  const A = globalThis.CGPArcade, key = "carpet_gp_pov_game_v1", maxBytes = 4 * 1024 * 1024;
  let lastKnownRaw = null;
  function raw(storage) { try { return (storage || globalThis.localStorage).getItem(key); } catch { return null; } }
  function parse(raw) {
    if (typeof raw !== "string" || raw.length > maxBytes) throw Error("POV-Spielstand fehlt oder ist zu groß.");
    return A.POVCareer.validate(JSON.parse(raw), false);
  }
  function load(storage) {
    try {
      const raw = (storage || globalThis.localStorage).getItem(key);
      if (raw === null) return { status: "empty", game: null, message: "Noch kein POV-Spielstand vorhanden." };
      try { const game = parse(raw); lastKnownRaw = raw; return { status: "valid", game, message: "POV-Spielstand bereit." }; }
      catch { return { status: "invalid", game: null, message: "Der POV-Spielstand konnte nicht geladen werden. Er bleibt erhalten; du kannst eine gültige Sicherung importieren." }; }
    } catch { return { status: "unavailable", game: null, message: "Der Browser erlaubt hier keine Speicherung. Du kannst spielen und deinen Stand als Datei sichern." }; }
  }
  function save(game, { storage, replace = false, now = Date.now() } = {}) {
    try {
      const target = storage || globalThis.localStorage, previousRaw = target.getItem(key);
      if (!replace && previousRaw !== null && previousRaw !== lastKnownRaw && load(target).status === "invalid") return false;
      const data = A.POVCareer.validate({ ...game, savedAt: now }, false), raw = JSON.stringify(data);
      if (raw.length > maxBytes) return false;
      target.setItem(key, raw); lastKnownRaw = raw; return true;
    } catch { return false; }
  }
  function importJSON(raw, options = {}) {
    const data = parse(raw);
    if (!save(data, { ...options, replace: true })) throw Error("Spielstand konnte nicht gespeichert werden. Der bisherige Stand bleibt erhalten.");
    return data;
  }
  A.POVGameStore = Object.freeze({ key, maxBytes, raw, load, save, parse, importJSON });
})();
