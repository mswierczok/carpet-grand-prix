import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ROOT } from "../helpers/project.js";
import { createPOVMenuOffline, createArcadeOffline, createCampaignOffline, createClassicArchiveOffline } from "../../scripts/build-arcade-offline.js";
const hash = data => createHash("sha256").update(data).digest("hex");
const manifest = JSON.parse(readFileSync(new URL("assets/manifest.json", ROOT), "utf8"));
it("bewahrt sämtliche historischen Bilder und freigegebenen Lackierungen bytegenau", () => {
  expect(manifest.images).toHaveLength(36);
  for (const image of manifest.images) {
    const bytes = readFileSync(new URL(image.path, ROOT));
    expect(bytes.length, image.path).toBe(image.bytes);
    expect(hash(bytes), image.path).toBe(image.sha256);
  }
});
it("liefert über den bisherigen Offline-Befehl ein vollständiges aktuelles Paket mit auflösbaren Navigationslinks", () => {
  execFileSync(process.execPath, ["scripts/build-offline.js"], { cwd: ROOT, stdio: "pipe" });
  for (const name of ["", "menu-", "campaign-", "race-", "arcade-", "arcade3d-"]) {
    const html = readFileSync(new URL(`dist/carpet-grand-prix-${name}offline.html`, ROOT), "utf8");
    for (const match of html.matchAll(/href="\.\/(carpet-grand-prix-[^"?#]+\.html)(?:[?#][^"]*)?"/g))
      expect(existsSync(new URL(`dist/${match[1]}`, ROOT)), match[1]).toBe(true);
  }
});
it("erzeugt aktuelle portable Ansichten ohne externe Scripts, Styles oder eingebettete klassische Simulation", () => {
  for (const build of [createPOVMenuOffline, createArcadeOffline, () => createArcadeOffline({ threeD: true }), () => createArcadeOffline({ race: true }), createCampaignOffline, createClassicArchiveOffline]) {
    const html = build();
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+rel="stylesheet"/);
    expect(html).not.toMatch(/function (?:createQualSession|qualStep|beginNewChampionship|runRaceToEnd)\(/);
  }
});
