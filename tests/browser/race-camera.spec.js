import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

for (const name of ['initial', 'activeQualifying', 'activeRace']) {
  const save = JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
  test(`vergrößert ${name} ohne Speicheränderung und setzt die Canvas-Transformation zurück`, async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(save => {
      localStorage.setItem('carpet_gp_v072', JSON.stringify(save));
      let renderer;
      globalThis.__cameraStorageChanged = false;
      Object.defineProperty(globalThis, 'CGPRaceCamera', {
        configurable: true, get: () => renderer,
        set: value => { renderer = { ...value, apply(...args) {
          const before = localStorage.getItem('carpet_gp_v072');
          const c = value.apply(...args), m = args[0].getTransform();
          globalThis.__cameraFrame = { ...c, matrix: { a: m.a, d: m.d, e: m.e, f: m.f } };
          globalThis.__cameraStorageChanged ||= before !== localStorage.getItem('carpet_gp_v072');
          return c;
        } }; },
      });
    }, save);
    await page.goto('./');
    await page.locator('[data-launch="load-view"]').click();
    await page.locator('#launchResume').click();
    const c = await page.evaluate(() => globalThis.__cameraFrame);
    expect(c.scale).toBeGreaterThan(1.25);
    expect(c.matrix.a).toBeCloseTo(c.scale, 6);
    expect(c.matrix.d).toBeCloseTo(c.scale, 6);
    expect(c.matrix.e).toBeCloseTo(c.x, 5);
    expect(c.matrix.f).toBeCloseTo(c.y, 5);
    const transform = await page.locator('#raceCanvas').evaluate(canvas => {
      const m = canvas.getContext('2d').getTransform(); return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
    });
    expect(transform).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    expect(await page.evaluate(() => globalThis.__cameraStorageChanged)).toBe(false);
    expect(errors).toEqual([]);
  });
}
