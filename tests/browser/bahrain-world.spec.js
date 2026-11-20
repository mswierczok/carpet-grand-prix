import { driveButton, selectRaceOption } from "../helpers/racing-menu.js";
import { pilotPit } from "../helpers/pitlane-browser.js";
import { test, expect } from "@playwright/test";
import { capture3D, selectDriveSetting, switchToTopDown } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";
test("Bahrain-Welt: echter Renderer, unveränderliche Eingabe und sicherer Wechsel zu bisherigen Strecken", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text())
    )
      errors.push(message.text());
  });
  await capture3D(page);
  await page.goto("race.html?track=bahrain");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await selectDriveSetting(page, "quality", "low");
  await page.clock.runFor(32);
  const result = await page.evaluate(() => {
    const s = structuredClone(__driveSnapshot),
      before = JSON.stringify(s),
      freeze = (o) => {
        if (!o || typeof o !== "object" || Object.isFrozen(o)) return;
        Object.values(o).forEach(freeze);
        Object.freeze(o);
      };
    freeze(s);
    for (let i = 0; i < 12; i++)
      __inspect3D.draw(s, s.race.playerTeam, false, 1 / 60);
    return {
      same: before === JSON.stringify(s),
      diag: __inspect3D.diagnostics(),
      glError: document
        .getElementById("arcadeCanvas")
        .getContext("webgl2")
        .getError(),
    };
  });
  expect(result.same).toBe(true);
  expect(result.glError).toBe(0);
  expect(result.diag.world.assets).toBe(22);
  expect(result.diag.world.room.id).toBe("motorsport-bedroom");
  expect(result.diag.world.room.furniture).toBe(6);
  expect(result.diag.world.passage.clearHeight).toBe(26);
  expect(result.diag.world.tunnelClearHeight).toBe(22);
  expect(result.diag.world.tunnelHalfWidth).toBe(32);
  expect(result.diag.drawCalls).toBeLessThan(190);
  expect(result.diag.triangles).toBeLessThan(90000);
  await selectRaceOption(page, "track", "luxembourg");
  await page.clock.runFor(32);
  const luxembourg = await page.evaluate(() => __inspect3D.diagnostics().world);
  expect(luxembourg.theme).toBe("luxembourg");
  expect(luxembourg.area).toBe("wood");
  expect(luxembourg.passages.map((passage) => passage.type)).toContain(
    "woodBridge",
  );
  await selectRaceOption(page, "track", "bahrain");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __inspect3D.diagnostics().world.theme)).toBe(
    "carpet-desert",
  );
  expect(errors).toEqual([]);
});
test("Bahrain-Welt: vollständiges Standardrennen mit 13 echten Fahrzeugen und acht Runden", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { renderEvery: 90, observeFleet: true });
  await page.addInitScript(() =>
    localStorage.setItem("carpet_gp_v072", "bahrain-classic-sentinel"),
  );
  await page.goto("race.html?track=bahrain");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await selectDriveSetting(page, "quality", "low");
  await driveButton(page);
  await page.evaluate(pilotRace);
  for (let i = 0; i < 550; i++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
      break;
  }
  const result = await page.evaluate(() => ({
    race: __driveSnapshot.race,
    timing: __driveSnapshot.timing,
    classic: localStorage.getItem("carpet_gp_v072"),
    pov: localStorage.getItem("carpet_gp_pov_game_v1"),
  }));
  expect(result.race.phase).toBe("finished");
  expect(result.race.finished).toBe(13);
  expect(result.race.standings).toHaveLength(13);
  expect(result.race.laps).toBe(8);
  expect(result.timing.completed).toBe(8);
  expect(result.timing.invalid).toBe(false);
  expect(result.classic).toBe("bahrain-classic-sentinel");
  expect(result.pov).toBeNull();
  expect(errors).toEqual([]);
});
test("Bahrain-Welt: vollständig offline mit 3D, mobilen Abmessungen und sicherem 2D-Rückfall", async ({
  page,
  context,
}) => {
  await capture3D(page);
  const requests = [];
  page.on("request", (r) => {
    if (r.url().startsWith("http")) requests.push(r.url());
  });
  await page.goto("__arcade_race_offline__/index.html?track=bahrain");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await context.setOffline(true);
  await selectDriveSetting(page, "quality", "low");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __inspect3D.diagnostics().world.theme)).toBe(
    "carpet-desert",
  );
  await driveButton(page);
  await page.keyboard.down("w");
  await page.clock.runFor(5000);
  await page.keyboard.up("w");
  expect(
    await page.evaluate(() => __driveSnapshot.race.elapsed),
  ).toBeGreaterThan(1);
  await switchToTopDown(page);
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "2d",
  );
  expect(requests).toHaveLength(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Bahrain-Welt: fährt per Tastatur durch Unterbett und offene Boxengasse mit gültiger Zielwertung", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { renderEvery: 90 });
  await page.goto("arcade3d.html?track=bahrain");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await selectDriveSetting(page, "quality", "low");
  await driveButton(page);
  await page.evaluate(pilotPit);
  for (let i = 0; i < 600; i++) {
    await page.clock.runFor(250);
    if (await page.evaluate(() => __pitDrive.done)) break;
  }
  const result = await page.evaluate(() => ({
    drive: __pitDrive,
    timing: __driveSnapshot.timing,
    contacts: __driveSnapshot.contacts,
    car: __driveSnapshot.car,
  }));
  expect(result.drive.done).toBe(true);
  expect(result.timing.completed).toBe(1);
  expect(result.timing.lastLap.valid).toBe(true);
  expect(result.contacts).toBe(0);
  expect(result.car.hitWall).toBe(false);
  expect(errors).toEqual([]);
});
