// Developer review images only. No pose writes or production test hooks.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { capture2D, capture3D } from "../tests/helpers/arcade-browser.js";
import { pilotRace } from "../tests/helpers/arcade-race-browser.js";
const output = new URL("../previews/arcade-race/", import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ["--enable-unsafe-swiftshader"],
});
try {
  let page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.goto("http://127.0.0.1:4173/carpet-grand-prix/race.html");
  await page.locator("#worldAtlas").evaluate((img) => img.decode());
  await page.clock.runFor(64);
  await page.screenshot({
    path: new URL("grid.png", output).pathname,
    fullPage: true,
  });
  await page.locator("#quality").selectOption("low");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(6000);
  await page.keyboard.up("w");
  await page.keyboard.press("p");
  await page.clock.runFor(64);
  await page
    .locator(".drive-view")
    .screenshot({ path: new URL("race-view.png", output).pathname });
  await page.close();
  page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await capture2D(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
  await page.goto("http://127.0.0.1:4173/carpet-grand-prix/race.html");
  await page.clock.runFor(32);
  await page.locator("#pause").click();
  await page.evaluate(pilotRace);
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(20000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
      break;
  }
  const finish = await page.evaluate(() => __driveSnapshot.race);
  if (finish.finished !== 13 || errors.length)
    throw Error(JSON.stringify({ finish, errors }));
  await page
    .locator("#raceResults")
    .screenshot({ path: new URL("results.png", output).pathname });
  writeFileSync(
    new URL("capture.json", output),
    JSON.stringify(
      {
        baseline: "80cd477a617e052ed09bf7ed1e973bc25529ab36",
        source:
          "Actual 3D grid/start and shared result UI; result reached through keyboard events in 2D fallback. Virtual clock, no pose/timing/state injection. Not a performance measurement.",
        finish,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Actual 13-car review images captured; errors=[]; results=" +
      finish.finished,
  );
} finally {
  await browser.close();
}
