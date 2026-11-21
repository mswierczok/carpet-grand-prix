// Read static JSON only. No evaluation of the classic game or test adapter.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { bahrainIteration2 } from "./lib/bahrain-iteration2.js";
const root = new URL("../", import.meta.url);
// Original calendar indices stay intact for the later championship adapter.
// Flat and separately layered bridge tracks share one POV calendar.
const povTracks = [
  { id: "bahrain", index: 0 },
  { id: "luxembourg", index: 1, pov: { layoutScale: 1.15, roadScale: 1 } },
  { id: "canada", index: 2 },
  { id: "france", index: 3, pov: { layoutScale: 1.4, roadScale: 1.2 } },
  { id: "switzerland", index: 4, pov: { layoutScale: 1.2, roadScale: 1 } },
  {
    id: "portugal",
    index: 5,
    pov: {
      layoutScale: 1.35,
      roadScale: 1.1,
      southExtension: {
        start: 0.8,
        end: 0.91,
        distance: 140,
        section: [0.54, 0.73],
      },
    },
  },
  { id: "india", index: 6, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "brazil", index: 7, pov: { layoutScale: 1.35, roadScale: 1.23 } },
  { id: "south-africa", index: 8, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "korea", index: 9, pov: { layoutScale: 1.3, roadScale: 1.02 } },
  { id: "usa", index: 10, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "belgium", index: 11, pov: { layoutScale: 1.35, roadScale: 1.08 } },
  { id: "sweden", index: 12, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "germany", index: 13, pov: { layoutScale: 1.35, roadScale: 1.23 } },
  { id: "japan", index: 14, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "china", index: 15, pov: { layoutScale: 1.35, roadScale: 1.14 } },
  { id: "russia", index: 16, pov: { layoutScale: 1.4, roadScale: 1 } },
  { id: "australia", index: 17, pov: { layoutScale: 1.35, roadScale: 1.2 } },
  {
    id: "england",
    index: 18,
    pov: {
      layoutScale: 1.2,
      roadScale: 1.05,
      southExtension: {
        start: 0.75,
        end: 0.88,
        distance: 140,
        section: [0.6, 0.75],
      },
    },
  },
  { id: "italy", index: 19, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "hungary", index: 20, pov: { layoutScale: 1.2, roadScale: 1 } },
  { id: "abu-dhabi", index: 21, pov: { layoutScale: 1.2, roadScale: 1 } },
];
export function arcadeData() {
  // Independent, immutable historical inputs; never read/evaluate the legacy UI.
  const read = (name) => JSON.parse(readFileSync(
    new URL(`src/data/historical/${name}.json`, root), "utf8",
  ));
  const master = read("master"),
    originals = read("tracks"),
    tracks = Object.fromEntries(
      povTracks.map(({ id, index, pov }) => {
        const track = originals[index];
        if (!track) throw Error("POV-Strecke fehlt.");
        // POV-only room around the fixed-size cars. Keep the source drawing,
        // calendar and sector fractions intact; never edit the classic data.
        const exported = { id, index, ...track, ...(pov ? { pov } : {}) };
        return [id, id === "bahrain" ? bahrainIteration2(exported) : exported];
      }),
    );
  return {
    track: tracks.bahrain,
    tracks,
    roster: {
      sourceSHA256: master.sourceSHA256,
      teams: master.teams,
      drivers: master.drivers,
    },
  };
}
export function arcadeScripts() {
  const data = arcadeData();
  return Object.fromEntries(
    [
      ["arcade-tracks", data.tracks],
      ["arcade-roster", data.roster],
    ].map(([name, value]) => [
      name,
      `/* Read-only export of classic data. Regenerate: npm run build:arcade-data */\n(()=>{const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};globalThis.CGPArcadeData=globalThis.CGPArcadeData||{};CGPArcadeData.${name === "arcade-tracks" ? "tracks" : "roster"}=freeze(${JSON.stringify(value)});})();\n`,
    ]),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const check = process.argv.includes("--check");
  for (const [name, source] of Object.entries(arcadeScripts())) {
    const path = new URL(`src/data/${name}.js`, root);
    if (check) {
      if (readFileSync(path, "utf8") !== source)
        throw Error(`Datenexport ${name} weicht von der statischen Quelle ab.`);
    } else writeFileSync(path, source);
  }
  console.log(
    `${povTracks.length} POV-Strecken, 13 Teams und 92 Fahrer ${check ? "geprüft" : "schreibgeschützt exportiert"}.`,
  );
}
