(() => {
  "use strict";
  const A = globalThis.CGPArcade, M = A.RunMap, copy = A.POVCheckpoint.copy;
  const equal = (a, b) => a === b || (!!a && !!b && typeof a === "object" && typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b) && Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(k => Object.hasOwn(b, k) && equal(a[k], b[k])));
  const need = (ok, message = "Der Run-Stand ist beschädigt oder nicht kompatibel.") => { if (!ok) throw Error(message); };
  const keys = (o, names) => need(o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === names.length && names.every(k => Object.hasOwn(o, k)));
  const fields = ["version", "kind", "configVersion", "id", "seed", "status", "phase", "teamAbility", "startOffers", "startAbility", "eventContents", "decisions", "visited", "route", "raceCommitted", "outcome", "phaseHistory", "build", "campaign", "savedAt"];
  const buildKeys = ["vehicleUpgrades", "driverDevelopment", "items", "crew", "passiveAbilities", "synergies"];
  const nodeForRecord = r => M.phase.nodes.find(n => n.kind === "race" && n.trackId === r.trackId);
  function outcome(campaign) {
    const last = campaign.completed.at(-1);
    if (!last) return null;
    const node = nodeForRecord(last), position = last.order.find(r => r.teamId === campaign.teamId).position;
    if (position <= node.cutoff && !node.final) return null;
    return { phaseId: M.phase.id, nodeId: node.id, position, required: node.cutoff,
      reason: position > node.cutoff ? "eliminated" : "prototype-complete" };
  }
  function validate(run, clone = true) {
    keys(run, fields);
    need(run.version === 1 && run.kind === "roguelite-run" && run.configVersion === M.version);
    need(typeof run.id === "string" && /^run-[a-zA-Z0-9-]{8,100}$/.test(run.id));
    need(Number.isInteger(run.seed) && run.seed >= 0 && run.seed <= 0xffffffff);
    need(Number.isFinite(run.savedAt) && run.savedAt >= 0 && run.savedAt < 1e16);
    const generated = M.generate(run.seed), c = A.Campaign.validate(run.campaign, false);
    need(!c.legacyWeekend && c.completed.every(record => record.qualifying !== null), "Run-Wochenenden verlangen immer ein vollständiges Qualifying.");
    need(equal(run.startOffers, generated.startOffers) && equal(run.eventContents, generated.events));
    need(run.teamAbility === "team-placeholder-" + c.teamId);
    need(run.startAbility === null || run.startOffers.includes(run.startAbility));
    keys(run.phase, ["id", "status", "currentNode"]);
    need(run.phase.id === M.phase.id && typeof run.raceCommitted === "boolean");
    keys(run.build, buildKeys);
    // Reserved, versioned slots. No invented effects or arbitrary item payloads.
    need(buildKeys.every(k => Array.isArray(run.build[k]) && run.build[k].length === 0));
    need(Array.isArray(run.route) && run.route.length <= M.phase.nodes.length && new Set(run.route).size === run.route.length);
    need(Array.isArray(run.visited) && equal(run.visited, run.route.slice(0, run.visited.length)));
    need(run.visited.length === run.route.length || run.visited.length === run.route.length - 1);
    need(Array.isArray(run.decisions));
    if (run.startAbility === null) {
      need(run.route.length === 0 && run.visited.length === 0 && run.decisions.length === 0 && run.phase.currentNode === null);
      need(c.trackId === M.phase.first && c.stage === "ready" && !c.weekend && c.completed.length === 0);
    } else {
      need(run.route[0] === M.phase.first && run.phase.currentNode === run.route.at(-1));
      run.route.forEach((id, i) => need(M.get(id) && (!i || M.outgoing(run.route[i - 1]).includes(id))));
      const current = M.get(run.phase.currentNode), races = run.route.map(M.get).filter(n => n.kind === "race");
      need(c.trackId === races.at(-1).trackId);
      need(equal(c.completed.map(r => r.trackId), races.slice(0, c.completed.length).map(n => n.trackId)));
      need(c.completed.length === races.length - (current.kind === "race" && c.stage !== "interim" ? 1 : 0));
      for (const record of c.completed) {
        const n = nodeForRecord(record), index = run.route.indexOf(n.id), own = record.order.find(r => r.teamId === c.teamId);
        if (index < run.route.length - 1) need(own.position <= n.cutoff && !n.final);
        need(run.visited.includes(n.id));
      }
      if (current.kind === "event") need(c.stage === "interim" && run.visited.at(-1) === current.id);
      if (run.visited.length < run.route.length) need(current.kind === "race" && c.stage === "ready");
      const decided = run.route.filter(id => M.get(id).kind === "event" && id !== current.id);
      need(equal(run.decisions.map(d => d?.nodeId), decided));
      for (const d of run.decisions) { keys(d, ["nodeId", "choiceId"]); need(run.eventContents[d.nodeId].offers.some(o => o.id === d.choiceId)); }
    }
    const expected = outcome(c);
    need(equal(run.outcome, expected));
    need(run.status === (expected ? expected.reason === "eliminated" ? "failed" : "won" : "active"));
    need(run.phase.status === (run.status === "active" ? "active" : run.status === "won" ? "completed" : "failed"));
    const history = run.status === "active" ? [] : [{ id: run.phase.id, status: run.phase.status, route: run.route, decisions: run.decisions, results: c.completed }];
    need(equal(run.phaseHistory, history));
    if (c.weekend && !c.weekend.qualifying && c.weekend.session.state.phase !== "grid") need(run.raceCommitted);
    need(!run.raceCommitted || (c.weekend && !c.weekend.qualifying && c.weekend.result !== null));
    return clone ? copy(run) : run;
  }
  function create({ id, seed, ...options }) {
    const generated = M.generate(seed);
    return validate({ version: 1, kind: "roguelite-run", configVersion: M.version, id, seed,
      status: "active", phase: { id: M.phase.id, status: "active", currentNode: null },
      teamAbility: "team-placeholder-" + (options.teamId || A.CampaignConfig.initialTeam),
      startOffers: generated.startOffers, startAbility: null, eventContents: generated.events,
      decisions: [], visited: [], route: [], raceCommitted: false, outcome: null, phaseHistory: [],
      build: Object.fromEntries(buildKeys.map(k => [k, []])), campaign: A.Campaign.create(options), savedAt: 0 });
  }
  function reachable(run) {
    if (run.status !== "active" || run.startAbility === null) return [];
    const current = M.get(run.phase.currentNode);
    if (current.kind === "event" || run.campaign.stage !== "interim") return [current.id];
    return M.outgoing(current.id);
  }
  function chooseAbility(run, id) {
    const r = validate(run);
    need(r.status === "active" && r.startAbility === null && r.startOffers.includes(id), "Diese Startfähigkeit kann nicht gewählt werden.");
    r.startAbility = id; r.phase.currentNode = M.phase.first; r.route = [M.phase.first];
    return validate(r, false);
  }
  function enterEvent(run, id) {
    const r = validate(run);
    need(reachable(r).includes(id) && M.get(id)?.kind === "event", "Dieser Event-Knoten ist nicht erreichbar.");
    if (r.phase.currentNode === id) return r;
    r.phase.currentNode = id; r.route.push(id); r.visited.push(id);
    return validate(r, false);
  }
  function completeEvent(run, choiceId) {
    const r = validate(run), id = r.phase.currentNode;
    need(r.status === "active" && M.get(id)?.kind === "event" && r.eventContents[id].offers.some(o => o.id === choiceId), "Diese Event-Entscheidung ist nicht verfügbar.");
    const next = M.outgoing(id)[0];
    r.decisions.push({ nodeId: id, choiceId }); r.route.push(next); r.phase.currentNode = next;
    r.campaign = A.Campaign.next(r.campaign, M.get(next).trackId); r.raceCommitted = false;
    need(r.campaign);
    return validate(r, false);
  }
  function canRace(run) {
    return run?.status === "active" && run.startAbility !== null && M.get(run.phase.currentNode)?.kind === "race" && run.campaign.stage !== "interim";
  }
  function canOpenWeekend(run) {
    return !!run && M.get(run.phase.currentNode)?.kind === "race" && run.visited.includes(run.phase.currentNode) &&
      (canRace(run) || run.campaign.stage === "interim");
  }
  function beginRace(run) {
    const r = validate(run); need(canRace(r), "Dieses Rennwochenende kann nicht betreten werden.");
    if (!r.visited.includes(r.phase.currentNode)) r.visited.push(r.phase.currentNode);
    return validate(r, false);
  }
  function capture(run, weekend, now = Date.now()) {
    const r = validate(run);
    need(M.get(r.phase.currentNode)?.kind === "race" && r.visited.at(-1) === r.phase.currentNode, "Kein geöffnetes Run-Wochenende.");
    r.campaign = A.Campaign.capture(r.campaign, weekend, now);
    r.raceCommitted ||= !weekend.qualifying && weekend.session.state.phase !== "grid";
    r.outcome = outcome(r.campaign);
    if (r.outcome) {
      r.status = r.outcome.reason === "eliminated" ? "failed" : "won";
      r.phase.status = r.status === "won" ? "completed" : "failed";
      r.phaseHistory = [{ id: r.phase.id, status: r.phase.status, route: copy(r.route), decisions: copy(r.decisions), results: copy(r.campaign.completed) }];
    }
    return validate(r, false);
  }
  function cutoff(run) { return run?.startAbility ? M.get(run.phase.currentNode)?.cutoff ?? null : null; }
  function canRestart(run) { return canRace(run) && !run.raceCommitted; }
  function nodeState(run, id) {
    const n = M.get(id), c = run.campaign;
    const completed = n.kind === "race" ? c.completed.some(r => r.trackId === n.trackId) : run.decisions.some(d => d.nodeId === id);
    if (completed) {
      if (n.kind === "race" && c.completed.find(r => r.trackId === n.trackId).order.find(r => r.teamId === c.teamId).position > n.cutoff) return "failed";
      return n.final && run.status === "won" ? "won" : "completed";
    }
    if (id === run.phase.currentNode) return "current";
    if (reachable(run).includes(id)) return "reachable";
    const future = new Set(), visit = node => { if (future.has(node)) return; future.add(node); M.outgoing(node).forEach(visit); };
    if (run.status === "active") visit(run.phase.currentNode || M.phase.first);
    return future.has(id) ? "locked" : "unreachable";
  }
  function compatibleProgress(before, after) {
    if (before.id !== after.id) return true;
    return before.seed === after.seed && before.campaign.teamId === after.campaign.teamId && before.campaign.driverId === after.campaign.driverId &&
      (before.startAbility === null || before.startAbility === after.startAbility) &&
      equal(before.route, after.route.slice(0, before.route.length)) && equal(before.visited, after.visited.slice(0, before.visited.length)) &&
      equal(before.decisions, after.decisions.slice(0, before.decisions.length)) &&
      equal(before.campaign.completed, after.campaign.completed.slice(0, before.campaign.completed.length)) &&
      (before.status === "active" || (before.status === after.status && equal(before.outcome, after.outcome))) &&
      (!(before.raceCommitted && before.campaign.trackId === after.campaign.trackId) || (after.raceCommitted &&
        after.campaign.weekend.session.state.elapsed >= before.campaign.weekend.session.state.elapsed));
  }
  A.RogueliteRun = Object.freeze({ version: 1, create, validate, chooseAbility, reachable, enterEvent, completeEvent, beginRace, canRace, canOpenWeekend, capture, cutoff, canRestart, nodeState, compatibleProgress });
})();
