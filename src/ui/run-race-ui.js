(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, { getRun, setRun, getSession, onPause }) {
    const el = id => root.querySelector("#" + id), S = A.RunStore;
    let lastSave = 0, lastSaveOK = false, departing = false, archiveAtBoot = [];
    try { archiveAtBoot = S.inspect(S.raw()).archive; } catch { /* Boot errors remain visible; no storage is written. */ }
    root.querySelector(".back-link").href = "./run.html";
    root.querySelector(".back-link").textContent = "← Run-Map";
    root.querySelector("[data-track-link]").hidden = true;
    el("savePOV").textContent = "Run speichern";
    el("exportPOV").textContent = "Run und Archiv als Datei sichern";
    root.querySelector('label[for="importPOV"]').textContent = "Run-Sicherung laden";
    el("continueCampaignAfterRace").href = "./run.html";
    function capture() {
      const run = getRun();
      if (!run) return null;
      const next = A.RogueliteRun.capture(run, getSession().exportState());
      setRun(next); return next;
    }
    function save() {
      if (departing || !getRun()) return false;
      lastSave = performance.now();
      try {
        const next = capture(), now = Date.now();
        lastSaveOK = S.save(next, { now });
        if (lastSaveOK) setRun({ ...next, savedAt: now });
        el("povSaveStatus").textContent = lastSaveOK ? "Run und Ergebnisse gespeichert. Andere Spielstände bleiben erhalten." : "Run nicht gespeichert. Bitte als Datei sichern; ein anderer Tab oder ein Speicherfehler verhindert das Schreiben.";
        return lastSaveOK;
      } catch (error) { lastSaveOK = false; el("povSaveStatus").textContent = "Run nicht gespeichert: " + error.message; return false; }
    }
    function update() {
      const run = getRun(), done = run?.campaign.stage === "interim";
      el("povCareerPanel").hidden = true;
      el("team").disabled = el("track").disabled = true;
      el("selectionNote").textContent = "Run · Die gewählte Route und die Fahrerzuordnung sind verbindlich.";
      el("restart").disabled = !run || !getSession().canRestart?.();
      el("restart").title = el("restart").disabled ? "Ab Beginn des gewerteten Rennens ist ein Neustart im Run gesperrt." : "Startet auch das Pflichtqualifying neu.";
      el("startQualifying").disabled = !!done;
      el("continueCampaignAfterRace").hidden = !done;
      el("continueCampaignAfterRace").textContent = run?.status === "failed" ? "Run-Auswertung ansehen" : run?.status === "won" ? "Phase-1-Erfolg ansehen" : "Zur Run-Map";
      el("continueCampaignAfterRace").onclick = event => {
        if (!lastSaveOK && !confirm("Das Ergebnis ist noch nicht gesichert. Bitte exportieren. Trotzdem zur Run-Map wechseln?")) event.preventDefault();
      };
      if (done) {
        const own = run.campaign.result.order.find(r => r.teamId === run.campaign.teamId);
        el("resultState").textContent = run.status === "failed" ? `Run beendet · P${own.position}. Erforderlich: P${A.RogueliteRun.cutoff(run)} oder besser.` : run.status === "won" ? "Phase 1 erfolgreich abgeschlossen · spielbarer Prototyp beendet." : `Weitergekommen mit P${own.position} · wähle deinen nächsten Event-Knoten.`;
      }
    }
    const changed = () => { const ok = save(); update(); return ok; };
    el("savePOV").onclick = () => { onPause(); changed(); };
    el("exportPOV").onclick = () => {
      onPause(); save();
      // Export the actual in-memory checkpoint even when storage is denied or
      // changed by another tab. Never reload the CAS token as an export side effect.
      const active = getRun();
      if (!active) return;
      const file = { version: 1, kind: "roguelite-save", active, archive: archiveAtBoot };
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "carpet-grand-prix-run.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    el("importPOV").onchange = async event => {
      const file = event.target.files[0]; if (!file) return;
      onPause(); const previous = S.raw();
      try {
        if (file.size > S.maxBytes) throw Error("Die Sicherung ist zu groß.");
        const imported = S.inspect(await file.text());
        if (previous !== null && !confirm("Diese Run-Sicherung laden? Bereits gesicherte Ergebnisse bleiben geschützt.")) return;
        if (!S.replace(imported, previous)) throw Error("Laden abgebrochen: Fortschritt würde zurückgesetzt oder der Speicher wurde inzwischen geändert.");
        departing = true; location.href = new URL("./run.html", location.href).href;
      } catch (error) { el("povSaveStatus").textContent = error.message; }
      finally { event.target.value = ""; }
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => { if (document.hidden) { onPause(); save(); } });
    return Object.freeze({ capture, save, changed, update, autosave(now) { if (getRun() && now - lastSave >= 5000 && !getSession().snapshot().paused) save(); } });
  }
  A.RunRaceUI = Object.freeze({ attach });
})();
