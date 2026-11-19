import { test, expect } from "@playwright/test";
import { selectDriveSetting, capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

test("Rennlänge: zeigt alle 22 echten Standardformate auch offline und erhält Team, Grafik und Spielstand", async ({ page, context }) => {
  test.setTimeout(240000);
  await capture3D(page);
  await page.goto("__arcade_race_offline__/index.html");
  await page.clock.runFor(64);
  await page.evaluate(() => localStorage.setItem("carpet_gp_v072", "duration-sentinel"));
  await page.locator("#team").selectOption("t05");
  await selectDriveSetting(page, "quality", "low");
  await context.setOffline(true);
  const formats = await page.evaluate(() => CGPArcade.RaceFormats.settings.tracks);
  for (const [id, format] of Object.entries(formats)) {
    await page.locator("#track").selectOption(id);
    await page.clock.runFor(32);
    await expect(page.locator("#raceLap")).toHaveText(`1 / ${format.laps}`);
    await expect(page.locator("#raceLength")).toHaveText(`${format.laps} Runden`);
    await expect(page.locator("#status")).toContainText(`${format.laps} Runden`);
    await expect(page.locator("#team")).toHaveValue("t05");
    await expect(page.locator("#quality")).toHaveValue("low");
    expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe("duration-sentinel");
  }
});

for (const id of ["bahrain", "france", "russia"])
  test(`Rennlänge: vollständiges Standardrennen auf ${id} mit Tastatur und 13 Zieleinläufen`, async ({ page }) => {
    test.setTimeout(360000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (id === "bahrain") await capture3D(page, { renderEvery: 40 });
    else {
      await capture2D(page);
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : original.call(this, type, ...args);
        };
      });
    }
    await page.goto(`race.html?track=${id}`);
    await page.clock.runFor(64);
    const { laps, lengthScale } = await page.evaluate(() => {
      const track = CGPArcade.TrackCatalog.get(document.getElementById("track").value),
        surface = CGPArcade.Surface.create(track);
      return {
        laps: __driveSnapshot.race.laps,
        lengthScale: track.pov?.originalLength
          ? surface.g.len / track.pov.originalLength : 1,
      };
    });
    if (id === "bahrain") {
      expect(laps).toBe(8);
      await expect(page.locator("#arcadeApp")).toHaveAttribute("data-rendering", "3d");
      await selectDriveSetting(page, "quality", "low");
    }
    const storage = await page.evaluate(() => ({ ...localStorage }));
    await page.locator("#pause").click();
    await page.evaluate(pilotRace);
    for (let step = 0; step < 400; step++) {
      await page.clock.runFor(1000);
      if (await page.evaluate(() => __driveSnapshot.race.phase === "finished")) break;
    }
    const s = await page.evaluate(() => __driveSnapshot),
      player = s.race.standings.find((e) => e.player);
    expect(s.race.phase).toBe("finished");
    expect(s.race.finished).toBe(13);
    expect(s.entries.every((e) => e.timing.completed === laps && e.timing.lastLap.valid)).toBe(true);
    expect(player.finishTime).toBeGreaterThanOrEqual(180 * lengthScale);
    expect(player.finishTime).toBeLessThanOrEqual(240 * lengthScale);
    await page.clock.runFor(250); // Allow the existing result UI update after pausing.
    await expect(page.locator("#raceLap")).toHaveText(`${laps} / ${laps}`);
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    await page.locator("#restart").click();
    await page.clock.runFor(32);
    await expect(page.locator("#raceLap")).toHaveText(`1 / ${laps}`);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
    expect(errors).toEqual([]);
  });
