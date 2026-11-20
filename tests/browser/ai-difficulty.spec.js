import { driveButton, raceAction, selectRaceOption, openRaceMenu, closeRaceMenu } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { selectDriveSetting, capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

test("KI-Stufen: Auswahl bleibt über Streckenwechsel und Neuladen erhalten, klassische Daten bleiben unangetastet", async ({ page }) => {
  test.setTimeout(180000);
  await capture3D(page);
  await page.addInitScript(() => localStorage.setItem("carpet_gp_v072", "difficulty-classic-sentinel"));
  await page.goto("race.html");
  await page.clock.runFor(32);
  await expect(page.locator("#difficulty option")).toHaveCount(4);
  await selectRaceOption(page, "team", "t05");
  await selectDriveSetting(page, "quality", "low");
  for (const id of ["beginner", "hard", "expert", "normal", "expert"]) {
    await selectDriveSetting(page, "difficulty", id);
    await page.clock.runFor(32);
    expect(await page.evaluate(() => __driveSnapshot.race.difficulty)).toBe(id);
    expect(await page.evaluate(() => __driveSnapshot.race.playerTeam)).toBe("t05");
  }
  await selectRaceOption(page, "track", "france");
  await page.clock.runFor(32);
  await expect(page.locator("#difficulty")).toHaveValue("expert");
  await expect(page.locator("#quality")).toHaveValue("low");
  await expect(page.locator("#team")).toHaveValue("t05");
  await page.reload();
  await page.clock.runFor(32);
  await expect(page.locator("#difficulty")).toHaveValue("expert");
  await driveButton(page);
  await page.clock.runFor(32);
  await expect(page.locator("#difficulty")).toBeDisabled();
  await raceAction(page, "restart");
  await page.clock.runFor(32);
  await expect(page.locator("#difficulty")).toBeEnabled();
  await expect(page.locator("#difficulty")).toHaveValue("expert");
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe("difficulty-classic-sentinel");
});

test("KI-Stufen: verweigerter Speicher blockiert die Fahrt nicht und wird verständlich angezeigt", async ({ page }) => {
  await capture2D(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "carpet_gp_pov_preferences_v1") throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
    const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : originalContext.call(this, type, ...args);
    };
  });
  await page.goto("race.html");
  await page.clock.runFor(32);
  await selectDriveSetting(page, "difficulty", "expert");
  await page.clock.runFor(32);
  await expect(page.locator("#difficultyNote")).toContainText("nicht gespeichert");
  expect(await page.evaluate(() => __driveSnapshot.race.difficulty)).toBe("expert");
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_pov_preferences_v1"))).toBeNull();
});

for (const [id, difficulty] of [["bahrain", "expert"], ["france", "beginner"], ["russia", "hard"]])
  test(`KI-Stufen: ${difficulty} auf ${id} fährt mit normaler Tastatur bis zu 13 Ergebnissen`, async ({ page }) => {
    test.setTimeout(240000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (id === "bahrain") await capture3D(page, { renderEvery: 8 });
    else {
      await capture2D(page);
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : original.call(this, type, ...args);
        };
      });
    }
    // Test copy: public laps option, unchanged driving/checkpoint implementation.
    await page.route("**/src/racing/race-session.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + `
;(() => { const module = CGPArcade.RaceSession;
CGPArcade.RaceSession = { ...module, create(track, options = {}) {
  return module.create(track, { ...options, laps: options.laps ?? 1 });
}}; })();` });
    });
    await page.goto(`race.html?track=${id}&balance=1`);
    await page.clock.runFor(32);
    await selectDriveSetting(page, "difficulty", difficulty);
    await page.clock.runFor(32);
    if (id === "bahrain") await selectDriveSetting(page, "quality", "low");
    const storage = await page.evaluate(() => ({ ...localStorage }));
    await openRaceMenu(page, "settings");
    await page.locator("#balancePanel summary").click();
    await closeRaceMenu(page);
    await driveButton(page);
    await page.evaluate(pilotRace);
    for (let i = 0; i < 10; i++) {
      await page.clock.runFor(10000);
      if (await page.evaluate(() => __driveSnapshot.race.phase === "finished")) break;
    }
    const s = await page.evaluate(() => __driveSnapshot);
    expect(s.race.phase).toBe("finished");
    expect(s.race.difficulty).toBe(difficulty);
    expect(s.entries.every((e) => e.timing.completed === 1)).toBe(true);
    expect(s.entries.some((e) => e.telemetry?.reason)).toBe(true);
    await expect(page.locator("#balanceReadout")).toContainText("targetKmh");
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
    expect(errors).toEqual([]);
  });
