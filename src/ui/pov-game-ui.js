(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, { getGame, setGame, getSession, onLoad, onPause, replace = false }) {
    const el = id => root.querySelector("#" + id), store = A.POVGameStore;
    let lastSave = 0, standingsKey = "";
    const write = (id, value) => { const node = el(id); if (node.textContent !== value) node.textContent = value; };
    function capture() {
      const weekend = getSession().exportState();
      const game = getGame() || A.POVCareer.create({ mode: "single", teamId: weekend.config.playerTeam,
        trackId: weekend.trackId, ...weekend.config });
      setGame({ ...game, teamId: weekend.config.playerTeam, trackId: weekend.trackId,
        options: { difficulty: weekend.config.difficulty, catchup: weekend.config.catchup, slipstream: weekend.config.slipstream }, weekend });
      return getGame();
    }
    function save() {
      if (!getGame()) return false;
      capture();
      lastSave = performance.now();
      const stamp = Date.now(), ok = store.save(getGame(), { replace, now: stamp });
      if (ok) { replace = false; setGame({ ...getGame(), savedAt: stamp }); }
      el("povSaveStatus").textContent = ok ? "Spielstand gespeichert."
        : "Speichern nicht möglich. Dein bisheriger Stand bleibt erhalten. Bitte den aktuellen Stand als Datei sichern.";
      return ok;
    }
    function changed() { if (!getGame()) return false; const ok = save(); update(getSession().snapshot()); return ok; }
    const workshop = A.POVWorkshopUI.attach(root, { getGame, setGame, save,
      onOpen() { onPause(); capture(); } });
    el("openWorkshop").onclick = () => workshop.open();
    el("savePOV").onclick = () => {
      if (!getGame() && store.load().status !== "empty" && !confirm("Den bisherigen POV-Spielstand durch diese Fahrt ersetzen?")) return;
      if (!getGame()) { replace = true; capture(); }
      onPause(); changed();
    };
    el("exportPOV").onclick = () => {
      onPause(); const active = getGame(), weekend = getSession().exportState();
      const data = active ? capture() : { ...A.POVCareer.create({ mode: "single", teamId: weekend.config.playerTeam,
        trackId: weekend.trackId, ...weekend.config }), weekend };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "carpet-grand-prix-pov.json";
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    el("importPOV").onchange = async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        const raw = await file.text(), imported = store.parse(raw);
        if (imported.weekend) A.RaceWeekend.restore(imported.weekend);
        if (store.load().status !== "empty" && !confirm("Den bisherigen POV-Spielstand durch diese geprüfte Sicherung ersetzen?")) return;
        store.importJSON(raw); onPause(); onLoad(imported); changed();
      } catch (error) { el("povSaveStatus").textContent = "Import abgebrochen: " + error.message; }
      finally { event.target.value = ""; }
    };
    el("commitPOVResult").onclick = () => {
      if (!getGame()) return;
      capture(); const next = A.POVCareer.record(getGame(), getSession().snapshot()); if (!next) return;
      setGame(next); save(); update(getSession().snapshot());
    };
    el("nextPOVRound").onclick = () => {
      const game = getGame(), next = game?.career?.round === 21 ? A.POVCareer.nextSeason(game) : A.POVCareer.nextRound(game);
      if (!next) return; onPause(); onLoad(next); changed();
    };
    function update(snapshot) {
      const game = getGame(), career = game?.mode === "championship";
      el("povCareerPanel").hidden = !career;
      if (!career) return;
      const committed = A.POVCareer.recorded(game), s = game.career;
      write("povCareerTitle", `Saison ${s.season} · Grand Prix ${s.round+1} / 22`);
      write("povCareerNote", committed ? (s.round === 21 ? "Saison beendet. Prämien sind verbucht." : "Ergebnis und Punkte sind verbucht.")
        : "Ein Auto pro Team · Teamwertung · Fahrerzuordnung folgt später.");
      el("commitPOVResult").hidden = !!snapshot.qualifying || snapshot.race.phase !== "finished" || committed;
      el("nextPOVRound").hidden = !committed;
      write("nextPOVRound", s.round === 21 ? "Nächste Saison starten" : "Zur nächsten Strecke");
      el("openWorkshop").disabled = committed || !!snapshot.qualifying || !!snapshot.qualifyingResult || snapshot.race.phase !== "grid";
      for (const id of ["team", "track"]) el(id).disabled = true;
      el("restart").disabled = committed;
      el("startQualifying").disabled = committed;
      const key = s.season + ":" + JSON.stringify(s.results);
      if (key === standingsKey) return;
      standingsKey = key;
      const rows = el("povTeamStandings"); rows.replaceChildren();
      for (const team of A.POVCareer.standings(game)) {
        const row = document.createElement("li"); row.textContent = `${team.position}. ${team.name} · ${team.points} Punkte`;
        if (team.id === game.teamId) row.className = "is-player"; rows.append(row);
      }
    }
    function autosave(now) {
      if (getGame() && now - lastSave >= 5000 && !getSession().snapshot().paused) save();
    }
    return Object.freeze({ save, capture, changed, update, autosave });
  }
  A.POVGameUI = Object.freeze({ attach });
})();
