(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  const definitions = [
    [
      "luxembourg",
      "Helles Holzparkett",
      "wood",
      "#d9bf96",
      "#698b73",
      "woodBridge",
      "woodTown",
    ],
    [
      "canada",
      "Schreibtisch",
      "desk",
      "#d6ad7c",
      "#a95045",
      "bookLandscape",
      "stationery",
    ],
    [
      "france",
      "Bettdecke",
      "bed",
      "#b4c6ce",
      "#ad5147",
      "paperStand",
      "pillows",
    ],
    [
      "switzerland",
      "Grauer Teppich",
      "carpet",
      "#b8bab6",
      "#ad5147",
      "blockMountains",
      "woodTown",
    ],
    [
      "portugal",
      "Balkon",
      "terrace",
      "#c5b6a0",
      "#5b8e98",
      "awningTown",
      "plants",
    ],
    [
      "india",
      "Bunte Spielmatte",
      "mat",
      "#9eae91",
      "#d18d46",
      "plasticTube",
      "brickTown",
    ],
    ["brazil", "Wohnzimmer", "living", "#a6b99b", "#bc9750", "plants", "plush"],
    [
      "south-africa",
      "Terrassenplatten",
      "terrace",
      "#cbb88e",
      "#77936c",
      "safari",
      "plants",
    ],
    [
      "korea",
      "Schreibtisch",
      "desk",
      "#d2b18d",
      "#577d91",
      "trainViaduct",
      "stationery",
    ],
    [
      "usa",
      "Dunkler Teppich",
      "carpet",
      "#626c79",
      "#c58b61",
      "neonSkyline",
      "brickTown",
    ],
    [
      "belgium",
      "Unter dem Bett",
      "underbed",
      "#a6a295",
      "#9c5c4c",
      "bedPassage",
      "toyCrates",
    ],
    [
      "sweden",
      "Helle Dielen",
      "wood",
      "#dfd0ae",
      "#6a889b",
      "woodTown",
      "blockMountains",
    ],
    [
      "germany",
      "Technikschreibtisch",
      "desk",
      "#c2b59e",
      "#b05d48",
      "technicalDesk",
      "bookLandscape",
    ],
    [
      "japan",
      "Spielmatte",
      "mat",
      "#bac4be",
      "#bd6662",
      "futureCity",
      "brickTown",
    ],
    [
      "china",
      "Gemusterte Bettdecke",
      "bed",
      "#bcc2b2",
      "#b96752",
      "toyBridge",
      "pillows",
    ],
    [
      "russia",
      "Holzfläche",
      "wood",
      "#bb9878",
      "#768b9c",
      "stackedBridges",
      "woodTown",
    ],
    [
      "australia",
      "Terrasse",
      "terrace",
      "#c9b996",
      "#638b8a",
      "rampPark",
      "safari",
    ],
    [
      "england",
      "Großer Zimmerteppich",
      "carpet",
      "#a5ad9e",
      "#667f69",
      "grandstand",
      "toyCrates",
    ],
    [
      "italy",
      "Fliesenfläche",
      "tile",
      "#d5c4ac",
      "#a75c4e",
      "dollhouse",
      "awningTown",
    ],
    [
      "hungary",
      "Farbige Bettdecke",
      "bed",
      "#c1acbc",
      "#657c94",
      "cushionTunnel",
      "pillows",
    ],
    [
      "abu-dhabi",
      "Sandfarbener Teppich",
      "carpet",
      "#d4c1a1",
      "#638b91",
      "sailStand",
      "threadTowers",
    ],
  ].map(([id, place, area, floor, accent, signature, supporting]) =>
    Object.freeze({ id, place, area, floor, accent, signature, supporting }),
  );
  function tint(hex, amount) {
    const n = parseInt(hex.slice(1), 16),
      target = amount < 0 ? 0 : 255,
      a = Math.abs(amount);
    return (
      "#" +
      [n >> 16, (n >> 8) & 255, n & 255]
        .map((v) =>
          Math.round(v + (target - v) * a)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  const byId = new Map(definitions.map((d) => [d.id, d])),
    cache = new WeakMap();
  function scene(surface) {
    if (!byId.has(surface.id)) return null;
    if (cache.has(surface)) return cache.get(surface);
    const d = byId.get(surface.id),
      xs = surface.g.pts.map((p) => p.x),
      ys = surface.g.pts.map((p) => p.y),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys),
      bounds = {
        minX: minX - 240,
        maxX: maxX + 240,
        minY: minY - 250,
        maxY: maxY + 260,
        height: 550,
      },
      cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2,
      platformHeight = d.area === "desk" ? 350 : d.area === "bed" ? 115 : 0,
      finishes = {
        wall: "#e8dfcb",
        dado: "#a8b8b7",
        trim: "#f3e5bf",
        floor: "#caa575",
        bedding: d.accent,
        beddingAccent: "#e5c184",
      },
      furniture = [
        {
          id: "bed",
          asset: "bed",
          at: { x: bounds.minX + 95, y: cy + 25, ang: 0 },
          w: 174,
          d: 382,
          h: 120,
        },
        {
          id: "desk",
          asset: "desk",
          at: { x: bounds.maxX - 160, y: bounds.minY + 90, ang: 0 },
          w: 292,
          d: 160,
          h: 235,
        },
        {
          id: "wardrobe",
          asset: "wardrobe",
          at: { x: bounds.maxX - 65, y: cy, ang: Math.PI / 2 },
          w: 250,
          d: 120,
          h: 380,
        },
        {
          id: "bookshelf",
          asset: "bookshelf",
          at: { x: cx, y: bounds.maxY - 50, ang: Math.PI },
          w: 320,
          d: 70,
          h: 310,
          detailDistance: 480,
        },
        {
          id: "toy-corner",
          asset: "toyCorner",
          at: { x: bounds.maxX - 145, y: bounds.maxY - 110, ang: 0 },
          w: 262,
          d: 190,
          h: 115,
        },
      ].filter(
        (f) =>
          !(
            f.asset === "bed" && ["bed", "underbed", "living"].includes(d.area)
          ) && !(f.asset === "desk" && d.area === "desk"),
      );
    if (d.area === "living")
      furniture.push({
        id: "sofa",
        asset: "sofa",
        at: { x: bounds.minX + 95, y: cy, ang: Math.PI / 2 },
        w: 300,
        d: 120,
        h: 130,
      });
    const config = {
      ...d,
      camera: { distance: 30, height: 17, look: 52, speedLook: 0.09 },
      platformHeight,
      playBounds: {
        minX: minX - 95,
        maxX: maxX + 95,
        minY: minY - 100,
        maxY: maxY + 100,
      },
      room: {
        id: "motorsport-bedroom",
        unitMillimetres: 5,
        bounds,
        window: {
          x: bounds.maxX - 190,
          y: bounds.minY + 8,
          w: 330,
          bottom: platformHeight ? 300 : 150,
          h: 230,
        },
        posterXs: [bounds.minX + 150, cx - 60, cx + 190],
        rug: { x: cx, y: cy, w: maxX - minX + 190, d: maxY - minY + 200 },
        furniture,
      },
      finishes,
      materials: {
        carpet: {
          base: d.floor,
          loops: tint(d.floor, 0.1),
          shade: tint(d.floor, -0.08),
          highlight: tint(d.floor, 0.18),
        },
      },
      lighting: {
        background: d.area === "terrace" ? "#c8d6d4" : "#e3dbca",
        sky: "#fff0d6",
        ground: "#74695c",
        sun: "#ffe7c8",
        skyIntensity: 1.15,
        sunIntensity: 1.15,
        far: 3000,
        fogNear: 1900,
        fogFar: 3100,
      },
    };
    cache.set(surface, config);
    return config;
  }
  A.TrackEnvironments = Object.freeze({
    definitions: Object.freeze(definitions),
    get: (id) => byId.get(id) || null,
    scene,
  });
})();
