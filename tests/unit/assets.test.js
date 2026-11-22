import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ROOT } from "../helpers/project.js";
import { createPOVMenuOffline, createArcadeOffline, createCampaignOffline, createRunOffline, createClassicArchiveOffline } from "../../scripts/build-arcade-offline.js";
const hash = data => createHash("sha256").update(data).digest("hex");
const manifest = JSON.parse(readFileSync(new URL("assets/manifest.json", ROOT), "utf8"));
it("bewahrt 13 Teamillustrationen und alle 22 Originalstrecken bytegenau", () => {
  expect(manifest.version).toBe(2);
  expect(manifest.images).toHaveLength(35);
  // Keep the original hashes; only the retired studio background is excluded.
  const before = JSON.parse(execFileSync("git", ["show", "921717c3827948c24af1c26465bb33695b68b4be:assets/manifest.json"], { cwd: ROOT, encoding: "utf8" }));
  expect(manifest.images).toEqual(before.images.filter(image => image.path !== "assets/backgrounds/studio-event.webp"));
  expect(manifest.images.filter(image => image.path.startsWith("assets/cars/"))).toHaveLength(13);
  expect(manifest.images.filter(image => image.path.startsWith("assets/tracks/"))).toHaveLength(22);
  for (const image of manifest.images) {
    const bytes = readFileSync(new URL(image.path, ROOT));
    expect(bytes.length, image.path).toBe(image.bytes);
    expect(hash(bytes), image.path).toBe(image.sha256);
  }
});
it("liefert über den bisherigen Offline-Befehl ein vollständiges aktuelles Paket mit auflösbaren Navigationslinks", () => {
  execFileSync(process.execPath, ["scripts/build-offline.js"], { cwd: ROOT, stdio: "pipe" });
  for (const name of ["", "menu-", "campaign-", "run-", "race-", "arcade-", "arcade3d-"]) {
    const html = readFileSync(new URL(`dist/carpet-grand-prix-${name}offline.html`, ROOT), "utf8");
    for (const match of html.matchAll(/href="\.\/(carpet-grand-prix-[^"?#]+\.html)(?:[?#][^"]*)?"/g))
      expect(existsSync(new URL(`dist/${match[1]}`, ROOT)), match[1]).toBe(true);
  }
});
it("erzeugt aktuelle portable Ansichten ohne externe Scripts, Styles oder eingebettete klassische Simulation", () => {
  for (const build of [createPOVMenuOffline, createArcadeOffline, () => createArcadeOffline({ threeD: true }), () => createArcadeOffline({ race: true }), createCampaignOffline, createRunOffline, createClassicArchiveOffline]) {
    const html = build();
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel="stylesheet"/);
    expect(html).not.toMatch(/function (?:createQualSession|qualStep|beginNewChampionship|runRaceToEnd)\(/);
  }
});
