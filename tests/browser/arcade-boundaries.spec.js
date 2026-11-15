import { test, expect } from "@playwright/test";
import { capture3D } from "../helpers/arcade-browser.js";
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
  await page.locator("#overview").click();
  expect(await page.evaluate(() => __inspect3D.diagnostics().lost)).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
