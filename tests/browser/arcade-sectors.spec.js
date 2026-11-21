import { driveButton } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { capture2D } from "../helpers/arcade-browser.js";
import { sectorShoulderPilot } from "../helpers/sector-shoulder-browser.js";

test("zeichnet die Sektor-Checkpoints unsichtbar, unabhängig davon welche Linie als Nächstes erwartet wird", async ({
  page,
}) => {
  await capture2D(page);
  await page.goto("arcade.html");
  await page.clock.runFor(32);
  const identical = await page.evaluate(() => {
    const original = __driveSnapshot,
      canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;left:-10000px;top:0;width:600px;height:400px";
    document.body.append(canvas);
    try {
      const surface = CGPArcade.Surface.create(CGPArcadeData.tracks.bahrain),
        renderer = CGPArcade.Renderer.create(canvas, surface),
        frames = [];
      for (const nextGate of [0, 1, 2]) {
        renderer.draw(
          {
            ...original,
            paused: false,
            timing: { ...original.timing, nextGate },
          },
          "t01",
        );
        frames.push(canvas.toDataURL());
      }
      return frames.every((frame) => frame === frames[0]);
    } finally {
      canvas.remove();
    }
  });
  expect(identical).toBe(true);
  await expect(page.locator("#checkpoint")).not.toContainText("32");
});

test("zählt eine echte Tastaturrunde mit beiden Sektoren und Start/Ziel auf dem dunklen Rand", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture2D(page);
  await page.goto("arcade.html");
  await page.clock.runFor(32);
  await driveButton(page);
  await page.evaluate(sectorShoulderPilot);
  for (let step = 0; step < 9; step++) {
    await page.clock.runFor(20000);
    if (await page.evaluate(() => globalThis.__shoulderLapDone)) break;
  }
  const result = await page.evaluate(() => ({
    s: __driveSnapshot,
    crossings: __shoulderCrossings,
  }));
  expect(result.s.timing.completed).toBe(1);
  expect(result.s.timing.lastLap.valid).toBe(true);
  expect(result.s.contacts).toBe(0);
  expect(result.crossings.slice(-3)).toEqual([
    { index: 1, offroad: true },
    { index: 2, offroad: true },
    { index: 0, offroad: true },
  ]);
  await expect(page.locator("#laps")).toHaveText("1");
  expect(errors).toEqual([]);
});
