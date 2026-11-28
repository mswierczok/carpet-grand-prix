import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {capture3D} from '../helpers/arcade-browser.js';
import {driveButton,openRaceMenu,closeRaceMenu} from '../helpers/racing-menu.js';
import {loadArcade} from '../helpers/arcade.js';
import {pilotRace} from '../helpers/arcade-race-browser.js';
test.use({hasTouch:true});
for(const [width,height]of[[320,700],[375,812],[390,844],[430,932],[844,390]])test(`Fahrer/Touch: große kollisionsfreie Touchflächen bei ${width}x${height}`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width,height});await capture3D(page,{renderEvery:16});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('race.html?new=single&quality=low');await page.clock.runFor(64);
 const boxes=await page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {buttons:[...document.querySelectorAll('[data-drive]')].map(e=>box(`[data-drive="${e.dataset.drive}"]`)),speed:box('.hud-speed'),gear:box('#openSettings'),viewport:{width:innerWidth,height:innerHeight},scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};});
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 expect(boxes.buttons).toHaveLength(4);expect(boxes.scroll).toBe(false);
 for(let i=0;i<4;i++){const b=boxes.buttons[i];expect(b.width).toBeGreaterThanOrEqual(width===320?67:78);expect(b.height).toBeGreaterThanOrEqual(80);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height);expect(overlap(b,boxes.speed)||overlap(b,boxes.gear)).toBe(false);for(let j=0;j<i;j++)expect(overlap(b,boxes.buttons[j])).toBe(false);}
 if(info.project.name==='mobile-chromium'){mkdirSync('docs/driver-racing/screenshots',{recursive:true});await page.screenshot({path:`docs/driver-racing/screenshots/touch-${width}x${height}.png`});}
 expect(errors).toEqual([]);
});
test('Fahrer/Touch: echte Mehrfingerkombinationen, Richtungswechsel, Halten, Abbruch, Pause und Fokusverlust',async({page,context})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});await capture3D(page,{renderEvery:20});
 await page.addInitScript(()=>{let module;Object.defineProperty(CGPArcade,'Controls',{configurable:true,get:()=>module,set(value){module={...value,attach(...args){const real=value.attach(...args);return {...real,read(){return globalThis.__input=real.read();}};}};}});});
 await page.goto('race.html?new=single&quality=low');await page.clock.runFor(64);await driveButton(page);await page.clock.runFor(3100);
 const cdp=await context.newCDPSession(page),neutral={throttle:0,brake:0,steer:0};
 const point=async(action,id)=>{const b=await page.locator(`[data-drive="${action}"]`).boundingBox();return{id,x:b.x+b.width/2,y:b.y+b.height/2};};
 const touch=async(type,actions)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:await Promise.all(actions.map((a,i)=>point(a,i+1)))});await page.clock.runFor(80);};
 for(const pedal of ['throttle','brake'])for(const direction of ['left','right']){
  await touch('touchStart',[pedal,direction]);await page.clock.runFor(400);
  expect(await page.evaluate(()=>__input)).toEqual({throttle:Number(pedal==='throttle'),brake:Number(pedal==='brake'),steer:direction==='left'?-1:1});
  await touch('touchEnd',[]);expect(await page.evaluate(()=>__input)).toEqual(neutral);
 }
 await touch('touchStart',['throttle','left']);await page.clock.runFor(1600);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[await point('left',2)]});await page.clock.runFor(80);expect(await page.evaluate(()=>__input)).toEqual({throttle:1,brake:0,steer:0});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point('throttle',1),await point('right',3)]});await page.clock.runFor(80);expect(await page.evaluate(()=>__input.steer)).toBe(1);
 await touch('touchCancel',[]);expect(await page.evaluate(()=>__input)).toEqual(neutral);
 for(let n=0;n<4;n++){await touch('touchStart',['throttle']);await touch('touchEnd',[]);}expect(await page.evaluate(()=>__input)).toEqual(neutral);
 await touch('touchStart',['throttle','left']);await openRaceMenu(page);await page.clock.runFor(80);expect(await page.evaluate(()=>__input)).toEqual(neutral);await touch('touchEnd',[]);
 await closeRaceMenu(page);await page.clock.runFor(3100);await touch('touchStart',['throttle']);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(80);expect(await page.evaluate(()=>__input)).toEqual(neutral);await touch('touchEnd',[]);
 expect(await page.evaluate(()=>({selection:getSelection().toString(),scrollX,scrollY,scale:visualViewport.scale}))).toEqual({selection:'',scrollX:0,scrollY:0,scale:1});
});
test('Fahrer/Touch: Kampagnenprofil folgt echter Startliste durch Qualifying, Reload, Rennen und Archiv',async({page},info)=>{
 test.setTimeout(300000);await capture3D(page,{renderEvery:30});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const game=loadArcade({race:true}).api.Campaign.create({driverId:'d035',difficulty:'beginner'});
 await page.addInitScript(g=>{if(!localStorage.getItem('carpet_gp_campaign_v1'))localStorage.setItem('carpet_gp_campaign_v1',JSON.stringify(g));let module;Object.defineProperty(CGPArcade,'RaceWeekend',{configurable:true,get:()=>module,set(value){module={...value,create(track,opts={}){return value.create(track,{...opts,laps:1});}};}});},game);
 await page.goto('race.html?mode=campaign&quality=low');await page.clock.runFor(64);await page.locator('#startQualifying').tap();await page.clock.runFor(3200);
 const snapshot=await page.evaluate(()=>__driveSnapshot);for(const e of snapshot.entries){expect(e.driverId).toBe(game.lineup[e.id]);expect(e.performance.version).toBe(2);}expect(snapshot.entries.find(e=>e.player).driverId).toBe('d035');
 await page.evaluate(pilotRace,{stopOnQualifiedGrid:true,difficulty:'expert'});
 for(let i=0;i<120;i++){await page.clock.runFor(1000);if(await page.evaluate(()=>!!__driveSnapshot.qualifyingResult))break;}
 expect(await page.evaluate(()=>__driveSnapshot.qualifyingResult.length)).toBe(13);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('carpet_gp_campaign_v1')).weekend.result.length)).toBe(13);
 await page.reload();await page.clock.runFor(64);const restored=await page.evaluate(()=>__driveSnapshot.entries);for(const e of restored){expect(e.driverId).toBe(game.lineup[e.id]);expect(e.performance.version).toBe(2);}
 await page.locator('#pause').tap();await page.evaluate(pilotRace,{difficulty:'expert'});
 for(let i=0;i<150;i++){await page.clock.runFor(1000);if(await page.evaluate(()=>__driveSnapshot.race.phase==='finished'))break;}
 expect(await page.evaluate(()=>__driveSnapshot.race.finished)).toBe(13);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('carpet_gp_campaign_v1')));expect(saved.completed).toHaveLength(1);for(const row of saved.completed[0].order)expect(row.driverId).toBe(game.lineup[row.teamId]);
 await page.screenshot({path:info.outputPath('driver-weekend-result.png')});expect(errors).toEqual([]);
});
