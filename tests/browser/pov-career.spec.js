import { openLegacySettings, backToMenu } from "../helpers/racing-menu.js";
import { driveButton, raceAction } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { capture2D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";
import { loadArcade } from "../helpers/arcade.js";
import { createArcadeOffline, createPOVMenuOffline } from "../../scripts/build-arcade-offline.js";
const key = "carpet_gp_pov_game_v1";
async function prepare(page, shortRace = false) {
  await capture2D(page);
  await page.addInitScript(short => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    localStorage.setItem("carpet_gp_v072", "career-classic-sentinel");
    if (short) {
      let module;
      Object.defineProperty(CGPArcade, "RaceWeekend", { configurable: true,
        get: () => module, set(value) { module = { ...value, create(track, options = {}) {
          return value.create(track, { ...options, laps: 1 });
        } }; } });
    }
  }, shortRace);
}
async function ready(page) {
  await expect(page.locator("#arcadeApp")).toHaveAttribute("data-rendering", "2d"); await page.clock.runFor(32);
}
async function finish(page) {
  await page.evaluate(pilotRace, { stopOnQualifiedGrid: true });
  for (let i = 0; i < 130; i++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished" || (__driveSnapshot.race.phase === "grid" && !!__driveSnapshot.qualifyingResult))) return;
  }
  throw Error("Rennwochenende nicht beendet");
}
test("POV-Karriere: speichert ein reales Feld und setzt über Hauptmenü und Neuladen pausiert fort", async ({ page }) => {
  test.setTimeout(120000); const errors = []; page.on("pageerror", e => errors.push(e.message));
  await prepare(page);
  await page.goto("play.html"); await page.locator("#newDrive").click();
  await page.locator("#menuTeam").selectOption("t05"); await page.locator("#startDrive").click(); await ready(page);
  await driveButton(page); await page.keyboard.down("w"); await page.clock.runFor(6200);
  await openLegacySettings(page, "save"); await page.keyboard.up("w"); await page.clock.runFor(32);
  const before = await page.evaluate(() => __driveSnapshot);
  expect(before.race.phase).toBe("racing"); expect(before.paused).toBe(true);
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => __driveSnapshot.entries)).toEqual(before.entries);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await backToMenu(page);
  await expect(page.locator("#continuePOV")).toBeEnabled(); await page.locator("#continuePOV").click(); await ready(page);
  expect(await page.evaluate(() => __driveSnapshot.entries)).toEqual(before.entries);
  await driveButton(page); await page.clock.runFor(100);
  expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBeGreaterThan(before.race.elapsed);
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe("career-classic-sentinel");
  expect(errors).toEqual([]);
});
test("POV-Karriere: erhält Qualifying-Bestzeiten und übernommene Startaufstellung nach Neuladen", async ({ page }) => {
  test.setTimeout(240000); await prepare(page,true);
  await page.goto("race.html?new=single"); await ready(page);
  await raceAction(page, "startQualifying"); await finish(page);
  const result = await page.evaluate(() => __driveSnapshot.qualifyingResult);
  expect(result).toHaveLength(13);
  expect(result.every(e => e.laps.length === 1)).toBe(true);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("grid");
  await openLegacySettings(page, "save"); await page.locator("#closeSettings").click();
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => __driveSnapshot.qualifyingResult)).toEqual(result);
  await expect(page.locator("#acceptQualifying")).toBeHidden();
  const grid = await page.evaluate(() => __driveSnapshot.entries.map(e => e.id));
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => __driveSnapshot.entries.map(e => e.id))).toEqual(grid);
  expect(await page.evaluate(() => __driveSnapshot.qualifyingResult)).toEqual(result);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
});
test("POV-Karriere: verbucht ein echtes Rennen einmalig und geht mit unverändertem Team zur nächsten Strecke", async ({ page }) => {
  test.setTimeout(180000); const errors = []; page.on("pageerror", e => errors.push(e.message));
  await prepare(page,true);
  await page.goto("play.html"); await page.locator("#newChampionship").click();
  await expect(page.locator("#menuTrack")).toBeDisabled(); await page.locator("#startDrive").click(); await ready(page);
  await expect(page.locator("#team")).toBeDisabled(); await expect(page.locator("#track")).toBeDisabled();
  await driveButton(page); await finish(page);
  await raceAction(page, "commitPOVResult", { close: false });
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)),key);
  expect(saved.career.results).toHaveLength(1); expect(saved.career.results[0].order.map(e => e.points)).toEqual([25,18,15,12,10,8,6,4,2,1,0,0,0]);
  await page.evaluate(() => document.getElementById("commitPOVResult").click());
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).career.teams,key)).toEqual(saved.career.teams);
  await page.reload(); await ready(page); await expect(page.locator("#commitPOVResult")).toBeHidden();
  await raceAction(page, "nextPOVRound"); await page.clock.runFor(32);
  await expect(page.locator("#track")).toHaveValue("luxembourg");
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("grid");
  const next = await page.evaluate(k => JSON.parse(localStorage.getItem(k)),key);
  expect(next.career.round).toBe(1); expect(next.career.results).toHaveLength(1); expect(next.teamId).toBe(saved.teamId);
  await raceAction(page, "openWorkshop", { close: false }); await expect(page.locator("#povWorkshop svg")).toBeVisible();
  await expect(page.locator("[data-upgrade]")).toHaveCount(4);
  expect(errors).toEqual([]);
});
function fundedGame() {
  const { api, data } = loadArcade({ race: true });
  let g = api.POVCareer.create({ mode: "championship", teamId: "t01" });
  const snapshot = { race: { phase: "finished", finished: 13, playerTeam: "t01", standings: data.roster.teams.map((t,i) => ({ id:t.id, finishTime:30+i })) } };
  for (let i=0;i<22;i++) { g = api.POVCareer.record(g,snapshot); if (i<21) g = api.POVCareer.nextRound(g); }
  return api.POVCareer.nextSeason(g);
}
test("POV-Karriere: importiert Sicherungen, entwickelt das Teamfahrzeug und schützt einen gültigen Stand vor beschädigtem Import", async ({ page }) => {
  test.setTimeout(120000); await prepare(page);
  await page.goto("play.html"); await openLegacySettings(page, "save");
  const game = fundedGame();
  await page.locator("#importMenuPOV").setInputFiles({ name:"pov.json", mimeType:"application/json", buffer:Buffer.from(JSON.stringify(game)) });
  await expect(page.locator("#menuMessage")).toContainText("importiert"); await page.locator("#closeSettings").click();
  await page.locator("#menuWorkshop").click(); await page.locator('[data-upgrade="power"]').click();
  await expect(page.locator("#workshopMessage")).toContainText("gespeichert");
  await page.locator("[data-workshop-close]").click(); await page.reload();
  await page.locator("#menuWorkshop").click(); await expect(page.locator("#workshopBudget")).toContainText("188 Credits");
  await page.locator("[data-workshop-close]").click(); await page.locator("#continuePOV").click(); await ready(page);
  expect(await page.evaluate(() => CGPArcade.Physics.parameters.maxSpeed)).toBe(110);
  expect(await page.evaluate(() => CGPArcade.POVWorkshop.drivingEffectsActive)).toBe(false);
  await openLegacySettings(page, "save");
  const before = await page.evaluate(k => localStorage.getItem(k),key);
  await page.locator("#importPOV").setInputFiles({ name:"bad.json", mimeType:"application/json", buffer:Buffer.from('{"version":1}') });
  await expect(page.locator("#povSaveStatus")).toContainText("Import abgebrochen");
  expect(await page.evaluate(k => localStorage.getItem(k),key)).toBe(before);
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe("career-classic-sentinel");
});

