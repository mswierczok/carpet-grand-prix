import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import {
  openRaceMenu,
  closeRaceMenu,
  driveButton,
} from "../helpers/racing-menu.js";
async function prepare(page) {
  await capture2D(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
}
test("Racing-HUD: echter 3D-Viewport ohne Scrollen auf Desktop, iPhone hoch/quer und kleinem Smartphone", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { renderEvery: 8 });
  await page.goto("race.html?new=single&team=t13");
  for (const [name, width, height] of [
    ["desktop", 1440, 810],
    ["iphone-portrait", 390, 844],
    ["iphone-landscape", 844, 390],
    ["small-phone", 320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(64);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    const geometry = await page.locator("#arcadeCanvas").evaluate((c) => {
      const r = c.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        sw: document.documentElement.scrollWidth,
        sh: document.documentElement.scrollHeight,
        vw: innerWidth,
        vh: innerHeight,
        ratio: c.width / c.height,
      };
    });
    expect(geometry.x).toBe(0);
    expect(geometry.y).toBe(0);
    expect(geometry.w).toBe(width);
    expect(geometry.h).toBe(height);
    expect(geometry.sw).toBe(geometry.vw);
    expect(geometry.sh).toBe(geometry.vh);
    await expect
      .poll(async () => {
        await page.clock.runFor(64);
        return page
          .locator("#arcadeCanvas")
          .evaluate((c) => c.width / c.height);
      })
      .toBeCloseTo(width / height, 2);
    await expect(page.locator("#relativeOrder li")).toHaveCount(3);
    expect(await page.locator("#relativeOrder b").allTextContents()).toEqual([
      "P11",
      "P12",
      "P13",
    ]);
    await expect(page.locator("#recover")).toBeHidden();
    await expect(page.locator("#team")).toBeHidden();
    await expect(page.locator("#raceOrder")).toBeHidden();
    await page.screenshot({
      path: `docs/racing-hud/${info.project.name}-${name}.png`,
    });
  }
  expect(errors).toEqual([]);
});
test("Racing-HUD: Pause, 13 Fahrer, Zurück-Navigation, Einstellungen und bewusstes Fortsetzen", async ({
  page,
}, info) => {
  await prepare(page);
  await page.goto("race.html?new=single&team=t13");
  await page.clock.runFor(32);
  await driveButton(page);
  await page.keyboard.down("w");
  await page.clock.runFor(5600);
  await page.locator("#openSettings").click();
  await page.keyboard.up("w");
  const before = await page.evaluate(() => __driveSnapshot.race.elapsed);
  await page
    .getByRole("button", { name: "Vollständiges Klassement", exact: true })
    .click();
  await expect(page.locator("#raceOrder li")).toHaveCount(13);
  await expect(page.locator("#raceOrder .is-player")).toContainText("S. Colbe");
  await page.clock.runFor(5000);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBe(before);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-classification.png`,
  });
  await page.locator("#closeSettings").click();
  await expect(page.locator("#raceSettings")).toBeVisible();
  await expect(page.locator("#resumeRace")).toBeVisible();
  await page.locator("#closeSettings").click();
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBe(before);
  await expect(page.locator("#pause")).toBeHidden();
  await openRaceMenu(page, "settings");
  await page.locator("#steeringSensitivity").focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await closeRaceMenu(page);
  await openRaceMenu(page);
  await page.locator("#resumeRace").click();
  await expect(page.locator("#resumeCountdownNumber")).toHaveText("3");
  await page.clock.runFor(3500);
  expect(
    await page.evaluate(() => __driveSnapshot.race.elapsed),
  ).toBeGreaterThan(before);
});
test("Racing-HUD: Neustart nur nach Bestätigung, Gesamtstrecke und Zurücksetzen bleiben im Menü erreichbar", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("race.html?new=single");
  await driveButton(page);
  await page.keyboard.down("w");
  await page.clock.runFor(5400);
  await page.keyboard.up("w");
  await openRaceMenu(page);
  const before = await page.evaluate(() => __driveSnapshot.race.elapsed);
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#restart").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBe(before);
  await page.locator("#overview").click();
  await expect(page.locator("#overview")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#overview").click();
  await expect(page.locator("#overview")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#recover").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBe(0);
  page.once("dialog", (d) => d.accept());
  await page.locator("#restart").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("grid");
  await expect(page.locator("#startQualifying")).toBeVisible();
});
test("Racing-HUD: Mehrfinger-Gas und Lenken bleiben bei langem Halten, Abbruch und erneuter Berührung zuverlässig", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(!isMobile, "CDP-Multitouch im mobilen Chromium");
  await prepare(page);
  await page.goto("race.html?new=single");
  await driveButton(page);
  await page.clock.runFor(3100);
  const cdp = await context.newCDPSession(page),
    gas = await page.locator("[data-drive=throttle]").boundingBox(),
    left = await page.locator("[data-drive=left]").boundingBox(),
    point = (r, id) => ({ id, x: r.x + r.width / 2, y: r.y + r.height / 2 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(gas, 1), point(left, 2)],
  });
  await page.clock.runFor(2400);
  await expect(page.locator("[data-drive=throttle]")).toHaveClass(/is-held/);
  await expect(page.locator("[data-drive=left]")).toHaveClass(/is-held/);
  expect(await page.evaluate(() => getSelection().toString())).toBe("");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator(".is-held")).toHaveCount(0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(gas, 3)],
  });
  await page.clock.runFor(1200);
  await expect(page.locator("[data-drive=throttle]")).toHaveClass(/is-held/);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".is-held")).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
