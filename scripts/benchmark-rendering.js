// Developer-only browser probe. Same saved race, follow camera and viewport.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const save = JSON.parse(readFileSync(new URL('../tests/fixtures/activeRace.json', import.meta.url), 'utf8'));
const output = process.argv[2] || '/tmp/cgp-render-benchmark.json';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.addInitScript(save => {
    localStorage.setItem('carpet_gp_v072', JSON.stringify(save));
    globalThis.__renderProbe = { running: false, frames: [] };
    const raf = requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => raf.call(globalThis, callback.name !== 'frame' ? callback : now => {
      const start = performance.now(); callback(now);
      if (globalThis.__renderProbe.running) globalThis.__renderProbe.frames.push({ now, ms: performance.now() - start, target: globalThis.__renderTarget });
    });
    let camera;
    Object.defineProperty(globalThis, 'CGPRaceCamera', {
      configurable: true, get: () => camera,
      set: value => { camera = { ...value, apply(...args) {
        const view = value.apply(...args); globalThis.__renderTarget = view.target;
        return view;
      } }; },
    });
  }, save);
  await page.goto('http://127.0.0.1:4173/carpet-grand-prix/');
  await page.locator('[data-launch="load-view"]').click(); await page.locator('#launchResume').click();
  await page.locator('.team-driver-card').first().click();
  await page.locator('[data-action="race-pause"]').click();
  await page.waitForTimeout(1000);
  await page.evaluate(() => { globalThis.__renderProbe.frames = []; globalThis.__renderProbe.running = true; });
  await page.waitForTimeout(4000);
  const frames = await page.evaluate(() => { globalThis.__renderProbe.running = false; return globalThis.__renderProbe.frames; });
  const costs = frames.map(f => f.ms).sort((a, b) => a - b);
  const same = frames.slice(1).filter((f, i) => f.target && frames[i].target && f.target.x === frames[i].target.x && f.target.y === frames[i].target.y).length;
  const result = { viewport: '1440x1100', scenario: 'Bahrain, 26 cars, 1x, own driver follow camera', frames: frames.length,
    meanFrameCallbackMs: costs.reduce((a, b) => a + b, 0) / Math.max(1, costs.length),
    p95FrameCallbackMs: costs[Math.floor(costs.length * .95)] || 0,
    identicalCameraFramesPercent: 100 * same / Math.max(1, frames.length - 1),
    longFrameGaps: frames.slice(1).filter((f, i) => f.now - frames[i].now > 50).length };
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
} finally { await browser.close(); }
