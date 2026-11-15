import { rolldown } from "rolldown";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const root = new URL("../", import.meta.url);
const bundle = await rolldown({
  input: new URL("src/rendering/three-entry.js", root).pathname,
});
const license = readFileSync(new URL("licenses/three-MIT.txt", root), "utf8");
const { output } = await bundle.generate({
  format: "iife",
  name: "CGPThree",
  minify: true,
  banner: `/* Locally bundled three@0.187.0.\n${license}\n*/`,
});
const code = output[0].code;
const target = new URL("src/vendor/three.js", root);
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== code)
    throw Error(
      "3D-Bibliothek stimmt nicht mit dem reproduzierbaren Build überein.",
    );
} else {
  mkdirSync(new URL("src/vendor/", root), { recursive: true });
  writeFileSync(target, code);
}
await bundle.close();
console.log(`Lokale Three.js-Ausgabe: ${Buffer.byteLength(code)} Bytes.`);
