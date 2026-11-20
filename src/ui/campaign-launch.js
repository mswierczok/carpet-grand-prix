(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    C = A.CampaignConfig,
    V = A.CampaignView,
    S = A.CampaignStore,
    el = (id) => document.getElementById(id),
    n = V.node,
    details = A.ResultDetails.attach(el("campaignApp"));
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
  function tab(name) {
    for (const section of document.querySelectorAll("[data-campaign-view]"))
      section.hidden = section.dataset.campaignView !== name;
    for (const b of document.querySelectorAll("[data-campaign-tab]")) {
      if (b.dataset.campaignTab === name)
        b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
    window.scrollTo(0, 0);
  }
  for (const button of document.querySelectorAll("[data-campaign-tab]"))
    button.onclick = () => tab(button.dataset.campaignTab);
  function showStep(step) {
    for (const name of ["Team", "Driver", "Overview"])
      el(`campaign${name}Step`).hidden = name.toLowerCase() !== step;
    for (const item of document.querySelectorAll("[data-step]")) {
      if (item.dataset.step === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
    el(`campaign${step[0].toUpperCase() + step.slice(1)}Title`).focus({
      preventScroll: true,
    });
  }
  function identity(root, teamId, driverId) {
    root.replaceChildren();
    const t = C.getTeam(teamId),
      d = C.getDriver(driverId),
      info = n("div");
    info.append(
      n("p", t.name, "eyebrow"),
      n("h3", d.name),
      n("p", `${d.age} Jahre · ${d.nationality}`),
      n("p", d.profile?.archetype || d.specialty, "campaign-tag"),
    );
    root.append(V.portrait(d), V.car(teamId), info);
  }
  function renderSaved() {
    const valid = stored.status === "valid",
      g = stored.game,
      complete = valid && g.stage === "interim";
    el("campaignSaved").hidden = !valid;
    el("campaignSetup").hidden = stored.status !== "empty";
    el("campaignNext").hidden = true;
    el("campaignTestStand").hidden = true;
    el("campaignInterim").replaceChildren();
    el("campaignArchive").replaceChildren();
    el("campaignNextTrack").replaceChildren();
    el("campaignTracks").replaceChildren();
    el("exportCampaign").disabled = S.raw() === null;
    el("saveCampaign").disabled = !valid;
    if (valid) {
      identity(el("campaignSavedIdentity"), g.teamId, g.driverId);
      el("continueCampaign").hidden = complete;
      el("savedCampaignTitle").textContent = complete
        ? "Dein nächster Start wartet."
        : "Zurück ins Cockpit.";
      el("campaignCurrent").textContent =
        `${CGPArcadeData.tracks[g.trackId].name} · ${g.completed.length} / 8 Strecken absolviert`;
      const last = g.completed.at(-1);
      if (last) {
        const own = last.order.find((e) => e.teamId === g.teamId),
          q = last.qualifying?.find((e) => e.teamId === g.teamId),
          summary = n("div", undefined, "campaign-last-result");
        summary.append(
          n("span", "LETZTER GRAND PRIX", "campaign-tag"),
          n("h3", CGPArcadeData.tracks[last.trackId].name),
          n(
            "p",
            `Qualifying ${q ? "P" + q.position : "—"} · Rennen P${own.position} · ${V.format(own.finishTime)}`,
          ),
        );
        const b = n("button", "Ergebnis ansehen");
        b.type = "button";
        b.onclick = () => details.open(last, g.teamId);
        summary.append(b);
        el("campaignInterim").append(summary);
      }
      const available = C.tracks.filter(
        (t) => !g.completed.some((r) => r.trackId === t.id),
      );
      el("campaignNext").hidden = !complete || !available.length;
      el("campaignTestStand").hidden = !complete || !!available.length;
      for (const t of available) {
        const option = n("option", CGPArcadeData.tracks[t.id].name);
        option.value = t.id;
        el("campaignNextTrack").append(option);
      }
      for (const record of g.completed) {
        const own = record.order.find((r) => r.teamId === g.teamId),
          q = record.qualifying?.find((r) => r.teamId === g.teamId),
          card = n("article", undefined, "campaign-archive-card");
        card.dataset.track = record.trackId;
        card.append(
          n("h3", CGPArcadeData.tracks[record.trackId].name),
          n("p", `Platz ${own.position} · ${own.driverName} · ${own.teamName}`),
          n(
            "p",
            `Qualifying ${q ? "P" + q.position : "nicht gespeichert"} · Rennen P${own.position}`,
            "hint",
          ),
        );
        const button = n("button", "Ergebnis ansehen");
        button.type = "button";
        button.onclick = () => details.open(record, g.teamId);
        card.append(button);
        el("campaignArchive").append(card);
      }
    }
    el("campaignArchiveEmpty").hidden = !!g?.completed.length;
    for (const [i, t] of C.tracks.entries()) {
      const done = g?.completed.some((r) => r.trackId === t.id),
        current = valid && g.stage !== "interim" && g.trackId === t.id,
        row = n("li");
      row.dataset.track = t.id;
      row.dataset.status = done
        ? "completed"
        : current
          ? "current"
          : "available";
      row.append(
        n("span", String(i + 1).padStart(2, "0"), "campaign-track-number"),
        n("h3", CGPArcadeData.tracks[t.id].name),
        n("p", t.focus),
        n(
          "strong",
          done
            ? "✓ ABGESCHLOSSEN"
            : current
              ? "AKTUELLES WOCHENENDE"
              : i === 0 && !valid
                ? "DEIN ERSTER START"
                : "NOCH OFFEN",
          "campaign-tag",
        ),
      );
      if (complete && !done) {
        const b = n("button", "Als Nächstes wählen");
        b.type = "button";
        b.onclick = () => {
          el("campaignNextTrack").value = t.id;
          tab("overview");
        };
        row.append(b);
      }
      el("campaignTracks").append(row);
    }
    if (["invalid", "unavailable"].includes(stored.status))
      message(stored.message);
  }
  const ordered = [...C.teams].sort(
    (a, b) => Number(b.initiallyUnlocked) - Number(a.initiallyUnlocked),
  );
  for (const t of ordered) {
    const card = n("button", undefined, "campaign-team-card");
    card.type = "button";
    card.dataset.team = t.id;
    card.disabled = !t.initiallyUnlocked;
    card.setAttribute("aria-pressed", String(t.id === selectedTeam));
    card.classList.toggle("is-locked", !t.initiallyUnlocked);
    card.append(
      n(
        "span",
        t.initiallyUnlocked ? "FREIGESCHALTET" : "🔒 GESPERRT",
        "campaign-tag",
      ),
      V.car(t.id),
      n("h3", t.name),
      n(
        "p",
        t.initiallyUnlocked
          ? "Dein Startteam · Teamprofil 64"
          : "Freischaltung folgt später",
        "hint",
      ),
      n("small", "Teamfähigkeit · später verfügbar"),
    );
    card.onclick = () => {
      selectedTeam = t.id;
    };
    el("campaignTeams").append(card);
  }
  el("campaignStartTeam").append(
    V.car("t13"),
    n("h3", "Redwood GP"),
    n("p", "Dein freigeschaltetes Startteam · Teamprofil 64", "hint"),
  );
  for (const id of C.starters) {
    const d = C.getDriver(id),
      card = n("button", undefined, "campaign-driver-card"),
      info = n("div", undefined, "campaign-driver-info");
    card.type = "button";
    card.dataset.driver = id;
    card.setAttribute("aria-pressed", "false");
    info.append(
      n("span", d.profile.archetype, "campaign-tag"),
      n("h3", d.name),
      n("p", `${d.age} Jahre · ${d.countryCode} · ${d.nationality}`),
      n("p", d.profile.description),
    );
    const strengths = n("ul", undefined, "campaign-strengths"),
      weaknesses = n("ul", undefined, "campaign-weaknesses");
    d.profile.strengths.forEach((s) => strengths.append(n("li", s)));
    d.profile.weaknesses.forEach((s) => weaknesses.append(n("li", s)));
    info.append(
      strengths,
      weaknesses,
      n("span", "Fahrer wählen", "campaign-card-action"),
    );
    card.append(V.portrait(d), info);
    card.onclick = () => {
      selectedDriver = id;
      for (const c of el("campaignDrivers").children)
        c.setAttribute("aria-pressed", String(c === card));
      el("campaignShowOverview").disabled = false;
    };
    el("campaignDrivers").append(card);
  }
  el("campaignChooseDriver").onclick = () => showStep("driver");
  el("campaignBackTeam").onclick = () => showStep("team");
  el("campaignBackDriver").onclick = () => showStep("driver");
  el("campaignShowOverview").onclick = () => {
    identity(el("campaignSelection"), selectedTeam, selectedDriver);
    showStep("overview");
  };
  el("newCampaign").onclick = () => {
    el("campaignSaved").hidden = true;
    el("campaignNext").hidden = true;
    el("campaignTestStand").hidden = true;
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
        "Deine bisherige Kampagne durch diesen neuen Start ersetzen? Einzelrennen und Meisterschaft bleiben erhalten. Sichere deinen Stand vorher im Bereich Spielstand.",
      )
    )
      return;
    const prefs = A.POVPreferences.load(),
      g = A.Campaign.create({
        teamId: selectedTeam,
        driverId: selectedDriver,
        difficulty: prefs.difficulty,
        catchup: prefs.catchup,
      });
    if (!S.replace(g, previous)) {
      message(
        "Start nicht gespeichert. Dein bisheriger Stand bleibt erhalten.",
      );
      return;
    }
    goRace();
  };
  el("startNextCampaign").onclick = () => {
    const next = A.Campaign.next(stored.game, el("campaignNextTrack").value);
    if (!next) {
      message("Diese Strecke kann gerade nicht vorbereitet werden.");
      return;
    }
    if (!S.save(next)) {
      message(
        "Der neue Grand Prix wurde nicht gespeichert. Dein bisheriger Stand bleibt erhalten.",
      );
      return;
    }
    goRace();
  };
  el("saveCampaign").onclick = () =>
    message(
      S.save(stored.game)
        ? "Kampagne gespeichert."
        : "Speichern nicht möglich. Bisheriger Stand bleibt erhalten; bitte exportieren.",
    );
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
      const g = S.parse(await file.text()),
        previous = S.raw();
      if (
        previous !== null &&
        !confirm(
          "Deine Kampagne durch diese geprüfte Sicherung ersetzen? Andere Spielstände bleiben erhalten.",
        )
      )
        return;
      if (!S.replace(g, previous))
        throw Error(
          "Speichern fehlgeschlagen. Der bisherige Stand bleibt erhalten.",
        );
      stored = S.load();
      renderSaved();
      tab("overview");
      message("Kampagnensicherung geladen.");
    } catch (error) {
      message("Import abgebrochen: " + error.message);
    } finally {
      event.target.value = "";
    }
  };
  renderSaved();
})();
