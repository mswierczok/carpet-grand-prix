import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const save = JSON.parse(readFileSync(new URL('../fixtures/activeRace.json', import.meta.url), 'utf8'));

test('bindet alle 13 Sprites im echten Renn-Canvas ein und verändert beim Neuzeichnen keinen Spielstand', async ({ page }) => {
  await page.addInitScript(save => {
    localStorage.setItem('carpet_gp_v072', JSON.stringify(save));
    let renderer;
    globalThis.__spriteDraws = {};
    Object.defineProperty(globalThis, 'CGPRaceSprites', {
      configurable: true, get: () => renderer,
      set: value => { renderer = { ...value, draw(...args) {
        const result = value.draw(...args), id = args[2];
        if (result) globalThis.__spriteDraws[id] = (globalThis.__spriteDraws[id] || 0) + 1;
        return result;
      } }; },
    });
  }, save);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.locator('[data-launch="load-view"]').click();
  await page.locator('#launchResume').click();
  const counts = await page.evaluate(() => globalThis.__spriteDraws);
  for (const id of save.teams.map(team => team.id)) expect(counts[id]).toBeGreaterThan(0);
  const before = await page.evaluate(() => localStorage.getItem('carpet_gp_v072'));
  const focused = save.activeRace.cars.find(car => car.team === 't01').id;
  await page.locator(`[data-action="focus-driver"][data-value="${focused}"]`).click();
  expect(await page.evaluate(() => localStorage.getItem('carpet_gp_v072'))).toBe(before);
  expect(await page.evaluate(() => globalThis.__spriteDraws.t01)).toBeGreaterThan(counts.t01);
  expect(errors).toEqual([]);
});

test('zeigt alle 13 vergrößerten Modelle und bewegt die kleinen Sprites nur in der separaten Grafikprobe', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('previews/topdown/index.html');
  await expect(page.locator('.card')).toHaveCount(13);
  expect(await page.locator('.photo').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const before = await page.evaluate(() => document.getElementById('motion').toDataURL());
  await page.locator('#motion-toggle').click();
  await expect.poll(() => page.evaluate(() => document.getElementById('motion').toDataURL())).not.toBe(before);
  await page.locator('#motion-toggle').click();
  await expect(page.locator('#motion-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
