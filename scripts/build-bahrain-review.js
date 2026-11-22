import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
const target = "dist/bahrain-review";
mkdirSync(target, { recursive: true });
const gallery = existsSync("previews/bahrain-iteration2/index.html")
  ? "previews/bahrain-iteration2/index.html"
  : "previews/bahrain-world/index.html";
let html = readFileSync(gallery, "utf8");
html = html
  .replace(
    /src="\.\.\/\.\.\/(docs\/(?:bahrain-(?:world|gate|iteration2)|master-bedroom)\/[^" ]+\.png)"/g,
    (_, path) =>
      `src="data:image/png;base64,${readFileSync(path).toString("base64")}"`,
  )
  .replace(
    "../../race.html?track=bahrain",
    "./carpet-grand-prix-race-offline.html?track=bahrain",
  );
if (/src="\.\.\//.test(html)) throw Error("Missing embedded review image");
writeFileSync(`${target}/index.html`, html);
for (const name of ["race", "menu", "campaign", "run", "arcade", "arcade3d", ""]) {
  const file = `carpet-grand-prix-${name ? name + "-" : ""}offline.html`;
  if (!existsSync(`dist/${file}`))
    throw Error(`Run both offline builds first: ${file}`);
  copyFileSync(`dist/${file}`, `${target}/${file}`);
}
copyFileSync("dist/carpet-grand-prix-classic-archive.html", `${target}/carpet-grand-prix-classic-archive.html`);
console.log("Playable offline Bahrain review: dist/bahrain-review/index.html");
