(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(materials, settings = {}) {
    const yarn = settings.carpet || {};
    let seed = 1901;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    function canvas(w = 512, h = w) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return [c, c.getContext("2d")];
    }
    function texture(c, repeat = false) {
      const t = materials.canvasTexture(c);
      if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = 1;
      return t;
    }
    const [carpet, c] = canvas();
    c.fillStyle = yarn.base || "#c7b28f";
    c.fillRect(0, 0, 512, 512);
    // Broad, low-contrast loops; ordinary mipmaps remove distant thread detail.
    for (let row = -1; row < 22; row++)
      for (let col = -1; col < 22; col++) {
        const x = col * 25 + (row % 2) * 12 + (random() - 0.5) * 9,
          y = row * 25 + (random() - 0.5) * 9;
        c.strokeStyle =
          random() > 0.45 ? yarn.loops || "#d4c09c" : yarn.shade || "#bba581";
        c.lineWidth = 2.6;
        c.beginPath();
        c.ellipse(
          x,
          y,
          5 + random() * 2,
          8 + random() * 3,
          -0.45,
          0,
          Math.PI * 2,
        );
        c.stroke();
        c.strokeStyle = yarn.highlight || "#e1cfa9";
        c.lineWidth = 1.2;
        c.beginPath();
        c.ellipse(x - 1, y - 1, 5, 8, -0.45, Math.PI, Math.PI * 1.8);
        c.stroke();
      }
    const [road, r] = canvas();
    r.fillStyle = "#fff0cf";
    r.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 140; i++) {
      r.strokeStyle = i % 3 ? "#ebdfc2" : "#fff8e5";
      r.lineWidth = 0.7 + random();
      const x = random() * 512,
        y = random() * 512;
      r.beginPath();
      r.moveTo(x, y);
      r.quadraticCurveTo(x + 4, y - 1, x + 7 + random() * 9, y + 0.5);
      r.stroke();
    }
    const [wood, w] = canvas(256);
    w.fillStyle = "#fff4dc";
    w.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12; i++) {
      w.strokeStyle = i % 3 ? "#d7bd94" : "#b99c78";
      w.lineWidth = i % 3 ? 1 : 1.8;
      const y = i * 23 + random() * 5;
      w.beginPath();
      w.moveTo(-5, y);
      w.bezierCurveTo(70, y - 5, 160, y + 5, 262, y - 1);
      w.stroke();
    }
    w.strokeStyle = "#c4a582";
    w.lineWidth = 1.4;
    w.beginPath();
    w.ellipse(164, 130, 17, 4, 0.03, 0, Math.PI * 2);
    w.stroke();
    const [cloth, f] = canvas(256);
    f.fillStyle = "#fff5e1";
    f.fillRect(0, 0, 256, 256);
    f.strokeStyle = "#e9dac1";
    f.lineWidth = 0.7;
    for (let i = 0; i < 180; i++) {
      const x = random() * 256,
        y = random() * 256;
      f.beginPath();
      f.moveTo(x, y);
      f.quadraticCurveTo(x + 2, y - 1, x + 3.5, y + 0.6);
      f.stroke();
    }
    const [rope, y] = canvas(128, 64);
    y.fillStyle = "#d6bd88";
    y.fillRect(0, 0, 128, 64);
    for (let i = -2; i < 6; i++) {
      y.strokeStyle = "#9b7e51";
      y.lineWidth = 3;
      y.beginPath();
      y.moveTo(i * 32, 0);
      y.lineTo(i * 32 + 45, 64);
      y.stroke();
      y.strokeStyle = "#f3e5bf";
      y.lineWidth = 8;
      y.beginPath();
      y.moveTo(i * 32 + 7, 0);
      y.lineTo(i * 32 + 52, 64);
      y.stroke();
      y.strokeStyle = "#e5ce9d";
      y.lineWidth = 2;
      y.stroke();
    }
    const [labels, l] = canvas(1024);
    const texts = settings.labels || [
      ["CARPET DESERT", "BAHRAIN  ·  GRAND PRIX"],
      ["BLOCKWORKS", "BUILT FOR THE SMALL THINGS"],
      ["THE WOODEN PIT", "01   /   02   /   03"],
      ["SUNSTITCH", "WARM THREADS · FAST LAPS"],
      ["LOOP & CO.", "A LITTLE WORLD OF RACING"],
      ["DUNE THREAD", "SPOOL POWER"],
      ["01", "BAHRAIN · HANDMADE"],
      ["CARPET CLUB", "FRONT ROW · EVERY ROW"],
    ];
    texts.forEach(([title, sub], i) => {
      const cy = i * 128;
      l.fillStyle = i === 1 ? "#ad5147" : "#fff3d2";
      l.fillRect(0, cy, 1024, 128);
      l.strokeStyle = "#443f37";
      l.lineWidth = 9;
      l.strokeRect(5, cy + 5, 1014, 118);
      l.fillStyle = i === 1 ? "#fff3d2" : "#443f37";
      l.textAlign = "center";
      l.font = "900 51px sans-serif";
      l.fillText(title, 512, cy + 65);
      l.font = "bold 20px sans-serif";
      l.fillText(sub, 512, cy + 104);
      l.strokeStyle = i === 1 ? "#e2b780" : "#ad5147";
      l.lineWidth = 4;
      l.beginPath();
      l.moveTo(50, cy + 81);
      l.lineTo(205, cy + 81);
      l.moveTo(819, cy + 81);
      l.lineTo(974, cy + 81);
      l.stroke();
    });
    const [shadow, s] = canvas(64);
    const shade = s.createRadialGradient(32, 32, 3, 32, 32, 31);
    shade.addColorStop(0, "#493c2d75");
    shade.addColorStop(0.55, "#493c2d38");
    shade.addColorStop(1, "#493c2d00");
    s.fillStyle = shade;
    s.fillRect(0, 0, 64, 64);
    const [laminate, pl] = canvas();
    pl.fillStyle = "#d8b58b";
    pl.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 4; row++) {
      pl.fillStyle = ["#d8b58b", "#d3ac80", "#dfbf96", "#cea779"][row];
      pl.fillRect(0, row * 128, 512, 128);
      pl.strokeStyle = "#aa835d";
      pl.lineWidth = 2;
      pl.beginPath();
      pl.moveTo(0, row * 128);
      pl.lineTo(512, row * 128);
      pl.stroke();
      const seam = (row % 2) * 256;
      pl.beginPath();
      pl.moveTo(seam, row * 128);
      pl.lineTo(seam, (row + 1) * 128);
      pl.stroke();
      pl.strokeStyle = "#c19a6e";
      pl.lineWidth = 0.9;
      for (let j = 0; j < 5; j++) {
        const y = row * 128 + 15 + j * 22;
        pl.beginPath();
        pl.moveTo(0, y);
        pl.bezierCurveTo(140, y - 4, 370, y + 6, 512, y);
        pl.stroke();
      }
    }
    return Object.freeze({
      carpet: texture(carpet, true),
      laminate: texture(laminate, true),
      road: texture(road, true),
      wood: texture(wood, true),
      cloth: texture(cloth, true),
      rope: texture(rope, true),
      labels: texture(labels),
      shadow: texture(shadow),
    });
  }
  A.IllustratedMaterials3D = Object.freeze({ create });
})();
