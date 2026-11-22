(() => {
  "use strict";
  const A = globalThis.CGPArcade, C = A.CampaignConfig, R = A.RogueliteRun, M = A.RunMap,
    S = A.RunStore, V = A.CampaignView, n = V.node, el = id => document.getElementById(id),
    details = A.ResultDetails.attach(el("runApp"));
  let stored = S.load(), selectedTeam = C.initialTeam, selectedDriver = null, preparing = false;
  const message = text => { el("runMessage").textContent = text; };
  function tab(name) {
    document.querySelectorAll("[data-run-view]").forEach(e => e.hidden = e.dataset.runView !== name);
    document.querySelectorAll("[data-run-tab]").forEach(b => b.dataset.runTab === name ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    if (name === "journey" && stored.game?.startAbility) A.RunMapUI.reveal(el("runMapBoard"), stored.game.phase.currentNode);
  }
  document.querySelectorAll("[data-run-tab]").forEach(b => b.onclick = () => tab(b.dataset.runTab));
  function identity(target, run) {
    const c = run.campaign, driver = C.getDriver(c.driverId), info = n("div", undefined, "run-identity-copy");
    info.append(n("p", C.getTeam(c.teamId).name, "eyebrow"), n("h3", driver.name), n("p", `${driver.age} Jahre · ${driver.nationality}`));
    if (run.startAbility) info.append(n("p", "Start: " + M.abilities.find(a => a.id === run.startAbility).name + " · Platzhalter", "hint"));
    target.replaceChildren(V.portrait(driver), V.car(c.teamId), info);
  }
  function save(next) {
    if (!S.save(next)) { message("Nicht gespeichert. Der bisherige Stand bleibt erhalten. Bitte exportieren oder den geänderten Stand neu laden."); return false; }
    stored = S.load(); message(""); return true;
  }
  function eventDialog() {
    const run = stored.game, id = run.phase.currentNode, content = run.eventContents[id], type = M.eventTypes.find(t => t.id === content.typeId);
    el("runEventTitle").textContent = `${type.symbol} ${type.name} · Event ${M.get(id).letter}`;
    el("runEventDescription").textContent = `${type.future} werden später entwickelt. Die Route ist bereits festgelegt: Danach geht es nach ${CGPArcadeData.tracks[M.outgoing(id)[0]].name}.`;
    el("runEventOffers").replaceChildren();
    for (const offer of content.offers) {
      const b = n("button", undefined, "run-offer"); b.type = "button"; b.dataset.choice = offer.id;
      b.append(n("small", "TESTANGEBOT · OHNE EFFEKT"), n("strong", offer.label), n("span", offer.description));
      b.onclick = () => {
        try {
          if (!save(R.completeEvent(stored.game, offer.id))) return;
          el("runEventDialog").close(); render(); tab("journey");
        } catch (error) { message(error.message); }
      };
      el("runEventOffers").append(b);
    }
    if (!el("runEventDialog").open) el("runEventDialog").showModal();
  }
  el("runEventClose").onclick = () => el("runEventDialog").close();
  el("runEventDialog").addEventListener("close", () => {
    const current = [...el("runMapBoard").querySelectorAll("[data-node]")].find(node => node.dataset.node === stored.game?.phase.currentNode);
    current?.focus({ preventScroll: true });
  });
  function enter(id) {
    try {
      if (!R.reachable(stored.game).includes(id)) throw Error("Dieser Knoten ist nicht erreichbar.");
      if (M.get(id).kind === "event") {
        if (!save(R.enterEvent(stored.game, id))) return;
        render(false); eventDialog();
      } else {
        if (!save(R.beginRace(stored.game))) return;
        const url = new URL("./race.html", location.href); url.search = "mode=run"; location.href = url.href;
      }
    } catch (error) { message(error.message); }
  }
  function summary(run, target) {
    const list = n("ol", undefined, "run-summary-route");
    for (const id of run.route) {
      const node = M.get(id), record = run.campaign.completed.find(r => r.trackId === id);
      if (node.kind === "race") {
        const own = record?.order.find(r => r.teamId === run.campaign.teamId), q = record?.qualifying?.find(r => r.teamId === run.campaign.teamId);
        list.append(n("li", `${CGPArcadeData.tracks[id].name}${own ? ` · Q${q?.position ?? "—"} / P${own.position}` : " · vorbereitet"}`));
      } else {
        const type = M.eventTypes.find(t => t.id === run.eventContents[id].typeId), choice = run.decisions.find(d => d.nodeId === id);
        list.append(n("li", `Event ${node.letter} · ${type.name}${choice ? " ✓" : " · offen"}`));
      }
    }
    target.replaceChildren(n("p", `Rennebene ${M.get(run.phase.currentNode)?.level || run.campaign.completed.length} · ${run.campaign.completed.length} abgeschlossene Wochenenden · ${run.visited.filter(id => M.get(id).kind === "event").length} besuchte Events`), list);
  }
  function resultArchive() {
    el("runArchive").replaceChildren();
    const runs = [...(stored.game ? [stored.game] : []), ...[...(stored.archive || [])].reverse()];
    if (!runs.length) el("runArchive").append(n("p", "Noch kein Run gespeichert."));
    for (const run of runs) {
      const group = n("section"); group.dataset.runId = run.id;
      group.append(n("h3", `${C.getDriver(run.campaign.driverId).name} · ${run.status === "won" ? "Phase 1 geschafft" : run.status === "failed" ? "Ausgeschieden" : run.id === stored.game?.id ? "Aktueller Run" : "Archivierter Zwischenstand"}`), n("p", run.savedAt ? "Zuletzt gesichert: " + new Date(run.savedAt).toLocaleString("de-DE") : "Vorbereiteter Run", "hint"));
      summary(run, group.appendChild(n("div")));
      for (const record of run.campaign.completed) {
        const own = record.order.find(e => e.teamId === run.campaign.teamId), q = record.qualifying?.find(e => e.teamId === run.campaign.teamId), card = n("article", undefined, "run-result-card");
        card.dataset.track = record.trackId;
        card.append(n("h4", CGPArcadeData.tracks[record.trackId].name), n("p", `Qualifying P${q?.position ?? "—"} · Rennen P${own.position} · ${own.teamName}`));
        const b = n("button", "Ergebnis ansehen"); b.type = "button";
        b.onclick = () => details.open(record, run.campaign.teamId, M.get(record.trackId).cutoff);
        card.append(b); group.append(card);
      }
      el("runArchive").append(group);
    }
  }
  function render(reveal = true) {
    const run = stored.game, valid = stored.status === "valid";
    el("runSetup").hidden = !(preparing || stored.status === "empty");
    el("runDriverStep").hidden = true;
    el("runAbilities").hidden = !valid || preparing || run.startAbility !== null;
    el("runJourney").hidden = !valid || preparing || run.startAbility === null;
    el("runSave").disabled = !valid; el("runExport").disabled = S.raw() === null;
    if (!valid) {
      if (stored.status !== "empty") message(stored.message);
      resultArchive(); return;
    }
    identity(el("runAbilityIdentity"), run); identity(el("runIdentity"), run);
    el("runTeamAbility").textContent = `${C.getTeam(run.campaign.teamId).name} · individuelle Teamfähigkeit vorgemerkt. Entwicklungsplatzhalter ohne Wirkung; die Startfähigkeit ersetzt sie nicht.`;
    el("runAbilityOffers").replaceChildren();
    if (!run.startAbility) for (const id of run.startOffers) {
      const ability = M.abilities.find(a => a.id === id), button = n("button", undefined, "run-offer"); button.type = "button"; button.dataset.ability = id;
      button.append(n("small", "PASSIVER PLATZHALTER · NOCH OHNE EFFEKT"), n("strong", ability.name), n("span", ability.description));
      button.onclick = () => { try { if (save(R.chooseAbility(stored.game, id))) { render(); tab("journey"); } } catch (error) { message(error.message); } };
      el("runAbilityOffers").append(button);
    }
    if (run.startAbility) {
      const record = run.campaign.completed.at(-1), own = record?.order.find(r => r.teamId === run.campaign.teamId);
      el("runMapNote").textContent = run.status !== "active" ? "Dieser Run ist beendet. Die Karte und alle Ergebnisse bleiben lesbar." : M.get(run.phase.currentNode).kind === "event" ? "Route festgelegt. Schließe dein Test-Event ab, um weiterzufahren." : run.campaign.stage === "interim" ? `P${own.position} in ${CGPArcadeData.tracks[record.trackId].name} · Ziel erreicht. Wähle einen verbundenen Event-Knoten.` : "Öffne dein aktuelles Rennwochenende. Das Qualifying ist verpflichtend.";
      A.RunMapUI.render(el("runMapBoard"), run, enter);
      if (reveal) A.RunMapUI.reveal(el("runMapBoard"), run.phase.currentNode);
    }
    el("runOutcome").hidden = run.status === "active";
    if (run.status !== "active") {
      el("runOutcome").dataset.status = run.status;
      el("runOutcomeEyebrow").textContent = run.status === "won" ? "PHASE 1 · ERFOLGREICH" : "RUN BEENDET";
      el("runOutcomeTitle").textContent = run.status === "won" ? "Ganz nach oben gefahren." : "Diesmal endet dein Weg hier.";
      el("runOutcomeReason").textContent = run.status === "won" ? "P1 im Finale! Phase 1 und der spielbare Prototyp sind abgeschlossen. Weitere Run-Phasen folgen später; es gibt noch keine Meta-Belohnungen." : `Ausgeschieden in Rennen ${M.get(run.outcome.nodeId).level}: P${run.outcome.position}. Erforderlich war P${run.outcome.required} oder besser. Keine zweite Chance in diesem Run.`;
      summary(run, el("runOutcomeDetails"));
    }
    resultArchive();
  }
  const teams = [...C.teams].sort((a, b) => Number(b.initiallyUnlocked) - Number(a.initiallyUnlocked));
  for (const team of teams) {
    const b = n("button", undefined, "run-team"); b.type = "button"; b.dataset.team = team.id; b.disabled = !team.initiallyUnlocked;
    b.setAttribute("aria-pressed", String(team.id === selectedTeam)); b.append(n("small", team.initiallyUnlocked ? "FREIGESCHALTET" : "🔒 GESPERRT"), V.car(team.id), n("strong", team.name));
    b.onclick = () => { selectedTeam = team.id; }; el("runTeams").append(b);
  }
  el("runTeams").before(el("runChooseDriver"));
  for (const id of C.starters) {
    const driver = C.getDriver(id), b = n("button", undefined, "campaign-driver-card"), info = n("div", undefined, "campaign-driver-info"); b.type = "button"; b.dataset.driver = id; b.setAttribute("aria-pressed", "false");
    info.append(n("span", driver.profile.archetype, "campaign-tag"), n("h3", driver.name), n("p", `${driver.age} Jahre · ${driver.nationality}`), n("p", driver.profile.description), n("p", "+ " + driver.profile.strengths.join(" · ")), n("p", "− " + driver.profile.weaknesses.join(" · ")));
    b.append(V.portrait(driver), info); b.onclick = () => { selectedDriver = id; [...el("runDrivers").children].forEach(c => c.setAttribute("aria-pressed", String(c === b))); el("runCreate").disabled = false; }; el("runDrivers").append(b);
  }
  el("runChooseDriver").onclick = () => { el("runSetup").hidden = true; el("runDriverStep").hidden = false; el("runDriverStep").scrollIntoView({ block: "start" }); };
  el("runBackTeam").onclick = () => { el("runDriverStep").hidden = true; el("runSetup").hidden = false; };
  el("runCreate").onclick = () => {
    if (!selectedDriver) return;
    const previous = S.raw(), current = S.load();
    if (["invalid", "unavailable"].includes(current.status)) { message(current.message); return; }
    if (previous !== null && !confirm("Einen neuen Run beginnen? Der bisherige Run bleibt im Ergebnisarchiv erhalten.")) return;
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0], prefs = A.POVPreferences.load();
      const next = R.create({ id: "run-" + crypto.randomUUID(), seed, teamId: selectedTeam, driverId: selectedDriver, difficulty: prefs.difficulty, catchup: prefs.catchup });
      if (!S.replace(next, previous)) { message("Start nicht gespeichert. Der bisherige Stand bleibt erhalten."); return; }
      stored = S.load(); preparing = false; render(); el("runAbilities").scrollIntoView({ block: "start" });
    } catch (error) { message(error.message); }
  };
  function prepareNew() { preparing = true; selectedDriver = null; el("runCreate").disabled = true; [...el("runDrivers").children].forEach(c => c.setAttribute("aria-pressed", "false")); render(); tab("journey"); el("runSetup").scrollIntoView({ block: "start" }); }
  el("runNew").onclick = el("runNewAfterOutcome").onclick = prepareNew;
  el("runSave").onclick = () => { if (save(stored.game)) message("Run gespeichert."); };
  el("runExport").onclick = () => {
    const raw = S.raw(); if (raw === null) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" })), link = n("a"); link.href = url; link.download = "carpet-grand-prix-run-archiv.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  el("runImport").onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    const previous = S.raw();
    try {
      if (file.size > S.maxBytes) throw Error("Die Sicherung ist zu groß.");
      const value = S.inspect(await file.text());
      if (previous !== null && !confirm("Diese geprüfte Run-Sicherung laden? Bereits gesicherte Ergebnisse können nicht zurückgesetzt werden.")) return;
      if (!S.replace(value, previous)) throw Error("Nicht geladen: Der Fortschritt würde zurückgesetzt oder der Speicher wurde inzwischen geändert.");
      stored = S.load(); preparing = false; render(); tab("journey"); message("Run-Sicherung geladen.");
    } catch (error) { message("Import abgebrochen: " + error.message); }
    finally { event.target.value = ""; }
  };
  render();
})();
