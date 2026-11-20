import { driveButton, raceAction } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { selectDriveSetting, switchToTopDown, capture2D, capture3D } from "../helpers/arcade-browser.js";
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
    {
      let renderer;
      Object.defineProperty(CGPArcade, "Renderer", { configurable: true,
        get: () => renderer, set(value) { renderer = { ...value, create(...args) {
          const real = value.create(...args);
          return { ...real, draw(snapshot, ...rest) {
            globalThis.__driveSnapshot = snapshot;
            globalThis.__spriteFrame = [];
            const result = real.draw(snapshot, ...rest), ids = __spriteFrame,
              stats = (globalThis.__soloSprites ||= { qFrames: 0, qMax: 0, qWrongTeam: 0, raceMax: 0 });
            if (snapshot.qualifying) {
              stats.qFrames++;
              stats.qMax = Math.max(stats.qMax, ids.length);
              stats.qWrongTeam += ids.filter((id) => id !== snapshot.race.playerTeam).length;
            } else stats.raceMax = Math.max(stats.raceMax, ids.length);
            globalThis.__spriteFrame = null;
            return result;
          } };
        } }; } });
    }
    let sprites, fleet;
    Object.defineProperty(globalThis, "CGPRaceSprites", { configurable: true,
      get: () => sprites, set(value) { sprites = { ...value, draw(ctx, pose, id, ...rest) {
        globalThis.__spriteFrame?.push(id);
        return value.draw(ctx, pose, id, ...rest);
      } }; } });
    Object.defineProperty(CGPArcade, "Fleet3D", { configurable: true,
      get: () => fleet, set(value) { fleet = { ...value, create(...args) {
        const real = value.create(...args);
        return { ...real, update(entries) {
          real.update(entries);
          if (globalThis.__driveSnapshot?.qualifying) {
            const stats = (globalThis.__soloFleet ||= { frames: 0, maxOpponents: 0 });
            stats.frames++;
            stats.maxOpponents = Math.max(stats.maxOpponents, real.group.children.filter((node) => node.visible).length);
          }
        } };
      } }; } });
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
  } else await selectDriveSetting(page, "quality", "low");
  const storage = await page.evaluate(() => ({ ...localStorage }));
  await raceAction(page, "startQualifying");
  await page.clock.runFor(1100);
  await expect(page.locator("#raceSignal .is-red")).toHaveCount(2);
  await page.keyboard.press("p");
  await page.clock.runFor(600);
  await expect(page.locator("#raceSignal .is-red")).toHaveCount(2);
  await driveButton(page);
  if (!offline) {
    await page.clock.runFor(3000);
    expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeTruthy();
    expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBeGreaterThan(0);
    const fleet = await page.evaluate(() => __soloFleet);
    expect(fleet.frames).toBeGreaterThan(0);
    expect(fleet.maxOpponents).toBe(0);
    await page.locator("#arcadeCanvas").screenshot({ path: test.info().outputPath("solo-qualifying.png") });
    await switchToTopDown(page);
    await driveButton(page);
  }
  await finishSession(page);
  const q = await page.evaluate(() => __driveSnapshot);
  expect(q.qualifying.finished).toBe(true);
  expect(q.visibleEntries.map((e) => e.id)).toEqual([q.race.playerTeam]);
  expect(q.contacts).toBe(0);
  expect(q.entries.every((e) => e.timing.completed === 3 && !e.slipstream && !e.catchup)).toBe(true);
  expect(q.qualifying.standings.every((e) => e.laps.length === 2 && e.bestLap === Math.min(...e.laps))).toBe(true);
  const opponentTimes = q.qualifying.standings.filter((e) => !e.player).map((e) => e.bestLap);
  expect(new Set(opponentTimes.map((t) => t.toFixed(3))).size).toBeGreaterThanOrEqual(10);
  expect(Math.max(...opponentTimes) - Math.min(...opponentTimes)).toBeGreaterThan(0.3);
  await expect(page.locator("#qualifyingResults")).toBeVisible();
  await expect(page.locator("#qualifyingRows tr")).toHaveCount(13);
  await expect(page.locator("#acceptQualifying")).toBeVisible();
  const sprites = await page.evaluate(() => __soloSprites);
  expect(sprites.qFrames).toBeGreaterThan(0);
  expect(sprites.qMax).toBe(1);
  expect(sprites.qWrongTeam).toBe(0);
  await raceAction(page, "acceptQualifying");
  await page.clock.runFor(32);
  const grid = await page.evaluate(() => __driveSnapshot);
  expect(grid.race.phase).toBe("grid");
  expect(grid.visibleEntries).toBeUndefined();
  expect(await page.evaluate(() => __soloSprites.raceMax)).toBe(13);
  expect(grid.entries.map((e) => e.id)).toEqual(q.qualifying.standings.map((e) => e.id));
  expect(grid.race.position).toBe(q.qualifying.player.position);
  expect(grid.entries.every((e) => e.car.speed === 0 && e.timing.completed === 0)).toBe(true);
  await expect(page.locator("#sessionPrompt")).toContainText("Startplatz P" + q.qualifying.player.position);
  await driveButton(page);
  await finishSession(page);
  expect(await page.evaluate(() => __driveSnapshot.race.finished)).toBe(13);
  await expect(page.locator("#resultRows tr")).toHaveCount(13);
  await raceAction(page, "restart");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.entries.map((e) => e.id))).toEqual(grid.entries.map((e) => e.id));
  await raceAction(page, "startQualifying");
  await page.clock.runFor(32);
  await raceAction(page, "cancelQualifying");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeUndefined();
  await expect(page.locator("#position")).toHaveText("13 / 13");
  await expect(page.locator("#qualifyingResults")).toBeHidden();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
