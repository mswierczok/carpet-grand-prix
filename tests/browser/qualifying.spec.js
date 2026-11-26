import { driveButton, raceAction, closeRaceMenu, openRaceMenu } from "../helpers/racing-menu.js";
import { test, expect } from "@playwright/test";
import { mkdirSync } from 'node:fs';
import { selectDriveSetting, switchToTopDown, capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

async function finishSession(page) {
  await page.evaluate(pilotRace,{stopOnQualifiedGrid:true});
  for (let i = 0; i < 160; i++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished" || (__driveSnapshot.race.phase === "grid" && !!__driveSnapshot.qualifyingResult))) return;
  }
  throw Error("Session did not finish through keyboard controls");
}

for (const offline of [false, true]) test(`Qualifying: echte Bestzeiten und Startaufstellung ${offline ? "offline" : "mit 3D-Start und Ansichtswechsel"}`, async ({ page, context }) => {
  test.setTimeout(300000);
  const errors = [], requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (offline) {
    await capture2D(page);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : original.call(this, type, ...args);
      };
    });
  } else await capture3D(page, { renderEvery: 16 });
  await page.addInitScript(() => {
    // Capture both renderers so the test driver keeps receiving live poses
    // after a real 3D-to-2D switch.
    {
      let renderer;
      Object.defineProperty(CGPArcade, "Renderer", { configurable: true,
        get: () => renderer, set(value) { renderer = { ...value, create(...args) {
          const real = value.create(...args);
          return { ...real, draw(snapshot, ...rest) {
            globalThis.__driveSnapshot = snapshot;
            globalThis.__spriteFrame = [];
            const result = real.draw(snapshot, ...rest), ids = __spriteFrame,
              stats = (globalThis.__soloSprites ||= { qFrames: 0, qMax: 0, qWrongTeam: 0, raceMax: 0 });
            if (snapshot.qualifying) {
              stats.qFrames++;
              stats.qMax = Math.max(stats.qMax, ids.length);
              stats.qWrongTeam += ids.filter((id) => id !== snapshot.race.playerTeam).length;
            } else stats.raceMax = Math.max(stats.raceMax, ids.length);
            globalThis.__spriteFrame = null;
            return result;
          } };
        } }; } });
    }
    let sprites, fleet;
    Object.defineProperty(globalThis, "CGPRaceSprites", { configurable: true,
      get: () => sprites, set(value) { sprites = { ...value, draw(ctx, pose, id, ...rest) {
        globalThis.__spriteFrame?.push(id);
        return value.draw(ctx, pose, id, ...rest);
      } }; } });
    Object.defineProperty(CGPArcade, "Fleet3D", { configurable: true,
      get: () => fleet, set(value) { fleet = { ...value, create(...args) {
        const real = value.create(...args);
        return { ...real, update(entries) {
          real.update(entries);
          if (globalThis.__driveSnapshot?.qualifying) {
            const stats = (globalThis.__soloFleet ||= { frames: 0, maxOpponents: 0 });
            stats.frames++;
            stats.maxOpponents = Math.max(stats.maxOpponents, real.group.children.filter((node) => node.visible).length);
          }
        } };
      } }; } });
    // Public race-length option only; qualifying still drives its real approach
    // and one timed lap. No changed poses, sector state or generated times.
    let module;
    Object.defineProperty(CGPArcade, "RaceWeekend", { configurable: true,
      get: () => module, set(value) { module = { ...value,
        create(track, options) { return value.create(track, { ...options, laps: 1 }); } }; } });
    localStorage.setItem("carpet_gp_v072", "qualifying-save-sentinel");
  });
  await page.goto(offline ? "__arcade_race_offline__/index.html" : "race.html");
  await page.clock.runFor(64);
  if (offline) {
    await context.setOffline(true);
    page.on("request", (r) => { if (r.url().startsWith("http")) requests.push(r.url()); });
  } else await selectDriveSetting(page, "quality", "low");
  const storage = await page.evaluate(() => ({ ...localStorage }));
  await raceAction(page, "startQualifying");
  await page.clock.runFor(1100);
  await expect(page.locator("#raceSignal .is-red")).toHaveCount(2);
  await page.keyboard.press("p");
  await page.clock.runFor(600);
  await expect(page.locator("#raceSignal .is-red")).toHaveCount(2);
  await driveButton(page);
  if (!offline) {
    await page.clock.runFor(3000);
    expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeTruthy();
    expect(await page.evaluate(() => __driveSnapshot.race.elapsed)).toBeGreaterThan(0);
    const fleet = await page.evaluate(() => __soloFleet);
    expect(fleet.frames).toBeGreaterThan(0);
    expect(fleet.maxOpponents).toBe(0);
    await page.locator("#arcadeCanvas").screenshot({ path: test.info().outputPath("solo-qualifying.png") });
    await switchToTopDown(page);
    await driveButton(page);
  }
  await finishSession(page);
  const q = await page.evaluate(() => __driveSnapshot);
  expect(q.qualifying).toBeUndefined();
  expect(q.race.phase).toBe("grid");expect(q.paused).toBe(true);
  expect(q.visibleEntries).toBeUndefined();
  expect(q.contacts).toBe(0);
  expect(q.entries.every((e) => e.timing.completed === 0 && e.car.speed === 0)).toBe(true);
  expect(q.qualifyingResult.every((e) => e.laps.length === 1 && e.bestLap === Math.min(...e.laps))).toBe(true);
  const opponentTimes = q.qualifyingResult.filter((e) => !e.player).map((e) => e.bestLap);
  expect(new Set(opponentTimes.map((t) => t.toFixed(3))).size).toBeGreaterThanOrEqual(10);
  expect(Math.max(...opponentTimes) - Math.min(...opponentTimes)).toBeGreaterThan(0.3);
  await raceAction(page,"showResults");
  await expect(page.locator("#qualifyingResults")).toBeVisible();
  await expect(page.locator("#qualifyingRows tr")).toHaveCount(13);
  await expect(page.locator("#acceptQualifying")).toBeHidden();
  const sprites = await page.evaluate(() => __soloSprites);
  expect(sprites.qFrames).toBeGreaterThan(0);
  expect(sprites.qMax).toBe(1);
  expect(sprites.qWrongTeam).toBe(0);
  await page.locator("#closeResults").click();
  await closeRaceMenu(page);
  await page.clock.runFor(32);
  const grid = await page.evaluate(() => __driveSnapshot);
  expect(grid.race.phase).toBe("grid");
  expect(grid.visibleEntries).toBeUndefined();
  expect(await page.evaluate(() => __soloSprites.raceMax)).toBe(13);
  expect(grid.entries.map((e) => e.id)).toEqual(q.qualifyingResult.map((e) => e.id));
  expect(grid.race.position).toBe(q.qualifyingResult.find(e=>e.player).position);
  expect(grid.entries.every((e) => e.car.speed === 0 && e.timing.completed === 0)).toBe(true);
  await expect(page.locator("#sessionPrompt")).toContainText("Startplatz P" + q.qualifyingResult.find(e=>e.player).position);
  await driveButton(page);
  await finishSession(page);
  expect(await page.evaluate(() => __driveSnapshot.race.finished)).toBe(13);
  await expect(page.locator("#resultRows tr")).toHaveCount(13);
  await raceAction(page, "restart");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.entries.map((e) => e.id))).toEqual(grid.entries.map((e) => e.id));
  await raceAction(page, "startQualifying");
  await page.clock.runFor(32);
  await raceAction(page, "cancelQualifying");
  await page.clock.runFor(32);
  expect(await page.evaluate(() => __driveSnapshot.qualifying)).toBeUndefined();
  await expect(page.locator("#position")).toHaveText("13 / 13");
  await expect(page.locator("#qualifyingResults")).toBeHidden();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for(const track of ['bahrain','canada','korea','france','england','russia','italy','japan'])test(`Qualifying: eine fliegende Runde mit Fahrzeugprofil, Anfahrt und automatischer Startaufstellung auf ${track}`,async({page},info)=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(track==='bahrain')await capture3D(page,{renderEvery:20});else{
    await capture2D(page,{renderEvery:20});await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
  }
  await page.addInitScript(()=>{localStorage.setItem('carpet_gp_v072','legacy-sentinel');localStorage.setItem('carpet_gp_campaign_v1','campaign-sentinel');localStorage.setItem('carpet_gp_roguelite_run_v1','run-sentinel');});
  await page.goto(`race.html?new=single&track=${track}&team=t13&difficulty=expert&catchup=0&quality=low`);await page.clock.runFor(64);
  const profile=await page.evaluate(()=>__driveSnapshot.entries.find(e=>e.player).performance);
  expect(profile.context).toBe('historical');expect(profile.strength).toBe(72);
  await page.locator('#startQualifying').click();await page.clock.runFor(64);
  const gridStart=await page.evaluate(()=>__driveSnapshot);
  expect(gridStart.entries.every(e=>e.car.s===gridStart.car.s&&e.car.speed===0)).toBe(true);
  await page.clock.runFor(3136);
  const approach=await page.evaluate(()=>__driveSnapshot);expect(approach.car.speed).toBe(0);expect(approach.car.s).toBeLessThan(-100);expect(approach.timing.started).toBe(false);
  await expect(page.locator('#hudLap')).toHaveText('ANFAHRT');
  if(track==='bahrain'){mkdirSync('docs/vehicle-performance/screenshots',{recursive:true});await page.screenshot({path:`docs/vehicle-performance/screenshots/${info.project.name}-approach.png`});}
  await page.evaluate(pilotRace,{stopOnQualifiedGrid:true,difficulty:'expert'});
  let crossed=false,done=false;
  for(let i=0;i<240;i++){
    await page.clock.runFor(500);const s=await page.evaluate(()=>__driveSnapshot);
    if(!crossed&&s.qualifying&&s.timing.started){crossed=true;expect(s.timing.completed).toBe(0);expect(s.qualifying.player.bestLap).toBeNull();
      await expect(page.locator('#hudLap')).toHaveText('SCHNELLE RUNDE 1/1');
      if(track==='bahrain'){
        await page.screenshot({path:`docs/vehicle-performance/screenshots/${info.project.name}-flying.png`});
        await openRaceMenu(page,'save');await page.locator('#savePOV').click();
        const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('carpet_gp_pov_game_v1')));
        expect(saved.weekend.session.format).toBe('flying-one-v1');expect(saved.weekend.session.race.config.laps).toBe(1);
        await page.reload();await page.clock.runFor(64);expect(await page.evaluate(()=>__driveSnapshot.paused)).toBe(true);
        expect(await page.evaluate(()=>__driveSnapshot.qualifying.format)).toBe('flying-one-v1');
        expect(await page.evaluate(()=>__driveSnapshot.entries.find(e=>e.player).performance)).toEqual(profile);
        await openRaceMenu(page);await closeRaceMenu(page);await page.clock.runFor(3040);await page.evaluate(pilotRace,{stopOnQualifiedGrid:true,difficulty:'expert'});
      }
    }
    if(s.qualifyingResult&&s.race.phase==='grid'){done=true;break;}
  }
  expect(crossed&&done).toBe(true);const grid=await page.evaluate(()=>__driveSnapshot);
  expect(grid.paused).toBe(true);expect(grid.qualifying).toBeUndefined();expect(grid.qualifyingResult).toHaveLength(13);
  expect(grid.qualifyingResult.every(e=>e.completed===1&&e.laps.length===1&&e.bestLap===e.laps[0])).toBe(true);
  expect(grid.entries.map(e=>e.id)).toEqual(grid.qualifyingResult.map(e=>e.id));
  expect(grid.entries.every(e=>e.car.speed===0&&e.timing.completed===0)).toBe(true);
  expect(grid.entries.find(e=>e.player).performance).toEqual(profile);
  await expect(page.locator('#pause')).toBeVisible();await expect(page.locator('#startQualifying')).toBeHidden();await expect(page.locator('#hudLap')).toHaveText('QUALIFYING ABGESCHLOSSEN');
  await openRaceMenu(page,'classification');await expect(page.locator('#raceOrder li')).toHaveCount(13);await expect(page.locator('#classificationTitle')).toHaveText('Qualifying-Klassement');
  await expect(page.locator('#raceOrder .is-eliminated')).toHaveCount(0);
  if(track==='bahrain'){await page.screenshot({path:`docs/vehicle-performance/screenshots/${info.project.name}-classification.png`});await closeRaceMenu(page);await page.screenshot({path:`docs/vehicle-performance/screenshots/${info.project.name}-qualifying-grid.png`});await page.setViewportSize({width:844,height:390});await page.screenshot({path:`docs/vehicle-performance/screenshots/${info.project.name}-landscape.png`});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  expect(await page.evaluate(()=>localStorage.getItem('carpet_gp_v072'))).toBe('legacy-sentinel');expect(await page.evaluate(()=>localStorage.getItem('carpet_gp_campaign_v1'))).toBe('campaign-sentinel');expect(await page.evaluate(()=>localStorage.getItem('carpet_gp_roguelite_run_v1'))).toBe('run-sentinel');expect(errors).toEqual([]);
});
