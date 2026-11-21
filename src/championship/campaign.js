(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    C = A.CampaignConfig,
    copy = A.POVCheckpoint.copy;
  const baseKeys = [
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
  ];
  const equal = (a, b) =>
    a === b ||
    (!!a &&
      !!b &&
      typeof a === "object" &&
      typeof b === "object" &&
      Array.isArray(a) === Array.isArray(b) &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.keys(a).every((k) => Object.hasOwn(b, k) && equal(a[k], b[k])));
  const fail = () => {
    throw Error(
      "Der Kampagnenstand ist unvollständig, beschädigt oder nicht kompatibel.",
    );
  };
  const need = (value) => {
    if (!value) fail();
  };
  const keys = (o, names) =>
    need(
      o &&
        typeof o === "object" &&
        !Array.isArray(o) &&
        Object.keys(o).length === names.length &&
        names.every((k) => Object.hasOwn(o, k)),
    );
  const name = (s) =>
    typeof s === "string" && s.trim().length > 0 && s.length <= 160;
  const time = (t) => Number.isFinite(t) && t >= 0 && t < 1e16;
  function legacyResult(record) {
    return record
      ? {
          trackId: record.trackId,
          qualifying:
            record.qualifying?.map(
              ({ teamId, driverId, position, bestLap }) => ({
                teamId,
                driverId,
                position,
                bestLap,
              }),
            ) ?? null,
          order: record.order.map(
            ({ teamId, driverId, position, finishTime }) => ({
              teamId,
              driverId,
              position,
              finishTime,
            }),
          ),
        }
      : null;
  }
  function identity(game, teamId) {
    const driverId = game.lineup[teamId];
    return {
      teamId,
      driverId,
      driverName: C.getDriver(driverId).name,
      teamName: C.getTeam(teamId).name,
    };
  }
  function recordFor(game, result, at) {
    const q =
      result.qualifying?.map((e) => ({
        ...identity(game, e.teamId),
        position: e.position,
        bestLap: e.bestLap,
      })) ?? null;
    return {
      id: "gp-" + result.trackId,
      trackId: result.trackId,
      recordedAt: at,
      qualifying: q,
      order: result.order.map((e) => ({
        ...identity(game, e.teamId),
        position: e.position,
        finishTime: e.finishTime,
        startPosition: q?.find((r) => r.teamId === e.teamId)?.position ?? null,
      })),
    };
  }
  function migrate(value) {
    const old = A.CampaignV1.validate(value);
    const result = old.result ? recordFor(old, old.result, old.savedAt) : null;
    return {
      ...old,
      version: 2,
      result,
      completed: result ? [result] : [],
      legacyWeekend: !!(
        old.weekend &&
        !old.weekend.qualifying &&
        !old.weekend.result &&
        old.weekend.session.state.phase !== "grid"
      ),
    };
  }
  function create(options) {
    return validate(migrate(A.CampaignV1.create(options)), false);
  }
  function validate(value, clone = true) {
    const g = value?.version === 1 ? migrate(value) : value;
    keys(g, [...baseKeys, "completed", "legacyWeekend"]);
    need(g.version === 2 && typeof g.legacyWeekend === "boolean");
    need(g.result === null || (g.result && Array.isArray(g.result.order)));
    const legacy = Object.fromEntries(baseKeys.map((k) => [k, g[k]]));
    legacy.version = 1;
    legacy.result = legacyResult(g.result);
    A.CampaignV1.validate(legacy, false);
    need(Array.isArray(g.completed) && g.completed.length <= C.tracks.length);
    need(
      new Set(g.completed.map((r) => r?.trackId)).size === g.completed.length,
    );
    for (const record of g.completed) {
      keys(record, ["id", "trackId", "recordedAt", "qualifying", "order"]);
      need(
        record.id === "gp-" + record.trackId &&
          C.tracks.some((t) => t.id === record.trackId) &&
          time(record.recordedAt),
      );
      need(
        Array.isArray(record.order) &&
          record.order.length === 13 &&
          new Set(record.order.map((r) => r?.teamId)).size === 13,
      );
      need(new Set(record.order.map((r) => r?.driverId)).size === 13);
      for (const [i, r] of record.order.entries()) {
        keys(r, [
          "teamId",
          "driverId",
          "driverName",
          "teamName",
          "position",
          "finishTime",
          "startPosition",
        ]);
        need(
          g.rosters[r.teamId]?.includes(r.driverId) &&
            name(r.driverName) &&
            name(r.teamName) &&
            r.position === i + 1 &&
            time(r.finishTime),
        );
        need(r.teamId !== g.teamId || r.driverId === g.driverId);
        need(i === 0 || r.finishTime >= record.order[i - 1].finishTime);
        need(
          r.startPosition === null ||
            (Number.isInteger(r.startPosition) &&
              r.startPosition >= 1 &&
              r.startPosition <= 13),
        );
      }
      if (record.qualifying !== null) {
        need(
          Array.isArray(record.qualifying) &&
            record.qualifying.length === 13 &&
            new Set(record.qualifying.map((r) => r?.teamId)).size === 13,
        );
        for (const [i, r] of record.qualifying.entries()) {
          keys(r, [
            "teamId",
            "driverId",
            "driverName",
            "teamName",
            "position",
            "bestLap",
          ]);
          const raced = record.order.find((e) => e.teamId === r.teamId);
          need(
            raced &&
              r.position === i + 1 &&
              r.driverId === raced.driverId &&
              r.driverName === raced.driverName &&
              r.teamName === raced.teamName &&
              raced.startPosition === r.position,
          );
          need(r.bestLap === null || (time(r.bestLap) && r.bestLap > 0));
          if (i)
            need(
              record.qualifying[i - 1].bestLap !== null || r.bestLap === null,
            );
          if (i && r.bestLap !== null)
            need(r.bestLap >= record.qualifying[i - 1].bestLap);
        }
      } else need(record.order.every((r) => r.startPosition === null));
    }
    if (g.completed.length) need(g.completed[0].trackId === C.firstTrack);
    need(g.trackId === C.firstTrack || g.completed.length > 0);
    const current = g.completed.find((r) => r.trackId === g.trackId);
    if (g.stage === "interim")
      need(
        current &&
          equal(current, g.result) &&
          current.trackId === g.completed.at(-1).trackId,
      );
    else need(!current && g.result === null);
    if (g.legacyWeekend)
      need(
        g.trackId === C.firstTrack &&
          g.weekend &&
          !g.weekend.qualifying &&
          !g.weekend.result &&
          g.weekend.session.state.phase !== "grid",
      );
    if (
      g.weekend &&
      !g.weekend.qualifying &&
      !g.weekend.result &&
      g.weekend.session.state.phase !== "grid"
    )
      need(g.legacyWeekend);
    return clone ? copy(g) : g;
  }
  function capture(game, weekend, now = Date.now()) {
    const g = validate(game, false),
      next = {
        ...g,
        weekend: copy(weekend),
        stage: "weekend",
        result: null,
        options: {
          difficulty: weekend.config.difficulty,
          catchup: weekend.config.catchup,
          slipstream: weekend.config.slipstream,
        },
        legacyWeekend:
          g.legacyWeekend &&
          !weekend.qualifying &&
          !weekend.result &&
          weekend.session.state.phase !== "grid",
      };
    if (!weekend.qualifying && weekend.session.state.phase === "finished") {
      const legacy = A.CampaignV1.capture(
        {
          ...Object.fromEntries(baseKeys.map((k) => [k, g[k]])),
          version: 1,
          result: legacyResult(g.result),
        },
        weekend,
      ).result;
      const existing = g.completed.find((r) => r.trackId === g.trackId);
      if (existing && !equal(legacyResult(existing), legacy))
        throw Error(
          "Ein gesichertes Ergebnis darf nicht überschrieben werden.",
        );
      next.result = existing || recordFor(g, legacy, now);
      next.stage = "interim";
      next.completed = existing ? g.completed : [...g.completed, next.result];
    }
    return validate(next, false);
  }
  function next(game, trackId) {
    const g = validate(game);
    if (
      g.stage !== "interim" ||
      !C.tracks.some((t) => t.id === trackId) ||
      g.completed.some((r) => r.trackId === trackId)
    )
      return null;
    return validate(
      {
        ...g,
        trackId,
        lineup: C.lineup(g.teamId, g.driverId, trackId, g.rosters),
        stage: "ready",
        weekend: null,
        result: null,
        legacyWeekend: false,
      },
      false,
    );
  }
  A.Campaign = Object.freeze({
    version: 2,
    create,
    validate,
    capture,
    next,
    migrate,
  });
})();
