(() => {
  "use strict";
  const A = globalThis.CGPArcade, data = globalThis.CGPArcadeData,
    root = document.getElementById("povMenu"), el = id => document.getElementById(id),
    teams = data.roster.teams, tracks = Object.values(data.tracks).sort((a, b) => a.index - b.index),
    prefs = { ...A.POVPreferences.load() };
  let selection = A.POVSelection.load();
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
  el("newDrive").onclick = showSetup;
  el("loadSelection").onclick = () => { selection = A.POVSelection.load(); render(); showSetup(); };
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
  for (const id of ["quality", "difficulty", "catchup"]) el(id).onchange = event => {
    prefs[id] = id === "catchup" ? event.target.value === "on" : event.target.value;
    const saved = A.POVPreferences.update({ [id]: prefs[id] });
    el("menuPreferenceNote").textContent = saved ? "Für deine nächsten POV-Rennen gespeichert."
      : "Für diesen Start aktiv. Auf diesem Gerät konnte die Einstellung nicht gespeichert werden.";
  };
  el("startDrive").onclick = () => {
    saveSelection();
    const url = new URL("./race.html", location.href);
    url.search = new URLSearchParams({ team: selection.teamId, track: selection.trackId,
      difficulty: prefs.difficulty, quality: prefs.quality, catchup: prefs.catchup ? "1" : "0" }).toString();
    location.href = url.href;
  };
  render();
})();
