(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(
    root,
    format,
    entryLabel,
    {
      getSurface,
      isCampaign = false,
      getCampaign = () => null,
      getRun = () => null,
      onInspect = () => {},
      onResultsClose = () => {},
    } = {},
  ) {
    const el = (id) => root.querySelector("#" + id),
      write = (node, value) => {
        const text = String(value);
        if (node.textContent !== text) node.textContent = text;
      },
      set = (id, value) => write(el(id), value),
      presentation = A.RacePresentation.create({
        track: getSurface,
        getCampaign,
        getRun,
      }),
      relative = new Map(),
      field = new Map(),
      dialog = el("sessionResults");
    let latest = null,
      model = null,
      directReady = false,
      finishedShown = false,
      lastElapsed = 0,
      lastQualifying = false;
    const node = (tag, cls) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      return e;
    };
    function resultsTab(kind) {
      for (const [key, id] of [
        ["race", "raceResults"],
        ["qualifying", "qualifyingResults"],
      ]) {
        el(id).hidden = key !== kind;
        const button = el(
          key === "race" ? "raceResultTab" : "qualifyingResultTab",
        );
        button.setAttribute("aria-selected", String(key === kind));
      }
    }
    for (const button of root.querySelectorAll("[data-result-tab]"))
      button.onclick = () => resultsTab(button.dataset.resultTab);
    function closeResults() {
      dialog.close();
      onResultsClose();
    }
    el("closeResults").onclick = el("resultsToPause").onclick = closeResults;
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeResults();
    });
    function openResults() {
      if (!latest) return;
      onInspect();
      resultsTab(
        latest.qualifying ||
          (latest.race.phase === "grid" && latest.qualifyingResult)
          ? "qualifying"
          : "race",
      );
      if (!dialog.open) dialog.showModal();
    }
    el("showResults").onclick = openResults;
    el("acceptResultsQualifying").onclick = () => {
      if (isCampaign) return;
      dialog.close();
      el("acceptQualifying").click();
    };
    function update(s) {
      latest = s;
      model = presentation.update(s);
      const q = s.qualifying,
        r = s.race,
        player = model.own,
        campaign = isCampaign,
        grid = r.phase === "grid";
      if (r.elapsed < lastElapsed || !!q !== lastQualifying) {
        if (grid || q) finishedShown = false;
      }
      lastElapsed = r.elapsed;
      lastQualifying = !!q;
      const pendingQualifying =
        !q && grid && !s.qualifyingResult && !directReady;
      root.classList.toggle("is-qualifying", !!q);
      set(
        "hudSession",
        `${getSurface().name} · ${q || pendingQualifying ? "QUALIFYING" : "RENNEN"}`,
      );
      set("hudLap", pendingQualifying ? "Qualifying" : model.lap);
      set("position", `${player.position} / 13`);
      set("raceLap", `${Math.min(r.laps, s.timing.completed + 1)} / ${r.laps}`);
      set("raceLength", r.laps + " Runden");
      set("raceClock", format(r.elapsed));
      set("checkpoint", `${r.finished}/13 im Ziel`);
      set(
        "lastLap",
        s.timing.lastLap
          ? "Letzte Runde " + format(s.timing.lastLap.seconds)
          : "Noch keine vollständige Runde",
      );
      el("hudBest").hidden = !q;
      set(
        "hudBest",
        `Bestzeit ${q?.player.bestLap == null ? "—" : format(q.player.bestLap)}`,
      );
      for (const [i, e] of model.relative.entries()) {
        let row = relative.get(e.id);
        if (!row) {
          row = node("li");
          row.dataset.team = e.id;
          row.append(node("b"), node("span", "relative-name"), node("small"));
          relative.set(e.id, row);
        }
        row.classList.toggle("is-player", e.player);
        row.classList.toggle("is-eliminated", !!e.eliminated);
        write(
          row.children[0],
          q && e.bestLap === null ? "—" : "P" + e.position,
        );
        write(row.children[1], e.driverName);
        write(row.children[2], e.relativeGap);
        if (el("relativeOrder").children[i] !== row)
          el("relativeOrder").insertBefore(
            row,
            el("relativeOrder").children[i] || null,
          );
      }
      for (const row of [...el("relativeOrder").children])
        if (!model.relative.some((e) => e.id === row.dataset.team))
          row.remove();
      set(
        "classificationTitle",
        q ? "Qualifying-Klassement" : "Vollständiges Klassement",
      );
      set(
        "classificationNote",
        q
          ? "Beste schnelle Runde · Abstand zur Bestzeit"
          : "Zeitabstände aus echten Passagen. Ohne verlässliche Messung: —. Überrundungen als Rundendifferenz.",
      );
      set(
        "classificationGapTitle",
        q ? "Bestzeit / Abstand" : "Abstand / Zeit",
      );
      root.querySelector(".classification-head").lastElementChild.hidden = !!q;
      for (const e of model.rows) {
        let row = field.get(e.id);
        if (!row) {
          row = node("li");
          row.dataset.team = e.id;
          row.setAttribute("role", "row");
          const name = node("span");
          name.append(
            node("strong"),
            node("small"),
            node("small", "driver-meta"),
          );
          const gap = node("span");
          gap.append(node("strong"), node("small"));
          row.append(
            node("b"),
            name,
            gap,
            node("small"),
            node("small"),
            node("small"),
          );
          [...row.children].forEach((c) => c.setAttribute("role", "cell"));
          field.set(e.id, row);
        }
        row.classList.toggle("is-player", e.player);
        row.classList.toggle("is-eliminated", !!e.eliminated);
        write(row.children[0], "P" + e.position);
        write(
          row.children[1].children[0],
          e.driverName + (e.player ? " · DU" : ""),
        );
        write(row.children[1].children[1], e.teamName);
        write(
          row.children[1].children[2],
          `${e.completed} R · ${e.status}${q ? "" : " · Start P" + e.startPosition}`,
        );
        write(
          row.children[2].children[0],
          q ? (e.bestLap === null ? "—" : format(e.bestLap)) : e.gap,
        );
        write(
          row.children[2].children[1],
          q && e.bestLap !== null
            ? e.position === 1
              ? "Bestzeit"
              : e.gap
            : "",
        );
        write(row.children[3], e.completed);
        write(row.children[4], e.status);
        write(row.children[5], "P" + e.startPosition);
        row.children[5].hidden = !!q;
        if (el("raceOrder").children[e.position - 1] !== row)
          el("raceOrder").insertBefore(
            row,
            el("raceOrder").children[e.position - 1] || null,
          );
      }
      el("startQualifying").hidden =
        !!q || !grid || !!s.qualifyingResult || directReady;
      el("pause").hidden =
        !grid || !!q || (!s.qualifyingResult && !directReady);
      el("acceptQualifying").hidden = campaign || !q?.finished;
      el("acceptResultsQualifying").hidden = campaign || !q?.finished;
      el("repeatQualifying").hidden = campaign || !!q || !grid;
      el("cancelQualifying").hidden = campaign || !q;
      el("directRace").hidden =
        campaign || !!q || !grid || !!s.qualifyingResult;
      el("prepareRace").hidden = campaign;
      el("showResults").hidden = !(
        q?.finished ||
        s.qualifyingResult ||
        player.finishTime !== null
      );
      set("restart", "Rennen neu starten");
      set("pause", "RENNEN STARTEN");
      el("pause").disabled =
        r.phase === "finished" || (campaign && s.campaignPhase !== "race");
      el("recover").disabled = r.phase !== "racing";
      el("team").disabled = el("track").disabled = !grid || campaign;
      const locked = !grid || (campaign && !!s.qualifyingResult);
      el("difficulty").disabled = el("catchup").disabled = locked;
      el("difficulty").value = r.difficulty;
      el("catchup").value = r.catchup ? "on" : "off";
      for (const button of root.querySelectorAll("[data-drive]"))
        button.disabled = r.phase === "finishing" || r.phase === "finished";
      set(
        "resumeRace",
        grid
          ? "Zur Startansicht"
          : r.phase === "finished"
            ? "Zur Rennansicht"
            : "Fortsetzen",
      );
      set(
        "sessionPrompt",
        grid
          ? s.qualifyingResult
            ? `Startplatz P${player.startPosition} · ${getSurface().name}`
            : directReady
              ? "Direktstart ohne Qualifying"
              : `Dein Rennwochenende · ${getSurface().name}`
          : q?.finished
            ? "Qualifying beendet. Startaufstellung übernehmen."
            : "",
      );
      set(
        "status",
        r.phase === "finishing"
          ? `Im Ziel · P${r.position} · ${r.finished}/13 beendet`
          : r.phase === "finished"
            ? "Grand Prix beendet"
            : s.paused && !grid
              ? "PAUSE · Über ⚙ fortsetzen"
              : "",
      );
      el("status").hidden = !el("status").textContent;
      const lights = r.startLights;
      el("raceSignal").hidden = !(lights.red || lights.green);
      [...el("raceSignal").children].forEach((lamp, i) => {
        lamp.classList.toggle("is-red", i < lights.red);
        lamp.classList.toggle("is-green", lights.green);
      });
      el("viewDraft").hidden = !(
        s.entries.find((e) => e.player)?.slipstream?.strength > 0.03
      );
      const qualifying = q?.finished ? q.standings : s.qualifyingResult;
      if (qualifying)
        A.ResultDetails.fill(
          el("qualifyingRows"),
          qualifying
            .map((e) => ({
              ...e,
              ...model.rows.find((row) => row.id === e.id),
            }))
            .map((e) => ({
              ...e,
              bestLap: qualifying.find((q) => q.id === e.id).bestLap,
              position: qualifying.find((q) => q.id === e.id).position,
            })),
          "qualifying",
          r.playerTeam,
        );
      if (!qualifying)
        A.ResultDetails.fill(
          el("qualifyingRows"),
          [],
          "qualifying",
          r.playerTeam,
        );
      const finished = !q && player.finishTime !== null;
      if (!finished)
        A.ResultDetails.fill(el("resultRows"), [], "race", r.playerTeam);
      if (finished) {
        A.ResultDetails.fill(
          el("resultRows"),
          model.rows,
          "race",
          r.playerTeam,
          A.RogueliteRun?.cutoff(getRun()),
        );
        set("resultHeading", `P${player.position} · ${getSurface().name}`);
        set(
          "resultState",
          r.phase === "finished"
            ? "Alle 13 Fahrzeuge sind im Ziel."
            : `Dein Rennen ist beendet · ${r.finished}/13 im Ziel.`,
        );
      } else {
        set("resultHeading", "Session-Ergebnisse");
        set(
          "resultState",
          qualifying
            ? "Qualifying und Startaufstellung"
            : "Noch keine abgeschlossene Session.",
        );
      }
      if (q?.finished && !campaign && !finishedShown) {
        finishedShown = true;
        resultsTab("qualifying");
        if (!dialog.open) dialog.showModal();
      }
      if (!q && r.phase === "finished" && !finishedShown) {
        finishedShown = true;
        resultsTab("race");
        if (!dialog.open) dialog.showModal();
      }
      // Keep the existing optional diagnostic access in the pause menu.
      const telemetry = s.entries.find((e) => Object.hasOwn(e, "telemetry"));
      if (telemetry) {
        el("balancePanel").hidden = false;
        if (!el("balanceTeam").options.length) {
          for (const e of s.entries) {
            const option = node("option");
            option.value = e.id;
            option.textContent = e.name;
            el("balanceTeam").append(option);
          }
          el("balanceTeam").value = s.entries.find((e) => !e.player).id;
        }
        const selected = s.entries.find(
            (e) => e.id === el("balanceTeam").value,
          ),
          info = selected?.telemetry,
          kilometers = A.Physics.parameters.metersPerUnit * 3.6;
        if (el("balancePanel").open)
          set(
            "balanceReadout",
            JSON.stringify(
              {
                ...(info
                  ? {
                      reason: info.reason,
                      speedKmh: +(info.speed * kilometers).toFixed(1),
                      targetKmh: +(info.desiredSpeed * kilometers).toFixed(1),
                      freeTargetKmh: +(info.freeTarget * kilometers).toFixed(1),
                      lineError: +info.pathError.toFixed(2),
                      headingError: +info.headingError.toFixed(3),
                      lane: info.lane,
                      blockerGap:
                        info.blockerGap === null
                          ? null
                          : +info.blockerGap.toFixed(2),
                      throttle: info.throttle,
                      brake: info.brake,
                      steer: +info.steer.toFixed(3),
                    }
                  : { note: "Noch keine KI-Fahrdaten für dieses Fahrzeug." }),
                windschatten: selected?.slipstream || null,
                aufholhilfe: selected?.catchup || null,
              },
              null,
              2,
            ),
          );
      }
    }
    return Object.freeze({
      update,
      openResults,
      setDirectStart(value) {
        directReady = value;
      },
      reset() {
        if (dialog.open) dialog.close();
        directReady = false;
        finishedShown = false;
      },
      model: () => model,
    });
  }
  A.RacingHUD = Object.freeze({ attach });
})();
