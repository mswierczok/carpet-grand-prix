import { driveButton, raceAction, selectRaceOption, openRaceMenu, closeRaceMenu } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { selectDriveSetting, capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

async function observeWake(page) {
  await page.addInitScript(() => {
    let module;
    Object.defineProperty(CGPArcade, "Wake3D", { configurable: true,
      get: () => module, set(value) {
        module = { create(...args) {
          const real = value.create(...args);
          return { ...real, update(snapshot) {
            real.update(snapshot);
            const expected = new Set(snapshot.entries.filter((e) => e.slipstream?.strength > 0)
              .map((e) => e.slipstream.sourceId)).size,
              stats = (globalThis.__wakeStats ||= { samples: 0, activeSamples: 0, mismatches: 0,
                peakTriangles: 0, peakEmitters: 0, rangeViolations: 0, startViolations: 0 });
            stats.samples++;
            if (expected > 0) stats.activeSamples++;
            stats.mismatches += Number(real.diagnostics().emitters !== expected || real.mesh.visible !== (expected > 0));
            stats.peakTriangles = Math.max(stats.peakTriangles, real.diagnostics().triangles);
            stats.peakEmitters = Math.max(stats.peakEmitters, expected);
            stats.rangeViolations += snapshot.entries.filter((e) => e.slipstream?.strength > 0 &&
              (e.slipstream.distanceLengths < 1 || e.slipstream.distanceLengths >= 6)).length;
            stats.startViolations += Number(expected > 0 && snapshot.race.elapsed < 7 - 1e-9);
          } };
        } };
      } });
    // Temporary test wrapper: the public laps option, no pose/physics changes.
    let session;
    Object.defineProperty(CGPArcade, "RaceSession", { configurable: true,
      get: () => session, set(value) {
        session = { ...value, create(track, options = {}) { return value.create(track, { ...options, laps: 1 }); } };
      } });
    localStorage.setItem("carpet_gp_v072", "slipstream-classic-sentinel");
  });
}

test("Windschatten: echter 3D-Heckwirbel entspricht der Physik, Pause/Neustart behalten keine veralteten Effekte", async ({ page }) => {
  test.setTimeout(300000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { renderEvery: 8 });
  await observeWake(page);
  await page.goto("race.html?balance=1");
  await selectDriveSetting(page, "quality", "low");
  await page.clock.runFor(64);
  const before = await page.evaluate(() => ({ ...localStorage }));
  await openRaceMenu(page, "settings");
  await page.locator("#balancePanel summary").click();
  await closeRaceMenu(page);
  await driveButton(page);
  await page.evaluate(pilotRace);
  await page.clock.runFor(9000); // Three seconds red, then only six seconds racing.
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBeGreaterThan(5);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBeLessThan(7);
  expect(await page.evaluate(() => __wakeStats.activeSamples)).toBe(0);
  expect(await page.evaluate(() => __driveSnapshot.entries.every((e) => e.slipstream.strength === 0))).toBe(true);
  for (let i = 0; i < 30; i++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => (__wakeStats?.activeSamples || 0) > 4)) break;
  }
  let stats = await page.evaluate(() => __wakeStats);
  expect(stats.activeSamples).toBeGreaterThan(4);
  expect(stats.mismatches).toBe(0);
  expect(stats.rangeViolations).toBe(0);
  expect(stats.startViolations).toBe(0);
  expect(stats.peakTriangles).toBeLessThanOrEqual(2496);
  await expect(page.locator("#balanceReadout")).toContainText("windschatten");
  // Rendering and the 80-ms HUD refresh need not run in the same frame.
  // Advance the paused test clock until both observe the real active effect.
  for (let i = 0; i < 400; i++) {
    if (await page.evaluate(() => __driveSnapshot.entries.find((e) => e.player).slipstream.strength > 0.1 &&
      !document.getElementById("viewDraft").hidden)) break;
    await page.clock.runFor(125);
  }
  expect(await page.evaluate(() => __driveSnapshot.entries.find((e) => e.player).slipstream.strength)).toBeGreaterThan(0.1);
  await expect(page.locator("#viewDraft")).toBeVisible();
  await page.locator("#arcadeCanvas").screenshot({ path: test.info().outputPath("windschatten-vorschau.png") });
  await page.keyboard.press("p");
  await page.clock.runFor(32);
  const paused = await page.evaluate(() => __driveSnapshot.entries.map((e) => e.slipstream));
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => __driveSnapshot.entries.map((e) => e.slipstream))).toEqual(paused);
  await raceAction(page, "restart");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.entries.every((e) => e.slipstream.strength === 0))).toBe(true);
  expect(await page.evaluate(() => __inspect3D.diagnostics().wake.emitters)).toBe(0);
  await expect(page.locator("#viewDraft")).toBeHidden();
  await selectRaceOption(page, "track", "russia");
  await page.clock.runFor(64);
  expect(await page.evaluate(() => __inspect3D.diagnostics().wake.emitters)).toBe(0);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ ...before,
    carpet_gp_pov_selection_v1: JSON.stringify({ version: 1, teamId: "t01", trackId: "russia" }),
  });
  expect(errors).toEqual([]);
});

for (const [url, enabled] of [["race.html?track=france&balance=1&slipstream=0", false],
  ["__arcade_race_offline__/index.html?balance=1", true]])
  test(`Windschatten: ${enabled ? "Offline mit Effekt" : "A/B ohne Effekt"} beendet das echte Feld im 2D-Rückfall`, async ({ page, context }) => {
    test.setTimeout(240000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await capture2D(page);
    await observeWake(page);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : original.call(this, type, ...args);
      };
    });
    await page.goto(url);
    await page.clock.runFor(32);
    if (enabled) await context.setOffline(true);
    const before = await page.evaluate(() => ({ ...localStorage }));
    await driveButton(page);
    await page.evaluate(pilotRace);
    let active = false;
    for (let i = 0; i < 90; i++) {
      await page.clock.runFor(1000);
      const snap = await page.evaluate(() => __driveSnapshot);
      active ||= snap.entries.some((e) => e.slipstream?.strength > 0);
      if (!enabled) expect(snap.entries.every((e) => !Object.hasOwn(e, "slipstream"))).toBe(true);
      if (snap.race.phase === "finished") break;
    }
    const snap = await page.evaluate(() => __driveSnapshot);
    expect(snap.race.finished).toBe(13);
    expect(active).toBe(enabled);
    expect(snap.entries.every((e) => e.timing.completed === 1 && e.timing.lastLap.valid)).toBe(true);
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    expect(errors).toEqual([]);
  });
