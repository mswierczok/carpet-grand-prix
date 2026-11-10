import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));

async function open(page, save) {
  await page.addInitScript(save => {
    localStorage.setItem('carpet_gp_v072', JSON.stringify(save));
    let camera, sprites;
    globalThis.__selectionGradients = 0; globalThis.__leaderLabels = 0;
    const gradient = CanvasRenderingContext2D.prototype.createRadialGradient;
    CanvasRenderingContext2D.prototype.createRadialGradient = function (...args) {
      globalThis.__selectionGradients++; return gradient.apply(this, args);
    };
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      if (args[0] === 'P1') globalThis.__leaderLabels++;
      return text.apply(this, args);
    };
    Object.defineProperty(globalThis, 'CGPRaceCamera', {
      configurable: true, get: () => camera,
      set: value => { camera = { ...value, apply(...args) {
        const view = value.apply(...args);
        globalThis.__followView = { ...view, width: args[2], height: args[3], cssWidth: args[6] };
        return view;
      } }; },
    });
    Object.defineProperty(globalThis, 'CGPRaceSprites', {
      configurable: true, get: () => sprites,
      set: value => { sprites = { ...value, draw(ctx, pose, id, scale, retired) {
        const m = ctx.getTransform();
        // A team has two cars; capture poses by their world position, then match
        // the selected camera target against the actual drawn car.
        const sample = { x: pose.x, y: pose.y,
          screenX: m.a * pose.x + m.c * pose.y + m.e,
          screenY: m.b * pose.x + m.d * pose.y + m.f,
          length: 23 * scale * m.a * ctx.canvas.clientWidth / ctx.canvas.width };
        const target = globalThis.__followView?.target;
        if (target && Math.abs(target.x - pose.x) < 1e-8 && Math.abs(target.y - pose.y) < 1e-8) globalThis.__followCar = sample;
        return value.draw(ctx, pose, id, scale, retired);
      } }; },
    });
  }, save);
  await page.goto('./');
  await page.locator('[data-launch="load-view"]').click();
  await page.locator('#launchResume').click();
}

async function centered(page) {
  const { view, car } = await page.evaluate(() => ({ view: globalThis.__followView, car: globalThis.__followCar }));
  expect(view.mode).toBe('follow');
  expect(car.screenX).toBeCloseTo(view.width / 2, 2);
  expect(car.screenY).toBeCloseTo(view.height / 2, 2);
  expect(car.length).toBeGreaterThanOrEqual(55);
  return { view, car };
}

test('folgt den eigenen Fahrern mittig statt zu leuchten und kehrt per erneutem Klick zur Übersicht zurück', async ({ page }) => {
  const save = state('activeRace'); await open(page, save);
  const overview = await page.evaluate(() => globalThis.__followView);
  const before = await page.evaluate(() => localStorage.getItem('carpet_gp_v072'));
  const cards = page.locator('.team-driver-card');
  await page.evaluate(() => { globalThis.__selectionGradients = 0; globalThis.__leaderLabels = 0; });
  await cards.first().click();
  const first = await centered(page);
  expect(first.view.scale).toBeGreaterThan(overview.scale);
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.first()).toHaveAttribute('aria-label', /Gesamtstrecke/);
  expect(await page.evaluate(() => globalThis.__selectionGradients)).toBe(0);
  expect(await page.evaluate(() => globalThis.__leaderLabels)).toBe(0);
  await cards.last().click();
  const second = await centered(page);
  expect(second.view.target).not.toEqual(first.view.target);
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'false');
  await cards.last().click();
  const after = await page.evaluate(() => globalThis.__followView);
  expect([after.scale, after.x, after.y]).toEqual([overview.scale, overview.x, overview.y]);
  expect(after.mode).not.toBe('follow');
  expect(await page.evaluate(() => globalThis.__leaderLabels)).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('carpet_gp_v072'))).toBe(before);
});

test('verfolgt die Bewegung und bleibt bei geänderter Fenstergröße mittig', async ({ page }) => {
  await open(page, state('activeRace'));
  await page.locator('.team-driver-card').first().click();
  const before = await centered(page);
  await page.locator('[data-action="race-pause"]').click();
  await expect.poll(() => page.evaluate(p => {
    const c = globalThis.__followCar; return Math.hypot(c.x - p.x, c.y - p.y);
  }, before.car)).toBeGreaterThan(1);
  const moving = await centered(page);
  expect(moving.view.x !== before.view.x || moving.view.y !== before.view.y).toBe(true);
  await page.setViewportSize({ width: 500, height: 900 });
  await expect.poll(() => page.evaluate(() => globalThis.__followView.cssWidth === document.getElementById('raceCanvas').clientWidth)).toBe(true);
  await centered(page);
});

test('verwendet auch bei aktiven Qualifying-Fahrern die Verfolgung über den Tower', async ({ page }) => {
  const save = state('activeQualifying'); await open(page, save);
  const car = save.activeQualifying.cars.find(c => c.active && !c.finished);
  expect(car).toBeTruthy();
  await page.locator(`#qualTimingTower [data-value="${car.id}"]`).click();
  await centered(page);
  const inactive = save.activeQualifying.cars.find(c => !c.active || c.finished);
  if (inactive) {
    await page.locator(`#qualTimingTower [data-value="${inactive.id}"]`).click();
    expect(await page.evaluate(() => globalThis.__followView.mode)).not.toBe('follow');
    await expect(page.locator(`#qualTimingTower [data-value="${inactive.id}"]`)).toHaveAttribute('aria-pressed', 'false');
  }
});
