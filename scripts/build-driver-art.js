// Reproducible vector-art sources; original uploaded PNGs are never rewritten.
import { readFileSync, writeFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
const root = new URL("../", import.meta.url), scope = createContext({});
const master = JSON.parse(readFileSync(new URL("src/data/historical/master.json", root), "utf8"));
for (const file of ["rendering/race-sprites", "data/driver-identities", "rendering/driver-portraits"])
  new Script(readFileSync(new URL(`src/${file}.js`, root), "utf8")).runInContext(scope);
for (const [index, driver] of master.drivers.entries()) {
  const svg = scope.CGPDriverPortraits.vectorSVG(driver, master.teams[index % master.teams.length]) + "\n";
  const path = new URL(`assets/drivers/${driver.id}.svg`, root);
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== svg) throw Error(`Abweichendes Fahrer-Asset: ${driver.id}`);
  } else writeFileSync(path, svg);
}
console.log("92 historische Fahrerillustrationen reproduzierbar geprüft/exportiert.");
