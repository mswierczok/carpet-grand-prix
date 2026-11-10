// Developer-only: needs npm run serve:test. Never imports a save into a user's browser.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), output = new URL('previews/art-pilot/', root);
mkdirSync(output, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const race=JSON.parse(readFileSync(new URL('tests/fixtures/activeRace.json',root)));
  await page.addInitScript(save=>localStorage.setItem('carpet_gp_v072',JSON.stringify(save)),race);
  const open = async()=>{await page.goto('http://127.0.0.1:4173/carpet-grand-prix/');await page.locator('[data-launch="load-view"]').click();await page.locator('#launchResume').click();};
  await open();await page.locator('#raceCanvas').screenshot({path:new URL('bahrain.png',output).pathname});
  await page.locator('.team-driver-card').first().click();await page.locator('#raceCanvas').screenshot({path:new URL('follow.png',output).pathname});
  const initial=JSON.parse(readFileSync(new URL('tests/fixtures/initial.json',root)));
  const workshop=await browser.newPage({viewport:{width:1440,height:1100}});
  await workshop.addInitScript(save=>localStorage.setItem('carpet_gp_v072',JSON.stringify(save)),{...initial,team:'t01'});
  await workshop.goto('http://127.0.0.1:4173/carpet-grand-prix/');await workshop.locator('[data-launch="load-view"]').click();await workshop.locator('#launchResume').click();await workshop.locator('#nav [data-value="workshop"]').click();
  await workshop.locator('.cg-workshop-hero').screenshot({path:new URL('workshop.png',output).pathname});
  if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close();}
