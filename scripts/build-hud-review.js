import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
const frames = [
  ["before-desktop.png", "Vorher · Desktop"],
  ["chromium-desktop.png", "Nachher · Desktop 16:9"],
  ["before-iphone-portrait.png", "Vorher · Hochformat"],
  [
    "mobile-chromium-iphone-portrait.png",
    "Nachher · 390 × 844, Touch-Emulation",
  ],
  ["mobile-chromium-iphone-landscape.png", "844 × 390, Touch-Emulation"],
  ["mobile-chromium-small-phone.png", "320 × 568, Touch-Emulation"],
  ["mobile-chromium-classification.png", "Pausiertes vollständiges Klassement"],
  ["mobile-chromium-qualifying-classification.png", "Qualifying-Klassement"],
  [
    "mobile-chromium-campaign-overview.png",
    "Kampagnenübersicht und nächste Strecke",
  ],
  ["mobile-chromium-archive-list.png", "Gespeicherte Grand Prix"],
  ["mobile-chromium-archive-race.png", "Historisches Rennergebnis"],
  ["mobile-chromium-archive-qualifying.png", "Historisches Qualifying"],
  ["chromium-race-result.png", "Tatsächlicher Zieleinlauf"],
];
function html(embedded = false) {
  const cards = frames
    .map(
      ([file, title]) =>
        `<figure><h2>${title}</h2><img loading="lazy" src="${embedded ? "data:image/png;base64," + readFileSync("docs/racing-hud/" + file).toString("base64") : "../../docs/racing-hud/" + file}" alt="${title}: Aufnahme aus dem laufenden Spiel"><figcaption>Tatsächliche Browseraufnahme · keine Konzeptgrafik</figcaption></figure>`,
    )
    .join("\n");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Carpet Grand Prix · HUD & Kampagne</title><style>*{box-sizing:border-box}body{margin:0;background:#102b27;color:#fff0d2;font:16px/1.5 system-ui}main{max-width:1280px;margin:auto;padding:24px}h1{font:700 clamp(30px,5vw,52px) Georgia,serif}h2{font-size:19px;color:#ecc378}a{color:#f2cd8d}.play{display:inline-block;padding:12px 18px;background:#ecc378;color:#17372d;border-radius:8px;text-decoration:none;margin:5px 12px 5px 0;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;padding:14px;background:#193f35;border:1px solid #748b72;border-radius:12px}img{width:100%;max-height:780px;object-fit:contain;object-position:top;display:block;background:#0c2422}figcaption{color:#bacdbd;font-size:12px;margin-top:10px}@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:16px}}</style><main><h1>Mehr Rennen. Weniger Webseite.</h1><p>Vollbild-HUD, pausierbares 13er-Klassement, verpflichtendes Kampagnen-Qualifying und ein dauerhaftes Ergebnisarchiv. Die Fotos stammen aus den tatsächlichen Desktop- und Touch-Browserprüfungen.</p><a class="play" href="${embedded ? "./carpet-grand-prix-campaign-offline.html" : "../../campaign.html"}">Kampagne testen →</a><a class="play" href="${embedded ? "./carpet-grand-prix-race-offline.html" : "../../race.html"}">Freies Rennwochenende →</a><p>iPhone-Abmessungen wurden mit Chromium emuliert. Ein echter iPhone-/Safari-Gerätetest steht aus. In den langen Browserfahrten bleibt das Qualifying vollständig; Rennen sind über die öffentliche Engine-Option auf eine Runde verkürzt. Der ausgelieferte Modus behält seine regulären Rundenzahlen.</p><div class="grid">${cards}</div></main></html>`;
}
mkdirSync("previews/racing-hud", { recursive: true });
writeFileSync("previews/racing-hud/index.html", html());
if (!process.argv.includes("--gallery-only")) {
  mkdirSync("dist/hud-review", { recursive: true });
  writeFileSync("dist/hud-review/index.html", html(true));
  for (const name of ["campaign", "run", "race", "menu", "arcade", "arcade3d", ""]) {
    const file = `carpet-grand-prix-${name ? name + "-" : ""}offline.html`;
    copyFileSync("dist/" + file, "dist/hud-review/" + file);
  }
  copyFileSync("dist/carpet-grand-prix-classic-archive.html", "dist/hud-review/carpet-grand-prix-classic-archive.html");
  console.log("Spielbare HUD-/Kampagnen-Abnahme: dist/hud-review/index.html");
}
