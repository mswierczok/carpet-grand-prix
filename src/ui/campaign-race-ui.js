(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, { getGame, setGame, getSession, onPause }) {
    const el = (id) => root.querySelector("#" + id),
      store = A.CampaignStore,
      V = A.CampaignView;
    let lastSave = 0,
      lastSaveOK = false,
      departing = false;
    root.querySelector(".back-link").href = "./campaign.html";
    root.querySelector(".back-link").textContent = "← Kampagne";
    root.querySelector("[data-track-link]").hidden = true;
    el("savePOV").textContent = "Kampagne speichern";
    el("exportPOV").textContent = "Kampagne als Datei sichern";
    root.querySelector('label[for="importPOV"]').textContent =
      "Kampagnensicherung laden";
    const game = getGame();
    if (game) {
      const driver = A.CampaignConfig.getDriver(game.driverId),
        info = V.node("div");
      info.append(
        V.node(
          "p",
          "KAMPAGNE · " + CGPArcadeData.tracks[game.trackId].name.toUpperCase(),
          "eyebrow",
        ),
        V.node(
          "h2",
          driver.name + " · " + A.CampaignConfig.getTeam(game.teamId).name,
        ),
        V.node(
          "p",
          `${driver.age} Jahre · ${driver.profile?.archetype || driver.specialty}`,
        ),
      );
      el("campaignRaceIdentity").append(V.portrait(driver), info);
      el("campaignRacePanel").hidden = false;
    }
    function capture() {
      const game = getGame();
      if (!game) return null;
      const next = A.Campaign.capture(game, getSession().exportState());
      setGame(next);
      return next;
    }
    function save() {
      if (departing || !getGame()) return false;
      lastSave = performance.now();
      try {
        const next = capture(),
          stamp = Date.now(),
          ok = store.save(next, { now: stamp });
        lastSaveOK = ok;
        if (ok) setGame({ ...next, savedAt: stamp });
        el("povSaveStatus").textContent = ok
          ? "Kampagne gespeichert. Einzelrennen und Meisterschaft bleiben erhalten."
          : "Kampagne konnte nicht gespeichert werden. Bisheriger Stand bleibt erhalten; bitte den aktuellen Stand als Datei sichern.";
        return ok;
      } catch (error) {
        lastSaveOK = false;
        el("povSaveStatus").textContent =
          "Kampagne nicht gespeichert: " + error.message;
        return false;
      }
    }
    function update() {
      el("povCareerPanel").hidden = true;
      el("team").disabled = el("track").disabled = true;
      el("selectionNote").textContent =
        "Kampagne · Team und Strecke sind für dieses Rennwochenende festgelegt.";
      const interim = getGame()?.stage === "interim";
      el("restart").disabled = !!interim;
      el("startQualifying").disabled = !!interim;
      el("continueCampaignAfterRace").hidden = !interim;
      el("continueCampaignAfterRace").onclick = (event) => {
        if (
          !lastSaveOK &&
          !confirm(
            "Das Ergebnis konnte noch nicht gespeichert werden. Bitte sichere es als Datei. Trotzdem zur Übersicht wechseln?",
          )
        )
          event.preventDefault();
      };
    }
    function changed() {
      const ok = save();
      update();
      return ok;
    }
    el("savePOV").onclick = () => {
      onPause();
      changed();
    };
    el("exportPOV").onclick = () => {
      onPause();
      try {
        const data = getGame()
          ? JSON.stringify(capture(), null, 2)
          : store.raw();
        if (data === null) return;
        const url = URL.createObjectURL(
            new Blob([data], { type: "application/json" }),
          ),
          link = V.node("a");
        link.href = url;
        link.download = "carpet-grand-prix-kampagne.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        el("povSaveStatus").textContent =
          "Sicherung nicht möglich: " + error.message;
      }
    };
    el("importPOV").onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      onPause();
      const previous = store.raw();
      try {
        if (file.size > store.maxBytes)
          throw Error("Die Sicherung ist zu groß.");
        const imported = store.parse(await file.text());
        if (imported.weekend) A.RaceWeekend.restore(imported.weekend);
        if (
          previous !== null &&
          !confirm(
            "Die Kampagne durch diese geprüfte Sicherung ersetzen? Andere Spielstände bleiben erhalten.",
          )
        )
          return;
        if (!store.replace(imported, previous))
          throw Error(
            "Speichern fehlgeschlagen oder der gespeicherte Stand wurde inzwischen geändert.",
          );
        departing = true;
        location.href = new URL(
          "./race.html?mode=campaign",
          location.href,
        ).href;
      } catch (error) {
        el("povSaveStatus").textContent =
          "Import abgebrochen: " + error.message;
      } finally {
        event.target.value = "";
      }
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        onPause();
        save();
      }
    });
    return Object.freeze({
      capture,
      save,
      changed,
      update,
      autosave(now) {
        if (
          getGame() &&
          now - lastSave >= 5000 &&
          !getSession().snapshot().paused
        )
          save();
      },
    });
  }
  A.CampaignRaceUI = Object.freeze({ attach });
})();
