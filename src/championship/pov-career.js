(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  const rules = Object.freeze({ scoring: Object.freeze([25,18,15,12,10,8,6,4,2,1]),
    prizeCredits: Object.freeze([160,156,152,148,144,140,136,132,128,124,120,116,112]),
    prizeResearch: Object.freeze([85,93,102,110,118,127,135,143,152,160,168,177,185]) });
  const tracks = () => Object.values(CGPArcadeData.tracks).sort((a,b) => a.index-b.index);
  const copy = value => A.POVCheckpoint.copy(value);
  function create({ mode = "single", teamId, trackId = "bahrain", difficulty = "normal", catchup = true, slipstream = true }) {
    if (!["single", "championship"].includes(mode) || !CGPArcadeData.roster.teams.some(t => t.id === teamId)) throw Error("Ungültiger POV-Spielstart.");
    const game = { version: 1, engine: A.POVCheckpoint.engine, mode, teamId,
      trackId: mode === "championship" ? tracks()[0].id : trackId,
      options: { difficulty, catchup, slipstream }, weekend: null, savedAt: 0, career: null };
    if (mode === "championship") game.career = { season: 1, round: 0, results: [], history: [],
      teams: CGPArcadeData.roster.teams.map(t => ({ id: t.id, credits: 0, research: 0,
        parts: Object.fromEntries(["aero", "power", "handling", "reliability"].map(k => [k, t.baseStrength])),
        upgrades: 0, early: 0, late: 0, studies: 0 })) };
    return validate(game);
  }
  function standings(game) {
    return CGPArcadeData.roster.teams.map(t => ({ id: t.id, name: t.name,
      points: game.career.results.reduce((n, r) => n + r.order.find(e => e.id === t.id).points, 0) }))
      .sort((a,b) => b.points-a.points).map((t,i) => ({ ...t, position: i+1 }));
  }
  const recorded = game => game.mode === "championship" && game.career.results.length === game.career.round + 1;
  function award(team, credits, research) { team.credits += credits; team.research = Math.min(260, team.research + research); }
  function record(game, snapshot) {
    if (game.mode !== "championship" || recorded(game) || snapshot.qualifying || snapshot.race.phase !== "finished" || snapshot.race.finished !== 13) return null;
    const supplied = snapshot.race.standings;
    if (!Array.isArray(supplied) || supplied.length !== 13 || new Set(supplied.map(e => e.id)).size !== 13 ||
      supplied.some(e => !CGPArcadeData.roster.teams.some(t => t.id === e.id))) return null;
    const next = copy(game), career = next.career;
    if (next.trackId !== tracks()[career.round].id || snapshot.race.playerTeam !== next.teamId) return null;
    const order = snapshot.race.standings.map((e,i) => ({ id: e.id, position: i+1,
      finishTime: e.finishTime, points: rules.scoring[i] || 0 }));
    if (order.some(e => !Number.isFinite(e.finishTime))) return null;
    career.results.push({ round: career.round+1, trackId: next.trackId, order });
    for (const team of career.teams) award(team, 2 + Math.round(order.find(e => e.id === team.id).points * .08), 0);
    const ranks = standings(next);
    if (career.results.length === 11) for (const [i,t] of ranks.entries()) award(career.teams.find(x => x.id === t.id), 0, Math.round(rules.prizeResearch[i] * .5));
    if (career.results.length === 22) for (const [i,t] of ranks.entries()) award(career.teams.find(x => x.id === t.id), rules.prizeCredits[i], rules.prizeResearch[i]);
    return validate(next);
  }
  function nextRound(game) {
    if (!recorded(game) || game.career.round === 21) return null;
    const next = copy(game); next.career.round++; next.trackId = tracks()[next.career.round].id; next.weekend = null;
    return next;
  }
  function nextSeason(game) {
    if (!recorded(game) || game.career.round !== 21) return null;
    const next = copy(game), c = next.career;
    c.history.push({ season: c.season, standings: standings(next), results: c.results });
    c.season++; c.round = 0; c.results = [];
    for (const t of c.teams) t.upgrades = t.early = t.late = t.studies = 0;
    next.weekend = null; next.trackId = tracks()[0].id;
    return next;
  }
  function validate(value, clone = true) {
    const g = value, fail = () => { throw Error("Ungültiger POV-Karrierespielstand."); },
      need = v => { if (!v) fail(); }, num = (x, min = 0, max = 1e9) => Number.isFinite(x) && x >= min && x <= max,
      int = (x, min = 0, max = 1e9) => Number.isInteger(x) && num(x,min,max),
      known = (o, names) => { need(o && typeof o === "object" && !Array.isArray(o)); need(Object.keys(o).every(k => names.includes(k))); },
      ids = CGPArcadeData.roster.teams.map(t => t.id);
    known(g, ["version", "engine", "mode", "teamId", "trackId", "options", "weekend", "career", "savedAt"]);
    need(g.version === 1 && g.engine === A.POVCheckpoint.engine && ["single", "championship"].includes(g.mode));
    need(ids.includes(g.teamId) && Object.hasOwn(CGPArcadeData.tracks, g.trackId) && num(g.savedAt, 0, 1e16));
    known(g.options, ["difficulty", "catchup", "slipstream"]);
    need(["beginner", "normal", "hard", "expert"].includes(g.options.difficulty) && typeof g.options.catchup === "boolean" && typeof g.options.slipstream === "boolean");
    if (g.weekend !== null) {
      A.POVCheckpoint.weekend(g.weekend, false);
      need(g.weekend.trackId === g.trackId && g.weekend.config.playerTeam === g.teamId && g.weekend.config.difficulty === g.options.difficulty && g.weekend.config.catchup === g.options.catchup && g.weekend.config.slipstream === g.options.slipstream);
    }
    function results(list) {
      need(Array.isArray(list) && list.length <= 22);
      for (const [i,r] of list.entries()) {
        known(r, ["round", "trackId", "order"]); need(r.round === i+1 && r.trackId === tracks()[i].id);
        need(Array.isArray(r.order) && r.order.length === 13 && new Set(r.order.map(e => e.id)).size === 13);
        let time = 0;
        for (const [j,e] of r.order.entries()) {
          known(e, ["id", "position", "finishTime", "points"]);
          need(ids.includes(e.id) && e.position === j+1 && e.points === (rules.scoring[j] || 0) && num(e.finishTime, time)); time = e.finishTime;
        }
      }
    }
    if (g.mode === "single") need(g.career === null);
    else {
      const c = g.career; known(c, ["season", "round", "results", "history", "teams"]);
      need(int(c.season,1,10000) && int(c.round,0,21)); results(c.results);
      need(c.results.length === c.round || c.results.length === c.round+1);
      need(g.trackId === tracks()[c.round].id && Array.isArray(c.history) && c.history.length === c.season-1);
      for (const [i,h] of c.history.entries()) {
        known(h, ["season", "standings", "results"]); need(h.season === i+1); results(h.results); need(h.results.length === 22);
        const expected = standings({ career: { results: h.results } });
        need(Array.isArray(h.standings) && h.standings.length === 13);
        h.standings.forEach((row,j) => {
          known(row, ["id", "name", "points", "position"]);
          need(["id", "name", "points", "position"].every(key => row[key] === expected[j][key]));
        });
      }
      need(Array.isArray(c.teams) && c.teams.length === 13 && new Set(c.teams.map(t => t.id)).size === 13);
      for (const t of c.teams) {
        known(t, ["id", "credits", "research", "parts", "upgrades", "early", "late", "studies"]);
        const base = CGPArcadeData.roster.teams.find(x => x.id === t.id); need(base);
        need(num(t.credits) && num(t.research,0,260) && int(t.upgrades,0,4) && int(t.early,0,2) && int(t.late,0,2) && t.upgrades === t.early+t.late && int(t.studies,0,1));
        known(t.parts, ["aero", "power", "handling", "reliability"]);
        for (const k of ["aero", "power", "handling", "reliability"]) need(num(t.parts[k],base.baseStrength,base.developmentPotential));
      }
      if (recorded(g) && g.weekend !== null) {
        need(!g.weekend.qualifying && g.weekend.session.state.phase === "finished");
        const savedOrder = [...g.weekend.session.state.entries].sort((a,b) => a.finishTime-b.finishTime || a.id.localeCompare(b.id));
        need(c.results.at(-1).order.every((e,i) => e.id === savedOrder[i].id && e.finishTime === savedOrder[i].finishTime));
      }
    }
    return clone ? copy(g) : g;
  }
  A.POVCareer = Object.freeze({ rules, create, validate, standings, recorded, record, nextRound, nextSeason });
})();
