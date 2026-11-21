import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { arcadeData, arcadeScripts } from "../../scripts/export-arcade-data.js";

// Independent of tests/helpers/game.js: the export must survive its removal.
const root = new URL("../../", import.meta.url);
const baseline = "f24cd7481bf474fa42dda6b9bdfe1088d633c16f";
const read = (path) => readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const exportsBefore = {
  "arcade-roster": "9e64b6cc8693a96a4cdd6924200055bb4840adde58b13c8f117bc476142b0920",
  "arcade-tracks": "af32cf5939d3dc1b1c7cd0a93a01e3e782db8eb7e7be66203cfe2fbd8414677b",
};

it("erhält jedes historische Datenfeld und seine Reihenfolge aus dem Ausgangscommit", () => {
  // This immutable historical reference is test-only, never a build input.
  const html = execFileSync("git", ["show", `${baseline}:index.html`], {
    cwd: root, maxBuffer: 2 * 1024 * 1024, encoding: "utf8",
  });
  for (const [constant, file, hash] of [
    ["MASTER", "master", "f2f4582d0162513fb0eeadde4dfa9e2a0c18c93375c7925be7b8f18d65ca52f0"],
    ["digitizedTracks", "tracks", "396120aa06d1a08f5235e76eff9f481f216cd935555f2a96eebe49391a43ecb7"],
    ["trackDefs", "track-defs", "8361ec0982cda1cec43231a5798039e858607aceab37d821d89adb76f4feb7e2"],
  ]) {
    const prefix = `const ${constant}=`;
    const literal = html.split("\n").find(line => line.startsWith(prefix)).slice(prefix.length, -1);
    expect(sha(literal)).toBe(hash);
    const source = json(`src/data/historical/${file}.json`);
    expect(source).toEqual(JSON.parse(literal));
    expect(JSON.stringify(source)).toBe(JSON.stringify(JSON.parse(literal)));
  }
});

it("bewahrt 13 Teams, 92 Identitäten, Datenbankhash und alle 22 Originalgeometrien", () => {
  const master = json("src/data/historical/master.json");
  const tracks = json("src/data/historical/tracks.json");
  expect(master.teams).toHaveLength(13);
  expect(master.drivers).toHaveLength(92);
  expect(new Set(master.teams.map(t => t.id)).size).toBe(13);
  expect(new Set(master.drivers.map(d => d.id)).size).toBe(92);
  expect(master.sourceSHA256).toBe("17f3949b0fe047658af79ff4b95de1363ce5471b13fe4f3b05457eb277135946");
  expect(tracks).toHaveLength(22);
  const data = arcadeData();
  expect(data.roster.teams).toEqual(master.teams);
  expect(data.roster.drivers).toEqual(master.drivers);
  for (const track of Object.values(data.tracks)) {
    const { id, index, pov, ...original } = track;
    expect(original, id).toEqual(tracks[index]);
  }
  expect(data.tracks.bahrain.pov.layoutVersion).toBe("bahrain-underbed-2");
  expect(data.tracks.bahrain.pov.pitPoints.length).toBeGreaterThan(2);
  expect(data.tracks.korea.bridges).toHaveLength(1);
  expect(data.tracks.russia.bridges).toHaveLength(2);
});

it("erzeugt byteidentische veröffentlichte Arcade-Daten einschließlich der POV-Anpassungen", () => {
  for (const [name, source] of Object.entries(arcadeScripts())) {
    expect(sha(source), name).toBe(exportsBefore[name]);
    expect(source).toBe(read(`src/data/${name}.js`));
  }
  const before = arcadeScripts();
  const editable = arcadeData();
  editable.roster.teams[0].name = "Mutated caller copy";
  editable.tracks.bahrain.points[0][0] = -999;
  expect(arcadeScripts()).toEqual(before);
});

it("generiert und prüft ohne index.html, Testadapter oder Simulationscode, unabhängig vom Arbeitsverzeichnis", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "cgp-static-data-"));
  try {
    for (const file of ["scripts/export-arcade-data.js", "scripts/lib/bahrain-iteration2.js", "src/data/historical"]) {
      const target = join(sandbox, file);
      mkdirSync(join(target, ".."), { recursive: true });
      cpSync(new URL(file, root), target, { recursive: true });
    }
    writeFileSync(join(sandbox, "package.json"), '{"type":"module"}\n');
    const command = [join(sandbox, "scripts/export-arcade-data.js")];
    const options = { cwd: tmpdir(), encoding: "utf8", stdio: "pipe" };
    expect(existsSync(join(sandbox, "index.html"))).toBe(false);
    execFileSync(process.execPath, command, options);
    for (const [name, hash] of Object.entries(exportsBefore))
      expect(sha(readFileSync(join(sandbox, `src/data/${name}.js`)))).toBe(hash);
    expect(execFileSync(process.execPath, [...command, "--check"], options)).toContain("geprüft");

    const output = join(sandbox, "src/data/arcade-roster.js");
    writeFileSync(output, "modified export\n");
    expect(() => execFileSync(process.execPath, [...command, "--check"], options)).toThrow();
    expect(readFileSync(output, "utf8")).toBe("modified export\n");

    // Malformed or missing inputs must fail before replacing any output.
    const input = join(sandbox, "src/data/historical/tracks.json");
    writeFileSync(input, "invalid JSON");
    expect(() => execFileSync(process.execPath, command, options)).toThrow();
    expect(readFileSync(output, "utf8")).toBe("modified export\n");
    rmSync(input);
    expect(() => execFileSync(process.execPath, command, options)).toThrow();
    expect(readFileSync(output, "utf8")).toBe("modified export\n");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
