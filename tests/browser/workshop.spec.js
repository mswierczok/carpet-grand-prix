import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const save = { ...JSON.parse(readFileSync(new URL('../fixtures/initial.json', import.meta.url), 'utf8')), credits: 1000, research: 1000 };
const logoKey = 'carpet_grand_prix_workshop_logos_v1';

async function prepare(page) {
  await page.addInitScript(save => {
    if (!sessionStorage.getItem('workshop-seeded')) {
      localStorage.setItem('carpet_gp_v072', JSON.stringify(save));
      sessionStorage.setItem('workshop-seeded', 'true');
    }
  }, save);
}

async function openWorkshop(page) {
  await page.locator('[data-launch="load-view"]').click();
  await page.locator('#launchResume').click();
  await page.locator('#nav [data-value="workshop"]').click();
}

test('zeigt für alle 13 Werkstatt-Teams exakt die gemeinsamen Rennsprite-Flächen', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page);
  await page.goto('./');
  for (const team of save.teams) {
    await page.evaluate(save => localStorage.setItem('carpet_gp_v072', JSON.stringify(save)), { ...save, team: team.id });
    await page.reload();
    await openWorkshop(page);
    await expect(page.locator('.cg-garage-car')).toHaveAttribute('data-cg-team', team.id);
    expect(await page.evaluate(id => {
      const expected = document.createElement('div'); expected.innerHTML = CGPRaceSprites.svg(id);
      return document.querySelector('.cg-garage-car g > svg').innerHTML === expected.querySelector('svg').innerHTML;
    }, team.id)).toBe(true);
    await expect(page.locator('.cg-hotspot')).toHaveCount(4);
    await expect(page.locator('.cg-ws-upgrade')).toHaveCount(4);
  }
  expect(errors).toEqual([]);
});

test('erhält Bereichsfokus, Logo-Upload, Neuladen, Entfernen und Paketentwicklung', async ({ page }) => {
  await prepare(page);
  await page.goto('./'); await openWorkshop(page);
  const before = await page.evaluate(() => localStorage.getItem('carpet_gp_v072'));
  await page.locator('.cg-hotspot-power').click();
  await expect(page.locator('.cg-hotspot-power')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cg-part="power"]')).toHaveClass(/is-focused/);
  expect(await page.evaluate(() => localStorage.getItem('carpet_gp_v072'))).toBe(before);

  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff5533'; ctx.fillRect(0, 0, 16, 16);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#cg-ws-file').setInputFiles({ name: 'teamlogo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-cg-custom-logo]')).toHaveCount(1);
  const uploaded = await page.locator('[data-cg-custom-logo]').getAttribute('href');
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), logoKey))[save.team]).toBe(uploaded);
  await page.reload(); await openWorkshop(page);
  await expect(page.locator('[data-cg-custom-logo]')).toHaveAttribute('href', uploaded);
  await page.locator('[data-action="cg-clear-logo"]').click();
  await expect(page.locator('[data-cg-custom-logo]')).toHaveCount(0);
  await expect(page.locator('.cg-garage-car')).toHaveAttribute('data-cg-team', save.team);
  expect(await page.evaluate(() => localStorage.getItem('carpet_gp_v072'))).toBe(before);

  const upgrade = page.locator('.cg-ws-upgrade:not([disabled])').first();
  await expect(upgrade).toBeVisible();
  await upgrade.click();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('carpet_gp_v072')));
  expect(after.upgrades).toBe(save.upgrades + 1);
  expect(after.credits).toBeLessThan(save.credits);
  expect(after.research).toBeLessThan(save.research);
  await expect(page.locator('.cg-garage-car')).toHaveAttribute('data-cg-team', save.team);
});
