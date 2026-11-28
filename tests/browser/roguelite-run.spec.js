import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { capture2D, capture3D } from '../helpers/arcade-browser.js';
import { pilotRace } from '../helpers/arcade-race-browser.js';
import { openRaceMenu, closeRaceMenu } from '../helpers/racing-menu.js';
import { createRunOffline, createPOVMenuOffline, createCampaignOffline } from '../../scripts/build-arcade-offline.js';
const key = 'carpet_gp_roguelite_run_v1';
const old = { carpet_gp_campaign_v1:'original-campaign-sentinel', carpet_gp_v072:'classic-sentinel', carpet_gp_pov_game_v1:'pov-sentinel' };
async function prepare(page, { threeD = false } = {}) {
  if (threeD) await capture3D(page, { renderEvery:30 }); else await capture2D(page, { renderEvery:30 });
  await page.addInitScript(({ old, threeD }) => {
    for (const [k,v] of Object.entries(old)) if (localStorage.getItem(k) === null) localStorage.setItem(k,v);
    if (!threeD) { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type,...args) { return type === 'webgl2' ? null : original.call(this,type,...args); }; }
    // Existing public one-lap option only in the temporary test realm. All
    // qualifying laps, native inputs, 13 cars and finish timing remain real.
    globalThis.CGPArcade ||= {}; let module;
    Object.defineProperty(CGPArcade,'RaceWeekend',{configurable:true,get:()=>module,set:value=>{module={...value,create:(track,options={})=>value.create(track,{...options,laps:1})};}});
  }, { old, threeD });
}
async function create(page, url='play.html') {
  await page.goto(url);
  await page.evaluate(() => CGPArcade.POVPreferences.update({ difficulty:'beginner', quality:'low' }));
  await page.locator('#openCampaign').click();
  await expect(page.locator('#runTeams button')).toHaveCount(13);
  await expect(page.locator('#runTeams button:disabled')).toHaveCount(12);
  await page.locator('#runChooseDriver').click();
  await page.locator('[data-driver="d012"]').click();
  await page.locator('#runCreate').click();
  await expect(page.locator('#runAbilityOffers button')).toHaveCount(3);
}
async function current(page) { return page.evaluate(k => JSON.parse(localStorage.getItem(k)).active,key); }
async function enterRace(page,id) {
  await page.locator(`[data-node="${id}"]`).click();
  await expect(page.locator('#arcadeApp')).toHaveAttribute('data-rendering',/2d|3d/);
  await page.clock.runFor(64);
  await expect(page.locator('#startQualifying')).toBeVisible();
}
async function drive(page, qualifying=false, difficulty='expert') {
  await page.evaluate(pilotRace, { stopOnQualifiedGrid:qualifying, difficulty });
  for(let i=0;i<300;i++) {
    await page.clock.runFor(1000);
    const s=await page.evaluate(()=>globalThis.__driveSnapshot);
    if(qualifying ? s.qualifyingResult && s.race.phase==='grid' : s.race.phase==='finished') return s;
  }
  throw Error('Native Run-Browserfahrt nicht abgeschlossen');
}
async function unchanged(page) { for (const [k,v] of Object.entries(old)) expect(await page.evaluate(k=>localStorage.getItem(k),k)).toBe(v); }
test('Roguelite: einmalige Startangebote, feste komplette Karte, erreichbarer Fortschritt und Pflichtqualifying im POV', async ({page},info)=>{
  test.setTimeout(180000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await prepare(page,{threeD:true}); await create(page);
  const before=await current(page); expect(before.startOffers).toHaveLength(3);
  await expect(page.locator('#runTeamAbility')).toContainText('ohne Wirkung');
  mkdirSync('docs/roguelite',{recursive:true});
  await page.screenshot({path:`docs/roguelite/${info.project.name}-abilities.png`,fullPage:true});
  await page.reload(); expect((await current(page)).startOffers).toEqual(before.startOffers); expect((await current(page)).eventContents).toEqual(before.eventContents);
  await page.locator('#runAbilityOffers button').first().click();
  await expect(page.locator('#runMapBoard .is-race')).toHaveCount(8); await expect(page.locator('#runMapBoard .is-event')).toHaveCount(7);
  await expect(page.locator('#runMapBoard path')).toHaveCount(17); await expect(page.locator('#runMapBoard button:enabled')).toHaveCount(1);
  for (const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390},{width:320,height:640}]) {
    await page.setViewportSize(viewport); await page.evaluate(()=>CGPArcade.RunMapUI.reveal(document.getElementById('runMapBoard'),'bahrain')); await page.clock.runFor(300);
    await expect(page.locator('[data-node="bahrain"]')).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`docs/roguelite/${info.project.name}-${viewport.width}x${viewport.height}-map.png`,fullPage:true});
  }
  const selected=await current(page); await page.reload(); expect((await current(page)).startAbility).toBe(selected.startAbility);
  await enterRace(page,'bahrain'); await expect(page.locator('#arcadeApp')).toHaveAttribute('data-rendering','3d');
  expect(await page.locator('#relativeOrder .is-eliminated').count()).toBe(0);
  await expect(page.locator('#directRace')).toBeHidden(); await page.locator('#startQualifying').click(); await page.clock.runFor(2000);
  expect((await current(page)).campaign.weekend.qualifying).toBe(true);
  await openRaceMenu(page,'classification'); await expect(page.locator('#raceOrder li')).toHaveCount(13); await expect(page.locator('#raceOrder .is-eliminated')).toHaveCount(0);
  await unchanged(page); expect(errors).toEqual([]);
});
test('Roguelite: vier echte Wochenenden, drei bindende Testevents und endgültige Finaleentscheidung', async({page},info)=>{
  test.setTimeout(600000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await prepare(page); await create(page); await page.locator('#runAbilityOffers button').first().click();
  const route=[['bahrain','event-a'],['canada','event-d'],['england','event-f'],['italy',null]];
  let identity;
  for (const [track,event] of route) {
    await enterRace(page,track); await page.locator('#startQualifying').click();
    const q=await drive(page,true); expect(q.qualifyingResult).toHaveLength(13); expect(q.paused).toBe(true);
    await page.reload(); await expect(page.locator('#arcadeApp')).toHaveAttribute('data-rendering','2d'); await page.clock.runFor(64);
    expect(await page.evaluate(()=>__driveSnapshot.qualifyingResult)).toEqual(q.qualifyingResult);
    await page.locator('#pause').click();
    await openRaceMenu(page); await expect(page.locator('#restart')).toBeDisabled();
    const saved=await current(page); expect(saved.raceCommitted).toBe(true);
    await page.evaluate(()=>document.getElementById('restart').onclick()); expect(await current(page)).toEqual(saved);
    await closeRaceMenu(page); await drive(page);
    const run=await current(page); expect(run.campaign.result.order).toHaveLength(13);
    if(!identity) identity={driver:run.campaign.driverId,ability:run.startAbility};
    expect(run.campaign.driverId).toBe(identity.driver); expect(run.startAbility).toBe(identity.ability);
    if(event)expect(run.campaign.result.order.find(r=>r.teamId===run.campaign.teamId).position).toBeLessThanOrEqual(CGPRule(track));
    await page.locator('#continueCampaignAfterRace').click();
    if(event) {
      await page.locator(`[data-node="${event}"]`).click();
      const chosen=await current(page); expect(chosen.phase.currentNode).toBe(event);
      await page.locator('#runEventClose').click();
      const alternatives=await page.locator('#runMapBoard button:enabled').getAttribute('data-node'); expect(alternatives).toBe(event);
      await page.reload(); await page.locator(`[data-node="${event}"]`).click();
      await page.screenshot({path:`docs/roguelite/${info.project.name}-event.png`});
      await page.locator('#runEventOffers button').first().click();
      const complete=await current(page); expect(complete.build).toEqual(run.build);
    }
  }
  const done=await current(page),place=done.campaign.result.order.find(r=>r.teamId===done.campaign.teamId).position;
  expect(done.status).toBe(place===1?'won':'failed');expect(done.phase.status).toBe(place===1?'completed':'failed');expect(done.outcome.reason).toBe(place===1?'prototype-complete':'eliminated');expect(done.campaign.completed).toHaveLength(4);expect(done.decisions).toHaveLength(3);
  await expect(page.locator('#runOutcomeTitle')).toContainText(place===1?'oben':'hier'); await expect(page.locator('#runMapBoard button:enabled')).toHaveCount(0);
  await page.screenshot({path:`docs/roguelite/${info.project.name}-phase-finale.png`,fullPage:true});
  await page.locator('[data-run-tab="results"]').click(); await expect(page.locator('#runArchive .run-result-card')).toHaveCount(4);
  await page.locator('#runArchive button').first().click(); await expect(page.locator('[data-archive-rows="race"] tr')).toHaveCount(13);
  await page.locator('[data-archive-tab="qualifying"]').click(); await expect(page.locator('[data-archive-rows="qualifying"] .is-eliminated')).toHaveCount(0);
  const raw=await page.evaluate(k=>localStorage.getItem(k),key); await page.locator('#campaignResultDialog .settings-heading button').click(); await page.reload(); expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(raw);
  await unchanged(page); expect(errors).toEqual([]);
});
function CGPRule(track){return track==='bahrain'?10:track==='canada'?8:track==='england'?5:1;}
test('Roguelite: tatsächlich gewonnener PR55-Run bleibt mit allen vier Ergebnissen lesbar',async({page})=>{
  await prepare(page);const fixture=JSON.parse(readFileSync('tests/fixtures/vehicle-performance-legacy-won-run.json','utf8'));
  expect(fixture.sourceCommit).toBe('b4a797c7b9b390243db6b72213e99fffb081e876');
  await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key,save:fixture.save});
  await page.goto('run.html');await expect(page.locator('#runOutcomeTitle')).toContainText('oben');
  const run=await current(page);expect(run.status).toBe('won');expect(run.campaign.completed).toHaveLength(4);expect(run.campaign.weekend.config.performance).toBeUndefined();
  await expect(page.locator('#runMapBoard button:enabled')).toHaveCount(0);
  const before=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.locator('[data-run-tab="results"]').click();await expect(page.locator('#runArchive .run-result-card')).toHaveCount(4);
  await page.locator('#runArchive button').first().click();await expect(page.locator('[data-archive-rows="race"] tr')).toHaveCount(13);
  await page.locator('[data-archive-tab="qualifying"]').click();await expect(page.locator('[data-archive-rows="qualifying"] tr')).toHaveCount(13);
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);await unchanged(page);
});
test('Roguelite: echte Niederlage, rote eigene Zeile, Reload-Schutz und Archiv beim neuen Run',async({page},info)=>{
  test.setTimeout(300000); await prepare(page,{threeD:true}); await create(page); await page.locator('#runAbilityOffers button').first().click();
  const original=await current(page); await enterRace(page,'bahrain'); await page.locator('#startQualifying').click(); await drive(page,true);
  await page.locator('#pause').click(); await page.clock.runFor(55000);
  await expect(page.locator('#relativeOrder .is-player')).toHaveClass(/is-eliminated/);
  await page.screenshot({path:`docs/roguelite/${info.project.name}-elimination-hud.png`});
  await openRaceMenu(page,'classification'); await expect(page.locator('#raceOrder .is-eliminated')).toHaveCount(3);
  await expect(page.locator('#raceOrder .is-player')).toHaveClass(/is-eliminated/);
  await page.screenshot({path:`docs/roguelite/${info.project.name}-elimination-classification.png`});
  await page.locator('[data-menu-screen="classification"] [data-menu-back]').click(); await closeRaceMenu(page); await drive(page);
  const lost=await current(page); expect(lost.status).toBe('failed'); expect(lost.outcome.position).toBe(13);
  await page.locator('#continueCampaignAfterRace').click(); await expect(page.locator('#runOutcomeTitle')).toContainText('hier');
  await expect(page.locator('#runMapBoard button:enabled')).toHaveCount(0);
  await page.screenshot({path:`docs/roguelite/${info.project.name}-phase-failure.png`,fullPage:true});
  await page.reload(); expect((await current(page)).status).toBe('failed');
  expect(await page.evaluate(({key,old})=>CGPArcade.RunStore.replace(old,localStorage.getItem(key)),{key,old:original})).toBe(false);
  await page.locator('#runNewAfterOutcome').click(); await page.locator('#runChooseDriver').click(); await page.locator('[data-driver="d035"]').click();
  page.once('dialog',d=>d.accept()); await page.locator('#runCreate').click();
  const file=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key); expect(file.active.id).not.toBe(lost.id); expect(file.archive[0].id).toBe(lost.id);
  await page.locator('[data-run-tab="results"]').click(); await expect(page.locator('#runArchive .run-result-card')).toHaveCount(1); await page.locator('#runArchive button').click(); await expect(page.locator('[data-archive-rows="race"] tr')).toHaveCount(13);
  await unchanged(page);
});
test('Roguelite: fehlgeschlagene Speicherung blockiert den gewerteten Rennstart vor dem ersten Frame',async({page})=>{
  test.setTimeout(240000); await prepare(page); await create(page); await page.locator('#runAbilityOffers button').first().click();
  await enterRace(page,'bahrain'); await page.locator('#startQualifying').click(); await drive(page,true);
  const before=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.evaluate(k=>{
    const original=Storage.prototype.setItem;
    window.__restoreRunStorage=()=>{Storage.prototype.setItem=original;};
    Storage.prototype.setItem=function(name,value){if(name===k)throw Error('Test quota'); return original.call(this,name,value);};
  },key);
  await page.locator('#pause').click();
  await expect(page.locator('[data-menu-screen="save"]')).toBeVisible();
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>__driveSnapshot.paused)).toBe(true);
  expect(await page.evaluate(()=>__driveSnapshot.race.elapsed)).toBe(0);
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
  const downloadEvent=page.waitForEvent('download'); await page.locator('#exportPOV').click();
  const download=await downloadEvent, exported=JSON.parse(readFileSync(await download.path(),'utf8'));
  expect(exported.active.raceCommitted).toBe(true);
  expect(await page.evaluate(text=>CGPArcade.RunStore.inspect(text).active.raceCommitted,JSON.stringify(exported))).toBe(true);
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
  await page.evaluate(()=>window.__restoreRunStorage());
  await page.locator('#savePOV').click(); expect((await current(page)).raceCommitted).toBe(true);
  await closeRaceMenu(page); await page.clock.runFor(7000);
  expect(await page.evaluate(()=>__driveSnapshot.race.elapsed)).toBeGreaterThan(0);
  await unchanged(page);
});
test('Roguelite: Offline-Datei hält Auswahl und Race unter derselben Datei; Altstände bleiben zugänglich',async({page,context})=>{
  test.setTimeout(120000); await prepare(page);
  const files={menu:createPOVMenuOffline(),run:createRunOffline(),campaign:createCampaignOffline()},requests=[];
  await context.route('**/*',async route=>{const id=/carpet-grand-prix-(menu|run|campaign)-offline\.html/.exec(route.request().url())?.[1];if(id)return route.fulfill({status:200,contentType:'text/html',body:files[id]});requests.push(route.request().url());return route.abort();});
  await context.setOffline(true); await create(page,'http://127.0.0.1:4173/carpet-grand-prix/carpet-grand-prix-menu-offline.html');
  const before=await current(page); await page.reload(); expect((await current(page)).startOffers).toEqual(before.startOffers);
  await page.locator('#runAbilityOffers button').first().click(); await enterRace(page,'bahrain'); await page.locator('#startQualifying').click(); await page.clock.runFor(4000);
  await openRaceMenu(page,'save'); await page.locator('#savePOV').click(); await page.reload(); await page.clock.runFor(64);
  expect(await page.evaluate(()=>__driveSnapshot.paused)).toBe(true); expect((await current(page)).campaign.weekend.qualifying).toBe(true);
  await openRaceMenu(page,'save'); await page.locator('.back-link').click(); await page.locator('[data-run-tab="save"]').click(); await expect(page.locator('#openPreviousCampaign')).toBeVisible();
  await unchanged(page); expect(requests).toEqual([]);
});
