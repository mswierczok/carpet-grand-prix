// Developer-only comparison of two static checkouts; no production test hooks.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = resolve(option("--root", "."));
const url = option("--url", "http://127.0.0.1:4173/carpet-grand-prix/");
const output = resolve(option("--output", "dist/cleanup-measurement.json"));
const compare = option("--compare", null);
const excluded = new Set([".git", "node_modules", "dist", "test-results", "playwright-report", "coverage"]);
function files(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) return [];
    const path = join(folder, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const all = files(root), paths = all.map(path => relative(root, path));
const size = selected => selected.reduce((sum, path) => sum + statSync(path).size, 0);
const source = all.filter(path => /^(src\/|styles\/|[^/]+\.html$)/.test(relative(root, path)));
const entryScripts = new Set(), entryStyles = new Set();
for (const page of ["index.html", "play.html", "race.html", "campaign.html", "arcade.html", "arcade3d.html", "archive.html"]) {
  if (!paths.includes(page)) continue;
  const html = readFileSync(join(root, page), "utf8");
  for (const match of html.matchAll(/<script[^>]*src="\.\/([^"?]+)(?:\?[^" ]*)?"/g)) entryScripts.add(match[1]);
  for (const match of html.matchAll(/<link[^>]*href="\.\/([^"?]+\.css)(?:\?[^" ]*)?"/g)) entryStyles.add(match[1]);
}
const result = {
  checkoutCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  indexSHA256: createHash("sha256").update(readFileSync(join(root, "index.html"))).digest("hex"),
  node: process.version,
  project: { files: all.length, bytes: size(all), sourceFiles: source.length, sourceBytes: size(source),
    indexBytes: statSync(join(root, "index.html")).size,
    jsFiles: paths.filter(path => path.startsWith("src/") && path.endsWith(".js")).length,
    cssFiles: paths.filter(path => path.startsWith("styles/") && path.endsWith(".css")).length,
    entrypointJsFiles: entryScripts.size, entrypointCssFiles: entryStyles.size,
    entrypointCodeBytes: size([...entryScripts, ...entryStyles].map(path => join(root, path))),
    developmentDependencies: Object.keys(JSON.parse(readFileSync(join(root, "package.json"))).devDependencies).length },
  gitObjects: execFileSync("git", ["count-objects", "-v"], { cwd: root, encoding: "utf8" }).trim(),
  builds: {}, pages: [],
};
if (args.includes("--inventory-only")) {
  const previous = JSON.parse(readFileSync(output, "utf8"));
  Object.assign(previous, { project: result.project, gitObjects: result.gitObjects, checkoutCommit: result.checkoutCommit, indexSHA256: result.indexSHA256 });
  writeFileSync(output, JSON.stringify(previous, null, 2) + "\n");
  console.log(output);
  process.exit(0);
}
for (const file of args.includes("--single-offline-build") ? ["build-offline.js"] : ["build-offline.js", "build-arcade-offline.js"]) {
  const start = performance.now();
  execFileSync(process.execPath, [join(root, "scripts", file)], { cwd: root, stdio: "pipe" });
  result.builds[file] = { milliseconds: performance.now() - start };
}
if (args.includes("--build-only")) {
  const previous = JSON.parse(readFileSync(output, "utf8"));
  previous.builds = result.builds;
  writeFileSync(output, JSON.stringify(previous, null, 2) + "\n");
  console.log(output);
  process.exit(0);
}
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  args: ["--enable-unsafe-swiftshader"] });
mkdirSync(dirname(output), { recursive: true });
try {
  for (const [name, width, height, mobile] of [["desktop", 1280, 720, false], ["portrait", 390, 844, true], ["landscape", 844, 390, true]]) {
    for (const [kind, path, ready] of [["menu", "", "#openCampaign"], ["race", "race.html?new=single&team=t13&track=bahrain", '[data-rendering="3d"]']]) {
      const samples = [];
      for (let sample = 0; sample < 3; sample++) {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
        const page = await context.newPage(), cdp = await context.newCDPSession(page);
        const errors = [], requests = new Map(), complete = [];
        page.on("pageerror", e => errors.push(e.message));
        page.on("response", r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        cdp.on("Network.requestWillBeSent", e => requests.set(e.requestId, e.type));
        cdp.on("Network.loadingFinished", e => complete.push({ type: requests.get(e.requestId), bytes: e.encodedDataLength }));
        const start = performance.now();
        await page.goto(new URL(path, url).href);
        await page.locator(ready).waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const readyMilliseconds = performance.now() - start;
        if (sample === 2) {
          const imagePath = join(dirname(output), `${name}-${kind}.png`);
          await page.screenshot({ path: imagePath });
          if (compare && kind === "race") {
            const before = PNG.sync.read(readFileSync(join(resolve(compare), `${name}-${kind}.png`)));
            const after = PNG.sync.read(readFileSync(imagePath));
            if (before.width !== after.width || before.height !== after.height) throw Error("Different screenshot dimensions");
            result.pages.push({ comparison: `${name}-${kind}`, changedPixels: pixelmatch(before.data, after.data, null, before.width, before.height, { threshold: 0.05 }) });
          }
        }
        if (errors.length) throw Error(errors.join("\n"));
        samples.push({ readyMilliseconds, transferredBytes: complete.reduce((sum, r) => sum + r.bytes, 0),
          jsRequests: complete.filter(r => r.type === "Script").length, cssRequests: complete.filter(r => r.type === "Stylesheet").length });
        await context.close();
      }
      result.pages.push({ name, kind, width, height, samples });
    }
  }
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(output);
} finally { await browser.close(); }
