import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = new URL("../", import.meta.url);
function source(file) {
  const code = readFileSync(new URL(file, root), "utf8");
  if (file !== "src/ui/campaign-view.js") return code;
  const paths = [
    ...Array.from({ length: 13 }, (_, i) => `assets/cars/team-t${String(i + 1).padStart(2, "0")}.webp`),
    ...Array.from({ length: 35 }, (_, i) => `assets/drivers/portraits/webp/d${String(i + 1).padStart(3, "0")}.webp`),
  ];
  const images = Object.fromEntries(paths.map(path => ["./" + path, "data:image/webp;base64," + readFileSync(new URL(path, root)).toString("base64")]));
  return "CGPArcade.CampaignImages = Object.freeze(" + JSON.stringify(images) + ");\n" + code;
}
export function createArcadeOffline({ threeD = false, race = false } = {}) {
  threeD ||= race;
  let html = readFileSync(
    new URL(
      race ? "race.html" : threeD ? "arcade3d.html" : "arcade.html",
      root,
    ),
    "utf8",
  );
  if (threeD)
    html = html.replace(
      'src="./assets/world/arcade-materials.png"',
      () =>
        `src="data:image/png;base64,${readFileSync(new URL("assets/world/arcade-materials.png", root)).toString("base64")}"`,
    );
  html = html.replace(
    /<link\s+rel="stylesheet"\s+href="\.\/(styles\/(?:arcade(?:-race)?|campaign|racing-hud)\.css)(?:\?[^" ]*)?"\s*\/?>/g,
    (_, file) => `<style>${readFileSync(new URL(file, root), "utf8")}</style>`,
  );
  for (const match of [
    ...html.matchAll(
      /<script src="\.\/(src\/[^"?]+)(?:\?[^" ]*)?"><\/script>/g,
    ),
  ])
    html = html.replace(
      match[0],
      () =>
        `<script>\n${source(match[1]).replace(/<\/script/gi, "<\\/script")}\n</script>`,
    );
  if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) {
    throw new Error(
      "Die Offline-Datei enthält noch externe Scripts oder Styles.",
    );
  }
  html = html
    .replaceAll(
      'href="./race.html"',
      'href="./carpet-grand-prix-race-offline.html"',
    )
    .replace(
      'href="./arcade.html"',
      'href="./carpet-grand-prix-arcade-offline.html"',
    )
    .replace(
      'href="./arcade3d.html"',
      'href="./carpet-grand-prix-arcade3d-offline.html"',
    );
  html = html.replaceAll("./campaign.html", "./carpet-grand-prix-campaign-offline.html").replaceAll("./play.html", "./carpet-grand-prix-menu-offline.html").replaceAll("./race.html?mode=campaign", "./carpet-grand-prix-race-offline.html?mode=campaign");
  return html.replace(
    'href="./index.html"',
    'href="./carpet-grand-prix-menu-offline.html"',
  );
}
export function createPOVMenuOffline() {
  let html = readFileSync(new URL("play.html", root), "utf8");
  html = html.replace(/<link\s+rel="stylesheet"\s+href="\.\/(styles\/[^"?]+)(?:\?[^" ]*)?"\s*\/?>/g,
    (_, path) => `<style>${readFileSync(new URL(path, root), "utf8")}</style>`);
  for (const match of [...html.matchAll(/<script src="\.\/(src\/[^"?]+)(?:\?[^" ]*)?"><\/script>/g)])
    html = html.replace(match[0], () => `<script>\n${source(match[1]).replace(/<\/script/gi, "<\\/script")}\n</script>`);
  for (let i = 1; i <= 13; i++) {
    const path = `assets/cars/team-t${String(i).padStart(2, "0")}.webp`;
    html = html.replaceAll("./" + path, `data:image/webp;base64,${readFileSync(new URL(path, root)).toString("base64")}`);
  }
  return html.replaceAll("./race.html", "./carpet-grand-prix-race-offline.html")
    .replaceAll("./campaign.html", "./carpet-grand-prix-campaign-offline.html")
    .replaceAll("./archive.html", "./carpet-grand-prix-classic-archive.html");
}
export function createClassicArchiveOffline() {
  return readFileSync(new URL("archive.html", root), "utf8")
    .replace(/<link\s+rel="stylesheet"\s+href="\.\/(styles\/[^"?]+)(?:\?[^" ]*)?"\s*\/?>/g,
      (_, file) => `<style>${readFileSync(new URL(file, root), "utf8")}</style>`)
    .replace(/<script src="\.\/(src\/[^"?]+)(?:\?[^" ]*)?"><\/script>/g,
      (_, file) => `<script>${readFileSync(new URL(file, root), "utf8")}</script>`)
    .replaceAll("./play.html", "./carpet-grand-prix-menu-offline.html");
}
export function createCampaignOffline() {
  let html = readFileSync(new URL("campaign.html", root), "utf8");
  html = html.replace(/<link\s+rel="stylesheet"\s+href="\.\/(styles\/[^"?]+)(?:\?[^" ]*)?"\s*\/?>/g,
    (_, file) => `<style>${readFileSync(new URL(file, root), "utf8")}</style>`);
  for (const match of [...html.matchAll(/<script src="\.\/(src\/[^"?]+)(?:\?[^" ]*)?"><\/script>/g)])
    html = html.replace(match[0], () => `<script>\n${source(match[1]).replace(/<\/script/gi, "<\\/script")}\n</script>`);
  html = html.replaceAll("./race.html", "./carpet-grand-prix-campaign-offline.html")
    .replaceAll("./play.html", "./carpet-grand-prix-menu-offline.html");
  // One file owns both campaign views: file:// browsers may isolate storage by
  // path. Navigation only changes the query; selection and race share a slot.
  const race = createArcadeOffline({ race: true }).replaceAll(
    "./carpet-grand-prix-race-offline.html?mode=campaign",
    "./carpet-grand-prix-campaign-offline.html?mode=campaign",
  );
  const literal = value => JSON.stringify(value).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><title>Carpet Grand Prix · Kampagne offline</title><script>document.write(new URLSearchParams(location.search).get("mode")==="campaign"?${literal(race)}:${literal(html)});</script></html>`;
}
export function writeArcadeOffline() {
  mkdirSync(new URL("dist/", root), { recursive: true });
  writeFileSync(
    new URL("dist/carpet-grand-prix-arcade-offline.html", root),
    createArcadeOffline(),
  );
  writeFileSync(
    new URL("dist/carpet-grand-prix-arcade3d-offline.html", root),
    createArcadeOffline({ threeD: true }),
  );
  writeFileSync(
    new URL("dist/carpet-grand-prix-race-offline.html", root),
    createArcadeOffline({ race: true }),
  );
  const menu = createPOVMenuOffline();
  writeFileSync(new URL("dist/carpet-grand-prix-menu-offline.html", root), menu);
  writeFileSync(new URL("dist/carpet-grand-prix-offline.html", root), menu);
  writeFileSync(new URL("dist/carpet-grand-prix-campaign-offline.html", root), createCampaignOffline());
  writeFileSync(new URL("dist/carpet-grand-prix-classic-archive.html", root), createClassicArchiveOffline());
  console.log("Eigenständiger Arcade-Fahrtest und Kampagne exportiert.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) writeArcadeOffline();
