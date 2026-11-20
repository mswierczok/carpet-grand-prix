(() => {
  "use strict";
  const A = globalThis.CGPArcade, data = globalThis.CGPArcadeData,
    root = document.getElementById("povMenu"), el = id => document.getElementById(id),
    teams = data.roster.teams, tracks = Object.values(data.tracks).sort((a, b) => a.index - b.index),
    prefs = { ...A.POVPreferences.load() };
  let selection = A.POVSelection.load(), setupMode = "single", stored = A.POVGameStore.load();
  const store = A.POVGameStore;
  const savedMessage = "Team und Strecke gespeichert. Beim Laden wird ein neues Rennwochenende vorbereitet.";
  for (const [id, entries] of [["menuTeam", teams], ["menuTrack", tracks]]) {
    for (const entry of entries) {
      const option = document.createElement("option");
      option.value = entry.id; option.textContent = entry.name;
      el(id).append(option);
    }
  }
  function render() {
    const team = teams.find(t => t.id === selection.teamId), track = data.tracks[selection.trackId];
    el("menuTeam").value = team.id; el("menuTrack").value = track.id;
    el("menuTrack").disabled = setupMode === "championship";
    el("setupTitle").textContent = setupMode === "championship" ? "Dein Team für die Meisterschaft" : "Dein Team. Deine Strecke.";
    el("continuePOV").disabled = stored.status !== "valid";
    el("menuWorkshop").hidden = stored.game?.mode !== "championship";
    el("exportMenuPOV").disabled = !["valid", "invalid"].includes(stored.status);
    el("menuSaveInfo").textContent = stored.status === "valid"
      ? (stored.game.mode === "championship" ? `Saison ${stored.game.career.season} · Grand Prix ${stored.game.career.round+1}/22` : "Gespeichertes Rennwochenende")
        + " · " + teams.find(t => t.id === stored.game.teamId).name + " · " + data.tracks[stored.game.trackId].name
      : stored.message;
    el("teamName").textContent = team.name;
    el("teamCountry").textContent = team.country;
    el("teamCounter").textContent = (teams.indexOf(team) + 1) + " / " + teams.length;
    el("teamCar").src = el("menuCarImages").content.querySelector('[data-team-image="' + team.id + '"]').getAttribute("src");
    el("teamCar").alt = team.name + " – Teamfahrzeug";
    el("loadSelection").disabled = !selection.hasSaved;
    el("selectionSummary").textContent = selection.hasSaved
      ? team.name + " · " + track.name + " · Gespeicherte Auswahl"
      : "Wähle dein Team und deine nächste Strecke.";
  }
  function saveSelection() {
    const saved = A.POVSelection.save(selection);
    selection = { ...selection, hasSaved: saved };
    el("menuMessage").textContent = saved ? savedMessage
      : "Die Auswahl gilt für diesen Start. Sie konnte auf diesem Gerät nicht gespeichert werden.";
    render();
  }
  function showSetup() {
    el("menuHome").hidden = true; el("menuSetup").hidden = false;
    el("setupTitle").focus({ preventScroll: true });
  }
  el("newDrive").onclick = () => { setupMode = "single"; render(); showSetup(); };
  el("newChampionship").onclick = () => {
    setupMode = "championship"; selection = { ...selection, trackId: tracks[0].id };
    el("setupTitle").textContent = "Dein Team für die Meisterschaft"; render(); showSetup();
  };
  el("continuePOV").onclick = () => {
    if (stored.status !== "valid") return;
    const url = new URL("./race.html", location.href); url.search = "resume=1"; location.href = url.href;
  };
  const workshop = A.POVWorkshopUI.attach(root, { getGame: () => stored.game,
    setGame: value => { stored.game = value; }, save() {
      const ok = store.save(stored.game); if (ok) stored = store.load(); render(); return ok;
    } });
  el("menuWorkshop").onclick = () => workshop.open();
  el("exportMenuPOV").onclick = () => {
    const raw = store.raw(); if (raw === null) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "carpet-grand-prix-pov.json";
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  el("importMenuPOV").onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const raw = await file.text(); store.parse(raw);
      if (["valid", "invalid"].includes(stored.status) && !confirm("Den bisherigen POV-Spielstand durch diese geprüfte Sicherung ersetzen?")) return;
      store.importJSON(raw); stored = store.load(); render(); el("menuMessage").textContent = "POV-Spielstand importiert. Mit Fortsetzen weiterfahren.";
    } catch (error) { el("menuMessage").textContent = "Import abgebrochen: " + error.message; }
    finally { event.target.value = ""; }
  };
  el("loadSelection").onclick = () => { setupMode = "single"; selection = A.POVSelection.load(); render(); showSetup(); };
  el("menuBack").onclick = () => {
    el("menuSetup").hidden = true; el("menuHome").hidden = false; el("newDrive").focus();
  };
  el("menuTeam").onchange = event => { selection = { ...selection, teamId: event.target.value }; saveSelection(); };
  el("menuTrack").onchange = event => { selection = { ...selection, trackId: event.target.value }; saveSelection(); };
  function stepTeam(delta) {
    const i = teams.findIndex(t => t.id === selection.teamId);
    selection = { ...selection, teamId: teams[(i + delta + teams.length) % teams.length].id };
    saveSelection();
  }
  el("previousTeam").onclick = () => stepTeam(-1);
  el("nextTeam").onclick = () => stepTeam(1);
  const stage = root.querySelector(".menu-car-stage");
  stage.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); stepTeam(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  let swipe = null;
  stage.addEventListener("touchstart", event => {
    const point = event.touches.length === 1 && event.touches[0];
    swipe = point ? { x: point.clientX, y: point.clientY } : null;
  }, { passive: true });
  stage.addEventListener("touchend", event => {
    const end = event.changedTouches[0];
    if (swipe && end && !event.touches.length) {
      const dx = end.clientX - swipe.x, dy = end.clientY - swipe.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) stepTeam(dx < 0 ? 1 : -1);
    }
    swipe = null;
  }, { passive: true });
  stage.addEventListener("touchcancel", () => { swipe = null; });
  A.RaceSettings.attach(root, { onOpen() {}, onClose() {} });
  el("quality").value = prefs.quality; el("difficulty").value = prefs.difficulty;
  el("catchup").value = prefs.catchup ? "on" : "off";
  el("steeringSensitivity").value = prefs.steeringSensitivity;
  el("steeringSensitivityValue").value = `${prefs.steeringSensitivity} %`;
  el("steeringSensitivity").oninput = event => {
    const value = Number(event.target.value);
    if (!A.POVPreferences.isSteeringSensitivity(value)) return;
    prefs.steeringSensitivity = value;
    el("steeringSensitivityValue").value = `${value} %`;
    const saved = A.POVPreferences.update({ steeringSensitivity: value });
    el("menuPreferenceNote").textContent = saved ? "Für deine nächsten POV-Rennen gespeichert."
      : "Für diesen Start aktiv. Auf diesem Gerät konnte die Einstellung nicht gespeichert werden.";
  };
  for (const id of ["quality", "difficulty", "catchup"]) el(id).onchange = event => {
    prefs[id] = id === "catchup" ? event.target.value === "on" : event.target.value;
    const saved = A.POVPreferences.update({ [id]: prefs[id] });
    el("menuPreferenceNote").textContent = saved ? "Für deine nächsten POV-Rennen gespeichert."
      : "Für diesen Start aktiv. Auf diesem Gerät konnte die Einstellung nicht gespeichert werden.";
  };
  el("startDrive").onclick = () => {
    const previous = store.load();
    if (["valid", "invalid"].includes(previous.status) && !confirm("Ein neuer Start ersetzt deinen bisherigen POV-Spielstand. Vorher kannst du ihn in den Einstellungen als Datei sichern. Neu starten?")) return;
    saveSelection();
    const url = new URL("./race.html", location.href);
    url.search = new URLSearchParams({ team: selection.teamId, track: selection.trackId,
      difficulty: prefs.difficulty, quality: prefs.quality, catchup: prefs.catchup ? "1" : "0",
      steeringSensitivity: String(prefs.steeringSensitivity),
      new: setupMode, replace: ["valid", "invalid"].includes(previous.status) ? "1" : "0" }).toString();
    location.href = url.href;
  };
  render();
})();
