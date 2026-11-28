(() => {
  "use strict";
  const A = globalThis.CGPArcade, cache = new Map();
  const historical = Object.freeze({ version: 1, context: "historical" });
  const campaign = Object.freeze({ version: 1, context: "campaign" });
  function validate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== 2 || value.version !== 1 ||
      !["historical", "campaign"].includes(value.context))
      throw Error("Unbekanntes Fahrzeugleistungsmodell. Der Spielstand bleibt erhalten.");
    return value.context === "campaign" ? campaign : historical;
  }
  function get(teamId, model = historical) {
    if (model !== null) model = validate(model);
    const key = (model?.version || 0) + ":" + (model?.context || "legacy") + ":" + teamId;
    if (cache.has(key)) return cache.get(key);
    const team = model?.context === "campaign"
      ? A.CampaignConfig?.getTeam(teamId)
      : CGPArcadeData.roster.teams.find(t => t.id === teamId);
    if (!team || !Number.isFinite(team.baseStrength) || !["power", "handling", "aero"].includes(team.focus))
      throw Error("Kein gültiges Fahrzeugprofil für dieses Team.");
    const base = A.Physics.parameters, strength = team.baseStrength,
      quality = Math.max(0, Math.min(1, (strength - 64) / 23)),
      power = team.focus === "power", handling = team.focus === "handling", aero = team.focus === "aero";
    // Frozen model v1. A future rebalance requires a NEW version, so an
    // already saved weekend never silently changes its vehicle performance.
    const factors = model === null ? null : Object.freeze({
      acceleration: .82 + .18 * quality + (power ? .025 : 0),
      topSpeed: .91 + .09 * quality + (power ? .008 : aero ? .002 : -.004),
      braking: .90 + .10 * quality + (handling ? .025 : power ? -.005 : 0),
      handling: .90 + .10 * quality + (handling ? .045 : power ? -.005 : .005),
      grip: .88 + .12 * quality + (handling ? .018 : power ? -.005 : 0),
      highSpeedGrip: aero ? .04 : 0,
    });
    const parameters = !factors ? base : Object.freeze({ ...base,
      acceleration: base.acceleration * factors.acceleration,
      maxSpeed: base.maxSpeed * factors.topSpeed,
      braking: base.braking * factors.braking,
      steerResponse: base.steerResponse * factors.handling,
      steerReturnResponse: base.steerReturnResponse * factors.handling,
      maxLateralAcceleration: base.maxLateralAcceleration * factors.grip,
      highSpeedGrip: factors.highSpeedGrip,
      gripSpeedReference: base.maxSpeed * factors.topSpeed,
    });
    const profile = Object.freeze({ version: model?.version || 0,
      context: model?.context || "legacy", teamId, strength, focus: team.focus,
      developmentPotential: team.developmentPotential, factors, parameters });
    cache.set(key, profile); return profile;
  }
  A.VehiclePerformance = Object.freeze({ version: 1, historical, campaign, validate, get });
})();
