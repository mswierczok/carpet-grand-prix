// Developer-only real-game capture. Normal keyboard commands; no pose/state edits.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  capture3D,
  selectDriveSetting,
} from "../tests/helpers/arcade-browser.js";
import { pilotRace } from "../tests/helpers/arcade-race-browser.js";
const output =
  process.argv.find((a) => a.startsWith("--output="))?.slice(9) ||
  "docs/bahrain-world/after";
const quick = process.argv.includes("--quick");
const gate = process.argv.includes("--gate");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
const reports = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1200, height: 850 },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await capture3D(page, { renderEvery: 40, observeFleet: true });
    await page.goto(
      "http://127.0.0.1:4173/carpet-grand-prix/race.html?track=bahrain",
    );
    if (
      (await page.locator("#arcadeApp").getAttribute("data-rendering")) !== "3d"
    )
      throw Error("No genuine WebGL renderer");
    await selectDriveSetting(page, "quality", "low");
    const prefix = mobile ? "mobile" : "desktop";
    async function shot(name, overview = false) {
      await page.clock.runFor(32);
      await page.evaluate((overview) => {
        __inspect3D.setQuality("auto");
        __inspect3D.draw(
          __driveSnapshot,
          __driveSnapshot.race.playerTeam,
          overview,
          0,
        );
      }, overview);
      await page
        .locator("#arcadeCanvas")
        .screenshot({ path: `${output}/${prefix}-${name}.png` });
      const state = await page.evaluate(() => ({
        s: __driveSnapshot.car.s,
        car: __driveSnapshot.car,
        graphics: __inspect3D.diagnostics(),
      }));
      reports.push({ viewport: prefix, shot: name, ...state });
      await page.evaluate(() => __inspect3D.setQuality("low"));
    }
    await shot("01-grid");
    await page.locator("#pause").click();
    await page.evaluate(pilotRace);
    const len = await page.evaluate(
      () =>
        CGPArcade.Surface.create(CGPArcade.TrackCatalog.get("bahrain")).g.len,
    );
    const checkpoints = gate
      ? [
          ["02-gate-approach", 0.04],
          ["02b-gate-near", 0.075],
          ["03-gate-entry", 0.115],
          ["04-gate-through", 0.128],
          ["05-parked-cars", 0.143],
          ["06-corner", 0.25],
          ["07-pits", 0.977],
        ]
      : [
          ["02-camel", 0.025],
          ["03-corner", 0.25],
          ["04-tunnel-entry", 0.85],
          ["05-tunnel-inside", 0.883],
          ["06-pits", 0.977],
          ["07-finish", 1.006],
        ];
    let next = 0,
      finished = false;
    for (let i = 0; i < 1400; i++) {
      await page.clock.runFor(250);
      const s = await page.evaluate(() => ({
        s: __driveSnapshot.car.s,
        phase: __driveSnapshot.race.phase,
        completed: __driveSnapshot.timing.completed,
      }));
      if (next < checkpoints.length && s.s >= checkpoints[next][1] * len) {
        await page.keyboard.press("p");
        await shot(checkpoints[next++][0]);
        await page.keyboard.press("p");
      }
      if (
        s.phase === "finished" ||
        ((mobile || quick) && next === checkpoints.length)
      ) {
        finished = true;
        break;
      }
    }
    if (!finished || next !== checkpoints.length)
      throw Error(`${prefix}: incomplete actual drive (${next} images)`);
    await page.keyboard.press("p");
    await page.clock.runFor(32);
    if (gate) {
      await page.locator("#overview").click();
      await shot("08-overview", true);
      await page.locator("#overview").click();
    }
    reports.push({
      viewport: prefix,
      complete: !mobile && !quick,
      errors,
      final: await page.evaluate(() => ({
        race: __driveSnapshot.race,
        contacts: __driveSnapshot.contacts,
        timing: __driveSnapshot.timing,
        graphics: __inspect3D.diagnostics(),
      })),
    });
    if (errors.length) throw Error(errors.join("\n"));
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
      browser:
        "Chromium software WebGL; mobile viewport, not a physical iPhone",
      hashes: Object.fromEntries(
        [
          "src/racing/physics.js",
          "src/racing/opponents.js",
          "src/racing/race-session.js",
          "src/data/arcade-tracks.js",
          "src/data/arcade-boundaries.js",
          "src/persistence/pov-checkpoint.js",
        ].map((p) => [
          p,
          createHash("sha256").update(readFileSync(p)).digest("hex"),
        ]),
      ),
      artHashes: Object.fromEntries(
        [
          "arcade3d",
          "tracks3d",
          "bahrain3d",
          "bahrain-layout",
          "bahrain-materials3d",
          "illustrated-kit3d",
        ]
          .map((n) => `src/rendering/${n}.js`)
          .concat([
            "race.html",
            "arcade3d.html",
            "src/rendering/camera3d.js",
            "src/rendering/vehicles3d.js",
            "src/rendering/fleet3d.js",
            "src/vendor/three.js",
          ])
          .concat(
            Array.from(
              { length: 35 },
              (_, i) =>
                `assets/drivers/portraits/d${String(i + 1).padStart(3, "0")}.png`,
            ),
          )
          .filter((p) => existsSync(p))
          .map((p) => [
            p,
            createHash("sha256").update(readFileSync(p)).digest("hex"),
          ]),
      ),
      reports,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Actual Bahrain captures${quick ? " (one lap per viewport)" : " and full desktop race"} written to ${output}`,
);
