import { test, expect } from "@playwright/test";
import { capture3D } from "../helpers/arcade-browser.js";
import { loadArcade } from "../helpers/arcade.js";

// locator.click() still sends mouse events in a mobile context. Use real taps
// for overlay actions, and a held touch for the driving controls.
test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
for (const campaign of [false, true])
  for (const offline of [false, true])
    test(`Touch-Start: ${campaign ? "Kampagne" : "freies Rennen"} startet das Qualifying per Fingertipp ${offline ? "offline" : "online"}`, async ({
      page,
      context,
    }) => {
      test.setTimeout(120000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await capture3D(page, { renderEvery: 8 });
      if (campaign) {
        const game = loadArcade({ race: true }).api.Campaign.create({
          driverId: "d035",
        });
        await page.addInitScript(
          (game) =>
            localStorage.setItem("carpet_gp_campaign_v1", JSON.stringify(game)),
          game,
        );
      }
      const url = campaign
        ? `${offline ? "__campaign_offline__/index.html" : "race.html"}?mode=campaign`
        : `${offline ? "__arcade_race_offline__/index.html" : "race.html"}?new=single&team=t13`;
      await page.goto(url);
      await page.clock.runFor(64);
      await expect(page.locator("#arcadeApp")).toHaveAttribute(
        "data-rendering",
        "3d",
      );
      if (offline) await context.setOffline(true);

      await page.locator("#startQualifying").tap();
      await page.clock.runFor(64);
      expect(await page.evaluate(() => !!__driveSnapshot.qualifying)).toBe(
        true,
      );
      expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe(
        "countdown",
      );
      await expect(page.locator("#startQualifying")).toBeHidden();
      await page.clock.runFor(1100);
      await expect(page.locator("#raceSignal .is-red")).toHaveCount(2);
      await page.clock.runFor(3000);
      expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe(
        "racing",
      );
      await expect(page.locator("#hudLap")).toHaveText("ANFAHRT");

      const cdp = await context.newCDPSession(page),
        gas = await page.locator('[data-drive="throttle"]').boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { id: 1, x: gas.x + gas.width / 2, y: gas.y + gas.height / 2 },
        ],
      });
      await page.clock.runFor(800);
      expect(
        await page.evaluate(() => __driveSnapshot.car.speed),
      ).toBeGreaterThan(0);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });

      await page.locator("#openSettings").tap();
      await expect(page.locator("#raceSettings")).toBeVisible();
      await page.clock.runFor(32); // Capture the first paused renderer frame.
      expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
      const elapsed = await page.evaluate(() => __driveSnapshot.race.elapsed);
      await page.clock.runFor(500);
      expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
      expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBe(
        elapsed,
      );
      await page.locator("#resumeRace").tap();
      await expect(page.locator("#resumeCountdownNumber")).toHaveText("3");
      await page.clock.runFor(3500);
      expect(
        await page.evaluate(() => __driveSnapshot.race.elapsed),
      ).toBeGreaterThan(elapsed);
      expect(await page.evaluate(() => getSelection().toString())).toBe("");
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(errors).toEqual([]);
    });

test("Touch-Start: Rennstart und Zahnrad öffnen Pause/Einstellungen per Fingertipp vor und während der Fahrt", async ({
  page,
}) => {
  test.setTimeout(120000);
  await capture3D(page, { renderEvery: 8 });
  await page.goto("race.html?new=single&team=t13");
  await page.clock.runFor(64);
  await page.locator("#openSettings").tap();
  await expect(page.locator("#raceSettings")).toBeVisible();
  await page.locator('[data-menu-target="settings"]').tap();
  await expect(page.locator("#settingsTitle")).toHaveText("Einstellungen");
  await expect(page.locator("#quality")).toBeVisible();
  await expect(page.locator("#steeringSensitivity")).toBeVisible();
  await page.locator('[data-menu-screen="settings"] [data-menu-back]').tap();
  await page.locator("#directRace").tap();
  await page.locator("#pause").tap();
  await page.clock.runFor(64);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe(
    "countdown",
  );
  expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeUndefined();
  await expect(page.locator("#pause")).toBeHidden();
  await page.clock.runFor(4100);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("racing");
  await page.locator("#openSettings").tap();
  await expect(page.locator("#raceSettings")).toBeVisible();
  await page.clock.runFor(32);
  const elapsed = await page.evaluate(() => __driveSnapshot.race.elapsed);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await page.locator('[data-menu-target="settings"]').tap();
  await expect(page.locator("#settingsTitle")).toHaveText("Einstellungen");
  await expect(page.locator("#quality")).toBeVisible();
  await expect(page.locator("#steeringSensitivity")).toBeVisible();
  await page.clock.runFor(500);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBe(elapsed);
  await page.locator('[data-menu-screen="settings"] [data-menu-back]').tap();
  await page.locator("#resumeRace").tap();
  await expect(page.locator("#resumeCountdownNumber")).toHaveText("3");
  await page.clock.runFor(3500);
  expect(
    await page.evaluate(() => __driveSnapshot.race.elapsed),
  ).toBeGreaterThan(elapsed);
});
