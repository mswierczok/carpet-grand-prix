(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function create(track, options = {}) {
    const config = { ...options }, teams = config.teams || CGPArcadeData.roster.teams;
    const restored = options.restore ? A.POVCheckpoint.weekend(options.restore) : null;
    if (restored && restored.trackId !== track.id) throw Error("Falsche Strecke im Wochenend-Spielstand.");
    delete config.restore;
    // Absence in an existing weekend is a preserved legacy mode. Generic free
    // races do not silently acquire campaign driver identities.
    config.driving = restored ? restored.config.driving || null
      : options.driving ? A.DriverPersonalities.validate(options.driving) : null;
    config.performance = restored ? restored.config.performance || null
      : options.performance === null ? null : A.VehiclePerformance.validate(options.performance ?? A.VehiclePerformance.current.historical);
    if (options.qualifyingFormat !== undefined && options.qualifyingFormat !== null && options.qualifyingFormat !== "flying-one-v1")
      throw Error("Unbekanntes Qualifying-Format.");
    config.qualifyingFormat = restored ? restored.config.qualifyingFormat || null
      : options.qualifyingFormat === null ? null : "flying-one-v1";
    let qualifying = restored?.qualifying || false, result = restored?.result || null, transitioned = false,
      session = restored ? (qualifying ? A.QualifyingSession : A.RaceSession).restore(restored.session)
        : A.RaceSession.create(track, config);
    const surface = session.surface;
    const copy = () => result ? result.map((e) => ({ ...e, laps: [...e.laps] })) : null;
    function snapshot() {
      return { ...session.snapshot(), ...(result ? { qualifyingResult: copy() } : {}) };
    }
    function startQualifying() {
      if (qualifying || session.snapshot().race.phase !== "grid") return false;
      result = null;
      session = A.QualifyingSession.create(track, config);
      qualifying = true;
      session.pause(false);
      return true;
    }
    function acceptQualifying() {
      const q = session.snapshot().qualifying;
      if (!qualifying || !q?.finished) return false;
      result = q.standings.map((e) => ({ ...e, laps: [...e.laps] }));
      session = A.RaceSession.create(track, { ...config, gridOrder: result.map((e) => e.id) });
      qualifying = false;
      return true;
    }
    function cancelQualifying() {
      if (!qualifying) return false;
      qualifying = false;
      result = null;
      session = A.RaceSession.create(track, config);
      return true;
    }
    function advance(...args) {
      session.advance(...args);
      if (config.qualifyingFormat && qualifying && session.snapshot().qualifying.finished && acceptQualifying()) {
        session.pause(true);
        transitioned = true;
      }
    }
    function select(key, value) {
      if (session.snapshot().race.phase !== "grid") return false;
      if (key === "playerTeam" && !teams.some((t) => t.id === value)) return false;
      if (key === "difficulty" && !A.AIDifficulty.profiles.some((p) => p.id === value)) return false;
      if (key === "catchup" && typeof value !== "boolean") return false;
      config[key] = value;
      result = null;
      session = (qualifying ? A.QualifyingSession : A.RaceSession).create(track, config);
      return true;
    }
    function exportState() {
      const raw = session.exportState(), actual = { ...(qualifying ? raw.race.config : raw.config) };
      delete actual.qualifyingStartS;
      return { kind: "weekend", version: 1, trackId: track.id,
        config: { ...actual, playerTeam: config.playerTeam || teams[0].id,
          difficulty: config.difficulty || A.AIDifficulty.defaultId, catchup: config.catchup !== false,
          slipstream: config.slipstream !== false, isolated: false, qualifying: false,
          laps: config.laps ?? A.RaceFormats.get(track.id).laps, gridOrder: config.gridOrder ? [...config.gridOrder] : null },
        qualifying, result: copy(), session: raw };
    }
    return Object.freeze({ exportState, surface, get parameters() { return session.parameters; }, snapshot, startQualifying, acceptQualifying, cancelQualifying,
      advance, pause: (...args) => session.pause(...args),
      takeTransition() { const changed = transitioned; transitioned = false; return changed; },
      recover: () => session.recover(), restart: () => session.restart(),
      selectTeam: (id) => select("playerTeam", id), selectDifficulty: (id) => select("difficulty", id),
      selectCatchup: (enabled) => select("catchup", enabled) });
  }
  function restore(value) {
    const saved = A.POVCheckpoint.weekend(value);
    return create(A.TrackCatalog.get(saved.trackId), { ...saved.config,
      gridOrder: saved.config.gridOrder === null ? undefined : saved.config.gridOrder, restore: saved });
  }
  A.RaceWeekend = Object.freeze({ create, restore });
})();
