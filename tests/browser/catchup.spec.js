import { test, expect } from "@playwright/test";
import { selectDriveSetting, capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

async function observeSupport(page) {
  await page.addInitScript(() => {
    let session;
    Object.defineProperty(CGPArcade, "RaceSession", { configurable: true,
      get: () => session, set(value) {
        session = { ...value, create(track, options = {}) {
          const real = value.create(track, { ...options, laps: 1 });
          globalThis.__supportStats = { samples: 0, active: 0, violations: 0, maxPace: 0, playerMax: 0 };
          return { ...real, advance(...args) {
            const result = real.advance(...args), snap = real.snapshot(), stats = __supportStats;
            stats.samples++;
            for (const e of snap.entries) if (e.catchup) {
              const c = e.catchup;
              stats.maxPace = Math.max(stats.maxPace, c.pace);
              if (e.player) stats.playerMax = Math.max(stats.playerMax, c.pace);
              if (c.pace > 0) {
                stats.active++;
                stats.violations += Number(e.player || c.position <= 3 || c.pace > 0.01200001 || c.recoveryRemaining > 8.00001);
              }
            }
            return result;
          } };
        } };
      } });
    localStorage.setItem("carpet_gp_v072", "catchup-classic-sentinel");
  });
}
async function fallback(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
}

test("Aufholhilfe: Auswahl wird als Einstellung gespeichert, bleibt ab Countdown gesperrt und erhält den klassischen Spielstand", async ({ page }) => {
  test.setTimeout(180000);
  await capture3D(page, { renderEvery: 8 }); await observeSupport(page);
  await page.goto("race.html?balance=1"); await page.clock.runFor(32);
  await selectDriveSetting(page, "difficulty", "hard");
  const saved = await page.evaluate(() => ({ ...localStorage }));
  await page.locator("#team").selectOption("t05");
  await selectDriveSetting(page, "catchup", "off"); await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.entries.every((e) => !Object.hasOwn(e, "catchup")))).toBe(true);
  await page.locator("#track").selectOption("france"); await page.clock.runFor(32);
  await expect(page.locator("#catchup")).toHaveValue("off");
  await expect(page.locator("#team")).toHaveValue("t05");
  await expect(page.locator("#difficulty")).toHaveValue("hard");
  await selectDriveSetting(page, "catchup", "on");
  await page.locator("#pause").click(); await page.clock.runFor(1000);
  await expect(page.locator("#catchup")).toBeDisabled();
  await page.locator("#restart").click(); await page.clock.runFor(32);
  await expect(page.locator("#catchup")).toHaveValue("on");
  await expect(page.locator("#catchup")).toBeEnabled();
  expect(await page.evaluate(() => __driveSnapshot.entries.every((e) => e.catchup.pace === 0))).toBe(true);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ ...saved,
    carpet_gp_pov_selection_v1: JSON.stringify({ version: 1, teamId: "t05", trackId: "france" }),
    carpet_gp_pov_preferences_v1: JSON.stringify({ ...JSON.parse(saved.carpet_gp_pov_preferences_v1), catchup: true }),
  });
});

for (const [url, enabled, threeD] of [["race.html?balance=1", true, true],
  ["race.html?track=france&balance=1&catchup=0", false, false],
  ["__arcade_race_offline__/index.html?balance=1", true, false]])
  test(`Aufholhilfe: ${threeD ? "3D" : enabled ? "Offline" : "A/B aus"} beendet das echte Feld ohne Spieler-/Podiumsbonus`, async ({ page, context }) => {
    test.setTimeout(300000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (threeD) await capture3D(page, { renderEvery: 8 });
    else { await capture2D(page); await fallback(page); }
    await observeSupport(page);
    await page.goto(url); await page.clock.runFor(32);
    if (threeD) await selectDriveSetting(page, "quality", "low");
    if (url.startsWith("__arcade")) await context.setOffline(true);
    const saved = await page.evaluate(() => ({ ...localStorage }));
    await page.locator("#balancePanel summary").click();
    await page.locator("#pause").click(); await page.evaluate(pilotRace);
    for (let i = 0; i < 15; i++) {
      await page.clock.runFor(10000);
      if (await page.evaluate(() => __driveSnapshot.race.phase === "finished")) break;
    }
    const { snap, stats } = await page.evaluate(() => ({ snap: __driveSnapshot, stats: __supportStats }));
    expect(snap.race.finished).toBe(13);
    expect(stats.violations).toBe(0); expect(stats.playerMax).toBe(0);
    expect(stats.maxPace).toBeLessThanOrEqual(0.012);
    if (enabled) expect(stats.active).toBeGreaterThan(0);
    else {
      expect(stats.active).toBe(0);
      expect(snap.entries.every((e) => !Object.hasOwn(e, "catchup"))).toBe(true);
    }
    await expect(page.locator("#balanceReadout")).toContainText("aufholhilfe");
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(saved);
    expect(errors).toEqual([]);
  });
