(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, { getGame, setGame, save, onOpen = () => {} }) {
    const dialog = document.createElement("dialog"); dialog.id = "povWorkshop";
    dialog.setAttribute("aria-labelledby", "workshopTitle");
    dialog.innerHTML = `<div class="settings-heading"><h2 id="workshopTitle">Werkstatt</h2><button type="button" data-workshop-close autofocus>Schließen</button></div>
      <div id="povWorkshopCar" class="pov-workshop-car"></div><p id="workshopBudget"></p>
      <p class="hint">Entwicklungen werden für dein Team gespeichert. Die Wirkung auf das POV-Fahrverhalten wird separat abgestimmt und ist noch nicht aktiv.</p>
      <p class="hint">Credits gibt es für Rennergebnisse, F&E zur Saisonhalbzeit und zum Saisonende.</p><div id="workshopParts"></div><p id="workshopMessage" role="status"></p>`;
    root.append(dialog);
    const el = id => dialog.querySelector("#" + id);
    function render() {
      const game = getGame(); if (game?.mode !== "championship") return;
      const team = game.career.teams.find(t => t.id === game.teamId);
      el("povWorkshopCar").innerHTML = CGPRaceSprites.svg(game.teamId);
      el("workshopBudget").textContent = `${team.credits} Credits · ${team.research} F&E · ${team.upgrades}/4 Entwicklungen`;
      el("workshopParts").replaceChildren();
      for (const part of A.POVWorkshop.parts) {
        const offer = A.POVWorkshop.offer(game, part.id), row = document.createElement("article"),
          title = document.createElement("h3"), details = document.createElement("p"), button = document.createElement("button");
        row.className = "pov-workshop-part";
        title.textContent = part.name; details.textContent = `${offer.before.toFixed(1)} → ${offer.after.toFixed(1)} · Konzeptgrenze ${offer.cap}`;
        button.type = "button"; button.dataset.upgrade = part.id;
        button.textContent = `Entwickeln · ${offer.credits} Credits + ${offer.research} F&E`; button.disabled = !!offer.reason;
        button.onclick = () => {
          const next = A.POVWorkshop.buy(getGame(), part.id); if (!next) return;
          setGame(next); const stored = save(); render();
          el("workshopMessage").textContent = stored ? "Entwicklung gespeichert." : "Entwicklung für diese Sitzung übernommen. Bitte als Datei sichern; der Browser konnte nicht speichern.";
        };
        row.append(title, details, button);
        if (offer.reason) { const note = document.createElement("p"); note.className = "hint"; note.textContent = offer.reason; row.append(note); }
        el("workshopParts").append(row);
      }
      const study = A.POVWorkshop.studyOffer(game), row = document.createElement("article"),
        title = document.createElement("h3"), detail = document.createElement("p"), button = document.createElement("button");
      row.className = "pov-workshop-part"; title.textContent = "Grundlagenforschung";
      detail.textContent = study.part ? `${study.name}: ${study.before.toFixed(2)} → ${study.after.toFixed(2)} · einmal pro Saison` : "Alle Konzeptgrenzen erreicht.";
      button.type = "button"; button.dataset.study = "true"; button.disabled = !!study.reason;
      button.textContent = "Forschen · 115 F&E";
      button.onclick = () => {
        const next = A.POVWorkshop.buyStudy(getGame()); if (!next) return;
        setGame(next); const stored = save(); render();
        el("workshopMessage").textContent = stored ? "Grundlagenforschung gespeichert." : "Forschung für diese Sitzung übernommen. Bitte als Datei sichern.";
      };
      row.append(title,detail,button);
      if (study.reason) { const note = document.createElement("p"); note.className = "hint"; note.textContent = study.reason; row.append(note); }
      el("workshopParts").append(row);
    }
    dialog.querySelector("[data-workshop-close]").onclick = () => dialog.close();
    function open() { if (getGame()?.mode !== "championship") return; onOpen(); render(); dialog.showModal(); }
    return Object.freeze({ open, render });
  }
  A.POVWorkshopUI = Object.freeze({ attach });
})();
