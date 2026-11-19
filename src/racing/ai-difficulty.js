(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    profiles = [
      { id: "beginner", label: "Anfänger", lineWidth: 10, edgeMargin: 5,
        iterations: 600, apexInset: 0, cornerConfidence: 0.9, passingConfidence: 0.8,
        brakeDistance: 20, brakeConfidence: 0.68, steeringPrecision: 0.1, steeringAnticipation: 0.1,
        settleDistance: 6, settleAngle: 0.2, look: 0.23, inconsistency: 2,
        attackDistance: 60, smartPassing: false, defenseDistance: 0, edgePreview: 0 },
      { id: "normal", label: "Normal", lineWidth: 12, edgeMargin: 4,
        iterations: 1200, apexInset: 0, cornerConfidence: 1.3, passingConfidence: 1,
        brakeDistance: 16, brakeConfidence: 0.8, steeringPrecision: 0.3, steeringAnticipation: 0.15,
        settleDistance: 6, settleAngle: 0.2, look: 0.25, inconsistency: 0.6,
        attackDistance: 75, smartPassing: false, defenseDistance: 0, edgePreview: 0 },
      { id: "hard", label: "Schwer", lineWidth: 12, edgeMargin: 4,
        iterations: 1200, apexInset: 0.5, cornerConfidence: 1.3, passingConfidence: 1.2,
        brakeDistance: 10, brakeConfidence: 0.8, steeringPrecision: 0.7, steeringAnticipation: 0.5,
        settleDistance: 10, settleAngle: 0.5, look: 0.25, inconsistency: 0.2,
        attackDistance: 85, smartPassing: true, defenseDistance: 30, edgePreview: 0.12 },
      { id: "expert", label: "Experte", lineWidth: 14, edgeMargin: 3.5,
        iterations: 1200, apexInset: 1.5, cornerConfidence: 1.3, passingConfidence: 1.35,
        brakeDistance: 10, brakeConfidence: 0.8, steeringPrecision: 1, steeringAnticipation: 0.85,
        settleDistance: 12, settleAngle: 0.65, look: 0.25, inconsistency: 0.05,
        attackDistance: 95, smartPassing: true, defenseDistance: 40, edgePreview: 0.18 },
    ].map(Object.freeze),
    byId = new Map(profiles.map((p) => [p.id, p]));
  function get(id = "normal") {
    if (!byId.has(id)) throw Error("Unbekannter Schwierigkeitsgrad.");
    return byId.get(id);
  }
  // Measured corner-entry confidence, never vehicle/speed modifiers.
  // Preserve the safe line reserves outside Bahrain.
  const trackReserves = Object.freeze({ bahrain: 1.6 }),
    trackLines = Object.freeze({
      france: Object.freeze({ lineWidth: 12, edgeMargin: 4, apexInset: 0.5 }),
      brazil: Object.freeze({ lineWidth: 12, edgeMargin: 4, apexInset: 0.5 }),
    }),
    experts = new Map([...new Set([...Object.keys(trackReserves), ...Object.keys(trackLines)])].map((id) =>
      [id, Object.freeze({ ...get("expert"),
        ...(Object.hasOwn(trackReserves, id) ? { cornerConfidence: trackReserves[id] } : {}),
        ...trackLines[id],
      })]));
  // The under-bed layout needs a shorter, smoother line rather than the
  // old wide expert apex. This remains a steering target within the road.
  const bahrainExpert = Object.freeze({ ...get("expert"), lineWidth: 12,
    edgeMargin: 4, apexInset: 0.5, brakeDistance: 8, cornerConfidence: 1.6,
    steeringAnticipation: 1.4, pathBias: 0.005 });
  const bahrainProfiles = Object.freeze({
    normal: Object.freeze({ ...get("normal"), steeringPrecision: 0.5,
      steeringAnticipation: 0.35, brakeDistance: 14, cornerConfidence: 1.35, pathBias: 0.001 }),
    hard: Object.freeze({ ...get("hard"), steeringPrecision: 0.85,
      steeringAnticipation: 0.7, brakeDistance: 10, cornerConfidence: 1.5, pathBias: 0.003 }),
    expert: bahrainExpert,
  });
  function forTrack(id = "normal", trackId) {
    const profile = get(id);
    if (trackId === "bahrain" && Object.hasOwn(bahrainProfiles, id)) return bahrainProfiles[id];
    return id === "expert" && experts.has(trackId) ? experts.get(trackId) : profile;
  }
  A.AIDifficulty = Object.freeze({ profiles: Object.freeze(profiles), get, forTrack, trackReserves, trackLines, defaultId: "normal" });
})();
