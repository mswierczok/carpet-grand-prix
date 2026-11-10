import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const liveries = JSON.parse(readFileSync(new URL('../../assets/cars/liveries.json', import.meta.url)));
const names = new Map(liveries.entries.map(entry => [entry.id, entry.team]));
names.set('t01', 'Vauclair Motorsport');

test('zeigt alle dreizehn Teamfahrzeuge passend zu ihren Teams in einheitlicher Bildgröße', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.locator('[data-launch="new"]').click();
  await page.locator('[data-launch="new-manager"]').click();
  const sources = new Set();
  for (let index = 1; index <= 13; index++) {
    const id = `t${String(index).padStart(2, '0')}`;
    await expect(page.locator('#launchTeamCounter')).toHaveText(`${index} / 13`);
    await expect(page.locator('.showroom-team-name')).toHaveText(names.get(id));
    const image = page.locator('.showroom-car-image');
    await expect(image).toHaveAttribute('src', ['t01','t04','t10','t05'].includes(id) ? `./assets/cars/illustrated/team-${id}.svg` : `./assets/cars/team-${id}.webp`);
    await expect(image).toHaveAttribute('alt', new RegExp(names.get(id)));
    const decoded = await image.evaluate(async img => {
      await img.decode(); return { width: img.naturalWidth, height: img.naturalHeight, src: img.src };
    });
    expect([decoded.width, decoded.height]).toEqual([2172, 555]);
    sources.add(decoded.src);
    await page.locator('[data-launch="team-next"]').click();
  }
  expect(sources.size).toBe(13);
  await expect(page.locator('#launchTeamCounter')).toHaveText('1 / 13');
  expect(errors).toEqual([]);
});
