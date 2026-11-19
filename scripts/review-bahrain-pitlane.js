import { pilotPit } from "../tests/helpers/pitlane-browser.js";
// Actual keyboard drive through the complete main lap and the service lane.
// Test instrumentation reads snapshots; never replaces physics, poses or timing.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  capture3D,
  selectDriveSetting,
} from "../tests/helpers/arcade-browser.js";
const output = "docs/bahrain-iteration2/pitlane";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader"],
});
const reports = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1200, height: 850 },
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 1,
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await capture3D(page, { renderEvery: 60 });
    await page.goto(
      "http://127.0.0.1:4173/carpet-grand-prix/arcade3d.html?track=bahrain",
    );
    await selectDriveSetting(page, "quality", "low");
    await page.locator("#pause").click();
    await page.evaluate(pilotPit);
    const shots = [
      ["01-pit-entry", 35],
      ["02-parallel-pitlane", 160],
      ["03-pit-exit", 330],
    ];
    let next = 0,
      done = false;
    for (let i = 0; i < 700; i++) {
      await page.clock.runFor(200);
      const state = await page.evaluate(() => ({
        drive: __pitDrive,
        snapshot: __driveSnapshot,
      }));
      if (next < shots.length && state.drive.progress >= shots[next][1]) {
        await page.keyboard.press("p");
        await page.clock.runFor(600);
        await page.evaluate(() => {
          __inspect3D.setQuality("auto");
          __inspect3D.draw(__driveSnapshot, undefined, false, 0);
        });
        await page.locator("#arcadeCanvas").screenshot({
          path: `${output}/${mobile ? "mobile" : "desktop"}-${shots[next][0]}.png`,
        });
        reports.push({
          mobile,
          shot: shots[next][0],
          car: state.snapshot.car,
          drive: state.drive,
          timing: state.snapshot.timing,
        });
        next++;
        await page.evaluate(() => __inspect3D.setQuality("low"));
        await page.keyboard.press("p");
      }
      if (state.drive.done) {
        done = true;
        reports.push({
          mobile,
          done: true,
          contacts: state.snapshot.contacts,
          timing: state.snapshot.timing,
          car: state.snapshot.car,
          errors,
        });
        break;
      }
    }
    if (!done || next !== shots.length || errors.length)
      throw Error(
        JSON.stringify({
          mobile,
          done,
          next,
          errors,
          last: await page.evaluate(() => ({
            drive: __pitDrive,
            car: __driveSnapshot.car,
            timing: __driveSnapshot.timing,
          })),
        }),
      );
    console.log(
      `${mobile ? "Mobile" : "Desktop"}: actual pitlane traversal and checkpoint capture complete`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  `${output}/drive.json`,
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      hashes: Object.fromEntries(
        [
          "arcade3d.html",
          ...[
            ...readFileSync("arcade3d.html", "utf8").matchAll(
              /<script src="\.\/([^"?]+)(?:\?[^" ]*)?"><\/script>/g,
            ),
          ].map((m) => m[1]),
        ].map((p) => [
          p,
          createHash("sha256").update(readFileSync(p)).digest("hex"),
        ]),
      ),
      method:
        "Actual main lap and pit lane with normal keyboard commands, unchanged Physics and Timing, no pose edits",
      reports,
    },
    null,
    2,
  ) + "\n",
);
