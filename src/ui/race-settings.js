(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, { onOpen, onClose }) {
    const dialog = root.querySelector("#raceSettings"),
      opener = root.querySelector("#openSettings");
    opener.addEventListener("click", () => {
      if (dialog.open) return;
      onOpen();
      dialog.showModal();
    });
    root.querySelector("#closeSettings").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      onClose();
      opener.focus({ preventScroll: true });
    });
  }
  A.RaceSettings = Object.freeze({ attach });
})();
