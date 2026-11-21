import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { loadArcade } from "../helpers/arcade.js";
import { ROOT, digest, historicalInvariants, historicalTracks, historicalMaster, plain } from "../helpers/project.js";
it("verifiziert die Herkunft der vor der Entfernung erfassten Referenz ohne Simulation auszuführen", () => {
  expect(historicalInvariants.sourceCommit).toBe("fc338593c33c8e25063fc5ffd22511f7ded9b3c9");
  const source = execFileSync("git", ["show", `${historicalInvariants.sourceCommit}:index.html`], { cwd: ROOT, maxBuffer: 2 * 1024 * 1024 });
  expect(createHash("sha256").update(source).digest("hex")).toBe(historicalInvariants.sourceHTMLSHA256);
});
it("erhält alle 22 historischen Geometrien, Boxen, Breiten und Sektoren ohne klassische Engine", () => {
  const { api } = loadArcade();
  expect(historicalInvariants.geometry).toHaveLength(22);
  for (const [index, original] of historicalTracks.entries()) {
    const g = api.Surface.create(original).g, ref = historicalInvariants.geometry[index];
    expect(original.name).toBe(ref.name);
    expect(g.len, ref.name).toBe(ref.length);
    expect(g.width, ref.name).toBe(ref.width);
    expect(plain(g.sectors), ref.name).toEqual(ref.sectors);
    expect(digest(g.pts), ref.name).toBe(ref.pointsHash);
    expect(digest(g.cum), ref.name).toBe(ref.cumulativeHash);
    expect(digest(g.pit), ref.name).toBe(ref.pitHash);
  }
});
it("hält aktuelle und historische Team-/Fahreridentitäten sowie alle ursprünglichen Referenzdaten bereit", () => {
  const { data } = loadArcade();
  expect(plain(data.roster.teams)).toEqual(historicalMaster.teams);
  expect(plain(data.roster.drivers)).toEqual(historicalMaster.drivers);
  // These are historical user-format examples, never a source of gameplay state.
  for (const file of ["initial", "qualified", "activeRace", "activeQualifying", "completedWeekend", "reference"])
    expect(JSON.parse(readFileSync(new URL(`tests/fixtures/${file}.json`, ROOT), "utf8"))).toBeTruthy();
});
