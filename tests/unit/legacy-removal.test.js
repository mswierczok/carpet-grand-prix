import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { ROOT } from "../helpers/project.js";
const baseline = "fc338593c33c8e25063fc5ffd22511f7ded9b3c9";
it("bewahrt das aktuelle Rennspiel samt 3D-Welt, Daten, Assets, Speicher und bestehenden Referenzen bytegenau", () => {
  const pages = ["play.html", "race.html", "campaign.html", "arcade.html", "arcade3d.html"];
  const paths = ["race.html", "campaign.html", "arcade.html", "arcade3d.html", "assets", ":(exclude)assets/manifest.json", ":(exclude)assets/backgrounds/studio-event.webp", "scripts/lib",
    "scripts/export-arcade-data.js", "scripts/build-arcade-boundaries.js", "src/data/historical/master.json",
    "src/data/historical/tracks.json", "src/data/historical/track-defs.json", "src/data/driver-identities.js",
    "src/data/uploaded-portraits.js", "src/rendering/driver-portraits.js"];
  for (const page of pages) {
    const html = readFileSync(new URL(page, ROOT), "utf8");
    for (const match of html.matchAll(/(?:src|href)="\.\/((?:src|styles)\/[^"?]+)(?:\?[^" ]*)?"/g)) paths.push(match[1]);
  }
  // The only retired asset is the classic studio background; its sole CSS
  // consumer has been removed. The catalog is validated against its original
  // entries in assets.test.js. All other art, game code and fixtures stay exact.
  // The only earlier view changes were index.html and the menu archive link.
  const fixtures = execFileSync("git", ["ls-tree", "-r", "--name-only", baseline, "--", "tests/fixtures"], { cwd: ROOT, encoding: "utf8" })
    .trim().split("\n").filter(path => path.endsWith(".json"));
  expect(() => execFileSync("git", ["diff", "--exit-code", baseline, "--", ...new Set(paths), ...fixtures], { cwd: ROOT, stdio: "pipe" })).not.toThrow();
});
it("hält das entfernte klassische Spiel im Archiv-Tag statt in aktuellen Testadaptern", () => {
  expect(execFileSync("git", ["rev-parse", "classic-simulation-archive-2026-11-21^{}"], { cwd: ROOT, encoding: "utf8" }).trim()).toBe(baseline);
  for (const path of ["tests/helpers/game.js", "tests/helpers/reference.js", "tests/helpers/extended-scenario.js"])
    expect(existsSync(new URL(path, ROOT)), path).toBe(false);
  const html = readFileSync(new URL("index.html", ROOT), "utf8");
  expect(Buffer.byteLength(html)).toBeLessThan(1000);
  expect(html).not.toMatch(/const MASTER|digitizedTracks|runRaceToEnd|createQualSession/);
});
