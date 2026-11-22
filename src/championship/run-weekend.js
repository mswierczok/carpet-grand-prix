(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function create(run, options = {}) {
    A.RogueliteRun.validate(run, false);
    if (!A.RogueliteRun.canOpenWeekend(run)) throw Error("Dieses Run-Wochenende ist nicht verfügbar. Bitte zur Run-Map zurückkehren.");
    const native = A.CampaignWeekend.create(run.campaign, options);
    let committed = run.raceCommitted;
    const canRestart = () => {
      if (committed) return false;
      const s = native.snapshot();
      return s.race.phase === "grid" || !!s.qualifying;
    };
    return Object.freeze({ ...native,
      pause(paused) {
        const started = native.pause(paused);
        const s = native.snapshot();
        if (!paused && !s.qualifying && s.race.phase !== "grid") committed = true;
        return started;
      },
      restart() { return canRestart() && native.restart(); },
      canRestart,
    });
  }
  A.RunWeekend = Object.freeze({ create });
})();