test("POV-Karriere: speichert und setzt mit vollständig abgeschaltetem Netzwerk offline fort", async ({ page, context }) => {
  test.setTimeout(120000); await prepare(page);
  const requests = []; page.on("request", r => { if (r.url().startsWith("http")) requests.push(r.url()); });
  await page.route("**/__arcade_race_offline__/index.html*", route => route.fulfill({ contentType:"text/html", body:createArcadeOffline({ race:true }) }));
  await page.route("**/carpet-grand-prix-race-offline.html*", route => route.fulfill({ contentType:"text/html", body:createArcadeOffline({ race:true }) }));
  await page.route("**/carpet-grand-prix-menu-offline.html*", route => route.fulfill({ contentType:"text/html", body:createPOVMenuOffline() }));
  await context.setOffline(true);
  await page.goto("__arcade_race_offline__/index.html?new=single"); await ready(page);
  await driveButton(page); await page.keyboard.down("w"); await page.clock.runFor(6200);
  await openLegacySettings(page, "save"); await page.keyboard.up("w"); await page.clock.runFor(32);
  const before = await page.evaluate(() => __driveSnapshot.entries);
  await page.reload(); await ready(page); expect(await page.evaluate(() => __driveSnapshot.entries)).toEqual(before);
  await backToMenu(page); await page.locator("#continuePOV").click(); await ready(page);
  expect(await page.evaluate(() => __driveSnapshot.entries)).toEqual(before);
  expect(requests).toHaveLength(4);
});
test("POV-Karriere: sperrt Fortsetzen bei beschädigtem lokalen Stand ohne ihn zu überschreiben", async ({ page }) => {
  await prepare(page);
  await page.addInitScript(k => localStorage.setItem(k,"{broken"),key);
  await page.goto("race.html?resume=1");
  await expect(page.locator("#povLoadProblem")).toBeVisible(); await expect(page.locator("#pause")).toBeDisabled();
  await page.keyboard.press("p"); await page.clock.runFor(500);
  expect(await page.evaluate(k => localStorage.getItem(k),key)).toBe("{broken");
  await backToMenu(page); await expect(page.locator("#continuePOV")).toBeDisabled();
  expect(await page.evaluate(k => localStorage.getItem(k),key)).toBe("{broken");
});
