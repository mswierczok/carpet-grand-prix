// Paired, fixed real grid: no pose edits, no fake clocks, no production hooks.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { selectDriveSetting } from "../tests/helpers/arcade-browser.js";
const reference =
    process.argv.find((a) => a.startsWith("--reference="))?.slice(12) ||
    "34a7c07ac683ababd4e5f130b3a75e9029448560",
  base = "http://127.0.0.1:4173/carpet-grand-prix/";
const old = (path) =>
  execFileSync("git", ["show", `${reference}:${path}`], {
    maxBuffer: 8 * 1024 * 1024,
  }).toString();
const html = old("race.html"),
  sources = new Map([
    ["race.html", html],
    ...[
      ...html.matchAll(/<script src="\.\/([^"?]+)(?:\?[^" ]*)?"><\/script>/g),
    ].map((m) => [m[1], old(m[1])]),
  ]);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
const reports = [];
try {
  for (const mobile of [false, true])
    for (const version of ["before", "after"]) {
      const page = await browser.newPage({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1000, height: 800 },
        deviceScaleFactor: 0.75,
        isMobile: mobile,
        hasTouch: mobile,
      });
      if (version === "before")
        await page.route("**/*", async (route) => {
          const path = new URL(route.request().url()).pathname.split(
            "/carpet-grand-prix/",
          )[1];
          if (sources.has(path))
            await route.fulfill({
              contentType: path.endsWith(".html")
                ? "text/html"
                : "application/javascript",
              body: sources.get(path),
            });
          else await route.continue();
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
                const r = value.create(...args);
                globalThis.__fixedRenderer = r;
                return {
                  ...r,
                  draw(snapshot, ...rest) {
                    globalThis.__fixedSnapshot = snapshot;
                    return r.draw(snapshot, ...rest);
                  },
                };
              },
            };
          },
        });
      });
      await page.goto(base + "race.html?track=bahrain");
      await page.waitForFunction(
        () =>
          document.getElementById("arcadeApp").dataset.rendering === "3d" &&
          globalThis.__fixedSnapshot,
      );
      await selectDriveSetting(page, "quality", "auto");
      await page.waitForFunction(
        () =>
          document.getElementById("worldAtlas").complete &&
          document.getElementById("worldAtlas").naturalWidth > 0,
      );
      const report = await page.evaluate(async () => {
        const renderer = __fixedRenderer,
          s = __fixedSnapshot,
          gl = document.getElementById("arcadeCanvas").getContext("webgl2"),
          samples = [];
        const before = JSON.stringify(s.entries);
        let previous = performance.now();
        const pixel = new Uint8Array(4);
        for (let i = 0; i < 40; i++) {
          const frame = await new Promise(requestAnimationFrame);
          const begin = performance.now();
          renderer.draw(s, s.race.playerTeam, false, 0);
          const submit = performance.now();
          gl.finish();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          if (i >= 10)
            samples.push({
              submitMs: submit - begin,
              synchronizedMs: performance.now() - begin,
              frameIntervalMs: frame - previous,
            });
          previous = frame;
        }
        const p = (name, q) =>
          samples.map((s) => s[name]).sort((a, b) => a - b)[
            Math.floor(samples.length * q)
          ];
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          samples: samples.length,
          cpuSubmitP50ms: p("submitMs", 0.5),
          cpuSubmitP95ms: p("submitMs", 0.95),
          synchronizedP50ms: p("synchronizedMs", 0.5),
          synchronizedP95ms: p("synchronizedMs", 0.95),
          frameIntervalP50ms: p("frameIntervalMs", 0.5),
          frameIntervalP95ms: p("frameIntervalMs", 0.95),
          graphics: renderer.diagnostics(),
          renderer: ext
            ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          posesUnchanged: before === JSON.stringify(s.entries),
          poses: JSON.parse(before).map((e) => ({ id: e.id, car: e.car })),
        };
      });
      reports.push({
        viewport: mobile ? "mobile" : "desktop",
        version,
        ...report,
      });
      await page.close();
    }
} finally {
  await browser.close();
}
for (const viewport of ["desktop", "mobile"]) {
  const [a, b] = reports.filter((r) => r.viewport === viewport);
  if (
    JSON.stringify(a.poses) !== JSON.stringify(b.poses) ||
    !a.posesUnchanged ||
    !b.posesUnchanged
  )
    throw Error("Unequal actual start grids");
}
const files = [
  "src/rendering/arcade3d.js",
  "src/rendering/bahrain3d.js",
  "src/rendering/illustrated-kit3d.js",
  "src/rendering/bahrain-materials3d.js",
];
const result = {
  recordedAt: new Date().toISOString(),
  reference,
  browser: browser.version(),
  methodology:
    "Same real paused 13-car grid, auto quality and fixed deviceScaleFactor 0.75: identical render pixel budget before/after, independent of adaptive low-mode changes. One draw per actual animation frame: 10 warm-up then 30 measured draws. gl.finish and one-pixel readback synchronize GPU. Reference scripts served from pinned commit in test responses only. No clock or pose edits.",
  limits:
    "Synchronized submission is not delivered game FPS. SwiftShader is not an iPhone GPU; no physical Safari acceptance.",
  hashes: Object.fromEntries(
    files.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  ),
  reports,
};
writeFileSync(
  process.argv.find((a) => a.startsWith("--output="))?.slice(9) ||
    "docs/bahrain-world/paired-performance.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    reports.map(({ poses, ...r }) => r),
    null,
    2,
  ),
);
