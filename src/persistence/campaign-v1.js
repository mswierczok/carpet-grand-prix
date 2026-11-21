/* Frozen v1 schema adapter: validate before explicit, lossless migration. */
(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    C = A.CampaignConfig,
    copy = (value) => A.POVCheckpoint.copy(value);
  function create({
    teamId = C.initialTeam,
    driverId,
    difficulty = "normal",
    catchup = true,
    slipstream = true,
  } = {}) {
    if (
      !C.initialUnlocked.includes(teamId) ||
      !C.pools[teamId]?.includes(driverId)
    )
      throw Error("Dieses Team oder dieser Fahrer ist noch nicht verfügbar.");
    return validate({
      version: 1,
      kind: "campaign",
      configVersion: C.version,
      engine: A.POVCheckpoint.engine,
      teamId,
      driverId,
      trackId: C.firstTrack,
      unlocked: { teamIds: [...C.initialUnlocked] },
      rosters: copy(C.pools),
      lineup: C.lineup(teamId, driverId, C.firstTrack),
      options: { difficulty, catchup, slipstream },
      stage: "ready",
      weekend: null,
      result: null,
      savedAt: 0,
    });
  }
  function resultFor(game, weekend) {
    const entries = [...weekend.session.state.entries].sort(
      (a, b) => a.finishTime - b.finishTime || a.id.localeCompare(b.id),
    );
    return {
      trackId: game.trackId,
      qualifying: weekend.result
        ? weekend.result.map((e) => ({
            teamId: e.id,
            driverId: game.lineup[e.id],
            position: e.position,
            bestLap: e.bestLap,
          }))
        : null,
      order: entries.map((e, i) => ({
        teamId: e.id,
        driverId: game.lineup[e.id],
        position: i + 1,
        finishTime: e.finishTime,
      })),
    };
  }
  function capture(game, weekend) {
    const next = {
      ...game,
      options: {
        difficulty: weekend.config.difficulty,
        catchup: weekend.config.catchup,
        slipstream: weekend.config.slipstream,
      },
      weekend: copy(weekend),
      stage: "weekend",
      result: null,
    };
    if (!weekend.qualifying && weekend.session.state.phase === "finished") {
      next.stage = "interim";
      next.result = resultFor(next, weekend);
    }
    return validate(next, false);
  }
  function validate(value, clone = true) {
    const g = value,
      fail = () => {
        throw Error(
          "Der Kampagnenstand ist unvollständig, beschädigt oder nicht kompatibel.",
        );
      },
      need = (value) => {
        if (!value) fail();
      },
      keys = (o, list) => {
        need(o && typeof o === "object" && !Array.isArray(o));
        need(
          Object.keys(o).length === list.length &&
            list.every((k) => Object.hasOwn(o, k)),
        );
      },
      equal = (a, b) =>
        a === b ||
        (!!a &&
          !!b &&
          typeof a === "object" &&
          typeof b === "object" &&
          Array.isArray(a) === Array.isArray(b) &&
          Object.keys(a).length === Object.keys(b).length &&
          Object.keys(a).every(
            (k) => Object.hasOwn(b, k) && equal(a[k], b[k]),
          ));
    keys(g, [
      "version",
      "kind",
      "configVersion",
      "engine",
      "teamId",
      "driverId",
      "trackId",
      "unlocked",
      "rosters",
      "lineup",
      "options",
      "stage",
      "weekend",
      "result",
      "savedAt",
    ]);
    need(
      g.version === 1 &&
        g.kind === "campaign" &&
        g.configVersion === C.version &&
        g.engine === A.POVCheckpoint.engine,
    );
    need(
      Number.isFinite(g.savedAt) &&
        g.savedAt >= 0 &&
        g.savedAt <= 1e16 &&
        ["ready", "weekend", "interim"].includes(g.stage),
    );
    keys(g.unlocked, ["teamIds"]);
    need(
      Array.isArray(g.unlocked.teamIds) &&
        g.unlocked.teamIds.includes(C.initialTeam) &&
        new Set(g.unlocked.teamIds).size === g.unlocked.teamIds.length &&
        g.unlocked.teamIds.every((id) => C.getTeam(id)),
    );
    keys(
      g.rosters,
      C.teams.map((t) => t.id),
    );
    const all = Object.values(g.rosters).flat();
    need(all.length === 39 && new Set(all).size === 39);
    for (const t of C.teams)
      need(
        Array.isArray(g.rosters[t.id]) && equal(g.rosters[t.id], C.pools[t.id]),
      );
    need(
      g.unlocked.teamIds.includes(g.teamId) &&
        g.rosters[g.teamId]?.includes(g.driverId),
    );
    need(C.tracks.some((t) => t.id === g.trackId));
    keys(
      g.lineup,
      C.teams.map((t) => t.id),
    );
    const expectedLineup = C.lineup(g.teamId, g.driverId, g.trackId, g.rosters);
    need(C.teams.every((t) => g.lineup[t.id] === expectedLineup[t.id]));
    keys(g.options, ["difficulty", "catchup", "slipstream"]);
    need(
      ["beginner", "normal", "hard", "expert"].includes(g.options.difficulty) &&
        typeof g.options.catchup === "boolean" &&
        typeof g.options.slipstream === "boolean",
    );
    if (g.weekend === null) need(g.stage === "ready" && g.result === null);
    else {
      A.POVCheckpoint.weekend(g.weekend, false);
      const config = g.weekend.config;
      need(
        g.stage !== "ready" &&
          g.weekend.trackId === g.trackId &&
          config.playerTeam === g.teamId &&
          config.difficulty === g.options.difficulty &&
          config.catchup === g.options.catchup &&
          config.slipstream === g.options.slipstream,
      );
      const finished =
        !g.weekend.qualifying && g.weekend.session.state.phase === "finished";
      need((g.stage === "interim") === finished);
      if (finished) need(equal(g.result, resultFor(g, g.weekend)));
      else need(g.result === null);
    }
    return clone ? copy(g) : g;
  }
  A.CampaignV1 = Object.freeze({ create, validate, capture });
})();
