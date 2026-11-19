// Actual game geometry, paused grid, explicitly labelled inspection camera.
// The temporary renderer wrapper changes only this screenshot camera, no poses.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { capture3D } from "../tests/helpers/arcade-browser.js";
const output = "docs/bahrain-iteration2/details";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader"],
});
const reports = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 850 },
    deviceScaleFactor: 1,
  });
  await capture3D(page, { reviewCamera: true });
  await page.goto(
    "http://127.0.0.1:4173/carpet-grand-prix/race.html?track=bahrain",
  );
  await page.clock.runFor(32);
  for (const view of [
    { name: "01-paddock", position: [650, 64, -25], target: [710, 7, 54] },
    {
      name: "02-grandstand-figures",
      position: [680, 68, 178],
      target: [735, 19, 258],
    },
    {
      name: "03-underbed-layout",
      position: [295, 130, 735],
      target: [105, 18, 620],
    },
    {
      name: "04-start-pitlane",
      position: [630, 160, 325],
      target: [715, 0, 170],
    },
  ]) {
    await page.evaluate((view) => {
      globalThis.__reviewDetail = view;
      __inspect3D.draw(
        __driveSnapshot,
        __driveSnapshot.race.playerTeam,
        false,
        0,
      );
    }, view);
    await page
      .locator("#arcadeCanvas")
      .screenshot({ path: `${output}/${view.name}.png` });
    reports.push(view);
  }
} finally {
  await browser.close();
}
writeFileSync(
  `${output}/cameras.json`,
  JSON.stringify(
    {
      method:
        "Actual running game scene, unchanged paused grid; inspection camera explicitly distinct from normal POV",
      reports,
      hashes: Object.fromEntries(
        [
          "src/rendering/bahrain3d.js",
          "src/rendering/environment-assets3d.js",
          "src/rendering/environment-scenes.js",
          "src/data/arcade-tracks.js",
          "src/data/arcade-boundaries.js",
        ].map((p) => [
          p,
          createHash("sha256").update(readFileSync(p)).digest("hex"),
        ]),
      ),
    },
    null,
    2,
  ) + "\n",
);
