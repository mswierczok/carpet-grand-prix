(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  const freeze = value => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const race = (id, level, cutoff, x, y, flag, final = false) => ({ id, kind: "race", trackId: id, level, cutoff, x, y, flag, final });
  const event = (letter, x, y) => ({ id: "event-" + letter, kind: "event", letter: letter.toUpperCase(), x, y });
  const nodes = [
    race("bahrain", 1, 10, 50, 91, "🇧🇭"),
    event("a", 30, 78), event("b", 70, 78),
    race("canada", 2, 8, 30, 65, "🇨🇦"), race("korea", 2, 8, 70, 65, "🇰🇷"),
    event("c", 15, 52), event("d", 50, 52), event("e", 85, 52),
    race("france", 3, 5, 15, 39, "🇫🇷"), race("england", 3, 5, 50, 39, "🇬🇧"), race("russia", 3, 5, 85, 39, "🇷🇺"),
    event("f", 30, 26), event("g", 70, 26),
    race("italy", 4, 1, 30, 12, "🇮🇹", true), race("japan", 4, 1, 70, 12, "🇯🇵", true),
  ];
  const edges = [
    ["bahrain", "event-a"], ["bahrain", "event-b"],
    ["event-a", "canada"], ["event-b", "korea"],
    ["canada", "event-c"], ["canada", "event-d"], ["korea", "event-d"], ["korea", "event-e"],
    ["event-c", "france"], ["event-d", "england"], ["event-e", "russia"],
    ["france", "event-f"], ["england", "event-f"], ["england", "event-g"], ["russia", "event-g"],
    ["event-f", "italy"], ["event-g", "japan"],
  ];
  const eventTypes = [
    { id: "workshop", name: "Werkstatt", symbol: "⚙", future: "Fahrzeugteile, Items und Technik" },
    { id: "training", name: "Training", symbol: "◎", future: "Fahrerentwicklung" },
    { id: "recruitment", name: "Rekrutierung", symbol: "♟", future: "Mechaniker, Ingenieure und Strategen" },
    { id: "deal", name: "Der Deal", symbol: "◇", future: "Vorteile mit möglichen Nachteilen" },
    { id: "service", name: "Service", symbol: "✚", future: "Reparaturen und Unterstützung" },
  ];
  const abilities = ["Ruhige Hand", "Improvisation", "Teamgeist", "Technikblick", "Mut zum Start", "Gute Vorbereitung"]
    .map((name, i) => ({ id: "start-placeholder-" + (i + 1), name, implemented: false,
      description: "Entwicklungsplatzhalter · während des gesamten Runs vorgemerkt. Noch kein passiver Effekt und kein Leistungsbonus." }));
  const phase = { id: "phase-1", name: "Kinderzimmer Grand Prix", first: "bahrain", nodes, edges, nextPhase: null };
  const get = id => nodes.find(n => n.id === id);
  const outgoing = id => edges.filter(e => e[0] === id).map(e => e[1]);
  function generate(seed) {
    let value = seed >>> 0;
    const random = () => { value += 0x6D2B79F5; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pool = abilities.map(a => a.id), startOffers = [];
    for (let i = 0; i < 3; i++) startOffers.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    const events = Object.fromEntries(nodes.filter(n => n.kind === "event").map(n => {
      const typeId = eventTypes[Math.floor(random() * eventTypes.length)].id;
      return [n.id, { typeId, offers: [
        { id: typeId + "-note", label: "Testangebot vormerken", description: "Testentscheidung speichern. Keine Fahrzeug-, Fahrer- oder Crew-Werte werden verändert." },
        { id: typeId + "-pass", label: "Ohne Änderung weiter", description: "Test-Event abschließen. Keine Gameplay-Effekte." },
      ] }];
    }));
    return { startOffers, events };
  }
  A.RunMap = freeze({ version: 1, prototype: true, initialPhase: phase.id, phases: [phase], phase, get, outgoing, eventTypes, abilities, generate });
})();
