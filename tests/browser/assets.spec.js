import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { manifest } from '../../scripts/build-offline.js';

const initial = JSON.parse(readFileSync(new URL('../fixtures/initial.json', import.meta.url), 'utf8'));
const state = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));

async function prepare(context, save = initial, legacySprites = false) {
  await context.addInitScript(({ save, legacySprites }) => {
    localStorage.setItem('carpet_gp_v072', JSON.stringify(save));
    let seed = 12345;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    // Keep historical UI screenshots meaningful outside the expressly approved
    // sprite change. Actual new sprites have dedicated browser/renderer tests.
    if (legacySprites) {
      Object.defineProperty(globalThis, 'CGPTeamDriverHud', {
        configurable: true, get: () => ({ update() {} }), set() {},
      });
      Object.defineProperty(globalThis, 'CGPRaceCamera', {
        configurable: true, get: () => ({ apply() {} }), set() {},
      });
      let renderer;
      Object.defineProperty(globalThis, 'CGPRaceSprites', {
        configurable: true,
        get: () => renderer,
        set: value => { renderer = { ...value, draw: () => false, svg: () => null }; },
      });
    }
  }, { save, legacySprites });
}

async function resume(page) {
  await page.locator('[data-launch="load-view"]').click();
  await page.locator('#launchResume').click();
  await expect(page.locator('#startScreen')).toBeHidden();
}

async function screenshot(page) {
  await page.bringToFront();
  await page.mouse.move(0, 0);
  await page.locator('img[loading="lazy"]').evaluateAll(imgs => imgs.forEach(img => img.loading = 'eager'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode()));
  });
  await page.waitForLoadState('networkidle');
  // Paused canvases can be painted in an inactive tab. Activate both pages and
  // allow the same compositor path to settle before comparing their rounded clip.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
}

async function compare(original, current, label, testInfo) {
  // Compare the browser-parsed cascade as well, independently of rasterization.
  const rules = page => page.evaluate(() => [...document.styleSheets].filter(sheet => !sheet.href?.endsWith('/team-driver-hud.css')).flatMap(sheet =>
    [...sheet.cssRules].map(rule => rule.cssText.replace(/url\([^)]*\)/g, 'url(asset)'))));
  expect(await rules(current), `${label}: CSS-Kaskade`).toEqual(await rules(original));
  const before = await screenshot(original), after = await screenshot(current);
  const a = PNG.sync.read(before), b = PNG.sync.read(after);
  expect([b.width, b.height], `${label}: Seitengröße`).toEqual([a.width, a.height]);
  const diff = new PNG({ width: a.width, height: a.height });
  // Full-page mobile canvas clips can differ slightly in edge antialiasing.
  // 0.05 is stricter than Playwright's default 0.2; no other differing pixels allowed.
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05, includeAA: false });
  if (changed) {
    await testInfo.attach(`${label}-original`, { body: before, contentType: 'image/png' });
    await testInfo.attach(`${label}-aktuell`, { body: after, contentType: 'image/png' });
    await testInfo.attach(`${label}-unterschied`, { body: PNG.sync.write(diff), contentType: 'image/png' });
  }
  expect(changed, `${label}: Darstellung weicht vom unveränderten Original ab`).toBe(0);
}

test('vergleicht Start, Teamauswahl und alle sechs Ansichten visuell mit dem Original', async ({ context }, testInfo) => {
  test.setTimeout(120_000);
  await prepare(context, initial, true);
  const original = await context.newPage(), current = await context.newPage();
  const errors = [];
  for (const page of [original, current]) page.on('pageerror', e => errors.push(e.message));
  await original.goto('__reference__/index.html'); await current.goto('./');
  await compare(original, current, 'startmenue', testInfo);
  for (const page of [original, current]) {
    await page.locator('[data-launch="new"]').click();
    await page.locator('[data-launch="new-manager"]').click();
  }
  await compare(original, current, 'teamauswahl', testInfo);
  await original.goto('__reference__/index.html'); await current.goto('./');
  for (const page of [original, current]) await resume(page);
  for (const tab of ['dashboard', 'workshop', 'market', 'chronicle', 'calendar', 'universe']) {
    for (const page of [original, current]) await page.locator(`#nav [data-value="${tab}"]`).click();
    await compare(original, current, tab, testInfo);
  }
  expect(errors).toEqual([]);
});

for (const [name, label] of [['activeRace', 'pausiertes-rennen'], ['activeQualifying', 'pausiertes-qualifying']]) {
  test(`vergleicht ${label} visuell mit dem Original`, async ({ context }, testInfo) => {
    await prepare(context, state(name), true);
    const original = await context.newPage(), current = await context.newPage();
    await original.goto('__reference__/index.html'); await current.goto('./');
    for (const page of [original, current]) await resume(page);
    await compare(original, current, label, testInfo);
  });
}

test('lädt und dekodiert alle 36 ausgelagerten Bilder unter dem Projektpfad', async ({ page }) => {
  await page.goto('./');
  const decoded = await page.evaluate(async paths => Promise.all(paths.map(async path => {
    const img = new Image(); img.src = path;
    await img.decode(); return img.naturalWidth > 0 && img.naturalHeight > 0;
  })), manifest.images.map(image => './' + image.path));
  expect(decoded).toHaveLength(36);
  expect(decoded.every(Boolean)).toBe(true);
});

test('spielt die eigenständige Offline-Ausgabe ohne weitere HTTP-Ressourcen', async ({ context, page }) => {
  await prepare(context);
  const requests = [], errors = [];
  page.on('request', req => { if (req.url().startsWith('http')) requests.push(req.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('__offline__/index.html');
  await context.setOffline(true);
  await resume(page);
  for (const tab of ['workshop', 'market', 'chronicle', 'calendar', 'universe', 'dashboard']) {
    await page.locator(`#nav [data-value="${tab}"]`).click();
    await expect(page.locator('#content')).not.toBeEmpty();
  }
  await page.locator('[data-action="qual-quick"]').click();
  await page.locator('[data-action="race"]').click();
  await page.locator('[data-action="race-pause"]').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('carpet_gp_v072')));
  expect(saved.qualifying.phase).toBe('DONE');
  expect(saved.activeRace.cars).toHaveLength(26);
  expect(saved.activeRace.paused).toBe(true);
  expect(requests).toHaveLength(1);
  expect(errors).toEqual([]);
});
