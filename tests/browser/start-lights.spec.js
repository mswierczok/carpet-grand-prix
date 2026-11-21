import { driveButton } from "../helpers/racing-menu.js";
import {test,expect} from '@playwright/test';
import {pilotPit} from '../helpers/pitlane-browser.js';
import {capture3D} from '../helpers/arcade-browser.js';
import {mkdirSync} from 'node:fs';
test('große Startampel: fünf rote Lichter, Grün, Pause und freies mobiles Sichtfeld',async({page},info)=>{
  test.setTimeout(120000);
  await capture3D(page,{renderEvery:4});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('race.html?track=bahrain');await page.clock.runFor(64);
  const poses=await page.evaluate(()=>__driveSnapshot.entries.map(e=>[e.car.x,e.car.y]));
  await driveButton(page);await page.clock.runFor(128);
  await page.keyboard.down('w');
  for(let n=1;n<=5;n++){
    await expect(page.locator('#raceSignal .is-red')).toHaveCount(n);
    await expect(page.locator('#raceSignal .is-green')).toHaveCount(0);
    expect(await page.evaluate(()=>__driveSnapshot.entries.map(e=>[e.car.x,e.car.y]))).toEqual(poses);
    if(n<5)await page.clock.runFor(600);
  }
  const box=await page.locator('#raceSignal').boundingBox(),canvas=await page.locator('#arcadeCanvas').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(canvas.x);expect(box.x+box.width).toBeLessThanOrEqual(canvas.x+canvas.width);
  mkdirSync('docs/race-pace-startlights',{recursive:true});
  await page.screenshot({path:`docs/race-pace-startlights/${info.project.name}-red.png`});
  await page.keyboard.press('p');await page.clock.runFor(800);
  await expect(page.locator('#raceSignal .is-red')).toHaveCount(5);
  await driveButton(page);await page.keyboard.down('w');await page.clock.runFor(650);
  await expect(page.locator('#raceSignal .is-green')).toHaveCount(5);
  await expect(page.locator('#raceSignal .is-red')).toHaveCount(0);
  await page.screenshot({path:`docs/race-pace-startlights/${info.project.name}-green.png`});
  expect(await page.evaluate(()=>__driveSnapshot.car.speed)).toBeGreaterThan(0);
  await page.clock.runFor(2100);await expect(page.locator('#raceSignal')).toBeHidden();
  await page.keyboard.up('w');expect(errors).toEqual([]);
});

test('fährt die Boxengasse mit 80 km/h durch reale Tastaturbefehle und zählt die Runde',async({page})=>{
  test.setTimeout(180000);
  await capture3D(page,{renderEvery:90});
  await page.goto('arcade3d.html?track=bahrain');await page.clock.runFor(64);
  await driveButton(page);await page.evaluate(pilotPit,{fast:true});
  for(let i=0;i<300;i++){
    await page.clock.runFor(500);
    if(await page.evaluate(()=>__pitDrive.done))break;
  }
  const result=await page.evaluate(()=>({drive:__pitDrive,contacts:__driveSnapshot.contacts,timing:__driveSnapshot.timing}));
  expect(result.drive.done).toBe(true);expect(result.drive.peakKmh).toBeCloseTo(80,1);
  expect(result.contacts).toBe(0);expect(result.timing.completed).toBe(1);expect(result.timing.lastLap.valid).toBe(true);
});
