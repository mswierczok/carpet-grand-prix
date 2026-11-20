(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  // Campaign flow around the native weekend; no simulation, forces or clocks.
  function create(game) {
    const track = A.TrackCatalog.get(game.trackId),
      options = { playerTeam: game.teamId, ...game.options };
    let weekend = game.weekend
        ? A.RaceWeekend.restore(game.weekend)
        : A.RaceWeekend.create(track, options),
      legacy = game.legacyWeekend,
      qualifyingActive = !!game.weekend?.qualifying,
      transitioned = false;
    function settle() {
      if (
        qualifyingActive &&
        weekend.snapshot().qualifying?.finished &&
        weekend.acceptQualifying()
      ) {
        weekend.pause(true);
        qualifyingActive = false;
        transitioned = true;
      }
    }
    settle();
    function snapshot() {
      const s = weekend.snapshot();
      return {
        ...s,
        campaignPhase: s.qualifying
          ? "qualifying"
          : s.qualifyingResult || legacy
            ? "race"
            : "qualifying-ready",
      };
    }
    return Object.freeze({
      surface: weekend.surface,
      parameters: weekend.parameters,
      snapshot,
      exportState: () => weekend.exportState(),
      advance(input, delta) {
        weekend.advance(input, delta);
        settle();
      },
      pause(paused) {
        if (
          !paused &&
          !weekend.snapshot().qualifying &&
          !weekend.snapshot().qualifyingResult &&
          !legacy
        )
          return false;
        return weekend.pause(paused);
      },
      startQualifying() {
        if (
          legacy ||
          game.stage === "interim" ||
          weekend.snapshot().qualifyingResult
        )
          return false;
        const started = weekend.startQualifying();
        qualifyingActive ||= started;
        return started;
      },
      acceptQualifying: () => false,
      cancelQualifying: () => false,
      selectTeam: () => false,
      selectDifficulty(value) {
        return (
          !weekend.snapshot().qualifyingResult &&
          weekend.selectDifficulty(value)
        );
      },
      selectCatchup(value) {
        return (
          !weekend.snapshot().qualifyingResult && weekend.selectCatchup(value)
        );
      },
      recover: () => weekend.recover(),
      restart() {
        if (
          game.stage === "interim" ||
          (!weekend.snapshot().qualifying &&
            weekend.snapshot().race.phase === "finished")
        )
          return false;
        const config = weekend.exportState().config;
        weekend = A.RaceWeekend.create(track, config);
        legacy = false;
        qualifyingActive = false;
        transitioned = true;
        return true;
      },
      takeTransition() {
        const changed = transitioned;
        transitioned = false;
        return changed;
      },
    });
  }
  A.CampaignWeekend = Object.freeze({ create });
})();
