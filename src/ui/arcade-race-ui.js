(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, format) {
    const kilometers = A.Physics.parameters.metersPerUnit * 3.6;
    const write = (node, value) => {
      const text = String(value);
      if (node.textContent !== text) node.textContent = text;
    };
    const el = (id) => root.querySelector("#" + id),
      set = (id, value) => {
        if (el(id).textContent !== value) el(id).textContent = value;
      },
      rows = new Map(),
      results = new Map();
    function row(entry, result = false) {
      const node = document.createElement(result ? "tr" : "li"),
        position = document.createElement(result ? "td" : "b"),
        name = document.createElement(result ? "td" : "span"),
        detail = document.createElement(result ? "td" : "small");
      node.dataset.team = entry.id;
      node.classList.toggle("is-player", entry.player);
      name.textContent = entry.name + (entry.player ? " · DU" : "");
      node.append(position, name, detail);
      return { node, position, name, detail };
    }
    function update(snapshot) {
      const r = snapshot.race,
        t = snapshot.timing,
        player = r.standings.find((e) => e.player),
        active = r.phase !== "grid" && r.phase !== "finished";
      set("position", r.position + " / 13");
      set("raceLength", r.laps + " Runden");
      set("raceLap", Math.min(r.laps, t.completed + 1) + " / " + r.laps);
      set("raceClock", format(r.elapsed));
      el("viewDraft").hidden = !(snapshot.entries.find((e) => e.player)?.slipstream?.strength > 0.03);
      const panel = el("balancePanel");
      if (snapshot.entries.some((e) => Object.hasOwn(e, "telemetry"))) {
        panel.hidden = false;
        const chooser = el("balanceTeam");
        if (!chooser.options.length) {
          for (const entry of snapshot.entries) {
            const option = document.createElement("option");
            option.value = entry.id;
            option.textContent = entry.name;
            chooser.append(option);
          }
          chooser.value = snapshot.entries.find((e) => !e.player).id;
        }
        if (panel.open) {
          const entry = snapshot.entries.find((e) => e.id === chooser.value), info = entry?.telemetry;
          set("balanceReadout", JSON.stringify({
            ...(info ? {
            reason: info.reason, speedKmh: +(info.speed * kilometers).toFixed(1),
            targetKmh: +(info.desiredSpeed * kilometers).toFixed(1),
            freeTargetKmh: +(info.freeTarget * kilometers).toFixed(1),
            lineError: +info.pathError.toFixed(2), headingError: +info.headingError.toFixed(3),
            lane: info.lane, blockerGap: info.blockerGap === null ? null : +info.blockerGap.toFixed(2),
            throttle: info.throttle, brake: info.brake, steer: +info.steer.toFixed(3),
            } : { note: "Noch keine KI-Fahrdaten für dieses Fahrzeug." }),
            windschatten: entry?.slipstream || null,
            aufholhilfe: entry?.catchup || null,
          }, null, 2));
        }
      }
      set(
        "viewTime",
        "P" +
          r.position +
          " · Runde " +
          Math.min(r.laps, t.completed + 1) +
          "/" +
          r.laps,
      );
      const button = el("pause");
      button.disabled = r.phase === "finished";
      set(
        "pause",
        r.phase === "grid"
          ? "Rennen starten"
          : snapshot.paused
            ? "Fortsetzen"
            : "Pause",
      );
      el("team").disabled = r.phase !== "grid";
      el("difficulty").disabled = r.phase !== "grid";
      el("catchup").disabled = r.phase !== "grid";
      el("catchup").value = r.catchup ? "on" : "off";
      el("difficulty").value = r.difficulty;
      if (el("track")) el("track").disabled = r.phase !== "grid";
      el("recover").disabled = r.phase !== "racing";
      for (const button of root.querySelectorAll("[data-drive]"))
        button.disabled = r.phase === "finishing" || r.phase === "finished";
      const message =
        r.phase === "grid"
          ? "13 Teams bereit · Startplatz " + r.position + " · " + r.laps + " Runden"
          : r.phase === "countdown"
            ? snapshot.paused
              ? "Start pausiert"
              : "Startampel · bei Grün losfahren"
            : r.phase === "finished"
              ? "Rennen beendet · Dein Ergebnis: Platz " + r.position
              : r.phase === "finishing"
                ? "Du bist im Ziel! Platz " +
                  r.position +
                  " · Feld fährt zu Ende (" +
                  r.finished +
                  "/13)"
                : snapshot.paused
                  ? "Rennen pausiert"
                  : snapshot.car.hitWall
                    ? "Seilkontakt · Bei Bedarf mit R zurücksetzen"
                    : snapshot.car.hitCar
                      ? "Fahrzeugkontakt · Fair weiterfahren"
                      : snapshot.car.offroad
                        ? (root.dataset.track === "bahrain" ? "Dunkler Teppich · weniger Grip" : "Randbereich · weniger Grip")
                        : "Rennen läuft";
      set("status", message);
      set("checkpoint", r.finished + "/13 im Ziel");
      set(
        "lastLap",
        t.lastLap
          ? "Letzte Runde " + format(t.lastLap.seconds)
          : "Noch keine vollständige Runde",
      );
      const signal = el("raceSignal"), lights = r.startLights;
      signal.hidden = !(lights.red || lights.green);
      for (const [i, lamp] of [...signal.children].entries()) {
        lamp.classList.toggle("is-red", i < lights.red);
        lamp.classList.toggle("is-green", lights.green);
      }
      for (const entry of r.standings) {
        if (!rows.has(entry.id)) rows.set(entry.id, row(entry));
        const item = rows.get(entry.id);
        item.node.classList.toggle("is-player", entry.player);
        const label = entry.name + (entry.player ? " · DU" : "");
        if (item.name.textContent !== label) item.name.textContent = label;
        write(item.position, entry.position);
        write(
          item.detail,
          entry.finishTime === null
            ? "R" + Math.min(r.laps, entry.completed + 1) + "/" + r.laps
            : "Ziel",
        );
        const list = el("raceOrder");
        if (list.children[entry.position - 1] !== item.node)
          list.insertBefore(
            item.node,
            list.children[entry.position - 1] || null,
          );
      }
      el("raceResults").hidden = player.finishTime === null;
      el("showResults").hidden = player.finishTime === null;
      if (player.finishTime !== null) {
        set(
          "resultHeading",
          "Platz " + r.position + " · " + format(player.finishTime),
        );
        set(
          "resultState",
          active
            ? "Dein Rennen ist beendet. Die übrigen Fahrzeuge fahren noch zu Ende."
            : "Alle 13 Fahrzeuge sind im Ziel. Das Ergebnis steht fest.",
        );
        for (const entry of r.standings) {
          if (!results.has(entry.id)) results.set(entry.id, row(entry, true));
          const item = results.get(entry.id);
          item.node.classList.toggle("is-player", entry.player);
          const label = entry.name + (entry.player ? " · DU" : "");
          if (item.name.textContent !== label) item.name.textContent = label;
          write(item.position, entry.position);
          write(
            item.detail,
            entry.finishTime === null
              ? "Noch im Rennen"
              : entry.position === 1
                ? format(entry.finishTime)
                : "+" +
                  (entry.finishTime - r.standings[0].finishTime).toFixed(3) +
                  " s",
          );
          const list = el("resultRows");
          if (list.children[entry.position - 1] !== item.node)
            list.insertBefore(
              item.node,
              list.children[entry.position - 1] || null,
            );
        }
      }
    }
    return Object.freeze({ update });
  }
  A.RaceUI = Object.freeze({ attach });
})();
