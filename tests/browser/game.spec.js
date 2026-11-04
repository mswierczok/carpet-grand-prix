import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const key = 'carpet_gp_v072';
const fixture = name => readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8');
const state = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);

async function start(page, mode = 'manager') {
  await page.goto('./');
  await page.locator('[data-launch="new"]').click();
  await page.locator(`[data-launch="new-${mode}"]`).click();
  if (mode === 'manager') {
    await expect(page.locator('#launchTeamCounter')).toHaveText('1 / 13');
    await page.locator('[data-launch="team-next"]').click();
    await expect(page.locator('#launchTeamCounter')).toHaveText('2 / 13');
    await page.locator('[data-launch="start-team-chief"]').click();
  }
  await expect(page.locator('#startScreen')).toBeHidden();
}

async function resume(page, name) {
  await page.goto('./');
  await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key, data: fixture(name) });
  await page.reload();
  await page.locator('[data-launch="load-view"]').click();
  await expect(page.locator('#launchResume')).toBeEnabled();
  await page.locator('#launchResume').click();
  await expect(page.locator('#startScreen')).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  // Fail each test on uncaught runtime errors or broken same-origin resources.
  page.on('pageerror', error => { throw error; });
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
      throw Error(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
});

test('startet beide Spielmodi und öffnet alle Ansichten unter dem Pages-Projektpfad', async ({ page }) => {
  await start(page);
  expect((await state(page)).team).toBe('t02');
  for (const [tab, title] of [['workshop', 'Entwicklung & Werkstatt'], ['market', 'Fahrermarkt'],
    ['chronicle', 'Chronik & Rekorde'], ['calendar', 'Rennkalender'], ['universe', 'Dein Rennuniversum'],
    ['dashboard', 'Rennzentrale']]) {
    await page.locator(`#nav [data-value="${tab}"]`).click();
    await expect(page.locator('#pagetitle')).toHaveText(title);
    await expect(page.locator('#content')).not.toBeEmpty();
    await expect.poll(() => page.locator('#content img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  }
  await page.locator('[data-action="menu-return"]').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-launch="new"]').click();
  await page.locator('[data-launch="new-observer"]').click();
  expect((await state(page)).mode).toBe('observer');
});

test('simuliert Qualifying und setzt das pausierte Rennen nach Neuladen fort', async ({ page }) => {
  await start(page);
  await page.locator('[data-action="qual-quick"]').click();
  const qualified = await state(page);
  expect(qualified.qualifying.phase).toBe('DONE');
  expect(new Set(qualified.qualifying.gridIds).size).toBe(26);
  await page.locator('[data-action="race"]').click();
  await expect.poll(async () => (await state(page)).activeRace?.time ?? 0).toBeGreaterThan(0);
  await page.locator('[data-action="race-speed"][data-value="4"]').click();
  await page.locator('[data-action="race-pause"]').click();
  const paused = await state(page);
  expect(paused.activeRace.paused).toBe(true);
  expect(paused.activeRace.speed).toBe(4);
  await page.reload();
  await page.locator('[data-launch="load-view"]').click();
  await page.locator('#launchResume').click();
  await expect(page.locator('[data-action="race-pause"]')).toContainText('Fortsetzen');
  expect((await state(page)).activeRace).toEqual(paused.activeRace);
  await page.locator('[data-action="race-pause"]').click();
  await expect.poll(async () => (await state(page)).activeRace.time).toBeGreaterThan(paused.activeRace.time);
});

test('exportiert und importiert einen Spielstand verlustfrei', async ({ page }) => {
  await resume(page, 'completedWeekend');
  await page.locator('#nav [data-value="universe"]').click();
  const expected = await state(page);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported).toEqual(expected);
  await page.locator('#importFile').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  const imported = await state(page);
  expect(imported).toEqual(expected);
  await expect(page.locator('#toast')).toContainText('erfolgreich importiert');
});

test('weist beschädigten Import zurück und bewahrt den gespeicherten Stand', async ({ page }) => {
  await start(page);
  await page.locator('#nav [data-value="universe"]').click();
  const before = await state(page);
  const broken = structuredClone(before); broken.driverPoints[broken.drivers[0].id] = 999;
  await page.locator('#importFile').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(broken)) });
  await expect(page.locator('#toast')).toContainText('Import abgebrochen');
  expect(await state(page)).toEqual(before);
});

test('stellt laufendes Qualifying und getrennte Einstellungen wieder her', async ({ page }) => {
  await resume(page, 'activeQualifying');
  await expect(page.locator('[data-action="qual-pause"]')).toContainText('Fortsetzen');
  await page.locator('[data-action="menu-return"]').click();
  await page.locator('[data-launch="settings-view"]').click();
  await page.locator('#launchDefaultSpeed').selectOption('4');
  await page.locator('#launchLeaderMarker').uncheck();
  await page.reload();
  await page.locator('[data-launch="settings-view"]').click();
  await expect(page.locator('#launchDefaultSpeed')).toHaveValue('4');
  await expect(page.locator('#launchLeaderMarker')).not.toBeChecked();
  expect((await state(page)).activeQualifying.phase).toBe('Q1');
});

test('schützt beschädigten lokalen Spielstand beim Start vor Überschreiben', async ({ page }) => {
  await page.goto('./');
  const broken = '{invalid-json';
  await page.evaluate(({ key, broken }) => localStorage.setItem(key, broken), { key, broken });
  await page.reload();
  await page.locator('[data-launch="load-view"]').click();
  await expect(page.locator('#launchResume')).toBeDisabled();
  await expect(page.locator('#launchSaveSlot')).toContainText('nicht geladen werden');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(broken);
});
