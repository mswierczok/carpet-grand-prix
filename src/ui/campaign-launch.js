(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    C = A.CampaignConfig,
    V = A.CampaignView,
    S = A.CampaignStore,
    el = (id) => document.getElementById(id),
    n = V.node;
  let stored = S.load(),
    selectedTeam = C.initialTeam,
    selectedDriver = null;
  function message(text) {
    el("campaignMessage").textContent = text;
  }
  function goRace() {
    const url = new URL("./race.html", location.href);
    url.search = "mode=campaign";
    location.href = url.href;
  }
  function showStep(step) {
    for (const name of ["Team", "Driver", "Overview"])
      el(`campaign${name}Step`).hidden = name.toLowerCase() !== step;
    for (const node of document.querySelectorAll("[data-step]")) {
      if (node.dataset.step === step) node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    }
    const title = el(`campaign${step[0].toUpperCase() + step.slice(1)}Title`);
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: "start", behavior: "auto" });
  }
  function identity(root, teamId, driverId) {
    root.replaceChildren();
    const team = C.getTeam(teamId),
      driver = C.getDriver(driverId),
      info = n("div");
    info.append(
      n("p", team.name, "eyebrow"),
      n("h3", driver.name),
      n("p", `${driver.age} Jahre · ${driver.nationality}`),
      n("p", driver.profile?.archetype || driver.specialty, "campaign-tag"),
    );
    root.append(V.portrait(driver), V.car(teamId), info);
  }
  function renderSaved() {
    const valid = stored.status === "valid";
    el("campaignSaved").hidden = !valid;
    el("campaignSetup").hidden = stored.status !== "empty";
    el("campaignInterim").replaceChildren();
    el("exportCampaign").disabled = S.raw() === null;
    if (valid) {
      identity(
        el("campaignSavedIdentity"),
        stored.game.teamId,
        stored.game.driverId,
      );
      const interim = stored.game.stage === "interim";
      el("continueCampaign").hidden = interim;
      el("savedCampaignTitle").textContent = interim
        ? "Dein Ergebnis bleibt."
        : "Zurück ins Cockpit.";
      if (interim) el("campaignInterim").append(V.result(stored.game));
    }
    if (["invalid", "unavailable"].includes(stored.status))
      message(stored.message);
  }
  const ordered = [...C.teams].sort(
    (a, b) => Number(b.initiallyUnlocked) - Number(a.initiallyUnlocked),
  );
  for (const team of ordered) {
    const card = n("button", undefined, "campaign-team-card");
    card.type = "button";
    card.dataset.team = team.id;
    card.disabled = !team.initiallyUnlocked;
    card.setAttribute("aria-pressed", String(team.id === selectedTeam));
    card.classList.toggle("is-locked", !team.initiallyUnlocked);
    card.append(
      n(
        "span",
        team.initiallyUnlocked ? "FREIGESCHALTET" : "🔒 GESPERRT",
        "campaign-tag",
      ),
      V.car(team.id),
      n("h3", team.name),
      n(
        "p",
        team.initiallyUnlocked
          ? "Dein Startteam · Teamprofil 64"
          : "Freischaltung folgt später",
        "hint",
      ),
      n("small", "Teamfähigkeit · später verfügbar"),
    );
    card.onclick = () => {
      selectedTeam = team.id;
      for (const c of el("campaignTeams").children)
        c.setAttribute("aria-pressed", String(c === card));
    };
    el("campaignTeams").append(card);
  }
  for (const id of C.starters) {
    const driver = C.getDriver(id),
      card = n("button", undefined, "campaign-driver-card");
    card.type = "button";
    card.dataset.driver = id;
    card.setAttribute("aria-pressed", "false");
    const info = n("div", undefined, "campaign-driver-info");
    info.append(
      n("span", driver.profile.archetype, "campaign-tag"),
      n("h3", driver.name),
      n(
        "p",
        `${driver.age} Jahre · ${driver.countryCode} · ${driver.nationality}`,
      ),
      n("p", driver.profile.description),
    );
    const strengths = n("ul", undefined, "campaign-strengths"),
      weaknesses = n("ul", undefined, "campaign-weaknesses");
    for (const value of driver.profile.strengths)
      strengths.append(n("li", value));
    for (const value of driver.profile.weaknesses)
      weaknesses.append(n("li", value));
    info.append(
      strengths,
      weaknesses,
      n("span", "Fahrer wählen", "campaign-card-action"),
    );
    card.append(V.portrait(driver), info);
    card.onclick = () => {
      selectedDriver = id;
      for (const c of el("campaignDrivers").children)
        c.setAttribute("aria-pressed", String(c === card));
      el("campaignShowOverview").disabled = false;
    };
    el("campaignDrivers").append(card);
  }
  for (const [i, track] of C.tracks.entries()) {
    const row = n("li");
    row.dataset.track = track.id;
    row.append(
      n("span", String(i + 1).padStart(2, "0"), "campaign-track-number"),
      n("h3", CGPArcadeData.tracks[track.id].name),
      n("p", track.focus),
    );
    if (i === 0) row.append(n("strong", "DEIN ERSTER START", "campaign-tag"));
    el("campaignTracks").append(row);
  }
  el("campaignChooseDriver").onclick = () => showStep("driver");
  el("campaignBackTeam").onclick = () => showStep("team");
  el("campaignBackDriver").onclick = () => showStep("driver");
  el("campaignShowOverview").onclick = () => {
    identity(el("campaignSelection"), selectedTeam, selectedDriver);
    showStep("overview");
  };
  el("newCampaign").onclick = () => {
    el("campaignSetup").hidden = false;
    showStep("team");
  };
  el("continueCampaign").onclick = goRace;
  el("startCampaign").onclick = () => {
    if (!selectedDriver) return;
    const previous = S.raw(),
      current = S.load();
    if (["invalid", "unavailable"].includes(current.status)) {
      message(current.message);
      return;
    }
    if (
      previous !== null &&
      !confirm(
        "Deine bisherige Kampagne durch diesen neuen Start ersetzen? Einzelrennen und Meisterschaft bleiben erhalten. Eine Sicherung kannst du unten herunterladen.",
      )
    )
      return;
    const prefs = A.POVPreferences.load(),
      game = A.Campaign.create({
        teamId: selectedTeam,
        driverId: selectedDriver,
        difficulty: prefs.difficulty,
        catchup: prefs.catchup,
      });
    if (!S.replace(game, previous)) {
      message(
        "Der Kampagnenstart konnte nicht gespeichert werden. Dein bisheriger Stand bleibt erhalten.",
      );
      return;
    }
    goRace();
  };
  el("exportCampaign").onclick = () => {
    const raw = S.raw();
    if (raw === null) return;
    const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json" }),
      ),
      link = n("a");
    link.href = url;
    link.download = "carpet-grand-prix-kampagne.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  el("importCampaign").onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > S.maxBytes) throw Error("Die Sicherung ist zu groß.");
      const text = await file.text(),
        game = S.parse(text),
        previous = S.raw();
      if (
        previous !== null &&
        !confirm(
          "Deine gespeicherte Kampagne durch diese geprüfte Sicherung ersetzen? Andere Spielstände bleiben erhalten.",
        )
      )
        return;
      if (!S.replace(game, previous))
        throw Error(
          "Die Kampagnensicherung konnte nicht gespeichert werden. Der bisherige Stand bleibt erhalten.",
        );
      stored = S.load();
      renderSaved();
      message("Kampagnensicherung geladen.");
    } catch (error) {
      message("Import abgebrochen: " + error.message);
    } finally {
      event.target.value = "";
    }
  };
  renderSaved();
})();
