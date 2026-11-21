(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  function attach(root, { onResume }) {
    const overlay = root.querySelector("#resumeCountdown"),
      number = root.querySelector("#resumeCountdownNumber");
    let deadline = null;
    function show(value) {
      const text = String(value);
      if (number.textContent !== text) number.textContent = text;
    }
    function cancel() {
      deadline = null;
      overlay.hidden = true;
      root.classList.remove("is-resuming");
    }
    function start(now) {
      if (deadline !== null) return;
      deadline = now + 3000;
      show(3);
      overlay.hidden = false;
      root.classList.add("is-resuming");
    }
    function tick(now) {
      if (deadline === null) return;
      if (now < deadline) show(Math.min(3, Math.ceil((deadline - now) / 1000)));
      else {
        cancel();
        onResume();
        return true;
      }
    }
    return Object.freeze({ start, cancel, tick });
  }
  A.ResumeCountdown = Object.freeze({ attach });
})();
