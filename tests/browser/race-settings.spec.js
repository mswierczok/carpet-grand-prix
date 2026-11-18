import { test, expect } from "@playwright/test";
import { capture2D } from "../helpers/arcade-browser.js";

async function openRace(page, offline = false) {
  await capture2D(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    let controls;
    Object.defineProperty(CGPArcade, "Controls", { configurable: true,
      get: () => controls, set(value) {
        controls = { ...value, attach(...args) {
          const real = value.attach(...args);
          return { ...real, read() { return globalThis.__input = real.read(); } };
        } };
      } });
    localStorage.setItem("carpet_gp_v072", "settings-classic-sentinel");
  });
  await page.goto(offline ? "__arcade_race_offline__/index.html" : "race.html");
  await page.clock.runFor(32);
}
const neutral = { throttle: 0, brake: 0, steer: 0 };

test("Einstellungen: kompakter Dialog, Tastaturfokus, Pause und unveränderte Speicherung", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await openRace(page);
  const saved = await page.evaluate(() => ({ ...localStorage }));
  await expect(page.locator("#raceSettings")).not.toBeVisible();
  await expect(page.locator("#difficulty")).not.toBeVisible();
  await expect(page.locator(".bottom-panel #recover")).toHaveCount(0);
  await expect(page.locator(".race-toolbar #recover")).toHaveCount(1);
  await page.locator("#openSettings").click();
  await expect(page.getByRole("dialog", { name: "Einstellungen" })).toBeVisible();
  await expect(page.locator("#closeSettings")).toBeFocused();
  await page.locator("#difficulty").selectOption("expert");
  await page.locator("#catchup").selectOption("off");
  await page.keyboard.press("Escape");
  await expect(page.locator("#raceSettings")).not.toBeVisible();
  await expect(page.locator("#openSettings")).toBeFocused();
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(3500);
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBeGreaterThan(0);
  await page.locator("#openSettings").click();
  await page.clock.runFor(32);
  const stopped = await page.evaluate(() => __driveSnapshot);
  expect(stopped.paused).toBe(true);
  await expect(page.locator("#difficulty")).toBeDisabled();
  await expect(page.locator("#catchup")).toBeDisabled();
  await page.keyboard.press("p");
  await page.keyboard.press("r");
  await page.keyboard.down("d");
  await page.clock.runFor(400);
  expect(await page.evaluate(() => __driveSnapshot.entries)).toEqual(stopped.entries);
  expect(await page.evaluate(() => __input)).toEqual(neutral);
  await page.keyboard.up("w"); await page.keyboard.up("d");
  await page.locator("#closeSettings").click();
  await expect(page.locator("#pause")).toHaveText("Fortsetzen");
  await page.locator("#recover").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBe(0);
  await page.locator("#pause").click();
  await page.clock.runFor(400);
  expect(await page.evaluate(() => __input)).toEqual(neutral);
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe(saved.carpet_gp_v072);
  expect(errors).toEqual([]);
});

test("Einstellungen: offline bedienbar, mobil ohne Überbreite und Reset bleibt am oberen Rand", async ({ page, context }, info) => {
  await openRace(page, true);
  await context.setOffline(true);
  const requests = [];
  page.on("request", r => requests.push(r.url()));
  await page.locator("#openSettings").click();
  await page.locator("#difficulty").selectOption("hard");
  await page.locator("#catchup").selectOption("off");
  await page.screenshot({ path: info.outputPath("settings.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#closeSettings").click();
  await page.locator("#pause").click();
  await page.clock.runFor(3200);
  await page.locator(".drive-view").scrollIntoViewIfNeeded();
  const bounds = await page.locator("#recover").boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  await page.locator("#recover").click();
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBe(0);
  expect(requests).toEqual([]);
});

test("Touch: Gas und Lenken gleichzeitig, Loslassen außerhalb, Abbruch und erneutes Anfahren", async ({ page, context, isMobile }) => {
  test.skip(!isMobile, "Echte Mehrfingereingabe im Mobilprojekt");
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await openRace(page);
  await page.locator("#pause").click();
  await page.clock.runFor(3200);
  await page.locator(".touch-controls").scrollIntoViewIfNeeded();
  const point = async (selector, id) => {
    const b = await page.locator(selector).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, id };
  };
  const gas = await point('[data-drive="throttle"]', 1),
    left = await point('[data-drive="left"]', 2),
    cdp = await context.newCDPSession(page),
    send = (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  await send("touchStart", [gas]);
  await send("touchStart", [gas, left]);
  await page.clock.runFor(700);
  expect(await page.evaluate(() => __input)).toEqual({ throttle: 1, brake: 0, steer: -1 });
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBeGreaterThan(0);
  await send("touchEnd", [left]);
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __input)).toEqual({ throttle: 1, brake: 0, steer: 0 });
  await send("touchMove", [{ ...gas, y: gas.y - 110 }]);
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __input.throttle)).toBe(1);
  await send("touchEnd", []);
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __input)).toEqual(neutral);
  await send("touchStart", [gas, left]);
  await send("touchCancel", []);
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __input)).toEqual(neutral);
  await expect(page.locator(".is-held")).toHaveCount(0);
  await send("touchStart", [gas]);
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __input.throttle)).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await send("touchEnd", []);
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __input)).toEqual(neutral);
  await expect(page.locator("#pause")).toHaveText("Fortsetzen");
  await page.locator("#pause").click();
  await page.locator(".touch-controls").scrollIntoViewIfNeeded();
  const again = await point('[data-drive="throttle"]', 3);
  await send("touchStart", [again]);
  await page.clock.runFor(100);
  expect(await page.evaluate(() => __input.throttle)).toBe(1);
  await send("touchEnd", []);
  expect(await page.locator(".drive-view").evaluate(node => ({
    selection: getComputedStyle(node).userSelect,
    gesture: getComputedStyle(node).touchAction,
    contextBlocked: !node.dispatchEvent(new Event("contextmenu", { bubbles: true, cancelable: true })),
    selectionBlocked: !node.dispatchEvent(new Event("selectstart", { bubbles: true, cancelable: true })),
    selected: String(getSelection()),
  }))).toEqual({ selection: "none", gesture: "none", contextBlocked: true, selectionBlocked: true, selected: "" });
  expect(errors).toEqual([]);
});
