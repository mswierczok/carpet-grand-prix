(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, format) {
    const raceUI = A.RaceUI.attach(root, format), el = (id) => root.querySelector("#" + id),
      results = new Map(), write = (node, value) => {
        const text = String(value);
        if (node.textContent !== text) node.textContent = text;
      }, set = (id, value) => write(el(id), value);
    function update(snapshot) {
      const q = snapshot.qualifying, r = snapshot.race, result = q?.finished ? q.standings : snapshot.qualifyingResult;
      // A presentation-only ordering lets the shared tower reuse stable DOM
      // rows while qualifying ranks by best lap rather than race progress.
      const view = q ? { ...snapshot, race: { ...r, position: q.player.position,
        standings: q.standings.map((e) => ({ ...r.standings.find((s) => s.id === e.id),
          position: e.position, finishTime: null })) } } : snapshot;
      raceUI.update(view);
      el("startQualifying").hidden = !!q || r.phase !== "grid";
      set("startQualifying", snapshot.qualifyingResult ? "Qualifying wiederholen" : "Qualifying starten");
      el("acceptQualifying").hidden = !q?.finished;
      el("cancelQualifying").hidden = !q;
      set("restart", q ? "Qualifying neu starten" : snapshot.qualifyingResult ? "Rennen neu starten" : "Neues Rennen");
      el("qualifyingResults").hidden = !result;
      set("weekendNote", q
        ? "Du fährst allein: eine Auslaufrunde, dann zwei schnelle Runden. Die Gegner fahren ihre Zeiten im Hintergrund."
        : snapshot.qualifyingResult
          ? "Qualifying übernommen · Startplatz " + result.find((e) => e.player).position + "."
          : "Fahre zuerst das Qualifying oder starte direkt von Platz 13 ins Rennen.");
      set("weekendFooter", q
        ? "Freie Strecke für dich. Die Gegner fahren unabhängige Runden im Hintergrund; ihre Bestzeiten erscheinen in der Tabelle. Nach zwei schnellen Runden übernimmt die KI, bis alle fertig sind."
        : "Du startest auf Platz " + (snapshot.qualifyingResult?.find((e) => e.player).position || 13) +
          ". Nach deinem Ziel übernimmt die KI die Auslaufrunde, bis alle im Ziel sind. Dein klassischer Spielstand wird nicht verwendet oder verändert.");
      if (q) {
        const completed = snapshot.timing.completed, running = r.phase === "racing",
          lap = completed === 0 ? "Auslaufrunde" : completed > q.timedLaps ? "Beendet" : completed + " / " + q.timedLaps;
        set("raceLength", "Qualifying · 1 Auslaufrunde + " + q.timedLaps + " schnelle Runden");
        set("position", q.player.bestLap === null ? "— / 13" : q.player.position + " / 13");
        set("raceLap", lap);
        set("viewTime", "Qualifying · " + lap);
        set("bestLap", q.player.bestLap === null ? "—" : format(q.player.bestLap));
        set("pause", r.phase === "grid" ? "Qualifying starten" : snapshot.paused ? "Fortsetzen" : "Pause");
        set("checkpoint", q.finished ? "Qualifying beendet · Startaufstellung bereit" : r.finished + "/13 fertig");
        set("lastLap", q.player.laps.length
          ? "Letzte schnelle Runde " + format(q.player.laps.at(-1)) : "Die Auslaufrunde zählt nicht zur Bestzeit.");
        set("status", q.finished ? "Qualifying beendet · Dein Startplatz: " + q.player.position
          : r.phase === "grid" ? "Bereit zum Qualifying"
            : snapshot.paused ? "Qualifying pausiert"
              : r.phase === "countdown" ? "Startampel · bei Grün beginnt das Qualifying"
                : r.phase === "finishing" ? "Deine schnellen Runden sind beendet · Gegner schließen ihre Fahrten ab"
                  : running && completed === 0 ? "Auslaufrunde · Reifen und Strecke kennenlernen"
                    : "Schnelle Runde " + Math.min(q.timedLaps, completed) + " / " + q.timedLaps);
        for (const e of q.standings) {
          const row = [...el("raceOrder").children].find((node) => node.dataset.team === e.id);
          write(row.querySelector("small"), e.bestLap === null ? "—" : format(e.bestLap));
        }
        el("showResults").hidden = true;
      }
      root.classList.toggle("is-qualifying", !!q);
      if (result) {
        for (const e of result) {
          if (!results.has(e.id)) {
            const node = document.createElement("tr");
            node.dataset.team = e.id;
            for (let i = 0; i < 3; i++) node.append(document.createElement("td"));
            results.set(e.id, node);
          }
          const row = results.get(e.id);
          row.classList.toggle("is-player", e.player);
          write(row.children[0], e.position);
          write(row.children[1], e.name + (e.player ? " · DU" : ""));
          write(row.children[2], e.bestLap === null ? "Keine Zeit" : format(e.bestLap));
          if (el("qualifyingRows").children[e.position - 1] !== row)
            el("qualifyingRows").insertBefore(row, el("qualifyingRows").children[e.position - 1] || null);
        }
      }
    }
    return Object.freeze({ update });
  }
  A.QualifyingUI = Object.freeze({ attach });
})();
