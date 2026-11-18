import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

async function finishSession(page) {
  await page.evaluate(pilotRace);
  for (let i = 0; i < 160; i++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished")) return;
  }
  throw Error("Session did not finish through keyboard controls");
}

for (const offline of [false, true]) test(`Qualifying: echte Bestzeiten und Startaufstellung ${offline ? "offline" : "mit 3D-Start und Ansichtswechsel"}`, async ({ page, context }) => {
  test.setTimeout(300000);
  const errors = [], requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (offline) {
    await capture2D(page);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : original.call(this, type, ...args);
      };
    });
  } else await capture3D(page, { renderEvery: 16 });
  await page.addInitScript(() => {
    // Capture both renderers so the test driver keeps receiving live poses
    // after a real 3D-to-2D switch.
    if (!Object.getOwnPropertyDescriptor(CGPArcade, "Renderer")) {
      let renderer;
      Object.defineProperty(CGPArcade, "Renderer", { configurable: true,
        get: () => renderer, set(value) { renderer = { ...value, create(...args) {
          const real = value.create(...args);
          return { ...real, draw(snapshot, ...rest) {
            globalThis.__driveSnapshot = snapshot;
            return real.draw(snapshot, ...rest);
          } };
        } }; } });
    }
    // Public race-length option only; qualifying still drives its real outlap
    // and two timed laps. No changed poses, sector state or generated times.
    let module;
    Object.defineProperty(CGPArcade, "RaceWeekend", { configurable: true,
      get: () => module, set(value) { module = { ...value,
        create(track, options) { return value.create(track, { ...options, laps: 1 }); } }; } });
    localStorage.setItem("carpet_gp_v072", "qualifying-save-sentinel");
  });
  await page.goto(offline ? "__arcade_race_offline__/index.html" : "race.html");
  await page.clock.runFor(64);
  if (offline) {
    await context.setOffline(true);
    page.on("request", (r) => { if (r.url().startsWith("http")) requests.push(r.url()); });
  } else await page.locator("#quality").selectOption("low");
  const storage = await page.evaluate(() => ({ ...localStorage }));
  await page.locator("#startQualifying").click();
  await page.clock.runFor(1100);
  await expect(page.locator("#raceSignal")).toHaveText("2");
  await page.keyboard.press("p");
  await page.clock.runFor(600);
  await expect(page.locator("#raceSignal")).toHaveText("2");
  await page.locator("#pause").click();
  if (!offline) {
    await page.clock.runFor(3000);
    expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeTruthy();
    expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBeGreaterThan(0);
    await page.locator("#fallback").click();
    await page.locator("#pause").click();
  }
  await finishSession(page);
  const q = await page.evaluate(() => __driveSnapshot);
  expect(q.qualifying.finished).toBe(true);
  expect(q.entries.every((e) => e.timing.completed === 3 && !e.slipstream && !e.catchup)).toBe(true);
  expect(q.qualifying.standings.every((e) => e.laps.length === 2 && e.bestLap === Math.min(...e.laps))).toBe(true);
  await expect(page.locator("#qualifyingResults")).toBeVisible();
  await expect(page.locator("#qualifyingRows tr")).toHaveCount(13);
  await expect(page.locator("#acceptQualifying")).toBeVisible();
  await page.locator("#acceptQualifying").click();
  await page.clock.runFor(32);
  const grid = await page.evaluate(() => __driveSnapshot);
  expect(grid.race.phase).toBe("grid");
  expect(grid.entries.map((e) => e.id)).toEqual(q.qualifying.standings.map((e) => e.id));
  expect(grid.race.position).toBe(q.qualifying.player.position);
  expect(grid.entries.every((e) => e.car.speed === 0 && e.timing.completed === 0)).toBe(true);
  await expect(page.locator("#status")).toContainText("Startplatz " + q.qualifying.player.position);
  await page.locator("#pause").click();
  await finishSession(page);
  expect(await page.evaluate(() => __driveSnapshot.race.finished)).toBe(13);
  await expect(page.locator("#resultRows tr")).toHaveCount(13);
  await page.locator("#restart").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.entries.map((e) => e.id))).toEqual(grid.entries.map((e) => e.id));
  await page.locator("#startQualifying").click();
  await page.clock.runFor(32);
  await page.locator("#cancelQualifying").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeUndefined();
  await expect(page.locator("#position")).toHaveText("13 / 13");
  await expect(page.locator("#qualifyingResults")).toBeHidden();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
