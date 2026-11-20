import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";
import {
  createCampaignOffline,
  createArcadeOffline,
  createPOVMenuOffline,
} from "../../scripts/build-arcade-offline.js";
const key = "carpet_gp_campaign_v1";
async function prepare(page, { short = false, threeD = false } = {}) {
  if (threeD) await capture3D(page, { renderEvery: 90 });
  else await capture2D(page);
  await page.addInitScript(
    ({ short, threeD }) => {
      if (!threeD) {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : original.call(this, type, ...args);
        };
      }
      // Keep sentinels stable across navigation; the application must never write them.
      for (const k of ["carpet_gp_v072", "carpet_gp_pov_game_v1"])
        if (localStorage.getItem(k) === null)
          localStorage.setItem(k, "untouched-" + k);
      if (short) {
        let module;
        Object.defineProperty(CGPArcade, "RaceWeekend", {
          configurable: true,
          get: () => module,
          set(value) {
            module = {
              ...value,
              create(track, options = {}) {
                return value.create(track, { ...options, laps: 1 });
              },
            };
          },
        });
      }
    },
    { short, threeD },
  );
}
async function start(page, driver = "d012") {
  await page.locator("#campaignChooseDriver").click();
  await page.locator(`[data-driver="${driver}"]`).click();
  await page.locator("#campaignShowOverview").click();
  await page.locator("#startCampaign").click();
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-track",
    "bahrain",
  );
  await page.clock.runFor(32);
}
async function finish(page) {
  await page.evaluate(pilotRace);
  for (let i = 0; i < 170; i++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
      return;
  }
  throw Error("Bahrain-Fahrt wurde nicht beendet");
}
async function unchanged(page) {
  for (const k of ["carpet_gp_v072", "carpet_gp_pov_game_v1"])
    expect(await page.evaluate((k) => localStorage.getItem(k), k)).toBe(
      "untouched-" + k,
    );
}
test("Kampagne: Hauptmenü, 13 Teamkarten, drei feste Fahrer und isoliertes Fortsetzen", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page);
  await page.goto("play.html");
  await expect(page.locator("#newChampionship")).toBeVisible();
  await expect(page.locator("#newDrive")).toBeVisible();
  await page.screenshot({
    path: `docs/campaign/${info.project.name}-menu.png`,
  });
  await page.locator("#openCampaign").click();
  await expect(page.locator("#campaignTeams button")).toHaveCount(13);
  await expect(page.locator("#campaignTeams button:disabled")).toHaveCount(12);
  await expect(page.locator('#campaignTeams [data-team="t13"]')).toBeEnabled();
  await expect(page.locator("#campaignTracks li")).toHaveCount(8);
  await page.screenshot({
    path: `docs/campaign/${info.project.name}-teams.png`,
    fullPage: true,
  });
  await page.locator("#campaignChooseDriver").click();
  await expect(page.locator("#campaignDrivers button")).toHaveCount(3);
  await expect(
    page.locator('[data-driver="campaign-veteran-001"]'),
  ).toContainText("38 Jahre");
  await expect(
    page.locator('[data-driver="campaign-veteran-001"]'),
  ).toContainText("Illustration folgt");
  await expect(page.locator("#campaignDrivers img")).toHaveCount(2);
  await page.screenshot({
    path: `docs/campaign/${info.project.name}-drivers.png`,
    fullPage: true,
  });
  await page.locator('[data-driver="d035"]').click();
  await page.locator("#campaignShowOverview").click();
  await page.locator("#startCampaign").click();
  await page.clock.runFor(32);
  await expect(page.locator("#team")).toHaveValue("t13");
  await expect(page.locator("#team")).toBeDisabled();
  await expect(page.locator("#track")).toHaveValue("bahrain");
  await expect(page.locator("#track")).toBeDisabled();
  await expect(page.locator('#raceOrder [data-team="t13"]')).toContainText(
    "D. Kluszic",
  );
  await expect(page.locator("#campaignRaceIdentity")).toContainText(
    "D. Kluszic",
  );
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(6000);
  await page.locator("#openSettings").click();
  await page.keyboard.up("w");
  await page.locator("#savePOV").click();
  await page.clock.runFor(32);
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(saved.driverId).toBe("d035");
  expect(saved.weekend.session.state.phase).toBe("racing");
  await page.reload();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  expect(
    await page.evaluate(() => __driveSnapshot.entries.map((e) => e.car)),
  ).toEqual(saved.weekend.session.state.entries.map((e) => e.car));
  await page.getByRole("link", { name: "← Kampagne" }).click();
  await expect(page.locator("#campaignSavedIdentity")).toContainText(
    "D. Kluszic",
  );
  await page.locator("#continueCampaign").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBe(
    saved.weekend.session.state.elapsed,
  );
  await unchanged(page);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Kampagne: echtes Qualifying und 13er-Rennen enden im ehrlichen Zwischenstand", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page, { short: true });
  await page.goto("campaign.html");
  await start(page, "campaign-veteran-001");
  await page.locator("#startQualifying").click();
  await finish(page);
  await expect(page.locator("#qualifyingRows tr")).toHaveCount(13);
  await expect(page.locator('#qualifyingRows [data-team="t13"]')).toContainText(
    "Mika Hartmann",
  );
  await page.locator("#acceptQualifying").click();
  await page.clock.runFor(32);
  await page.reload();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.entries.length)).toBe(13);
  expect(
    await page.evaluate(() => __driveSnapshot.qualifyingResult.length),
  ).toBe(13);
  await page.locator("#pause").click();
  await finish(page);
  await page.clock.runFor(100);
  await expect(page.locator("#campaignRaceInterim")).toContainText(
    "KAMPAGNEN-ZWISCHENSTAND",
  );
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(saved.stage).toBe("interim");
  expect(saved.result.order.length).toBe(13);
  expect(saved.result.qualifying.length).toBe(13);
  await expect(page.locator("#restart")).toBeDisabled();
  await expect(page.locator("#nextPOVRound")).toBeHidden();
  await page.screenshot({
    path: `docs/campaign/${info.project.name}-interim.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Zur Kampagnenübersicht" }).click();
  await expect(page.locator("#campaignInterim")).toContainText("Mika Hartmann");
  await expect(page.locator("#continueCampaign")).toBeHidden();
  await page.reload();
  await expect(page.locator("#campaignInterim tbody tr")).toHaveCount(13);
  await unchanged(page);
  expect(errors).toEqual([]);
});
test("Kampagne: beschädigte und neuere Sicherungen bleiben erhalten; neue Starts erfordern bestätigtes Ersetzen", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("campaign.html");
  const newer = '{"version":99}';
  await page.evaluate(({ key, newer }) => localStorage.setItem(key, newer), {
    key,
    newer,
  });
  await page.reload();
  await expect(page.locator("#campaignSetup")).toBeHidden();
  await expect(page.locator("#campaignMessage")).toContainText(
    "neueren Version",
  );
  await page.goto("race.html?mode=campaign");
  await page.clock.runFor(32);
  await expect(page.locator("#pause")).toBeDisabled();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(newer);
  await page.goto("campaign.html");
  await page
    .locator("#importCampaign")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.locator("#campaignMessage")).toContainText(
    "Import abgebrochen",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(newer);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await start(page);
  await page.getByRole("link", { name: "← Kampagne" }).click();
  const prior = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.locator("#newCampaign").click();
  await page.locator("#campaignChooseDriver").click();
  await page.locator('[data-driver="d035"]').click();
  await page.locator("#campaignShowOverview").click();
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#startCampaign").click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(prior);
  await unchanged(page);
});
test("Kampagne: ein bestätigter Import bleibt beim Seitenwechsel erhalten und lädt die gewählte Identität", async ({ page }) => {
  await prepare(page);
  await page.goto("campaign.html");
  await start(page);
  const replacement = await page.evaluate(() => CGPArcade.Campaign.create({ driverId: "d035" }));
  await page.locator("#openSettings").click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#importPOV").setInputFiles({ name: "campaign.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(replacement)) });
  await expect(page.locator("#campaignRaceIdentity")).toContainText("D. Kluszic");
  await page.clock.runFor(32);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).driverId,key)).toBe("d035");
  await expect(page.locator('#raceOrder [data-team="t13"]')).toContainText("D. Kluszic");
  await unchanged(page);
});
test("Kampagne: vollständig eingebettete Offline-Dateien navigieren und speichern ohne Netzwerk", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await prepare(page);
  const files = {
    menu: createPOVMenuOffline(),
    campaign: createCampaignOffline(),
    race: createArcadeOffline({ race: true }),
  };
  const requests = [];
  await context.route("**/*", async (route) => {
    const name = /carpet-grand-prix-(menu|campaign|race)-offline\.html/.exec(
      route.request().url(),
    )?.[1];
    if (name)
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: files[name],
      });
    requests.push(route.request().url());
    await route.abort();
  });
  await context.setOffline(true);
  await page.goto(
    "http://127.0.0.1:4173/carpet-grand-prix/carpet-grand-prix-menu-offline.html",
  );
  await page.locator("#openCampaign").click();
  await start(page);
  await expect(page.locator("#campaignRaceIdentity img")).toHaveAttribute(
    "src",
    /^data:image/,
  );
  await page.locator("#pause").click();
  await page.clock.runFor(4200);
  await page.locator("#openSettings").click();
  await page.locator("#savePOV").click();
  await page.reload();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await unchanged(page);
  expect(requests).toEqual([]);
});
test("Kampagne: vorhandene POV-Kamera und 13 Fahrzeuge starten in echter 3D-Ansicht", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await prepare(page, { threeD: true });
  await page.goto("campaign.html");
  await start(page);
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await page.locator("#arcadeCanvas").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/campaign/${info.project.name}-start-3d.png`,
  });
  await expect(page.locator("#raceOrder li")).toHaveCount(13);
  await unchanged(page);
});
