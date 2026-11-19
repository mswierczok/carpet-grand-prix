(() => {
  "use strict";
  const A = globalThis.CGPArcade, timedLaps = 2;
  function create(track, options = {}) {
    const teams = options.teams || CGPArcadeData.roster.teams,
      qualifyingDrivers = A.QualifyingDrivers.create(teams);
    const session = options.restore ? A.RaceSession.restore(options.restore.race) : A.RaceSession.create(track, { ...options, gridOrder: undefined,
      laps: timedLaps + 1, isolated: true, slipstream: false, catchup: false, qualifyingDrivers });
    let records;
    function clear() {
      records = new Map(session.snapshot().entries.map((e, i) => [e.id,
        { id: e.id, name: e.name, player: e.player, seed: i, completed: 0, laps: [] }]));
    }
    function advance(input, seconds) {
      session.advance(input, seconds);
      for (const e of session.snapshot().entries) {
        const record = records.get(e.id);
        if (e.timing.completed > record.completed) {
          // The first full circuit is the outlap. All later times come from
          // actual sector crossings, never a generated opponent-time table.
          if (e.timing.completed > 1 && e.timing.lastLap?.valid &&
            Number.isFinite(e.timing.lastLap.seconds) && e.timing.lastLap.seconds > 0)
            record.laps.push(e.timing.lastLap.seconds);
          record.completed = e.timing.completed;
        }
      }
    }
    function snapshot() {
      const s = session.snapshot(), standings = [...records.values()].map((record) => ({
        ...record, laps: [...record.laps],
        bestLap: record.laps.length ? Math.min(...record.laps) : null,
      })).sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity) || a.seed - b.seed);
      standings.forEach((e, i) => { e.position = i + 1; });
      return { ...s, visibleEntries: s.entries.filter((e) => e.player), qualifying: { timedLaps, standings,
        finished: s.race.phase === "finished", player: standings.find((e) => e.player) } };
    }
    function restart() { session.restart(); clear(); }
    clear();
    if (options.restore) records = new Map(A.POVCheckpoint.qualifying(options.restore).records.map(r => [r.id, r]));
    function exportState() {
      return { kind: "qualifying", version: 1,
        race: session.exportState(), records: [...records.values()].map(r => ({ ...r, laps: [...r.laps] })) };
    }
    return Object.freeze({ exportState, surface: session.surface, parameters: session.parameters,
      pause: (...args) => session.pause(...args), recover: () => session.recover(),
      advance, snapshot, restart });
  }
  function restore(value) {
    const saved = A.POVCheckpoint.qualifying(value);
    return create(A.TrackCatalog.get(saved.race.trackId), { ...saved.race.config, restore: saved });
  }
  A.QualifyingSession = Object.freeze({ create, restore, timedLaps });
})();
