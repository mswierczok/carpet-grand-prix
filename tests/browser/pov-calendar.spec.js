import { driveButton, selectRaceOption } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { selectDriveSetting, capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace, threeLapRegression } from "../helpers/arcade-race-browser.js";
import { povIds, newPovIds } from "../helpers/pov-catalog.js";

async function fallback(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    localStorage.setItem("carpet_gp_v072", "calendar-save-sentinel");
  });
}
test("POV-Kalender: lädt neue Strecken im echten 3D-Modus und gibt die vorherigen Kontexte frei", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.goto("race.html");
  await page.clock.runFor(32);
  await expect(page.locator("#track option")).toHaveCount(22);
  expect(
    await page
      .locator("#track option")
      .evaluateAll((nodes) => nodes.map((n) => n.value)),
  ).toEqual(povIds);
  await selectRaceOption(page, "team", "t05");
  await selectDriveSetting(page, "quality", "low");
  for (const id of newPovIds) {
    await page.evaluate(
      () =>
        (globalThis.__previousGL = document
          .getElementById("arcadeCanvas")
          .getContext("webgl2")),
    );
    await selectRaceOption(page, "track", id);
    await page.clock.runFor(64);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    await expect(page.locator("#arcadeApp")).toHaveAttribute("data-track", id);
    await expect(page.locator("#team")).toHaveValue("t05");
    await expect(page.locator("#quality")).toHaveValue("low");
    expect(await page.evaluate(() => __previousGL.isContextLost())).toBe(true);
    expect(await page.evaluate(() => __driveSnapshot.entries.length)).toBe(13);
  }
  expect(errors).toEqual([]);
});

test("POV-Kalender: enthält die neuen Strecken samt Brücken ohne Netzwerkzugriff im Offline-Rennen", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await capture2D(page);
  await fallback(page);
  await page.goto("__arcade_race_offline__/index.html");
  await page.clock.runFor(64);
  await context.setOffline(true);
  const requests = [],
    errors = [];
  page.on("request", (r) => {
    if (r.url().startsWith("http")) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const id of newPovIds) {
    await selectRaceOption(page, "track", id);
    await page.clock.runFor(32);
    await expect(page.locator("#arcadeApp")).toHaveAttribute("data-track", id);
    expect(await page.evaluate(() => __driveSnapshot.entries.length)).toBe(13);
    expect(
      await page.evaluate(() => localStorage.getItem("carpet_gp_v072")),
    ).toBe("calendar-save-sentinel");
  }
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const id of newPovIds)
  test(`POV-Kalender: drei Tastaturrunden auf ${id} mit allen 13 Zieleinläufen`, async ({
    page,
  }) => {
    test.setTimeout(300000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await capture2D(page);
    await threeLapRegression(page);
    await fallback(page);
    await page.goto(`race.html?track=${id}`);
    await page.clock.runFor(32);
    const before = await page.evaluate(() => ({ ...localStorage }));
    await driveButton(page);
    await page.evaluate(pilotRace);
    for (let n = 0; n < 15; n++) {
      await page.clock.runFor(20000);
      if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
        break;
    }
    const snap = await page.evaluate(() => __driveSnapshot);
    expect(
      snap.race.phase,
      JSON.stringify(
        snap.entries.map((e) => ({
          id: e.id,
          s: e.car.s,
          laps: e.timing.completed,
          speed: e.car.speed,
        })),
      ),
    ).toBe("finished");
    expect(snap.race.finished).toBe(13);
    expect(
      snap.entries.every(
        (e) =>
          e.timing.completed === 3 &&
          e.timing.lastLap.valid &&
          e.finishTime > 0,
      ),
    ).toBe(true);
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    expect(errors).toEqual([]);
  });

for (const id of newPovIds.filter((id) => id === "korea" || id === "russia"))
  test(`POV-Kalender: folgt dem tatsächlichen 3D-Fahrzeug auf die Brücke in ${id}`, async ({
    page,
  }) => {
    test.setTimeout(300000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Sample real WebGL frames at 1/8 rate on the software GPU. Physics,
    // keyboard commands and the simulation clock run at their normal rates.
    await capture3D(page, { renderEvery: 8, observeElevation: true });
    await page.goto(`race.html?track=${id}`);
    await selectDriveSetting(page, "quality", "low");
    await page.clock.runFor(64);
    await driveButton(page);
    await page.evaluate(pilotRace);
    for (let n = 0; n < 15; n++) {
      await page.clock.runFor(5000);
      if (
        await page.evaluate(
          () => (__bridgeRenderStats?.maxElevation || 0) > 23.99,
        )
      )
        break;
    }
    const stats = await page.evaluate(() => __bridgeRenderStats);
    expect(stats.samples).toBeGreaterThan(10);
    expect(stats.maxElevation).toBeCloseTo(24, 2);
    expect(stats.maxCamera).toBeGreaterThan(36);
    expect(stats.maxError).toBeLessThan(1e-6);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    expect(errors).toEqual([]);
  });
