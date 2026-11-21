import { driveButton, raceAction } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import {
  capture2D,
  capture3D,
  keyboardPilot,
} from "../helpers/arcade-browser.js";
test("zeigt alle früheren Seil-Engstellen und die Übersicht mit demselben fehlerfreien Spielrenderer", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.goto("previews/track-boundaries/index.html");
  await page.clock.runFor(32);
  for (const s of ["1080", "1140", "1518", "1734", "1810"]) {
    await page.locator("#spot").selectOption(s);
    const d = await page.evaluate(() => __inspect3D.diagnostics());
    expect(d.lost).toBe(false);
    expect(d.drawCalls).toBeGreaterThan(5);
    expect(d.triangles).toBeGreaterThan(1000);
    expect(d.triangles).toBeLessThan(30000);
    expect(
      await page.evaluate(() =>
        document
          .getElementById("previewCanvas")
          .getContext("webgl2")
          .getError(),
      ),
    ).toBe(0);
  }
  await raceAction(page, "overview");
  expect(await page.evaluate(() => __inspect3D.diagnostics().lost)).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

for (const entry of ["arcade.html", "arcade3d.html"])
  test(`${entry}: verhindert die Abkürzung im echten Fahrtest mit ausschließlich Tastaturbefehlen`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (entry === "arcade3d.html") {
      if (info.project.name === "chromium")
        await page.setViewportSize({ width: 600, height: 750 });
      await capture3D(page);
    } else await capture2D(page);
    await page.goto(entry);
    if (entry === "arcade3d.html") {
      await expect(page.locator("#arcadeApp")).toHaveAttribute(
        "data-rendering",
        "3d",
      );
      await page.locator("#quality").selectOption("low");
    }
    await driveButton(page);
    await page.evaluate(keyboardPilot, { tryShortcut: true });
    await page.clock.runFor(22000);
    const result = await page.evaluate(() => ({
      attempting: globalThis.__attemptingShortcut,
      snapshot: globalThis.__driveSnapshot,
    }));
    expect(result.attempting).toBe(true);
    expect(result.snapshot.contacts).toBeGreaterThan(0);
    expect(result.snapshot.paused).toBe(true);
    // Stopped on the approach, before reaching the return arm of the shortcut.
    expect(result.snapshot.car.s).toBeLessThan(1400);
    expect(result.snapshot.car.x).toBeGreaterThan(520);
    expect(result.snapshot.timing.invalid).toBe(false);
    await expect(page.locator("#pause")).toHaveText("▶ Fahren");
    expect(errors).toEqual([]);
  });
