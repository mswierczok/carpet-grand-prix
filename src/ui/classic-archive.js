(() => {
  "use strict";
  const button = document.getElementById("exportClassicSave");
  const status = document.getElementById("archiveStatus");
  button.addEventListener("click", () => {
    try {
      // Preserve even damaged historical JSON verbatim; never write to storage.
      const raw = localStorage.getItem("carpet_gp_v072");
      if (raw === null) {
        status.textContent = "In diesem Browserbereich wurde kein klassischer Spielstand gefunden.";
        return;
      }
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "carpet-grand-prix-classic-save.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Der klassische Spielstand wurde exportiert. Die gespeicherten Daten bleiben erhalten.";
    } catch {
      status.textContent = "Der Browser erlaubt hier keinen Zugriff auf den alten Spielstand. Öffne das Archiv im bisherigen Browser und unter derselben Adresse.";
    }
  });
})();
