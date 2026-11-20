(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    roster = CGPArcadeData.roster;
  const freeze = (value) => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const tracks = [
    {
      id: "bahrain",
      focus: "Allround · Carpet Desert Grand Prix",
      affinity: [1, 1, 1],
    },
    { id: "canada", focus: "Tempo und Bremszonen", affinity: [3, 1, 1] },
    {
      id: "russia",
      focus: "Zwei Brücken · fließende Linien",
      affinity: [2, 1, 2],
    },
    {
      id: "korea",
      focus: "Eine Brücke · technische Kurven",
      affinity: [1, 3, 2],
    },
    { id: "france", focus: "Enge Passagen · Präzision", affinity: [1, 2, 4] },
    { id: "japan", focus: "Richtungswechsel · Technik", affinity: [1, 3, 1] },
    { id: "england", focus: "Hohe Kurvendichte", affinity: [1, 3, 2] },
    { id: "italy", focus: "Kurvenkombinationen", affinity: [1, 2, 4] },
  ];
  const starters = ["d012", "campaign-veteran-001", "d035"],
    opponents = roster.drivers
      .slice(0, 38)
      .filter((d) => !starters.includes(d.id)),
    pools = Object.fromEntries(
      roster.teams.map((team, i) => [
        team.id,
        team.id === "t13"
          ? [...starters]
          : opponents.slice(i * 3, i * 3 + 3).map((d) => d.id),
      ]),
    );
  const archetypes = {
    d012: {
      archetype: "Der Hotshot",
      entryStrength: 57,
      potential: 88,
      description:
        "S. Colbe hat das Talent, nach vorn zu kommen. Erfahrung muss sie sich erst Runde für Runde erarbeiten.",
      strengths: ["Hohes Entwicklungspotenzial", "Lernt schnell"],
      weaknesses: ["Wenig Erfahrung", "Noch unsicher unter Druck"],
    },
    "campaign-veteran-001": {
      archetype: "Der Routinier",
      entryStrength: 60,
      potential: 64,
      description:
        "Mika Hartmann kennt das Podium aus früheren Jahren. Heute setzt er auf saubere Linien und einen kühlen Kopf.",
      strengths: ["Konstanz und Kontrolle", "Viel Rennerfahrung"],
      weaknesses: ["Begrenztes Entwicklungspotenzial", "Wenig rohes Tempo"],
    },
    d035: {
      archetype: "Der Hitzkopf",
      entryStrength: 59,
      potential: 79,
      description:
        "D. Kluszic sucht jede Lücke. Ehrgeiz und Mut sind da – Geduld und Konstanz müssen noch wachsen.",
      strengths: ["Offensiv im Zweikampf", "Mutige Entscheidungen"],
      weaknesses: ["Risikofreudig", "Wenig konstant"],
    },
  };
  const specialties = ["Tempo", "Technik", "Präzision"],
    affinities = [
      [3, 1, 2],
      [1, 3, 2],
      [2, 1, 3],
    ];
  const drivers = [
    ...roster.drivers.slice(0, 38).map((d) => ({
      id: d.id,
      sourceId: d.id,
      name: d.name,
      age: d.age,
      nationality: d.nationality,
      countryCode: d.countryCode,
      portrait:
        Number(d.id.slice(1)) <= 35
          ? `./assets/drivers/portraits/webp/${d.id}.webp`
          : null,
    })),
    {
      id: "campaign-veteran-001",
      sourceId: null,
      name: "Mika Hartmann",
      age: 38,
      nationality: "Deutschland",
      countryCode: "DE",
      portrait: null,
    },
  ].map((d) => {
    const teamId = Object.keys(pools).find((id) => pools[id].includes(d.id)),
      slot = pools[teamId].indexOf(d.id);
    const starterSlot =
      d.id === "campaign-veteran-001" ? 2 : d.id === "d035" ? 1 : slot;
    return {
      ...d,
      teamId,
      specialty: specialties[starterSlot],
      affinity: [...affinities[starterSlot]],
      profile: archetypes[d.id] || null,
    };
  });
  const teams = roster.teams.map((t) => ({
    ...t,
    baseStrength: t.id === "t13" ? 64 : t.id === "t12" ? 72 : t.baseStrength,
    initiallyUnlocked: t.id === "t13",
    ability: null,
    vehicleCharacter: null,
    unlockCondition: null,
  }));
  const getDriver = (id) => drivers.find((d) => d.id === id),
    getTeam = (id) => teams.find((t) => t.id === id);
  function lineup(teamId, driverId, trackId, assignments = pools) {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || !getTeam(teamId) || !assignments[teamId]?.includes(driverId))
      throw Error("Ungültige Kampagnen-Startliste.");
    return Object.fromEntries(
      teams.map((t) => {
        const ids = assignments[t.id];
        const chosen =
          t.id === teamId
            ? driverId
            : ids.reduce((best, id) => {
                const score = (d) =>
                  getDriver(d).affinity.reduce(
                    (sum, value, i) => sum + value * track.affinity[i],
                    0,
                  );
                return score(id) > score(best) ? id : best;
              }, ids[0]);
        return [t.id, chosen];
      }),
    );
  }
  A.CampaignConfig = freeze({
    version: 1,
    firstTrack: "bahrain",
    initialTeam: "t13",
    initialUnlocked: ["t13"],
    tracks,
    teams,
    drivers,
    pools,
    starters,
    getDriver,
    getTeam,
    lineup,
  });
})();
