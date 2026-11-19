(() => {
  "use strict";
  const A = globalThis.CGPArcade, parts = Object.freeze([
    Object.freeze({ id: "aero", name: "Aerodynamik" }), Object.freeze({ id: "power", name: "Antrieb" }),
    Object.freeze({ id: "handling", name: "Fahrwerk" }), Object.freeze({ id: "reliability", name: "Zuverlässigkeit" })]);
  const cost = n => ({ credits: 60 + n * 27, research: 40 + n * 16 });
  const gain = value => value < 70 ? 4.1 : value < 82 ? 3.5 : value < 90 ? 2.8 : value < 94 ? 1.4 : .8;
  function offer(game, key) {
    if (game.mode !== "championship" || !parts.some(p => p.id === key)) return null;
    const t = game.career.teams.find(t => t.id === game.teamId), base = CGPArcadeData.roster.teams.find(t => t.id === game.teamId),
      price = cost(t.upgrades), late = game.career.round >= 11, phaseUsed = late ? t.late : t.early,
      stage = game.weekend && (game.weekend.qualifying || game.weekend.result !== null || game.weekend.session.state.phase !== "grid"),
      reason = stage || A.POVCareer.recorded(game) ? "Nur vor dem Rennwochenende entwickeln."
        : t.upgrades >= 4 || phaseUsed >= 2 ? "Maximal zwei Entwicklungen pro Saisonhälfte."
          : t.parts[key] >= Math.min(95.15, base.developmentPotential - .05) ? "Konzeptgrenze erreicht."
            : t.credits < price.credits || t.research < price.research ? "Nicht genügend Credits oder F&E." : null;
    return { ...price, before: t.parts[key], after: Math.min(base.developmentPotential, t.parts[key]+gain(t.parts[key])), cap: base.developmentPotential, reason };
  }
  function buy(game, key) {
    const o = offer(game,key); if (!o || o.reason) return null;
    const next = A.POVCheckpoint.copy(game), t = next.career.teams.find(t => t.id === next.teamId);
    t.credits -= o.credits; t.research -= o.research; t.parts[key] = o.after; t.upgrades++;
    if (next.career.round >= 11) t.late++; else t.early++;
    return A.POVCareer.validate(next);
  }
  function studyOffer(game) {
    if (game.mode !== "championship") return null;
    const t = game.career.teams.find(t => t.id === game.teamId), base = CGPArcadeData.roster.teams.find(t => t.id === game.teamId),
      available = parts.filter(p => t.parts[p.id] < base.developmentPotential - .1).sort((a,b) => t.parts[a.id] - t.parts[b.id]),
      stage = game.weekend && (game.weekend.qualifying || game.weekend.result !== null || game.weekend.session.state.phase !== "grid"),
      reason = stage || A.POVCareer.recorded(game) ? "Nur vor dem Rennwochenende forschen."
        : t.studies >= 1 ? "Ein Grundlagenprojekt pro Saison." : !available.length ? "Alle Konzeptgrenzen erreicht."
          : t.research < 115 ? "Nicht genügend F&E." : null;
    const part = available[0];
    return { credits:0, research:115, part:part?.id || null, name:part?.name || "—", reason,
      before:part ? t.parts[part.id] : null, after:part ? Math.min(base.developmentPotential,t.parts[part.id]+.85) : null };
  }
  function buyStudy(game) {
    const offer = studyOffer(game); if (!offer || offer.reason) return null;
    const next = A.POVCheckpoint.copy(game), t = next.career.teams.find(t => t.id === next.teamId);
    t.research -= offer.research; t.parts[offer.part] = offer.after; t.studies++;
    return A.POVCareer.validate(next);
  }
  A.POVWorkshop = Object.freeze({ parts, cost, gain, offer, buy, studyOffer, buyStudy, drivingEffectsActive: false });
})();
