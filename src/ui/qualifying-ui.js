(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  A.QualifyingUI = Object.freeze({
    attach: (...args) => A.RaceUI.attach(...args),
  });
})();
