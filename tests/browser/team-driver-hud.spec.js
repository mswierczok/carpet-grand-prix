import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
const save = state('activeRace');
async function open(page, data = save) {
  await page.addInitScript(data => localStorage.setItem('carpet_gp_v072', JSON.stringify(data)), data);
  await page.goto('./');
  await page.locator('[data-launch="load-view"]').click();
  await page.locator('#launchResume').click();
}

test('zeigt eigene Positionen und koppelt Klick, erneuten Klick und Tower-Fokus in beide Richtungen', async ({ page }) => {
  await open(page);
  const cards = page.locator('.team-driver-card'); await expect(cards).toHaveCount(2);
  const ids = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.value));
  expect(ids).toEqual(save.activeRace.cars.filter(c => c.team === save.team).map(c => c.id));
  const stored = await page.evaluate(() => localStorage.getItem('carpet_gp_v072'));
  for (const id of ids) {
    const card = page.locator(`.team-driver-card[data-value="${id}"]`);
    const row = page.locator(`#raceTimingTower [data-value="${id}"]`);
    await expect(card.locator('[data-field="position"]')).toHaveText('P' + await row.locator('.position').textContent());
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true'); await expect(row).toHaveClass(/focused/);
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'false'); await expect(row).not.toHaveClass(/focused/);
  }
  await page.locator(`#raceTimingTower [data-value="${ids[0]}"]`).click();
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'true');
  await cards.last().focus(); await page.keyboard.press('Enter');
  await expect(cards.last()).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('carpet_gp_v072'))).toBe(stored);
});

test('aktualisiert die Live-Abstände und erhält dabei dieselben anklickbaren Elemente', async ({ page }) => {
  await open(page);
  const before = await page.locator('#teamDriverHud').innerText();
  await page.evaluate(() => { globalThis.__ownDriverButton = document.querySelector('.team-driver-card'); });
  await page.locator('[data-action="race-pause"]').click();
  await expect.poll(() => page.locator('#teamDriverHud').innerText()).not.toBe(before);
  expect(await page.evaluate(() => globalThis.__ownDriverButton === document.querySelector('.team-driver-card'))).toBe(true);
  await page.locator('.team-driver-card').first().click();
  await expect(page.locator('.team-driver-card').first()).toHaveAttribute('aria-pressed', 'true');
});

test('verdeckt keine Strecke und sitzt links und rechts am unteren Rand des Rennfensters', async ({ page }) => {
  await open(page);
  const rectangles = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    return { canvas: rect('#raceCanvas'), frame: rect('.racebox'), left: rect('.team-driver-card:first-child'), right: rect('.team-driver-card:last-child') };
  });
  expect(rectangles.left.top).toBeGreaterThanOrEqual(rectangles.canvas.bottom);
  expect(rectangles.right.top).toBeGreaterThanOrEqual(rectangles.canvas.bottom);
  expect(rectangles.left.left - rectangles.frame.left).toBeLessThan(18);
  expect(rectangles.frame.right - rectangles.right.right).toBeLessThan(18);
  expect(rectangles.left.right).toBeLessThan(rectangles.right.left);
  expect(rectangles.frame.bottom - rectangles.left.bottom).toBeLessThan(18);
  expect(await page.locator('.team-driver-card').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth))).toBe(true);
});

test('blendet die Karten vor Rennstart, im Qualifying und im Beobachtermodus aus', async ({ context }) => {
  for (const data of [state('initial'), state('activeQualifying'), { ...save, mode: 'observer' }]) {
    const page = await context.newPage(); await open(page, data);
    await expect(page.locator('#teamDriverHud')).toBeHidden();
    await expect(page.locator('.team-driver-card')).toHaveCount(0);
    await page.close();
  }
});
