import{test,expect}from'@playwright/test';
import{readFileSync}from'node:fs';
import{loadArcade}from'../helpers/arcade.js';
import{capture3D}from'../helpers/arcade-browser.js';
import{openRaceMenu,closeRaceMenu}from'../helpers/racing-menu.js';
test('Fahrzeugbalance: echtes gespeichertes V1-Qualifying bleibt nach Laden, Pause und Reload V1',async({page})=>{
 test.setTimeout(120000);const{api:A}=loadArcade({race:true}),f=JSON.parse(readFileSync(new URL('../fixtures/driver-v3-checkpoints.json',import.meta.url))),old=f.cases.find(c=>c.qualifying).before,
  game=A.Campaign.capture(A.Campaign.create({driverId:'d012',difficulty:'expert'}),old,1000),errors=[];
 await capture3D(page,{renderEvery:30});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(g=>{if(!localStorage.getItem('carpet_gp_campaign_v1'))localStorage.setItem('carpet_gp_campaign_v1',JSON.stringify(g));},game);
 await page.goto('race.html?mode=campaign&quality=low');await page.clock.runFor(64);
 expect(await page.evaluate(()=>CGPArcade.VehiclePerformance.current.campaign.version)).toBe(2);
 expect(await page.evaluate(()=>__driveSnapshot.qualifying.format)).toBe('flying-one-v1');
 expect(await page.evaluate(()=>__driveSnapshot.entries.every(e=>e.performance.version===1))).toBe(true);
 await openRaceMenu(page);await closeRaceMenu(page);await page.clock.runFor(3100);await page.clock.runFor(1000);
 await page.reload();await page.clock.runFor(64);expect(await page.evaluate(()=>__driveSnapshot.entries.every(e=>e.performance.version===1))).toBe(true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('carpet_gp_campaign_v1')));expect(saved.weekend.config.performance).toEqual({version:1,context:'campaign'});
 expect(saved.weekend.config.driving).toEqual(old.config.driving);expect(saved.completed).toEqual([]);expect(errors).toEqual([]);
});
