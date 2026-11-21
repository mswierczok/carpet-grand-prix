import { openLegacySettings, backToMenu } from "../helpers/racing-menu.js";
import { driveButton, selectRaceOption } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createPOVMenuOffline, createArcadeOffline } from "../../scripts/build-arcade-offline.js";
import { capture2D, capture3D, selectDriveSetting } from "../helpers/arcade-browser.js";
const classic = readFileSync(new URL("../fixtures/activeRace.json", import.meta.url), "utf8");
async function noWebGL(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
}
async function settings(page) {
  await openLegacySettings(page, "settings");
  await page.locator("#quality").selectOption("low");
  await page.locator("#difficulty").selectOption("expert");
  await page.locator("#catchup").selectOption("off");
  await page.locator("#closeSettings").click();
}
test("POV-Menü: ersetzt den normalen Simulationseinstieg, erhält alle Teamfahrzeuge und übergibt die Auswahl an 3D", async ({ page, context, isMobile }, info) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await capture3D(page, { renderEvery: 8 });
  await page.addInitScript(raw => localStorage.setItem("carpet_gp_v072", raw), classic);
  await page.goto("./");
  await expect(page).toHaveURL(/play.html$/);
  await expect(page.locator("#loadSelection")).toBeDisabled();
  await expect(page.locator('[data-launch="new-observer"]')).toHaveCount(0);
  await settings(page);
  await page.locator("#newDrive").click();
  for (let i = 1; i <= 13; i++) {
    await expect(page.locator("#teamCounter")).toHaveText(`${i} / 13`);
    await expect(page.locator("#teamCar")).toHaveAttribute("src", `./assets/cars/team-t${String(i).padStart(2, "0")}.webp`);
    expect(await page.locator("#teamCar").evaluate(async img => { await img.decode(); return img.naturalWidth > 0; })).toBe(true);
    await page.locator("#nextTeam").click();
  }
  await page.locator(".menu-car-stage").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#menuTeam")).toHaveValue("t02");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#menuTeam")).toHaveValue("t01");
  if (isMobile) {
    await page.locator(".menu-car-stage").scrollIntoViewIfNeeded();
    const b = await page.locator(".menu-car-stage").boundingBox(), cdp = await context.newCDPSession(page);
    const point = { id: 1, x: b.x + b.width / 2 + 60, y: b.y + b.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, x: point.x - 120 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("#menuTeam")).toHaveValue("t02");
    await page.locator("#previousTeam").click();
  }
  await page.locator("#menuTeam").selectOption("t05");
  await page.locator("#menuTrack").selectOption("france");
  await page.screenshot({ path: info.outputPath("team-selection.png") });
  await page.locator("#startDrive").click();
  await page.clock.runFor(64);
  await expect(page.locator("#arcadeApp")).toHaveAttribute("data-rendering", "3d");
  const snapshot = await page.evaluate(() => __driveSnapshot);
  expect(snapshot.race.playerTeam).toBe("t05"); expect(snapshot.race.difficulty).toBe("expert");
  expect(snapshot.entries.every(e => !Object.hasOwn(e, "catchup"))).toBe(true); expect(snapshot.race.phase).toBe("grid");
  await expect(page.locator("#track")).toHaveValue("france");
  await expect(page.locator("#team")).toHaveValue("t05");
  await expect(page.locator("#quality")).toHaveValue("low");
  expect(await page.evaluate(() => __inspect3D.diagnostics().quality)).toBe("low");
  await driveButton(page); await page.clock.runFor(3200);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("racing");
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe(classic);
  expect(errors).toEqual([]);
});
test("POV-Menü: gemeinsame Einstellungen und Auswahl bleiben bei Rückkehr und Neuladen erhalten", async ({ page }) => {
  await capture2D(page); await noWebGL(page);
  await page.goto("play.html"); await settings(page);
  await page.locator("#newDrive").click();
  await page.locator("#menuTeam").selectOption("t04"); await page.locator("#menuTrack").selectOption("canada");
  await page.reload();
  await expect(page.locator("#loadSelection")).toBeEnabled();
  await page.locator("#loadSelection").click();
  await expect(page.locator("#menuTeam")).toHaveValue("t04"); await expect(page.locator("#menuTrack")).toHaveValue("canada");
  await page.locator("#startDrive").click();
  await expect(page.locator("#arcadeApp")).toHaveAttribute("data-rendering", "2d");
  await page.clock.runFor(64);
  await selectDriveSetting(page, "difficulty", "hard");
  await selectDriveSetting(page, "catchup", "on");
  // Graphics is disabled in the 2D fallback; change only the available controls.
  await selectRaceOption(page, "team", "t02"); await selectRaceOption(page, "track", "bahrain");
  await page.reload(); await page.clock.runFor(32);
  await expect(page.locator("#difficulty")).toHaveValue("hard"); await expect(page.locator("#catchup")).toHaveValue("on");
  await expect(page.locator("#team")).toHaveValue("t02"); await expect(page.locator("#track")).toHaveValue("bahrain");
  await backToMenu(page);
  await expect(page).toHaveURL(/play.html$/);
  await openLegacySettings(page, "settings");
  await expect(page.locator("#difficulty")).toHaveValue("hard"); await expect(page.locator("#catchup")).toHaveValue("on");
  await expect(page.locator("#quality")).toHaveValue("low");
  await page.locator("#closeSettings").click(); await page.locator("#loadSelection").click();
  await expect(page.locator("#menuTeam")).toHaveValue("t02");
});
test("POV-Menü: verweigerter Speicher blockiert den Start nicht und alte Spielstände bleiben erreichbar", async ({ page }) => {
  await capture2D(page); await noWebGL(page);
  await page.addInitScript(raw => {
    localStorage.setItem("carpet_gp_v072", raw);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("carpet_gp_pov_")) throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  }, classic);
  await page.goto("./"); await settings(page);
  await page.locator("#newDrive").click(); await page.locator("#menuTeam").selectOption("t05"); await page.locator("#menuTrack").selectOption("france");
  await expect(page.locator("#menuMessage")).toContainText("nicht gespeichert");
  await page.locator("#startDrive").click();
  await expect(page.locator("#arcadeApp")).toHaveAttribute("data-rendering", "2d");
  await page.clock.runFor(64);
  expect(await page.evaluate(() => __driveSnapshot.race.playerTeam)).toBe("t05");
  expect(await page.evaluate(() => __driveSnapshot.race.difficulty)).toBe("expert");
  expect(await page.evaluate(() => __driveSnapshot.entries.every(e => !Object.hasOwn(e, "catchup")))).toBe(true);
  await expect(page.locator("#quality")).toHaveValue("low");
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe(classic);
  await backToMenu(page);
  await page.getByRole("link", { name: "Bisherigen Spielstand öffnen" }).click();
  await expect(page).toHaveURL(/index.html\?legacy=1$/);
  await page.locator('[data-launch="load-view"]').click();
  await expect(page.locator("#launchResume")).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe(classic);
});
test("POV-Menü: Offline-Ausgabe startet ohne externe Ressourcen und führt ins eigenständige Rennen", async ({ page, context }, info) => {
  await capture2D(page); await noWebGL(page);
  await page.route("**/__pov_menu_offline__/index.html", route => route.fulfill({ contentType: "text/html", body: createPOVMenuOffline() }));
  await page.route("**/carpet-grand-prix-race-offline.html?*", route => route.fulfill({ contentType: "text/html", body: createArcadeOffline({ race: true }) }));
  await context.setOffline(true);
  const requests = [], errors = [];
  page.on("request", r => { if (r.url().startsWith("http")) requests.push(r.url()); });
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("__pov_menu_offline__/index.html"); await settings(page);
  await page.locator("#newDrive").click(); await page.locator("#menuTeam").selectOption("t10"); await page.locator("#menuTrack").selectOption("canada");
  expect(await page.locator("#teamCar").evaluate(async img => { await img.decode(); return img.naturalWidth > 0; })).toBe(true);
  await page.screenshot({ path: info.outputPath("offline-menu.png") });
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#startDrive").click();
  await expect(page.locator("#arcadeApp")).toHaveAttribute("data-rendering", "2d");
  await page.clock.runFor(64);
  expect(await page.evaluate(() => __driveSnapshot.race.playerTeam)).toBe("t10");
  await expect(page.locator("#track")).toHaveValue("canada");
  await driveButton(page); await page.clock.runFor(3200);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("racing");
  expect(requests).toHaveLength(2); expect(requests.every(url => /\/[^/]+\.html(?:\?|$)/.test(url))).toBe(true);
  expect(errors).toEqual([]);
});
