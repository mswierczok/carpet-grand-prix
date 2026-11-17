// Developer measurement only. The app contains no benchmark or test hooks.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const software = process.argv.includes("--software-webgl");
const raceMode = process.argv.includes("--race");
const slipstreamDisabled = process.argv.includes("--slipstream=0");
const waitForWake = raceMode && !slipstreamDisabled && process.argv.includes("--wait-for-wake");
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: software ? ["--enable-unsafe-swiftshader"] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 800 },
  });
  await page.addInitScript(() => {
    globalThis.CGPArcade = {};
    let module;
    Object.defineProperty(CGPArcade, "Renderer3D", {
      configurable: true,
      get: () => module,
      set: (value) => {
        module = {
          create(...args) {
            const renderer = value.create(...args);
            globalThis.__benchRenderer = renderer;
            globalThis.__frames = [];
            return {
              ...renderer,
              draw(snapshot, ...rest) {
                globalThis.__benchSnapshot = snapshot;
                const start = performance.now();
                renderer.draw(snapshot, ...rest);
                if (
                  !snapshot.paused &&
                  (!snapshot.race || snapshot.race.phase === "racing")
                )
                  __frames.push({
                    frameSeconds: rest[2],
                    submitMs: performance.now() - start,
                    wakeEmitters: renderer.diagnostics().wake?.emitters || 0,
                    wakeTriangles: renderer.diagnostics().wake?.triangles || 0,
                  });
              },
            };
          },
        };
      },
    });
  });
  await page.goto(
    "http://127.0.0.1:4173/carpet-grand-prix/" +
      (raceMode ? "race.html" + (slipstreamDisabled ? "?slipstream=0" : "") : "arcade3d.html"),
  );
  if (
    (await page.locator("#arcadeApp").getAttribute("data-rendering")) !== "3d"
  )
    throw Error("3D nicht verfügbar; kein gültiger 3D-Messwert.");
  const difficulty = process.argv.find((a) => a.startsWith("--difficulty="))?.slice(13);
  if (raceMode && difficulty) await page.locator("#difficulty").selectOption(difficulty);
  await page.locator("#quality").selectOption("low");
  await page.waitForTimeout(1500);
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  if (raceMode)
    await page.waitForFunction(
      () => globalThis.__benchSnapshot?.race?.phase === "racing",
    );
  if (waitForWake) {
    await page.waitForFunction(() => __benchSnapshot.entries.some((e) => e.slipstream?.strength > 0.03), null,
      { timeout: 60000 });
    await page.evaluate(() => { __frames = []; });
  }
  await page.waitForTimeout(raceMode ? 2500 : 4000);
  await page.keyboard.up("w");
  await page.keyboard.press("p");
  const report = await page.evaluate(() => {
    const frames = __frames.slice(3),
      p = (values, q) => {
        const v = values.toSorted((a, b) => a - b);
        return v[Math.min(v.length - 1, Math.floor(v.length * q))] ?? null;
      };
    const gl = document.getElementById("arcadeCanvas").getContext("webgl2"),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      frames: frames.length,
      activeSeconds: frames.reduce((n, f) => n + f.frameSeconds, 0),
      frameIntervalP50ms: p(
        frames.map((f) => f.frameSeconds * 1000),
        0.5,
      ),
      frameIntervalP95ms: p(
        frames.map((f) => f.frameSeconds * 1000),
        0.95,
      ),
      cpuSubmitP95ms: p(
        frames.map((f) => f.submitMs),
        0.95,
      ),
      activeWakeFrames: frames.filter((f) => f.wakeEmitters > 0).length,
      peakWakeEmitters: Math.max(0, ...frames.map((f) => f.wakeEmitters)),
      peakWakeTriangles: Math.max(0, ...frames.map((f) => f.wakeTriangles)),
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      graphics: __benchRenderer.diagnostics(),
      vehicles: globalThis.__benchSnapshot?.entries?.length || 1,
      difficulty: globalThis.__benchSnapshot?.race?.difficulty || null,
      slipstreamEnabled: globalThis.__benchSnapshot?.entries
        ? globalThis.__benchSnapshot.entries.some((e) => Object.hasOwn(e, "slipstream")) : null,
    };
  });
  Object.assign(report, {
    recordedAt: new Date().toISOString(),
    browser: browser.version(),
    viewport: { width: 1000, height: 800 },
    softwareRequested: software,
    raceMode,
    waitedForActiveWake: waitForWake,
    limits:
      "Short headless straight-line sample, no physical-device or 60-FPS acceptance. CPU submit is not GPU frame time.",
  });
  const text = JSON.stringify(report, null, 2) + "\n",
    output = process.argv.find((a) => a.startsWith("--output="))?.slice(9);
  if (output) writeFileSync(output, text);
  process.stdout.write(text);
} finally {
  await browser.close();
}
