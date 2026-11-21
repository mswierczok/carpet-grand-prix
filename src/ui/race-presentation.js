(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  const format = (seconds) => {
    const ms = Math.max(0, Math.round(seconds * 1000));
    return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  function create({ track, getCampaign = () => null } = {}) {
    let history = A.RaceGaps.create(),
      previousTime = -1,
      context = "";
    function identity(id, snapshot) {
      const C = A.CampaignConfig,
        game = getCampaign(),
        team = CGPArcadeData.roster.teams.find((t) => t.id === id);
      // Free modes have no persistent driver assignment yet: use a stable,
      // explicitly presentational historical identity, never performance stats.
      const ids = C.pools[id].filter((id) => C.getDriver(id).sourceId),
        d = C.getDriver(game?.lineup[id] || ids[0]);
      return { driverId: d.id, driverName: d.name, teamName: team.name };
    }
    function between(a, b, snapshot) {
      if (!a || !b) return { text: "—", seconds: null, laps: 0 };
      if (a.id === b.id) return { text: "—", seconds: 0, laps: 0 };
      if (a.finishTime !== null && b.finishTime !== null) {
        const seconds = b.finishTime - a.finishTime;
        return {
          text: `${seconds < 0 ? "−" : "+"}${Math.abs(seconds).toFixed(3)} s`,
          seconds,
          laps: 0,
        };
      }
      const distance = a.progress - b.progress,
        laps = Math.floor((Math.abs(distance) + 1e-7) / track().g.len);
      if (laps > 0)
        return {
          text: `${distance < 0 ? "−" : "+"}${laps} ${laps === 1 ? "Runde" : "Runden"}`,
          seconds: null,
          laps,
        };
      const ahead = distance >= 0 ? a : b,
        behind = distance >= 0 ? b : a,
        crossed = history.crossing(ahead.id, behind.progress),
        elapsed = snapshot.race.elapsed;
      if (crossed === null || crossed > elapsed || elapsed <= 0)
        return { text: "—", seconds: null, laps: 0 };
      const seconds = (elapsed - crossed) * (distance >= 0 ? 1 : -1);
      return {
        text: `${seconds < 0 ? "−" : "+"}${Math.abs(seconds).toFixed(1)} s`,
        seconds,
        laps: 0,
      };
    }
    function update(s) {
      const q = s.qualifying,
        r = s.race,
        key = track().id + ":" + !!q + ":" + r.playerTeam;
      if (
        key !== context ||
        r.elapsed < previousTime ||
        (r.phase === "grid" && previousTime > 0)
      ) {
        history = A.RaceGaps.create();
        context = key;
      }
      previousTime = r.elapsed;
      if (!q)
        for (const e of r.standings)
          history.observe(e.id, e.progress, r.elapsed);
      const order = q ? q.standings : r.standings,
        own = order.find((e) => e.player),
        leader = order[0],
        best = q?.standings.find((e) => e.bestLap !== null)?.bestLap;
      const rows = order.map((e) => {
        const native = r.standings.find((x) => x.id === e.id),
          start =
            s.qualifyingResult?.find((x) => x.id === e.id)?.position ??
            s.entries.findIndex((x) => x.id === e.id) + 1,
          gap = q
            ? {
                text:
                  e.bestLap === null || best == null
                    ? "—"
                    : e.position === 1
                      ? format(e.bestLap)
                      : `+${(e.bestLap - best).toFixed(3)} s`,
                seconds:
                  e.bestLap === null || best == null ? null : e.bestLap - best,
                laps: 0,
              }
            : e.position === 1
              ? {
                  text:
                    e.finishTime !== null ? format(e.finishTime) : "Führend",
                  seconds: 0,
                  laps: 0,
                }
              : between(leader, e, s);
        return {
          ...e,
          ...identity(e.id, s),
          gap: gap.text,
          gapData: gap,
          startPosition: start,
          completed: q
            ? (e.completed ??
              s.entries.find((x) => x.id === e.id).timing.completed)
            : e.completed,
          status: q
            ? e.bestLap === null
              ? "Keine Zeit"
              : q.finished
                ? "Beendet"
                : "Zeit gesetzt"
            : e.finishTime !== null
              ? "Im Ziel"
              : gap.laps > 0
                ? "Überrundet"
                : r.phase === "grid"
                  ? "Bereit"
                  : "Fährt",
          bestLap: q ? e.bestLap : null,
          native,
        };
      });
      const index = Math.max(
          0,
          rows.findIndex((e) => e.id === own.id),
        ),
        from = Math.max(0, Math.min(index - 1, rows.length - 3));
      const relative = rows.slice(from, from + 3).map((e) => {
        let gap = "DU";
        if (!e.player) {
          if (q)
            gap =
              e.bestLap === null || own.bestLap === null
                ? "—"
                : `${e.bestLap < own.bestLap ? "+" : "−"}${Math.abs(e.bestLap - own.bestLap).toFixed(3)} s`;
          else {
            // Ahead is positive waiting time, behind is negative following gap.
            const relation = between(e.native, rows[index].native, s);
            gap = relation.text;
          }
        }
        return { ...e, relativeGap: gap };
      });
      return {
        rows,
        relative,
        qualifying: !!q,
        own: rows[index],
        best,
        lap: q
          ? s.timing.completed === 0
            ? "Auslaufrunde"
            : s.timing.completed > q.timedLaps
              ? "Qualifying beendet"
              : `Schnelle Runde ${s.timing.completed}/${q.timedLaps}`
          : `Runde ${Math.min(r.laps, s.timing.completed + 1)}/${r.laps}`,
      };
    }
    return Object.freeze({ update, between });
  }
  A.RacePresentation = Object.freeze({ create, format });
})();
