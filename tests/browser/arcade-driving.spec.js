import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";

for (const entry of ["arcade.html", "arcade3d.html"]) {
  async function open(page) {
    await (entry === "arcade3d.html" ? capture3D(page) : capture2D(page));
    await page.addInitScript(() =>
      localStorage.setItem("carpet_gp_driving_sentinel", "keep"),
    );
    await page.goto(entry);
    if (entry === "arcade3d.html") {
      await expect(page.locator("#arcadeApp")).toHaveAttribute(
        "data-rendering",
        "3d",
      );
      await page.locator("#quality").selectOption("low");
    }
    await page.clock.pauseAt(
      await page.evaluate(() => new Date(Date.now() + 100).toISOString()),
    );
    await page.clock.runFor(32);
  }
  test(`${entry}: bremst, fährt rückwärts und vorwärts und löst den Haltebefehl bei Fokusverlust`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    const before = await page.evaluate(() => ({ ...localStorage })),
      initial = await page.evaluate(() => __driveSnapshot.car);
    await page.locator("#pause").click();
    await page.keyboard.down("s");
    await page.clock.runFor(200);
    await expect(page.locator("#speed")).toHaveText("0");
    await expect(page.locator("#gear")).toHaveText("N");
    await page.clock.runFor(1000);
    await expect(page.locator("#gear")).toHaveText("R");
    const back = await page.evaluate(() => __driveSnapshot.car);
    expect(back.longitudinalSpeed).toBeLessThan(-5);
    expect(back.speed * 0.3 * 3.6).toBeLessThan(25);
    expect(back.x).toBeLessThan(initial.x - 2);
    expect(back.heading).toBe(initial.heading);
    expect(back.hitWall).toBe(false);
    await page.keyboard.up("s");
    await page.keyboard.down("w");
    await page.clock.runFor(350);
    await expect(page.locator("#gear")).toHaveText("D");
    expect(
      await page.evaluate(() => __driveSnapshot.car.longitudinalSpeed),
    ).toBeGreaterThan(0);
    await page.keyboard.up("w");
    await page.keyboard.down("s");
    await page.clock.runFor(160);
    await expect(page.locator("#speed")).toHaveText("0");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.locator("#pause")).toHaveText("▶ Fahren");
    await page.keyboard.up("s");
    await page.locator("#pause").click();
    await page.clock.runFor(500);
    await expect(page.locator("#speed")).toHaveText("0");
    await expect(page.locator("#gear")).toHaveText("N");
    await page.keyboard.down("w");
    await page.keyboard.down("s");
    await page.clock.runFor(500);
    await page.keyboard.up("w");
    await page.keyboard.up("s");
    await expect(page.locator("#speed")).toHaveText("0");
    await expect(page.locator("#laps")).toHaveText("0");
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    expect(errors).toEqual([]);
    if (entry === "arcade3d.html") {
      const camera = await page.evaluate(() => __cameraStats);
      expect(camera.maxX).toBeLessThan(0.95);
      expect(camera.minY).toBeGreaterThan(-0.95);
    }
  });
  test(`${entry}: unterstützt Rückwärts über Bildschirmtaste und reagiert auf kurze Lenktipps dosiert`, async ({
    page,
  }) => {
    await open(page);
    await page.locator("#pause").click();
    const button = page.locator('[data-drive="brake"]');
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(1100);
    await page.mouse.up();
    await expect(page.locator("#gear")).toHaveText("R");
    await expect(button).not.toHaveClass(/is-held/);
    await page.locator("#restart").click();
    await page.locator("#pause").click();
    await page.keyboard.down("w");
    await page.clock.runFor(1000);
    const heading = await page.evaluate(() => __driveSnapshot.car.heading);
    await page.keyboard.down("d");
    await page.clock.runFor(150);
    await page.keyboard.up("d");
    await page.keyboard.up("w");
    await page.keyboard.press("p");
    await page.clock.runFor(32);
    const turn =
      (await page.evaluate(() => __driveSnapshot.car.heading)) - heading;
    expect(turn).toBeGreaterThan(0.02);
    expect(turn).toBeLessThan(0.22);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
