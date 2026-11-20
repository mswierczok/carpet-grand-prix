// Reuse only a JSON state exported by a genuine browser test drive.
// This never invents times, modifies portraits, or changes reference fixtures.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const file = process.argv[2] || "dist/hud-chromium-actual-results.json",
  raw = readFileSync(file, "utf8");
const game = JSON.parse(raw);
if (game.version !== 2 || game.completed.length < 2)
  throw Error("Echte gespeicherte Bahrain-/Kanada-Ergebnisse erforderlich.");
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
});
try {
  for (const [prefix, viewport, mobile] of [
    ["chromium", { width: 1440, height: 810 }, false],
    ["mobile-chromium", { width: 390, height: 844 }, true],
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1,
    });
    await context.addInitScript(
      (raw) => localStorage.setItem("carpet_gp_campaign_v1", raw),
      raw,
    );
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/carpet-grand-prix/campaign.html");
    await page.screenshot({
      path: `docs/racing-hud/${prefix}-campaign-overview.png`,
    });
    if (mobile) {
      const box = await page.locator("#startNextCampaign").boundingBox();
      if (!box || box.y < 0 || box.y + box.height > viewport.height)
        throw Error("Nächste Aktion nicht im Viewport");
    }
    await page.locator('[data-campaign-tab="results"]').click();
    await page.screenshot({
      path: `docs/racing-hud/${prefix}-archive-list.png`,
    });
    await page
      .locator('#campaignArchive [data-track="bahrain"] button')
      .click();
    await page.screenshot({
      path: `docs/racing-hud/${prefix}-archive-race.png`,
    });
    await page.locator('[data-archive-tab="qualifying"]').click();
    await page.screenshot({
      path: `docs/racing-hud/${prefix}-archive-qualifying.png`,
    });
    if (
      mobile &&
      !(await page
        .locator('[data-archive-panel="qualifying"] .result-scroll')
        .evaluate((el) => el.scrollWidth <= el.clientWidth))
    )
      throw Error("Ergebniszeiten liegen außerhalb des sichtbaren Dialogs");
    if (
      (await page.evaluate(() =>
        localStorage.getItem("carpet_gp_campaign_v1"),
      )) !== raw
    )
      throw Error("Archiv hat Rohdaten verändert");
    await context.close();
  }
} finally {
  await browser.close();
}
