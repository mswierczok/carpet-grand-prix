import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const scope = { CGPArcade: {} };
runInNewContext(
  readFileSync("src/rendering/track-environments.js", "utf8"),
  scope,
);
const names = {
  luxembourg: "Luxemburg",
  canada: "Kanada",
  france: "Frankreich",
  switzerland: "Schweiz",
  portugal: "Portugal",
  india: "Indien",
  brazil: "Brasilien",
  "south-africa": "Südafrika",
  korea: "Korea",
  usa: "USA",
  belgium: "Belgien",
  sweden: "Schweden",
  germany: "Deutschland",
  japan: "Japan",
  china: "China",
  russia: "Russland",
  australia: "Australien",
  england: "England",
  italy: "Italien",
  hungary: "Ungarn",
  "abu-dhabi": "Abu Dhabi",
};
const signature = {
  woodBridge: "Holzklotzbrücke",
  bookLandscape: "Bücher und Lineale",
  paperStand: "Papiertribüne und Kissen",
  blockMountains: "Bauklotz-Gebirge",
  awningTown: "Modellstadt mit Stoffmarkisen",
  plasticTube: "Kunststoffröhre",
  plants: "Pflanzen und Plüschtiere",
  safari: "Spielzeug-Safari",
  trainViaduct: "Modellbahn auf drei Brücken",
  neonSkyline: "Spielzeug-Hochhäuser mit Leuchtschildern",
  bedPassage: "Unterbett-Durchfahrt und Spielzeugkisten",
  woodTown: "Holzspielzeugstadt",
  technicalDesk: "Technik, Bücher und Bauklotzboxen",
  futureCity: "Modellstadt und Zukunftstunnel",
  toyBridge: "Große Spielzeugbrücke",
  stackedBridges: "Gestapelte Holzüberführungen",
  rampPark: "Spielzeuglandschaft und Modellrampen",
  grandstand: "Überdachte Haupttribüne",
  dollhouse: "Durchfahrt durch ein Puppenhaus",
  cushionTunnel: "Kissentunnel",
  sailStand: "Weiße Segeldach-Tribüne",
};
const cards = scope.CGPArcade.TrackEnvironments.definitions
  .map(
    (d) =>
      `<article id="${d.id}"><h2>${names[d.id]}</h2><p>${d.place} · ${signature[d.signature]}</p><div class="photos"><figure><img loading="lazy" data-id="${d.id}" data-view="pov" src="../../docs/calendar-environments/chromium-${d.id}-pov.png" alt="${names[d.id]}: echte Startansicht"><figcaption>Rennansicht</figcaption></figure><figure><img loading="lazy" data-id="${d.id}" data-view="overview" src="../../docs/calendar-environments/chromium-${d.id}-overview.png" alt="${names[d.id]}: echte Zimmerübersicht"><figcaption>Umgebung im Überblick</figcaption></figure><figure><img loading="lazy" data-id="${d.id}" data-view="detail" src="../../docs/calendar-environments/chromium-${d.id}-detail.png" alt="${names[d.id]}: Landmarke aus der echten Spielszene"><figcaption>Detailkamera · tatsächliches 3D-Modell</figcaption></figure></div><a class="play" href="../../race.html?track=${d.id}">${names[d.id]} fahren →</a></article>`,
  )
  .join("\n");
let html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Carpet Grand Prix · 21 neue Spielwelten</title><style>*{box-sizing:border-box}body{margin:0;background:#17272e;color:#f8ecd4;font:17px/1.5 system-ui}main{max-width:1400px;margin:auto;padding:32px 20px}h1{font-size:clamp(30px,5vw,55px);line-height:1.1}h2{margin-bottom:0;color:#ebba6b}p{color:#ccd6d5}article{border:1px solid #53666b;border-radius:18px;background:#253b43;padding:22px;margin:24px 0}a{color:#f4c579}.photos{display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px}figure{margin:0}img{width:100%;border-radius:12px;display:block}figcaption{color:#b7c5c7;font-size:14px}.play,button{display:inline-block;padding:10px 16px;border-radius:9px;margin-top:12px;background:#e2b05f;color:#17272e;font-weight:750;border:0;text-decoration:none}button{cursor:pointer}button[aria-pressed=true]{outline:3px solid #f3e7c6}nav{display:flex;gap:12px;flex-wrap:wrap}@media(max-width:700px){.photos{grid-template-columns:1fr}article{padding:14px}}</style><main><a href="../../race.html?track=bahrain">← Bahrain: abgenommener Vergleich</a><h1>Ein Kalender. 21 neue Spielwelten.</h1><p>Jede Strecke nutzt ihre bisherige Fahrbahn. Die neuen Umgebungen greifen deine Zuordnung auf: vom Schreibtisch bis zum Kissentunnel. Alle Bilder stammen aus dem laufenden Spiel.</p><nav><button data-device="chromium" aria-pressed="true">Desktop-Aufnahmen</button><button data-device="mobile-chromium" aria-pressed="false">Mobil-Aufnahmen</button></nav>${cards}<p>Zur Abnahme auf einem separaten Entwicklungsbranch. Die öffentliche Spielversion ändert sich erst nach der Merge-Freigabe.</p></main><script>for(const b of document.querySelectorAll('button[data-device]'))b.addEventListener('click',()=>{for(const n of document.querySelectorAll('button[data-device]'))n.setAttribute('aria-pressed',n===b?'true':'false');for(const img of document.querySelectorAll('img[data-id]'))img.src='../../docs/calendar-environments/'+b.dataset.device+'-'+img.dataset.id+'-'+img.dataset.view+'.png';});</script></html>`;
mkdirSync("previews/calendar-environments", { recursive: true });
writeFileSync("previews/calendar-environments/index.html", html);
if (process.argv.includes("--gallery-only")) process.exit(0);
const embedded = {};
for (const d of scope.CGPArcade.TrackEnvironments.definitions)
  for (const device of ["chromium", "mobile-chromium"])
    for (const view of ["pov", "overview", "detail"]) {
      const file = `${device}-${d.id}-${view}.png`;
      embedded[file] =
        "data:image/png;base64," +
        readFileSync("docs/calendar-environments/" + file).toString("base64");
    }
html = html
  .replace(/src="\.\.\/\.\.\/docs\/calendar-environments\/([^" ]+)"/g, () => "")
  .replaceAll("../../race.html?", "./carpet-grand-prix-race-offline.html?")
  .replace(
    "img.src='../../docs/calendar-environments/'+b.dataset.device+'-'+img.dataset.id+'-'+img.dataset.view+'.png';",
    "img.src=frames[b.dataset.device+'-'+img.dataset.id+'-'+img.dataset.view+'.png'];",
  )
  .replace("<script>", "<script>const frames=" + JSON.stringify(embedded) + ";")
  .replace(
    "</script>",
    `for(const img of document.querySelectorAll('img[data-id]'))img.src=frames['chromium-'+img.dataset.id+'-'+img.dataset.view+'.png'];</script>`,
  );
mkdirSync("dist/calendar-review", { recursive: true });
writeFileSync("dist/calendar-review/index.html", html);
for (const name of ["race", "menu", "campaign", "run", "arcade", "arcade3d", ""]) {
  const file = `carpet-grand-prix-${name ? name + "-" : ""}offline.html`;
  copyFileSync(`dist/${file}`, `dist/calendar-review/${file}`);
}
copyFileSync("dist/carpet-grand-prix-classic-archive.html", "dist/calendar-review/carpet-grand-prix-classic-archive.html");
console.log(
  "Spielbare Abnahme aller 21 Umgebungen: dist/calendar-review/index.html",
);
