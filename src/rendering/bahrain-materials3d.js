(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  // Compatibility adapter; the shared factory accepts scene-specific finishes.
  A.BahrainMaterials3D = Object.freeze({
    create(materials) {
      return A.IllustratedMaterials3D.create(
        materials,
        A.EnvironmentScenes?.get("bahrain")?.materials,
      );
    },
  });
})();
