import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";
import { openRaceMenu, closeRaceMenu } from "../helpers/racing-menu.js";
import { loadArcade } from "../helpers/arcade.js";
import {
  createCampaignOffline,
  createPOVMenuOffline,
} from "../../scripts/build-arcade-offline.js";
const key = "carpet_gp_campaign_v1",
  championship = JSON.stringify(
    loadArcade({ race: true }).api.POVCareer.create({
      mode: "championship",
      teamId: "t05",
    }),
  );
async function prepare(page, { short = false, threeD = false } = {}) {
  if (threeD) await capture3D(page, { renderEvery: 60 });
  else await capture2D(page, { renderEvery: short ? 30 : 1 });
  await page.addInitScript(
    ({ short, threeD, championship }) => {
      if (!threeD) {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : original.call(this, type, ...args);
        };
      }
      if (localStorage.getItem("carpet_gp_pov_game_v1") === null)
        localStorage.setItem("carpet_gp_pov_game_v1", championship);
      if (localStorage.getItem("carpet_gp_v072") === null)
        localStorage.setItem("carpet_gp_v072", "classic-sentinel");
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
    { short, threeD, championship },
  );
}
async function start(page, driver = "d035") {
  await page.locator("#campaignChooseDriver").click();
  await page.locator(`[data-driver="${driver}"]`).click();
  await page.locator("#campaignShowOverview").click();
  await page.locator("#startCampaign").click();
  await page.clock.runFor(32);
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-track",
    "bahrain",
  );
}
async function unchanged(page) {
  expect(
    await page.evaluate(() => localStorage.getItem("carpet_gp_pov_game_v1")),
  ).toBe(championship);
  expect(
    await page.evaluate(() => localStorage.getItem("carpet_gp_v072")),
  ).toBe("classic-sentinel");
}
async function drive(page, qualifying = false) {
  await page.evaluate(pilotRace, { stopOnQualifiedGrid: qualifying });
  for (let i = 0; i < 220; i++) {
    await page.clock.runFor(1000);
    const s = await page.evaluate(() => __driveSnapshot);
    if (
      qualifying
        ? s.qualifyingResult && s.race.phase === "grid"
        : s.race.phase === "finished"
    )
      return s;
  }
  throw Error("Echte Kampagnenfahrt nicht abgeschlossen");
}
test("Kampagne: kompakter Einstieg, 13 Teams, drei Fahrer, Pflichtqualifying und sicherer Neustart", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page);
  await page.goto("play.html");
  await page.locator("#openCampaign").click();
  await page.locator('[data-campaign-tab="teams"]').click();
  await expect(page.locator("#campaignTeams button")).toHaveCount(13);
  await expect(page.locator("#campaignTeams button:disabled")).toHaveCount(12);
  await page.locator('[data-campaign-tab="tracks"]').click();
  await expect(page.locator("#campaignTracks li")).toHaveCount(8);
  await page.locator('[data-campaign-tab="overview"]').click();
  await page.locator("#campaignChooseDriver").click();
  await expect(page.locator("#campaignDrivers button")).toHaveCount(3);
  await expect(
    page.locator('[data-driver="campaign-veteran-001"]'),
  ).toContainText("38 Jahre");
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-driver-selection.png`,
  });
  await page.locator('[data-driver="d035"]').click();
  await page.locator("#campaignShowOverview").click();
  await page.locator("#startCampaign").click();
  await page.clock.runFor(32);
  await expect(page.locator("#startQualifying")).toBeVisible();
  await expect(page.locator("#pause")).toBeHidden();
  await expect(page.locator("#relativeOrder .is-player")).toContainText(
    "D. Kluszic",
  );
  await openRaceMenu(page);
  await expect(page.locator("#directRace")).toBeHidden();
  await expect(page.locator("#prepareRace")).toBeHidden();
  await expect(page.locator("#cancelQualifying")).toBeHidden();
  await page.evaluate(() => {
    document.getElementById("directRace").onclick();
    document.getElementById("pause").onclick();
  });
  await page.clock.runFor(4000);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("grid");
  await closeRaceMenu(page);
  await page.locator("#startQualifying").click();
  await page.clock.runFor(4500);
  await openRaceMenu(page, "classification");
  await expect(page.locator("#classificationTitle")).toContainText(
    "Qualifying",
  );
  await expect(page.locator("#raceOrder li")).toHaveCount(13);
  expect(await page.evaluate(() => __driveSnapshot.visibleEntries.length)).toBe(
    1,
  );
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-qualifying-classification.png`,
  });
  await page
    .locator('[data-menu-screen="classification"] [data-menu-back]')
    .click();
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#restart").click();
  expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeTruthy();
  page.once("dialog", (d) => d.accept());
  await page.locator("#restart").click();
  await page.clock.runFor(32);
  await expect(page.locator("#startQualifying")).toBeVisible();
  expect(await page.evaluate(() => __driveSnapshot.campaignPhase)).toBe(
    "qualifying-ready",
  );
  await unchanged(page);
  expect(errors).toEqual([]);
});
test("Kampagne: zwei echte Grand Prix, Migration eines Bahrain-Zwischenstands und unveränderliches Ergebnisarchiv", async ({
  page,
}, info) => {
  test.setTimeout(600000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page, { short: true });
  await page.goto("campaign.html");
  await start(page);
  let first;
  for (const track of ["bahrain", "canada"]) {
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-track",
      track,
    );
    await expect(page.locator("#startQualifying")).toBeVisible();
    await page.locator("#startQualifying").click();
    const q = await drive(page, true);
    expect(q.qualifyingResult).toHaveLength(13);
    expect(q.paused).toBe(true);
    await expect(page.locator("#acceptQualifying")).toBeHidden();
    await expect(page.locator("#pause")).toBeVisible();
    const stored = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    );
    expect(stored.weekend.result).toHaveLength(13);
    expect(stored.weekend.session.state.entries.map((e) => e.id)).toEqual(
      stored.weekend.result.map((e) => e.id),
    );
    await page.reload();
    await page.clock.runFor(32);
    expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
    expect(await page.evaluate(() => __driveSnapshot.qualifyingResult)).toEqual(
      q.qualifyingResult,
    );
    await page.locator("#pause").click();
    await drive(page);
    await page.clock.runFor(100);
    await expect(page.locator("#sessionResults")).toBeVisible();
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    await expect(page.locator("#continueCampaignAfterRace")).toBeVisible();
    if (track === "bahrain")
      await page.screenshot({
        path: `docs/racing-hud/${info.project.name}-race-result.png`,
      });
    const done = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    );
    expect(done.result.order).toHaveLength(13);
    expect(done.completed).toHaveLength(track === "bahrain" ? 1 : 2);
    expect(done.driverId).toBe("d035");
    await page.locator("#continueCampaignAfterRace").click();
    await expect(page.locator("#campaignSaved")).toBeVisible();
    if (track === "bahrain") {
      first = done.completed[0];
      // Recreate the exact old v1 representation from genuine finished sessions.
      await page.evaluate((k) => {
        const g = JSON.parse(localStorage.getItem(k)),
          fields = [
            "version",
            "kind",
            "configVersion",
            "engine",
            "teamId",
            "driverId",
            "trackId",
            "unlocked",
            "rosters",
            "lineup",
            "options",
            "stage",
            "weekend",
            "result",
            "savedAt",
          ],
          old = Object.fromEntries(fields.map((key) => [key, g[key]]));
        old.version = 1;
        old.result = {
          trackId: g.result.trackId,
          qualifying: g.result.qualifying.map(
            ({ teamId, driverId, position, bestLap }) => ({
              teamId,
              driverId,
              position,
              bestLap,
            }),
          ),
          order: g.result.order.map(
            ({ teamId, driverId, position, finishTime }) => ({
              teamId,
              driverId,
              position,
              finishTime,
            }),
          ),
        };
        localStorage.setItem(
          k,
          JSON.stringify(CGPArcade.CampaignV1.validate(old)),
        );
      }, key);
      await page.reload();
      await expect(page.locator("#campaignNext")).toBeVisible();
      await page.screenshot({
        path: `docs/racing-hud/${info.project.name}-campaign-overview.png`,
      });
      const raw = await page.evaluate((k) => localStorage.getItem(k), key);
      await page.locator("#campaignInterim button").click();
      await expect(page.locator('[data-archive-rows="race"] tr')).toHaveCount(
        13,
      );
      await page
        .getByRole("button", { name: "Schließen", exact: true })
        .click();
      expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
        raw,
      );
      await page.locator("#campaignNextTrack").selectOption("canada");
      await page.locator("#startNextCampaign").click();
      await page.clock.runFor(32);
    }
  }
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  mkdirSync("dist", { recursive: true });
  writeFileSync(`dist/hud-${info.project.name}-actual-results.json`,JSON.stringify(saved));
  expect(saved.version).toBe(2);
  expect(saved.completed[0].order).toEqual(first.order);
  expect(saved.completed[0].qualifying).toEqual(first.qualifying);
  await page.locator('[data-campaign-tab="results"]').click();
  await expect(page.locator("#campaignArchive article")).toHaveCount(2);
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-archive-list.png`,
  });
  const raw = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.locator('#campaignArchive [data-track="bahrain"] button').click();
  await expect(page.locator("#archiveResultTitle")).toContainText("Bahrain");
  await expect(page.locator('[data-archive-rows="race"] tr')).toHaveCount(13);
  expect(await page.locator('[data-archive-panel="race"] .result-scroll').evaluate(
    el => el.scrollWidth <= el.clientWidth,
  )).toBe(true);
  expect(
    await page
      .locator('[data-archive-rows="race"] tr')
      .evaluateAll((rows) => rows.map((r) => r.children[1].textContent)),
  ).toEqual(first.order.map((r) => r.driverName));
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-archive-race.png`,
  });
  await page.locator('[data-archive-tab="qualifying"]').click();
  await expect(page.locator('[data-archive-panel="qualifying"]')).toBeVisible();
  await expect(page.locator('[data-archive-rows="qualifying"] tr')).toHaveCount(
    13,
  );
  expect(await page.locator('[data-archive-panel="qualifying"] .result-scroll').evaluate(
    el => el.scrollWidth <= el.clientWidth,
  )).toBe(true);
  expect(
    await page
      .locator('[data-archive-rows="qualifying"] tr')
      .evaluateAll((rows) => rows.map((r) => r.children[1].textContent)),
  ).toEqual(first.qualifying.map((r) => r.driverName));
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-archive-qualifying.png`,
  });
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(raw);
  await page.reload();
  await page.locator('[data-campaign-tab="results"]').click();
  await expect(page.locator("#campaignArchive article")).toHaveCount(2);
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(raw);
  await unchanged(page);
  expect(errors).toEqual([]);
});
test("Kampagne: defekte und neuere Formate bleiben erhalten; abgesagte neue Kampagne überschreibt nichts", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("campaign.html");
  const future = '{"version":99}';
  await page.evaluate(({ key, future }) => localStorage.setItem(key, future), {
    key,
    future,
  });
  await page.reload();
  await expect(page.locator("#campaignMessage")).toContainText(
    "neueren Version",
  );
  await expect(page.locator("#campaignSetup")).toBeHidden();
  await page.locator('[data-campaign-tab="save"]').click();
  await page.locator("#importCampaign").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.locator("#campaignMessage")).toContainText(
    "Import abgebrochen",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(future);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await start(page);
  await openRaceMenu(page, "save");
  await page.getByRole("link", { name: "← Kampagne" }).click();
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.locator('[data-campaign-tab="save"]').click();
  await page.locator("#newCampaign").click();
  await page.locator("#campaignChooseDriver").click();
  await page.locator('[data-driver="d012"]').click();
  await page.locator("#campaignShowOverview").click();
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#startCampaign").click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  await unchanged(page);
});
test("Kampagne: bestätigter Import lädt die gewählte Identität ohne Überschreiben durch Verlassen-Autosave", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("campaign.html");
  await start(page, "d012");
  const replacement = await page.evaluate(() =>
    CGPArcade.Campaign.create({ driverId: "d035" }),
  );
  await openRaceMenu(page, "save");
  page.once("dialog", (d) => d.accept());
  await page.locator("#importPOV").setInputFiles({
    name: "campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replacement)),
  });
  await page.clock.runFor(32);
  await expect(page.locator("#relativeOrder .is-player")).toContainText(
    "D. Kluszic",
  );
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).driverId,
      key,
    ),
  ).toBe("d035");
  await unchanged(page);
});
test("Kampagne: Vollbild, Pflichtqualifying und pausiertes Fortsetzen in der vollständig eingebetteten Offline-Datei", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await prepare(page);
  const files = {
      menu: createPOVMenuOffline(),
      campaign: createCampaignOffline(),
    },
    requests = [];
  await context.route("**/*", async (route) => {
    const id = /carpet-grand-prix-(menu|campaign)-offline\.html/.exec(
      route.request().url(),
    )?.[1];
    if (id)
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: files[id],
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
  await page.locator("#startQualifying").click();
  await page.clock.runFor(5400);
  await openRaceMenu(page, "save");
  await page.locator("#savePOV").click();
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(saved.weekend.qualifying).toBe(true);
  await page.reload();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeTruthy();
  await unchanged(page);
  expect(requests).toEqual([]);
});
