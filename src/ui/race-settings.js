(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(
    root,
    { onOpen = () => {}, onClose = () => {}, onResume = () => {} } = {},
  ) {
    const dialog = root.querySelector("#raceSettings"),
      opener = root.querySelector("#openSettings"),
      fullscreen = root.classList.contains("racing-screen");
    function screen(name = "home") {
      for (const section of dialog.querySelectorAll("[data-menu-screen]"))
        section.hidden = section.dataset.menuScreen !== name;
      dialog.scrollTop = 0;
      if (fullscreen) {
        const heading = dialog.querySelector("#settingsTitle");
        heading.textContent =
          name === "home"
            ? "Rennpause"
            : name === "classification"
              ? "Vollständiges Klassement"
              : name === "save"
                ? "Spielstand"
                : "Rennmenü";
      }
    }
    function open() {
      if (dialog.open) return;
      onOpen();
      screen();
      dialog.showModal();
    }
    function close() {
      if (dialog.open) dialog.close();
    }
    opener.addEventListener("click", open);
    root.querySelector("#closeSettings").addEventListener("click", close);
    for (const button of dialog.querySelectorAll("[data-menu-target]"))
      button.onclick = () => screen(button.dataset.menuTarget);
    for (const button of dialog.querySelectorAll("[data-menu-back]"))
      button.onclick = () => screen();
    root.querySelector("#resumeRace")?.addEventListener("click", () => {
      close();
      onResume();
    });
    dialog.addEventListener("close", () => {
      onClose();
      opener.focus({ preventScroll: true });
    });
    return Object.freeze({ open, close, screen, isOpen: () => dialog.open });
  }
  A.RaceSettings = Object.freeze({ attach });
})();
