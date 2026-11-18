(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function create(track, options = {}) {
    const config = { ...options }, teams = config.teams || CGPArcadeData.roster.teams;
    let qualifying = false, result = null, session = A.RaceSession.create(track, config);
    const surface = session.surface, parameters = session.parameters;
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
    return Object.freeze({ surface, parameters, snapshot, startQualifying, acceptQualifying, cancelQualifying,
      advance: (...args) => session.advance(...args), pause: (...args) => session.pause(...args),
      recover: () => session.recover(), restart: () => session.restart(),
      selectTeam: (id) => select("playerTeam", id), selectDifficulty: (id) => select("difficulty", id),
      selectCatchup: (enabled) => select("catchup", enabled) });
  }
  A.RaceWeekend = Object.freeze({ create });
})();
