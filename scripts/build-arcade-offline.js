import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = new URL("../", import.meta.url);
export function createArcadeOffline({ threeD = false } = {}) {
  let html = readFileSync(
    new URL(threeD ? "arcade3d.html" : "arcade.html", root),
    "utf8",
  );
  if (threeD)
    html = html.replace(
      'src="./assets/world/arcade-materials.png"',
      () =>
        `src="data:image/png;base64,${readFileSync(new URL("assets/world/arcade-materials.png", root)).toString("base64")}"`,
    );
  html = html.replace(
    /<link rel="stylesheet" href="\.\/styles\/arcade\.css(?:\?[^" ]*)?"\s*\/?>/,
    () =>
      `<style>${readFileSync(new URL("styles/arcade.css", root), "utf8")}</style>`,
  );
  for (const match of [
    ...html.matchAll(
      /<script src="\.\/(src\/[^"?]+)(?:\?[^" ]*)?"><\/script>/g,
    ),
  ])
    html = html.replace(
      match[0],
      () =>
        `<script>\n${readFileSync(new URL(match[1], root), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`,
    );
  if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) {
    throw new Error(
      "Die Offline-Datei enthält noch externe Scripts oder Styles.",
    );
  }
  html = html
    .replace(
      'href="./arcade.html"',
      'href="./carpet-grand-prix-arcade-offline.html"',
    )
    .replace(
      'href="./arcade3d.html"',
      'href="./carpet-grand-prix-arcade3d-offline.html"',
    );
  return html.replace(
    'href="./index.html"',
    'href="./carpet-grand-prix-offline.html"',
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  mkdirSync(new URL("dist/", root), { recursive: true });
  writeFileSync(
    new URL("dist/carpet-grand-prix-arcade-offline.html", root),
    createArcadeOffline(),
  );
  writeFileSync(
    new URL("dist/carpet-grand-prix-arcade3d-offline.html", root),
    createArcadeOffline({ threeD: true }),
  );
  console.log("Eigenständiger Arcade-Fahrtest exportiert.");
}
