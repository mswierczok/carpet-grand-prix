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
    let currentScreen = "home";
    function screen(name = "home") {
      currentScreen = name;
      for (const section of dialog.querySelectorAll("[data-menu-screen]"))
        section.hidden = section.dataset.menuScreen !== name;
      dialog.scrollTop = 0;
      if (fullscreen) {
        const heading = dialog.querySelector("#settingsTitle");
        heading.textContent =
          {
            home: "Rennpause",
            classification: "Vollständiges Klassement",
            settings: "Einstellungen",
            preparation: "Rennvorbereitung",
            save: "Spielstand",
          }[name] || "Rennmenü";
        if (dialog.open)
          root.querySelector("#closeSettings").focus({ preventScroll: true });
      }
    }
    function open() {
      if (dialog.open) return;
      onOpen();
      screen();
      dialog.showModal();
    }
    function close() {
      if (fullscreen && currentScreen === "classification") {
        screen();
        return;
      }
      if (dialog.open) dialog.close();
    }
    dialog.addEventListener("cancel", (event) => {
      if (fullscreen && currentScreen === "classification") {
        event.preventDefault();
        screen();
      }
    });
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
