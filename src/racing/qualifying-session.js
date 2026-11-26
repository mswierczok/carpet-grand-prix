(() => {
  "use strict";
  const A = globalThis.CGPArcade, timedLaps = 1;
  function create(track, options = {}) {
    if (options.qualifyingFormat !== undefined && options.qualifyingFormat !== null && options.qualifyingFormat !== "flying-one-v1")
      throw Error("Unbekanntes Qualifying-Format.");
    const format = options.restore ? options.restore.format || null
      : options.qualifyingFormat === null ? null : "flying-one-v1",
      outLaps = format ? 0 : 1, attempts = format ? 1 : 2;
    const teams = options.teams || CGPArcadeData.roster.teams,
      qualifyingDrivers = A.QualifyingDrivers.create(teams, { technical: options.performance !== null });
    const session = options.restore ? A.RaceSession.restore(options.restore.race) : A.RaceSession.create(track, { ...options, gridOrder: undefined,
      laps: attempts + outLaps, qualifyingFormat: format, isolated: true, slipstream: false, catchup: false, qualifyingDrivers });
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
          // In the new format the first finish crossing STARTS Timing; the
          // first COMPLETE lap is already the only measured attempt. Old
          // checkpoints retain their full outlap and two attempts unchanged.
          if (e.timing.completed > outLaps && e.timing.lastLap?.valid &&
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
      return { ...s, visibleEntries: s.entries.filter((e) => e.player), qualifying: { timedLaps: attempts, ...(format ? { format } : {}), standings,
        finished: s.race.phase === "finished", player: standings.find((e) => e.player) } };
    }
    function restart() { session.restart(); clear(); }
    clear();
    if (options.restore) records = new Map(A.POVCheckpoint.qualifying(options.restore).records.map(r => [r.id, r]));
    function exportState() {
      return { kind: "qualifying", version: 1, ...(format ? { format } : {}),
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
