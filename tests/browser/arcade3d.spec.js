import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  capture3D,
  keyboardPilot,
  driveDarkShoulder,
} from "../helpers/arcade-browser.js";

test("zeichnet echte 3D-Geometrie, folgt dem Auto und erhält alle 13 Lackierungen und die Spielstandgrenze", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.addInitScript(() =>
    localStorage.setItem("carpet_gp_v072", "classic-save-sentinel"),
  );
  await page.goto("arcade3d.html");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await page.locator("#quality").selectOption("low");
  await page.clock.runFor(32);
  const initial = await page.evaluate(() => __driveSnapshot.car);
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(650);
  await page.keyboard.down("d");
  await page.clock.runFor(200);
  await page.keyboard.up("w");
  await page.keyboard.up("d");
  await page.keyboard.press("p");
  await page.clock.runFor(32);
  const moving = await page.evaluate(() => __driveSnapshot.car);
  expect(
    Math.hypot(moving.x - initial.x, moving.y - initial.y),
  ).toBeGreaterThan(10);
  expect(moving.heading).toBeGreaterThan(initial.heading + 0.03);
  const images = [];
  for (const id of await page
    .locator("#team option")
    .evaluateAll((nodes) => nodes.map((n) => n.value))) {
    await page.locator("#team").selectOption(id);
    await page.clock.runFor(32);
    images.push(
      createHash("sha256")
        .update(await page.locator("#arcadeCanvas").screenshot())
        .digest("hex"),
    );
  }
  expect(new Set(images).size).toBe(13);
  const diag = await page.evaluate(() => __inspect3D.diagnostics());
  expect(diag.drawCalls).toBeLessThan(150);
  expect(diag.triangles).toBeGreaterThan(1000);
  // The approved Bahrain art adds outlined landmark geometry. Other worlds
  // retain the original budget; full-field Bahrain has its own separate check.
  expect(diag.triangles).toBeLessThan(
    diag.world?.theme === "carpet-desert" ? 45000 : 30000,
  );
  expect(await page.evaluate(() => __driveSnapshot.car)).toEqual(moving);
  expect(
    await page.evaluate(() => localStorage.getItem("carpet_gp_v072")),
  ).toBe("classic-save-sentinel");
  expect(errors).toEqual([]);
});

test("pausiert bei echtem Kontextverlust, stellt WebGL wieder her und wechselt sicher in die Draufsicht", async ({
  page,
}) => {
  await capture3D(page);
  await page.goto("arcade3d.html");
  await page.locator("#quality").selectOption("low");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(300);
  await page.evaluate(() => {
    globalThis.__lostContext = document
      .getElementById("arcadeCanvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    __lostContext.loseContext();
  });
  await expect(page.locator("#renderNote")).toContainText("unterbrochen");
  await expect(page.locator("#pause")).toHaveText("▶ Fahren");
  await page.keyboard.up("w");
  const before = await page.locator("#lapTime").innerText();
  await page.clock.runFor(500);
  await expect(page.locator("#lapTime")).toHaveText(before);
  await page.evaluate(() => __lostContext.restoreContext());
  await page.clock.runFor(200);
  await expect(page.locator("#renderNote")).toContainText("wieder bereit");
  await page.clock.runFor(50);
  expect(await page.evaluate(() => __inspect3D.diagnostics().lost)).toBe(false);
  await page.locator("#fallback").click();
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "2d",
  );
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(500);
  await page.keyboard.up("w");
  expect(Number(await page.locator("#speed").innerText())).toBeGreaterThan(10);
});

test("bleibt ohne WebGL 2 als Fahrtest bedienbar", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : native.call(this, type, ...args);
    };
  });
  await page.goto("arcade3d.html");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "2d",
  );
  await expect(page.locator("#renderNote")).toContainText("nicht verfügbar");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(500);
  await page.keyboard.up("w");
  expect(Number(await page.locator("#speed").innerText())).toBeGreaterThan(10);
});

test("fährt offline eine vollständige gültige Bahrain-Runde durch die 3D-Welt ausschließlich per Tastatur", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180000);
  if (testInfo.project.name === "chromium")
    await page.setViewportSize({ width: 600, height: 750 });
  // Software WebGL: keep every physics/input step and >600 actual camera
  // samples, without rasterizing all 2,400 frames of this offline lap.
  // Unthrottled rendering is measured separately by measure-arcade3d.js.
  await capture3D(page, { renderEvery: 3 });
  const requests = [];
  page.on("request", (r) => {
    if (r.url().startsWith("http")) requests.push(r.url());
  });
  await page.goto("__arcade3d_offline__/index.html");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await context.setOffline(true);
  await page.locator("#quality").selectOption("low");
  await page.locator("#pause").click();
  await driveDarkShoulder(page);
  await expect(page.locator("#status")).toContainText("Dunkler Teppich");
  expect(await page.evaluate(() => __driveSnapshot.car.offroad)).toBe(true);
  expect(await page.evaluate(() => __driveSnapshot.timing.invalid)).toBe(false);
  await expect(page.locator("#arcadeApp")).not.toContainText("ungültig");
  await page.evaluate(keyboardPilot, { laps: 1 });
  await page.clock.runFor(40000);
  expect(
    Number(await page.locator("#laps").innerText()),
  ).toBeGreaterThanOrEqual(1);
  await expect(page.locator("#bestLap")).not.toHaveText("—");
  expect(await page.evaluate(() => __driveSnapshot.contacts)).toBe(0);
  expect(requests).toHaveLength(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const camera = await page.evaluate(() => __cameraStats);
  expect(camera.samples).toBeGreaterThan(600);
  expect(camera.maxX).toBeLessThan(0.95);
  expect(camera.minY).toBeGreaterThan(-0.95);
  expect(camera.maxY).toBeLessThan(0.95);
});
