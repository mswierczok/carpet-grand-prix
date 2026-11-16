// Read static JSON only. No evaluation of the classic game or test adapter.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = new URL("../", import.meta.url);
// Original calendar indices stay intact for the later championship adapter.
// Only flat, validated POV tracks are published in this first rollout.
const povTracks = [
  { id: "bahrain", index: 0 },
  { id: "luxembourg", index: 1, pov: { layoutScale: 1.15, roadScale: 1 } },
  { id: "canada", index: 2 },
  { id: "france", index: 3, pov: { layoutScale: 1.4, roadScale: 1.2 } },
];
export function arcadeData() {
  const html = readFileSync(new URL("index.html", root), "utf8");
  const read = (name) => {
    const prefix = `const ${name}=`;
    const line = html.split("\n").find((line) => line.startsWith(prefix));
    if (!line || !line.endsWith(";"))
      throw Error(`Statische Quelle ${name} fehlt`);
    return JSON.parse(line.slice(prefix.length, -1));
  };
  const master = read("MASTER"),
    originals = read("digitizedTracks"),
    tracks = Object.fromEntries(
      povTracks.map(({ id, index, pov }) => {
        const track = originals[index];
        if (!track || track.bridgeU.length)
          throw Error("POV-Strecke fehlt oder benötigt zuerst Brückenebenen.");
        // POV-only room around the fixed-size cars. Keep the source drawing,
        // calendar and sector fractions intact; never edit the classic data.
        return [id, { id, index, ...track, ...(pov ? { pov } : {}) }];
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
  for (const [name, source] of Object.entries(arcadeScripts()))
    writeFileSync(new URL(`src/data/${name}.js`, root), source);
  console.log(
    "Vier POV-Strecken, 13 Teams und 92 Fahrer schreibgeschützt exportiert.",
  );
}
