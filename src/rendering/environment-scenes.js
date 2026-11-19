(() => {
  "use strict";
  const A = globalThis.CGPArcade;
  const freeze = (value) => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  // One unit = 5 mm: a race car is about 5.5 cm, a desk 74 cm high.
  // Fixed room anchors; future track variants change finishes, not this floor plan.
  const room = freeze({
    id: "motorsport-bedroom",
    unitMillimetres: 5,
    bounds: { minX: -60, maxX: 1190, minY: -140, maxY: 930, height: 550 },
    rug: { x: 590, y: 385, w: 840, d: 620 },
    window: { x: 995, y: -132, w: 330, bottom: 150, h: 230 },
    furniture: [
      {
        id: "bed",
        asset: "bed",
        at: { x: 67, y: 460, ang: 0 },
        w: 174,
        d: 382,
        h: 120,
      },
      {
        id: "desk",
        asset: "desk",
        at: { x: 1000, y: -30, ang: 0 },
        w: 292,
        d: 160,
        h: 235,
      },
      {
        id: "wardrobe",
        asset: "wardrobe",
        at: { x: 1100, y: 590, ang: Math.PI / 2 },
        w: 250,
        d: 120,
        h: 380,
      },
      {
        id: "bookshelf",
        detailDistance: 480,
        asset: "bookshelf",
        at: { x: 565, y: 862, ang: Math.PI },
        w: 320,
        d: 70,
        h: 310,
      },
      {
        id: "toy-corner",
        asset: "toyCorner",
        at: { x: 1000, y: 823, ang: 0 },
        w: 262,
        d: 190,
        h: 115,
      },
      {
        id: "desk-stool",
        asset: "stool",
        at: { x: 1085, y: 110, ang: 0.16 },
        w: 70,
        d: 70,
        h: 90,
      },
    ],
  });
  const scenes = freeze({
    bahrain: {
      id: "bahrain",
      room,
      camera: { distance: 30, height: 17, look: 52, speedLook: 0.09 },
      materials: {
        carpet: {
          base: "#c7b28f",
          loops: "#d4c09c",
          shade: "#bba581",
          highlight: "#e1cfa9",
        },
        roadTint: "#ffffff",
        shoulderTint: "#a9916d",
      },
      finishes: {
        wall: "#e7d9b9",
        dado: "#a1b4b6",
        trim: "#f3e5bf",
        floor: "#caa575",
        bedding: "#526e86",
        beddingAccent: "#d8ad65",
      },
      lighting: {
        background: "#e7dcc4",
        sky: "#fff3d8",
        ground: "#735f50",
        sun: "#ffecd1",
        skyIntensity: 1,
        sunIntensity: 1.2,
        far: 2100,
        fogNear: 1350,
        fogFar: 2250,
      },
      landmarks: [
        {
          id: "main-grandstand",
          asset: "grandstand",
          at: { x: 735, y: 258, ang: Math.PI },
          w: 126,
          d: 48,
          scale: [1, 1, 0.85],
          h: 53,
          bays: 3,
        },
      ],
      passage: {
        id: "wooden-tunnel",
        asset: "blockTunnel",
        u: 0.882,
        w: 64,
        d: 88,
        h: 35,
        clearHeight: 26,
        clearHalfWidth: 32,
      },
    },
  });
  A.EnvironmentScenes = Object.freeze({
    room,
    get: (id) => scenes[id] || null,
  });
})();
