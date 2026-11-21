(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  A.RaceUI = Object.freeze({
    attach: (...args) => A.RacingHUD.attach(...args),
  });
})();
