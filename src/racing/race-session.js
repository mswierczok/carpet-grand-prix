(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    fixedStep = 1 / 120,
    neutral = Object.freeze({ throttle: 0, brake: 0, steer: 0 });
  function create(track, options = {}) {
    const surface = A.Surface.create(track),
      parameters = A.Physics.parameters,
      teams = options.teams || CGPArcadeData.roster.teams,
      laps = options.laps ?? A.RaceFormats.get(track.id).laps;
    const performance = options.performance === null ? null : A.VehiclePerformance.validate(options.performance ?? A.VehiclePerformance.historical),
      profilesByTeam = Object.freeze(Object.fromEntries(teams.map(t => [t.id, A.VehiclePerformance.get(t.id, performance)]))),
      parametersByTeam = Object.freeze(Object.fromEntries(teams.map(t => [t.id, profilesByTeam[t.id].parameters])));
    const driving = options.driving ? A.DriverPersonalities.validate(options.driving) : null;
    const qualifyingFormat = options.qualifyingFormat || null,
      qualifyingStartS = options.qualifyingDrivers && qualifyingFormat === "flying-one-v1"
        ? options.qualifyingStartS ?? A.QualifyingApproach.select(surface, parametersByTeam).s : null;
    const isolated = options.isolated === true,
      slipstreamEnabled = !isolated && options.slipstream !== false;
    let catchupEnabled = !isolated && options.catchup !== false, gapHistory;
    let difficulty = A.AIDifficulty.get(options.difficulty), controller;
    if (!Number.isInteger(laps) || laps < 1)
      throw Error("Ungültige Rundenzahl.");
    if (teams.length !== 13 || new Set(teams.map((t) => t.id)).size !== 13)
      throw Error(
        "Das volle Startfeld benötigt genau 13 unterschiedliche Teams.",
      );
    const gridOrder = options.gridOrder === undefined ? null : options.gridOrder;
    if (gridOrder !== null && (!Array.isArray(gridOrder) || gridOrder.length !== 13 ||
      new Set(gridOrder).size !== 13 || gridOrder.some((id) => !teams.some((t) => t.id === id))))
      throw Error("Die Startaufstellung muss alle 13 Teams genau einmal enthalten.");
    const grid = gridOrder ? [...gridOrder] : null;
    if (options.restore) {
      const saved = A.POVCheckpoint.race(options.restore, false), c = saved.config;
      if (saved.trackId !== track.id || c.playerTeam !== (options.playerTeam || teams[0].id) ||
        c.laps !== laps || c.isolated !== isolated || c.catchup !== catchupEnabled ||
        c.slipstream !== slipstreamEnabled || c.difficulty !== difficulty.id ||
        (c.performance?.version || null) !== (performance?.version || null) ||
        (c.performance?.context || null) !== (performance?.context || null) ||
        (c.qualifyingFormat || null) !== qualifyingFormat ||
        (c.qualifyingStartS ?? null) !== qualifyingStartS || JSON.stringify(c.gridOrder) !== JSON.stringify(grid))
        throw Error("Die Wiederherstellung darf das gespeicherte Renn- oder Fahrzeugmodell nicht ändern.");
      if(JSON.stringify(c.driving || null)!==JSON.stringify(driving))throw Error('Die Wiederherstellung darf das gespeicherte Fahrermodell nicht ändern.');
    }
    let playerTeam = options.playerTeam || teams[0].id,
      driverSeeds,
      entries,
      phase,
      countdown,
      elapsed,
      accumulator,
      paused,
      tick,
      pairs,
      playerContacts;
    if (!teams.some((t) => t.id === playerTeam))
      throw Error("Unbekanntes Spielerteam.");
    controller = A.Opponents.create(surface, parameters, { difficulty: difficulty.id, diagnostics: !!options.diagnostics, parametersByTeam });
    function pose(s, lane) {
      const car = A.Physics.spawn(surface, s),
        at = surface.at(s, lane);
      return { ...car, x: at.x, y: at.y, heading: at.ang };
    }
    function driverMemory(team, lane) {
      const memory = controller.memory(driverSeeds.get(team.id), lane),
        variation = options.qualifyingDrivers?.[team.id];
      if (driving) memory.personality = {id:driving.lineup[team.id],seed:driving.seed,mode:options.qualifyingDrivers?'qualifying':'race',...(driving.version===2?{model:2}:{})};
      else if (variation) memory.qualifying = variation;
      return memory;
    }
    function restart() {
      phase = "grid";
      countdown = 3;
      elapsed = accumulator = tick = playerContacts = 0;
      paused = true;
      pairs = new Set();
      gapHistory = catchupEnabled ? A.RaceGaps.create() : null;
      const defaultOrder = [
        ...teams.filter((t) => t.id !== playerTeam),
        teams.find((t) => t.id === playerTeam),
      ];
      driverSeeds = new Map(defaultOrder.map((team, i) => [team.id, i]));
      const order = grid ? grid.map((id) => teams.find((t) => t.id === id)) : defaultOrder;
      entries = order.map((team, i) => {
        const lane = isolated ? 0 : i % 2 ? 6 : -6,
          car = pose(isolated ? qualifyingStartS ?? -22 : -22 - Math.floor(i / 2) * 16 - (i % 2) * 3, lane);
        return {
          id: team.id,
          team,
          player: team.id === playerTeam,
          car,
          previous: car,
          timing: A.Timing.create(),
          finishTime: null,
          lastSafe: car.s,
          driver: driverMemory(team, lane),
          command: neutral,
          ...(slipstreamEnabled ? { slipstream: A.Slipstream.empty() } : {}),
          ...(catchupEnabled ? { catchup: A.Catchup.empty() } : {}),
        };
      });
    }
    function pause(value = true) {
      if (phase === "finished") return;
      paused = !!value;
      accumulator = 0;
      if (!paused && phase === "grid") phase = "countdown";
      for (const entry of entries) {
        entry.car = { ...entry.car, reverseHold: 0 };
        entry.previous = entry.car;
      }
    }
    function selectTeam(id) {
      if (phase !== "grid" || !teams.some((t) => t.id === id)) return false;
      playerTeam = id;
      restart();
      return true;
    }
    function selectDifficulty(id) {
      if (phase !== "grid" || !A.AIDifficulty.profiles.some((p) => p.id === id)) return false;
      difficulty = A.AIDifficulty.get(id);
      controller = A.Opponents.create(surface, parameters, { difficulty: id, diagnostics: !!options.diagnostics, parametersByTeam });
      restart();
      return true;
    }
    function selectCatchup(enabled) {
      if (phase !== "grid" || typeof enabled !== "boolean" || (isolated && enabled)) return false;
      catchupEnabled = enabled;
      restart();
      return true;
    }
    function step(input) {
      if (phase === "countdown") {
        countdown = Math.max(0, countdown - fixedStep);
        if (countdown < 1e-9) {
          countdown = 0;
          phase = "racing";
        }
        return;
      }
      if (catchupEnabled) {
        const support = A.Catchup.update(entries, surface, parameters, elapsed, fixedStep, gapHistory, progress);
        entries.forEach((e, i) => { e.catchup = support[i]; });
      }
      if (tick % 4 === 0) {
        const traffic = controller.prepare(
          entries.map((e) => ({
            ...e.car,
            id: e.id,
            inRace: e.finishTime === null,
            ...(slipstreamEnabled ? { slipstream: e.slipstream } : {}),
            ...(catchupEnabled ? { catchup: e.catchup } : {}),
          })),
        );
        entries.forEach((e, i) => {
          if (!e.player || e.finishTime !== null)
            e.command = controller.input(traffic[i], isolated ? [traffic[i]] : traffic, e.driver);
        });
      }
      // elapsed starts at green and advances only in live simulation steps.
      // Gate the shared state so both physics and visible wakes stay off.
      const wakes = slipstreamEnabled
        ? (elapsed + 1e-9 < A.Slipstream.settings.startSeconds
          ? entries.map(() => A.Slipstream.empty())
          : A.Slipstream.update(entries, surface, parameters, fixedStep, e => parametersByTeam[e.id]))
        : null;
      if (wakes) entries.forEach((entry, i) => { entry.slipstream = wakes[i]; });
      const previous = entries.map((e) => e.car),
        proposed = entries.map((e, i) =>
          A.Physics.step(
            e.car,
            e.player && e.finishTime === null ? input : e.command,
            surface,
            parametersByTeam[e.id],
            fixedStep,
            catchupEnabled ? { ...(wakes?.[i] || { strength: 0 }), catchup: e.catchup.pace } : wakes?.[i] || null,
          ),
        ),
        // Each isolated run has its own track: cars may occupy identical world
        // coordinates but never share traffic or physical contacts. Rope/road
        // collisions still belong to the unchanged per-car Physics.step.
        resolved = isolated ? { cars: proposed, contacts: [] } : A.VehicleContacts.resolve(
          proposed,
          previous,
          surface,
          parameters,
          tick,
        ),
        currentPairs = new Set(resolved.contacts.map((c) => c.key));
      for (const contact of resolved.contacts) {
        if (
          !pairs.has(contact.key) &&
          contact.pair.some((i) => entries[i].player)
        )
          playerContacts++;
      }
      pairs = currentPairs;
      elapsed += fixedStep;
      entries.forEach((e, i) => {
        e.previous = previous[i];
        e.car = resolved.cars[i];
        if (!e.car.offroad && !e.car.hitWall && !e.car.hitCar)
          e.lastSafe = e.car.s;
        if (e.finishTime !== null) return;
        e.timing = A.Timing.step(
          e.timing,
          e.previous,
          e.car,
          surface,
          fixedStep,
        );
        if (e.timing.completed >= laps) {
          e.finishTime = e.timing.lapStart;
          e.driver = driverMemory(e.team, 0);
          if (slipstreamEnabled) e.slipstream = A.Slipstream.empty();
          if (catchupEnabled) e.catchup = A.Catchup.empty();
        }
      });
      if (entries.every((e) => e.finishTime !== null)) {
        phase = "finished";
        paused = true;
      } else if (entries.find((e) => e.player).finishTime !== null)
        phase = "finishing";
      tick++;
    }
    function advance(input, realSeconds) {
      if (paused) return;
      accumulator += Math.min(
        0.1,
        Math.max(0, Number.isFinite(realSeconds) ? realSeconds : 0),
      );
      while (!paused && accumulator + 1e-12 >= fixedStep) {
        step(input || neutral);
        accumulator = Math.max(0, accumulator - fixedStep);
      }
    }
    function recover() {
      if (phase !== "racing") return false;
      const entry = entries.find((e) => e.player);
      for (let back = 0; back <= 140; back += 14)
        for (const lane of [0, -6, 6]) {
          const car = pose(entry.lastSafe - back, lane);
          if (
            surface.boundary.blocksFootprint(
              A.VehicleContacts.footprint(car, parameters),
              car.s,
            ) ||
            (!isolated && entries.some(
              (other) =>
                other !== entry &&
                A.VehicleContacts.overlap(car, other.car, parameters),
            ))
          )
            continue;
          entry.car = entry.previous = car;
          if (slipstreamEnabled) entries.forEach((e) => { e.slipstream = A.Slipstream.empty(); });
          accumulator = 0;
          return true;
        }
      return false;
    }
    function progress(e) {
      const ceiling = !e.timing.started
        ? 0
        : e.timing.completed * surface.g.len +
          (e.timing.nextGate === 0
            ? surface.g.len
            : surface.checkpoints[e.timing.nextGate].s);
      return Math.min(e.car.s, ceiling);
    }
    function snapshot() {
      const alpha = paused ? 1 : accumulator / fixedStep,
        visible = entries.map((e) => {
          const turn = Math.atan2(
            Math.sin(e.car.heading - e.previous.heading),
            Math.cos(e.car.heading - e.previous.heading),
          );
          return {
            id: e.id,
            teamId: e.id,
            name: e.team.name,
            player: e.player,
            ...(performance ? { performance: profilesByTeam[e.id] } : {}),
            ...(driving ? {driverId:driving.lineup[e.id],driverAttributes:A.DriverPersonalities.get(driving.lineup[e.id])} : {}),
            car: { ...e.car },
            visual: {
              ...e.car,
              x: e.previous.x + (e.car.x - e.previous.x) * alpha,
              y: e.previous.y + (e.car.y - e.previous.y) * alpha,
              heading: e.previous.heading + turn * alpha,
              ...(surface.bridge
                ? {
                    elevation:
                      e.previous.elevation +
                      (e.car.elevation - e.previous.elevation) * alpha,
                    pitch:
                      e.previous.pitch +
                      (e.car.pitch - e.previous.pitch) * alpha,
                  }
                : {}),
            },
            timing: {
              ...e.timing,
              lastLap: e.timing.lastLap ? { ...e.timing.lastLap } : null,
            },
            finishTime: e.finishTime,
            progress: progress(e),
            ...(slipstreamEnabled ? { slipstream: { ...e.slipstream } } : {}),
            ...(catchupEnabled ? { catchup: A.Catchup.visible(e.catchup) } : {}),
            ...(options.diagnostics ? { telemetry: controller.diagnostics(e.driver) } : {}),
          };
        }),
        order = [...visible].sort((a, b) => {
          if (a.finishTime !== null || b.finishTime !== null) {
            if (a.finishTime === null) return 1;
            if (b.finishTime === null) return -1;
            return a.finishTime - b.finishTime || a.id.localeCompare(b.id);
          }
          return b.progress - a.progress || a.id.localeCompare(b.id);
        });
      order.forEach((e, i) => {
        e.position = i + 1;
      });
      const player = visible.find((e) => e.player);
      return {
        car: player.car,
        visual: player.visual,
        timing: player.timing,
        paused,
        contacts: playerContacts,
        lapSeconds: player.timing.started
          ? player.timing.elapsed - player.timing.lapStart
          : 0,
        entries: visible,
        race: {
          difficulty: difficulty.id,
          ...(catchupEnabled ? { catchup: true } : {}),
          phase,
          countdown: Math.max(0, Math.ceil(countdown - 1e-9)),
          startLights: { red: phase === "countdown" ? Math.min(5, 1 + Math.floor((3 - countdown + 1e-9) / 0.6)) : 0,
            green: phase === "racing" && elapsed < 2 },
          elapsed,
          laps,
          playerTeam,
          position: player.position,
          finished: visible.filter((e) => e.finishTime !== null).length,
          standings: order.map((e) => ({
            id: e.id,
            name: e.name,
            player: e.player,
            position: e.position,
            completed: e.timing.completed,
            progress: e.progress,
            finishTime: e.finishTime,
          })),
        },
      };
    }
    function exportState() {
      return A.POVCheckpoint.copy({ kind: "race", version: 1, trackId: track.id,
        signature: A.POVCheckpoint.signature(track.id),
        config: { playerTeam, difficulty: difficulty.id, catchup: catchupEnabled, slipstream: slipstreamEnabled,
          isolated, qualifying: !!options.qualifyingDrivers, laps, gridOrder: grid, diagnostics: !!options.diagnostics,
          ...(performance ? { performance } : {}),
          ...(driving ? { driving } : {}),
          ...(qualifyingFormat ? { qualifyingFormat } : {}),
          ...(qualifyingStartS !== null ? { qualifyingStartS } : {}) },
        state: { phase, countdown, elapsed, accumulator, paused, tick, pairs: [...pairs], playerContacts,
          gaps: gapHistory ? gapHistory.exportState() : null,
          entries: entries.map(e => ({ id: e.id, car: e.car, previous: e.previous, timing: e.timing,
            finishTime: e.finishTime, lastSafe: e.lastSafe, driver: e.driver, command: e.command,
            ...(slipstreamEnabled ? { slipstream: e.slipstream } : {}),
            ...(catchupEnabled ? { catchup: { ...e.catchup,
              recoveryUntil: e.catchup.recoveryUntil === -Infinity ? "~negative-infinity" : e.catchup.recoveryUntil,
              contactUntil: e.catchup.contactUntil === -Infinity ? "~negative-infinity" : e.catchup.contactUntil } } : {}) })) } });
    }
    restart();
    if (options.restore) {
      const saved = A.POVCheckpoint.decode(A.POVCheckpoint.race(options.restore)), state = saved.state;
      if (saved.trackId !== track.id) throw Error("Falsche Strecke im POV-Spielstand.");
      phase = state.phase; countdown = state.countdown; elapsed = state.elapsed;
      accumulator = state.accumulator; paused = true; tick = state.tick; playerContacts = state.playerContacts;
      pairs = new Set(state.pairs);
      gapHistory = catchupEnabled ? A.RaceGaps.create(state.gaps) : null;
      entries = state.entries.map(e => ({ ...e, team: teams.find(t => t.id === e.id), player: e.id === playerTeam }));
    }
    return Object.freeze({
      exportState,
      surface,
      get parameters() { return parametersByTeam[playerTeam]; },
      parametersFor: id => parametersByTeam[id],
      advance,
      pause,
      recover,
      restart,
      snapshot,
      selectTeam,
      selectDifficulty,
      selectCatchup,
    });
  }
  function restore(value) {
    const saved = A.POVCheckpoint.race(value), config = saved.config;
    return create(A.TrackCatalog.get(saved.trackId), { ...config,
      performance: config.performance || null,
      gridOrder: config.gridOrder === null ? undefined : config.gridOrder,
      ...(config.qualifying ? { qualifyingDrivers: A.QualifyingDrivers.create(CGPArcadeData.roster.teams, { technical: !!config.performance }) } : {}),
      restore: saved });
  }
  A.RaceSession = Object.freeze({ create, restore, fixedStep });
})();
