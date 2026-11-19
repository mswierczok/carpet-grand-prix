// Checks the actual packaged files through local routes with network disabled.
// Useful where the managed browser blocks file://; no external service involved.
import { chromium } from "@playwright/test";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const folder = "dist/bahrain-review",
  files = new Map(
    readdirSync(folder)
      .filter((n) => n.endsWith(".html"))
      .map((n) => [n, readFileSync(`${folder}/${n}`)]),
  );
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext(),
    page = await context.newPage(),
    errors = [],
    unexpected = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/*", (route) => {
    const name =
      new URL(route.request().url()).pathname.split("/").at(-1) || "index.html";
    if (files.has(name))
      return route.fulfill({ contentType: "text/html", body: files.get(name) });
    if (name === "favicon.ico") return route.fulfill({ status: 204 });
    unexpected.push(route.request().url());
    return route.abort();
  });
  await context.setOffline(true);
  await page.goto("http://127.0.0.1:4173/carpet-grand-prix/index.html");
  const images = await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode()));
    return document.images.length;
  });
  if (images < 20) throw Error("Incomplete iteration gallery");
  await page.locator("a.play").click();
  await page
    .locator('#arcadeApp[data-rendering="3d"]')
    .waitFor({ timeout: 30000 });
  if (errors.length || unexpected.length)
    throw Error(JSON.stringify({ errors, unexpected }));
  const report = {
    checkedAt: new Date().toISOString(),
    method:
      "Identical package bytes over local routes; browser network disabled; file protocol is administratively blocked in this environment",
    images,
    actual3DGame: true,
    errors,
    unexpected,
    files: Object.fromEntries(
      [...files].map(([name, bytes]) => [
        name,
        {
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      ]),
    ),
  };
  writeFileSync(
    "docs/bahrain-iteration2/package-check.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({ images, actual3DGame: true, errors, unexpected }),
  );
} finally {
  await browser.close();
}
