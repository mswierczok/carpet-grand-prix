import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const save = JSON.parse(readFileSync(new URL('../fixtures/activeRace.json', import.meta.url)));

test('hält Live-Schaltflächen beim Aktualisieren und Sortieren stabil und bedienbar', async ({ page }) => {
  await page.goto('./');
  const result = await page.evaluate(() => {
    const root = document.createElement('div'); document.body.append(root);
    const html = reverse => `<div>${(reverse?['b','a']:['a','b']).map(id=>`<button data-action="focus-driver" data-value="${id}" aria-pressed="${reverse}">${id}${reverse?' neu':''}</button>`).join('')}</div>`;
    CGPLiveDOM.setHTML(root,html(false)); const a = root.querySelector('button'); a.focus();
    CGPLiveDOM.setHTML(root,html(true));
    const result = {same:a===root.querySelectorAll('button')[1],focused:document.activeElement===a,labels:[...root.querySelectorAll('button')].map(b=>b.textContent),pressed:a.getAttribute('aria-pressed')};
    CGPLiveDOM.setHTML(root,''); result.empty = root.childNodes.length===0; root.remove(); return result;
  });
  expect(result).toEqual({same:true,focused:true,labels:['b neu','a neu'],pressed:'true',empty:true});
});

test('zeichnet alle 13 illustrierten Autos und aktualisiert aktive Rennsteuerung ohne ihre DOM-Knoten zu ersetzen', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(save=>localStorage.setItem('carpet_gp_v072',JSON.stringify(save)),save);
  await page.goto('./'); await page.locator('[data-launch="load-view"]').click(); await page.locator('#launchResume').click();
  const rendered = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width=280; canvas.height=120;
    const ctx=canvas.getContext('2d'); const results=[];
    for(const id of CGPPilotVehicles.ids){ctx.clearRect(0,0,280,120);CGPRaceSprites.draw(ctx,{x:140,y:60,ang:0},id,8,false);const pixels=ctx.getImageData(0,0,280,120).data;results.push([...pixels].some((v,i)=>i%4===3&&v>0));}return results;
  });
  expect(rendered).toEqual(Array(13).fill(true));
  const pause = page.locator('[data-action="race-pause"]');
  await pause.evaluate(button=>globalThis.__pauseButton=button);
  await pause.click(); await page.waitForTimeout(650);
  expect(await pause.evaluate(button=>button===globalThis.__pauseButton)).toBe(true);
  await pause.click(); await expect(pause).toHaveText(/Fortsetzen/);
  expect(errors).toEqual([]);
});

test('lädt die Pilotgalerie mit vier Vergleichspaaren und lesbaren Größenproben', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('previews/art-pilot/index.html');
  await expect(page.locator('article')).toHaveCount(4);
  const decoded=await page.locator('img').evaluateAll(async imgs=>Promise.all(imgs.map(async img=>{await img.decode();return img.naturalWidth>0;})));
  expect(decoded.every(Boolean)).toBe(true);
  await page.locator('[data-mode="old"]').click(); await expect(page.locator('.old').first()).toBeVisible();
  await page.locator('[data-mode="new"]').click(); await expect(page.locator('.new').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('zeigt alle vier Pilotfahrzeuge auch vollständig offline ohne weitere Ressourcen', async ({ page,context }) => {
  const requests=[],errors=[];page.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('__offline__/index.html');await context.setOffline(true);
  await page.locator('[data-launch="new"]').click();await page.locator('[data-launch="new-manager"]').click();
  const pilots=[];
  for(let i=1;i<=10;i++){
    const img=page.locator('.showroom-car-image');
    if([1,4,5,10].includes(i)){
      expect(await img.getAttribute('src')).toMatch(/^data:image\/webp;base64,/);
      pilots.push(await img.evaluate(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight];}));
    }
    await page.locator('[data-launch="team-next"]').click();
  }
  expect(pilots).toEqual(Array(4).fill([2172,555]));expect(requests).toHaveLength(1);expect(errors).toEqual([]);
});
