(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    key = "carpet_gp_campaign_v1",
    maxBytes = 4 * 1024 * 1024;
  let knownRaw,
    knownValid = false;
  const raw = (storage) => {
    try {
      return (storage || globalThis.localStorage).getItem(key);
    } catch {
      return null;
    }
  };
  function parse(text) {
    if (typeof text !== "string" || text.length > maxBytes)
      throw Error("Kampagnensicherung fehlt oder ist zu groß.");
    const value = JSON.parse(text);
    if (value?.version > A.Campaign.version || value?.configVersion > A.CampaignConfig.version)
      throw Error("Diese Kampagnensicherung stammt aus einer neueren Version.");
    return A.Campaign.validate(value, false);
  }
  function load(storage) {
    try {
      const text = (storage || globalThis.localStorage).getItem(key);
      knownRaw = text;
      knownValid = text === null;
      if (text === null)
        return {
          status: "empty",
          game: null,
          message: "Deine erste Kampagne wartet.",
        };
      try {
        const game = parse(text);
        knownValid = true;
        return { status: "valid", game, message: "Kampagne bereit." };
      } catch (error) {
        return {
          status: "invalid",
          game: null,
          message: error.message + " Der gespeicherte Inhalt bleibt erhalten.",
        };
      }
    } catch {
      knownValid = false;
      return {
        status: "unavailable",
        game: null,
        message:
          "Der Browser erlaubt keine Speicherung. Für eine fortsetzbare Kampagne ist Browserspeicher nötig. Bestehende Spielstände bleiben erhalten.",
      };
    }
  }
  function save(game, { storage, now = Date.now() } = {}) {
    try {
      const target = storage || globalThis.localStorage,
        previous = target.getItem(key);
      if (!knownValid || previous !== knownRaw) return false;
      const value = A.Campaign.validate({ ...game, savedAt: now }, false),
        text = JSON.stringify(value);
      if (text.length > maxBytes) return false;
      target.setItem(key, text);
      knownRaw = text;
      return true;
    } catch {
      return false;
    }
  }
  function replace(game, expectedRaw, { storage, now = Date.now() } = {}) {
    try {
      const target = storage || globalThis.localStorage,
        value = A.Campaign.validate({ ...game, savedAt: now }, false),
        text = JSON.stringify(value);
      if (text.length > maxBytes || target.getItem(key) !== expectedRaw)
        return false;
      target.setItem(key, text);
      knownRaw = text;
      knownValid = true;
      return true;
    } catch {
      return false;
    }
  }
  A.CampaignStore = Object.freeze({
    key,
    maxBytes,
    raw,
    parse,
    load,
    save,
    replace,
  });
})();
