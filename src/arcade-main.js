(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    root = document.getElementById("arcadeApp");
  const racing = root.dataset.mode === "race",
    teams = CGPArcadeData.roster.teams,
    catalog = A.TrackCatalog,
    query = new URLSearchParams(location.search),
    campaignMode = racing && query.get("mode") === "campaign",
    requestedCampaign = campaignMode ? A.CampaignStore.load() : null,
    bootCampaign = requestedCampaign?.status === "valid" ? requestedCampaign.game : null,
    requestedTrack = query.get("track"),
    preferences = racing ? A.POVPreferences.load() : null,
    selection = racing ? A.POVSelection.load() : null,
    requestedSave = racing && !campaignMode && query.get("resume") === "1" ? A.POVGameStore.load() : null,
    bootGame = requestedSave?.status === "valid" ? requestedSave.game : null;
  const el = (id) => document.getElementById(id),
    format = (seconds) => {
      const ms = Math.max(0, Math.round(seconds * 1000));
      return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    };
  let canvas = document.getElementById("arcadeCanvas"),
    gameUI = null,
    raceMenu = null,
    loadError = campaignMode && !bootCampaign ? (requestedCampaign.message + " Bitte über die Kampagnenübersicht starten oder eine Sicherung laden.") : requestedSave && !bootGame ? requestedSave.message : "",
    campaign = bootCampaign,
    resumePending = !!(bootCampaign || bootGame)?.weekend,
    steeringSensitivity = racing ? (A.POVPreferences.isSteeringSensitivity(Number(query.get("steeringSensitivity")))
      ? Number(query.get("steeringSensitivity")) : preferences.steeringSensitivity) : 100,
    difficultyId = bootCampaign?.options.difficulty || bootGame?.options.difficulty || (racing ? (A.AIDifficulty.profiles.some(p => p.id === query.get("difficulty"))
      ? query.get("difficulty") : preferences.difficulty) : null),
    catchupEnabled = bootCampaign ? bootCampaign.options.catchup : bootGame ? bootGame.options.catchup : (query.has("catchup") ? query.get("catchup") !== "0" : (preferences?.catchup ?? true)),
    teamId = bootCampaign?.teamId || (campaignMode ? A.CampaignConfig.initialTeam : null) || bootGame?.teamId || (racing ? (teams.some(t => t.id === query.get("team")) ? query.get("team") : selection.teamId) : teams[0].id),
    trackId = bootCampaign?.trackId || (campaignMode ? A.CampaignConfig.firstTrack : null) || bootGame?.trackId || (query.get("new") === "championship" ? catalog.defaultId
      : catalog.tracks.some((t) => t.id === requestedTrack) ? requestedTrack : (selection?.trackId || catalog.defaultId)),
    game = bootGame || (racing && !campaignMode && ["single", "championship"].includes(query.get("new"))
      ? A.POVCareer.create({ mode: query.get("new"), teamId, trackId, difficulty: difficultyId,
        catchup: catchupEnabled, slipstream: query.get("slipstream") !== "0" }) : null),
    session = createSession(),
    overview = false,
    dirty = true,
    renderer,
    observer,
    active3D = false,
    sinceDraw = 0,
    renderBudget = 0,
    lastFrame = performance.now(),
    lastUI = 0,
    lastRacePhase = null;
  const set = (id, text) => {
    const node = el(id);
    if (node.textContent !== text) node.textContent = text;
  };
  const raceUI = racing ? A.QualifyingUI.attach(root, format, entry => campaign ? A.CampaignView.label(campaign, entry) : entry.name, { getSurface: () => session.surface, isCampaign: campaignMode, getCampaign: () => campaign, onInspect: pauseForGame, onResultsClose: () => raceMenu?.open() }) : null;
  function createSession() {
    if (campaignMode && campaign) { resumePending = false; try { return A.CampaignWeekend.create(campaign, { diagnostics: query.has("balance") }); } catch (error) { loadError = error.message; campaign = null; } }
    if (resumePending) {
      resumePending = false;
      try { return A.RaceWeekend.restore((campaign || game).weekend); }
      catch (error) { loadError = error.message; game = null; campaign = null; }
    }
    return (racing ? A.RaceWeekend : A.Session).create(
      catalog.get(trackId),
      racing ? { playerTeam: teamId, difficulty: difficultyId,
        slipstream: campaign ? campaign.options.slipstream : game ? game.options.slipstream : query.get("slipstream") !== "0",
        catchup: catchupEnabled,
        diagnostics: new URLSearchParams(location.search).has("balance") } : {},
    );
  }
  function freshCanvas() {
    const old = canvas;
    canvas = old.cloneNode(false);
    old.replaceWith(canvas);
    if (observer) {
      observer.unobserve(old);
      observer.observe(canvas);
    }
  }
  function renderNote(message) {
    if (el("renderNote")) set("renderNote", message);
  }
  function fallbackTo2D(
    message = "Draufsicht aktiv. Du kannst mit derselben Sitzung weiterfahren.",
  ) {
    renderer?.dispose?.();
    freshCanvas();
    renderer = A.Renderer.create(canvas, session.surface);
    active3D = false;
    root.dataset.rendering = "2d";
    if (el("fallback")) el("fallback").hidden = true;
    if (el("quality")) el("quality").disabled = true;
    renderNote(message);
    dirty = true;
  }
  function createRenderer(threeD = root.dataset.renderer === "3d") {
    if (threeD) {
      try {
        renderer = A.Renderer3D.create(canvas, session.surface, {
          invalidate: () => {
            dirty = true;
          },
          onContextLost: () => {
            session.pause(true);
            controls.clear();
            renderNote(
              "3D-Grafik unterbrochen. Warte auf Wiederherstellung oder fahre in der Draufsicht weiter.",
            );
            dirty = true;
            updateUI();
          },
          onContextRestored: () => {
            renderNote("3D-Grafik wieder bereit. Mit Fahren fortsetzen.");
            dirty = true;
          },
          onQuality: (value) => {
            if (el("quality")) el("quality").value = value;
            renderNote(
              "Sparsame Grafik aktiv, um die Darstellung zu entlasten.",
            );
          },
        });
        active3D = true;
        root.dataset.rendering = "3d";
        if (el("fallback")) el("fallback").hidden = false;
        if (el("quality")) {
          el("quality").disabled = false;
          renderer.setQuality(el("quality").value);
        }
        renderNote("3D-Verfolgungskamera · " + catalog.get(trackId).name);
      } catch (error) {
        fallbackTo2D(
          racing
            ? "3D ist hier nicht verfügbar. Das Rennen startet in der Draufsicht."
            : "3D ist hier nicht verfügbar. Der Fahrtest startet in der Draufsicht.",
        );
      }
    } else {
      renderer = A.Renderer.create(canvas, session.surface);
      root.dataset.rendering = "2d";
      active3D = false;
      renderNote("Draufsicht · " + catalog.get(trackId).name);
    }
  }
  if (racing) el("quality").value = ["auto", "low"].includes(query.get("quality"))
    ? query.get("quality") : preferences.quality;
  createRenderer();
  const controls = A.Controls.attach(root, {
    pause: () => togglePause(),
    recover: () => recover(),
    onBlur: () => {
      session.pause(true);
      dirty = true;
      updateUI();
      gameUI?.changed();
    },
    steeringSensitivity: () => steeringSensitivity,
  });
  if (racing) {
    el("steeringSensitivity").value = steeringSensitivity;
    el("steeringSensitivityValue").value = `${steeringSensitivity} %`;
    el("steeringSensitivity").oninput = event => {
      const value = Number(event.target.value);
      if (!A.POVPreferences.isSteeringSensitivity(value)) return;
      steeringSensitivity = value;
      el("steeringSensitivityValue").value = `${value} %`;
      controls.clear();
      savePreference({ steeringSensitivity: value });
    };
  }
  if (racing) raceMenu = A.RaceSettings.attach(root, {
    onOpen() {
      session.pause(true);
      controls.clear();
      dirty = true;
      updateUI();
      gameUI?.changed();
    },
    // Opening already clears and blocks input. A late native close event
    // must not discard a new press made after the dialog has disappeared.
    onClose() {},
    onResume() { if (session.snapshot().race.phase !== "grid" && session.snapshot().race.phase !== "finished") startOrResume(); },
  });
  function pauseForGame() {
    session.pause(true); controls.clear(); dirty = true; updateUI();
  }
  function loadGame(next) {
    const threeD = active3D;
    pauseForGame(); renderer.dispose?.(); game = next; loadError = "";
    trackId = next.trackId; teamId = next.teamId; difficultyId = next.options.difficulty;
    catchupEnabled = next.options.catchup;
    session = next.weekend ? A.RaceWeekend.restore(next.weekend) : createSession();
    raceUI?.reset();
    freshCanvas(); createRenderer(threeD); renderer.resetCamera?.(); lastRacePhase = null;
    el("team").value = teamId; updateTrack(); lastFrame = performance.now(); dirty = true; updateUI();
  }
  if (campaignMode) gameUI = A.CampaignRaceUI.attach(root, {
    getGame: () => campaign, setGame: value => { campaign = value; }, getSession: () => session, onPause: pauseForGame,
  });
  else if (racing) gameUI = A.POVGameUI.attach(root, {
    getGame: () => game, setGame: value => { game = value; }, getSession: () => session,
    onLoad: loadGame, onPause: pauseForGame, replace: query.get("replace") === "1",
  });
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.name;
    el("team").append(option);
  });
  el("team").value = teamId;
  function updateLaunchQuery(name, value) {
    if (!query.has(name)) return;
    const url = new URL(location.href);
    url.searchParams.set(name, String(value));
    try { history.replaceState(null, "", url.href); } catch { /* Standalone policy. */ }
  }
  function saveSelection() {
    if (racing) el("selectionNote").textContent = A.POVSelection.save({ teamId, trackId })
      ? "Team und Strecke für den nächsten Start gespeichert."
      : "Für diese Fahrt aktiv. Team und Strecke konnten auf diesem Gerät nicht gespeichert werden.";
  }
  function savePreference(patch) {
    for (const [name, value] of Object.entries(patch)) updateLaunchQuery(name, name === "catchup" ? Number(value) : value);
    el("preferencesNote").textContent = A.POVPreferences.update(patch)
      ? "Für deine nächsten POV-Rennen gespeichert."
      : "Für diese Fahrt aktiv. Die Einstellung konnte auf diesem Gerät nicht gespeichert werden.";
  }
  for (const track of catalog.tracks) {
    const option = document.createElement("option");
    option.value = track.id;
    option.textContent = track.name;
    el("track").append(option);
  }
  function updateTrack() {
    const track = catalog.get(trackId);
    root.dataset.track = trackId;
    el("track").value = trackId;
    for (const node of root.querySelectorAll("[data-track-name]"))
      node.textContent = track.name;
    document.title = `Carpet Grand Prix · ${track.name} · ${racing ? "Rennen" : "Fahrtest"}`;
    canvas.setAttribute(
      "aria-label",
      `${track.name}. W oder Pfeil hoch gibt Gas, S oder Pfeil runter bremst und fährt im Stand rückwärts. A und D lenken. P pausiert, R setzt das Auto zurück.`,
    );
    for (const link of root.querySelectorAll("[data-track-link]")) {
      link.dataset.trackHref ||= link.getAttribute("href");
      const url = new URL(link.dataset.trackHref, location.href);
      url.searchParams.set("track", trackId);
      link.href = url.href;
    }
  }
  function updateUI() {
    const s = session.snapshot(),
      t = s.timing;
    set(
      "speed",
      String(Math.round(s.car.speed * session.parameters.metersPerUnit * 3.6)),
    );
    set("lapTime", format(s.lapSeconds));
    const gear =
      s.car.longitudinalSpeed < -0.01
        ? "R"
        : s.car.longitudinalSpeed > 0.01
          ? "D"
          : "N";
    if (el("gear")) set("gear", gear);
    if (el("viewSpeed"))
      set(
        "viewSpeed",
        `${gear === "R" ? "R · " : ""}${Math.round(s.car.speed * session.parameters.metersPerUnit * 3.6)} km/h`,
      );
    if (el("viewTime")) set("viewTime", format(s.lapSeconds));
    set("bestLap", t.bestLap === null ? "—" : format(t.bestLap));
    set("laps", String(t.completed));
    if (raceUI) {
      raceUI.update(s);
      gameUI?.update(s);
      root.classList.toggle("pov-load-error", !!loadError);
      el("povLoadProblem").textContent = loadError;
      el("povLoadProblem").hidden = !loadError;
      for (const id of ["savePOV", "exportPOV"]) el(id).disabled = !!loadError;
      if (loadError) for (const id of ["pause", "startQualifying", "restart", "recover", "team", "track"]) el(id).disabled = true;
      return;
    }
    set("pause", s.paused ? "▶ Fahren" : "Pause");
    const status = s.paused
      ? "Bereit zum Fahren"
      : s.car.hitWall
        ? "Randkontakt · bei Bedarf R zum Zurücksetzen"
        : s.car.offroad
          ? (trackId === "bahrain" ? "Dunkler Teppich · weniger Grip" : "Randbereich · weniger Grip")
          : t.started
            ? "Deine Runde läuft"
            : "Fahre über Start/Ziel";
    set("status", status);
    set("checkpoint", t.started ? "Runde läuft" : "Zur Startlinie fahren");
    set(
      "lastLap",
      t.lastLap
        ? `Letzte Runde ${format(t.lastLap.seconds)}`
        : "Noch keine vollständige Runde",
    );
  }
  function startOrResume() {
    if (loadError) return;
    session.pause(false); controls.clear();
    lastFrame = performance.now(); dirty = true; updateUI(); gameUI?.changed();
  }
  function togglePause() {
    if (loadError) return;
    if (racing) { raceMenu?.open(); return; }
    session.pause(!session.snapshot().paused); controls.clear();
    if (!session.snapshot().paused && matchMedia("(pointer: coarse)").matches) canvas.scrollIntoView({ block: "center" });
    lastFrame = performance.now(); dirty = true; updateUI();
  }
  function recover() {
    if (loadError) return;
    session.recover();
    renderer.resetCamera?.();
    controls.clear();
    dirty = true;
    updateUI();
    gameUI?.changed();
  }
  el("pause").onclick = racing ? startOrResume : togglePause;
  el("recover").onclick = recover;
  el("restart").onclick = () => {
    if (loadError || campaign?.stage === "interim" || (game?.mode === "championship" && A.POVCareer.recorded(game))) return;
    if (racing && !confirm("Das aktuelle Rennwochenende neu starten? In der Kampagne beginnt es wieder mit dem Qualifying. Gesicherte Ergebnisse bleiben erhalten.")) return;
    session.restart();
    raceUI?.reset();
    raceMenu?.close();
    renderer.resetCamera?.();
    controls.clear();
    dirty = true;
    updateUI();
    gameUI?.changed();
  };
  el("overview").onclick = () => {
    overview = !overview;
    el("overview").setAttribute("aria-pressed", String(overview));
    set("overview", overview ? "Fahrzeug verfolgen" : "Gesamtstrecke");
    dirty = true;
  };
  el("team").onchange = (event) => {
    if (campaignMode) { el("team").value = teamId; return; }
    if (racing && (game?.mode === "championship" || !session.selectTeam(event.target.value))) return;
    teamId = event.target.value;
    updateLaunchQuery("team", teamId);
    saveSelection();
    gameUI?.changed();
    if (racing) {
      renderer.resetCamera?.();
      controls.clear();
      updateUI();
    }
    dirty = true;
  };
  if (racing) {
    const changeStage = (action) => {
      if (loadError || campaign?.stage === "interim" || !action()) return;
      raceMenu?.close();
      controls.clear();
      renderer.resetCamera?.();
      lastRacePhase = null;
      lastFrame = performance.now();
      dirty = true;
      updateUI();
      gameUI?.changed();
      canvas.focus({ preventScroll: true });
    };
    el("startQualifying").onclick = () => changeStage(() => { raceUI.setDirectStart(false); return session.startQualifying(); });
    el("directRace").onclick = () => {
      if (campaignMode || loadError || session.snapshot().qualifying || session.snapshot().qualifyingResult || session.snapshot().race.phase !== "grid") return;
      raceUI.setDirectStart(true); raceMenu.close(); updateUI();
    };
    el("repeatQualifying").onclick = () => {
      if (campaignMode) return;
      changeStage(() => { raceUI.setDirectStart(false); return session.startQualifying(); });
    };
    el("acceptQualifying").onclick = () => changeStage(() => session.acceptQualifying());
    el("cancelQualifying").onclick = () => changeStage(() => session.cancelQualifying());
    el("catchup").value = catchupEnabled ? "on" : "off";
    el("catchup").onchange = (event) => {
      if (session.selectCatchup(event.target.value === "on")) {
        catchupEnabled = event.target.value === "on";
        savePreference({ catchup: catchupEnabled });
        gameUI?.changed();
        controls.clear();
        renderer.resetCamera?.();
        dirty = true;
        updateUI();
      }
    };
    el("difficulty").value = difficultyId;
    el("difficulty").onchange = (event) => {
      if (!session.selectDifficulty(event.target.value)) {
        el("difficulty").value = difficultyId;
        return;
      }
      difficultyId = event.target.value;
      updateLaunchQuery("difficulty", difficultyId);
      gameUI?.changed();
      el("difficultyNote").textContent = A.POVPreferences.save(difficultyId)
        ? "Für deine nächsten POV-Rennen gespeichert."
        : "Für dieses Rennen aktiv. Auf diesem Gerät konnte die Auswahl nicht gespeichert werden.";
      renderer.resetCamera?.();
      controls.clear();
      dirty = true;
      updateUI();
    };
  }
  el("track").onchange = (event) => {
    const next = event.target.value;
    if (
      campaignMode || game?.mode === "championship" || (racing && session.snapshot().race.phase !== "grid") ||
      !catalog.tracks.some((t) => t.id === next)
    ) {
      el("track").value = trackId;
      return;
    }
    if (next === trackId) return;
    const threeD = active3D;
    session.pause(true);
    controls.clear();
    renderer.dispose?.();
    trackId = next;
    saveSelection();
    session = createSession();
    raceUI?.reset();
    freshCanvas();
    createRenderer(threeD);
    lastRacePhase = null;
    sinceDraw = renderBudget = 0;
    lastFrame = performance.now();
    updateTrack();
    gameUI?.changed();
    const url = new URL(location.href);
    url.searchParams.set("track", trackId);
    try {
      history.replaceState(null, "", url.href);
    } catch {
      /* Standalone file policies may disallow history. */
    }
    dirty = true;
    updateUI();
  };
  if (el("fallback"))
    el("fallback").onclick = () => {
      session.pause(true);
      controls.clear();
      fallbackTo2D();
      updateUI();
    };
  if (el("quality"))
    el("quality").onchange = (event) => {
      if (active3D) renderer.setQuality(event.target.value);
      if (racing) savePreference({ quality: event.target.value });
      dirty = true;
    };
  const resize = () => {
    dirty = true;
  };
  window.addEventListener("resize", resize);
  observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function frame(now) {
    const delta = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!document.hidden) session.advance(controls.read(), delta);
    if (campaignMode && session.takeTransition?.()) {
      controls.clear(); renderer.resetCamera?.(); dirty = true;
      gameUI?.changed(); updateUI();
    }
    gameUI?.autosave(now);
    const snapshot = session.snapshot();
    if (racing && snapshot.race.phase !== lastRacePhase) {
      lastRacePhase = snapshot.race.phase;
      if (lastRacePhase === "finishing" || lastRacePhase === "finished")
        controls.clear();
      dirty = true;
      updateUI();
      if (lastRacePhase === "finishing" || lastRacePhase === "finished") gameUI?.changed();
    }
    sinceDraw += delta;
    renderBudget += delta;
    const interval = renderer.frameInterval?.() || 0;
    if ((!snapshot.paused && renderBudget + 1e-8 >= interval) || dirty) {
      renderer.draw(snapshot, teamId, overview, sinceDraw);
      sinceDraw = 0;
      renderBudget = interval ? renderBudget % interval : 0;
      dirty = false;
    }
    if (now - lastUI > 80) {
      updateUI();
      lastUI = now;
    }
    requestAnimationFrame(frame);
  }
  updateTrack();
  updateUI();
  if (campaign && !loadError) gameUI.changed();
  if (game && !loadError) {
    const saved = gameUI.changed();
    const url = new URL(location.href);
    if (saved) {
      for (const key of ["new", "replace", "team", "track", "difficulty", "catchup", "quality", "steeringSensitivity"]) url.searchParams.delete(key);
      url.searchParams.set("resume", "1");
      try { history.replaceState(null, "", url.href); } catch { /* Standalone policy. */ }
    }
  }
  requestAnimationFrame(frame);
  Object.freeze(A);
})();
