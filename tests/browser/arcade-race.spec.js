import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

test("zeigt alle 13 echten Teamfahrzeuge mit gebündelter 3D-Geometrie und stabiler Teamwahl", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { observeFleet: true });
  await page.addInitScript(() =>
    localStorage.setItem("carpet_gp_full_grid_sentinel", "keep"),
  );
  await page.goto("race.html");
  await page.clock.runFor(64);
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await expect(page.locator("#raceOrder li")).toHaveCount(13);
  await expect(page.locator("#position")).toHaveText("13 / 13");
  const before = await page.evaluate(() => ({ ...localStorage }));
  for (const id of ["t01", "t04", "t05", "t13", "t01"]) {
    await page.locator("#team").selectOption(id);
    await page.clock.runFor(32);
    const s = await page.evaluate(() => ({
      snapshot: __driveSnapshot,
      fleet: __fleetStats,
      renderer: __inspect3D.diagnostics(),
    }));
    expect(s.snapshot.entries).toHaveLength(13);
    expect(s.snapshot.race.playerTeam).toBe(id);
    expect(s.fleet.ids).toHaveLength(12);
    expect(s.fleet.ids).not.toContain(id);
    expect(s.fleet.cached).toBeLessThanOrEqual(13);
    expect(s.fleet.liveries).toBe(12);
    expect(s.fleet.batches.every((n) => n <= 8)).toBe(true);
    expect(s.renderer.drawCalls).toBeLessThan(200);
    expect(s.renderer.triangles).toBeGreaterThan(30000);
    expect(s.renderer.geometries).toBeLessThan(160);
    await expect(page.locator("#raceOrder .is-player")).toHaveAttribute(
      "data-team",
      id,
    );
  }
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("hält das volle Feld bei Rot an, pausiert alle Fahrer und erhält sie beim Wechsel in die Draufsicht", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.goto("race.html");
  await page.clock.runFor(32);
  await page.locator("#quality").selectOption("low");
  const initial = await page.evaluate(() =>
    __driveSnapshot.entries.map((e) => [e.car.x, e.car.y]),
  );
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(1100);
  await expect(page.locator("#raceSignal")).toHaveText("2");
  expect(
    await page.evaluate(() =>
      __driveSnapshot.entries.map((e) => [e.car.x, e.car.y]),
    ),
  ).toEqual(initial);
  await page.keyboard.press("p");
  await page.clock.runFor(500);
  await expect(page.locator("#raceSignal")).toHaveText("2");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(4500);
  await page.keyboard.up("w");
  const moving = await page.evaluate(() => __driveSnapshot);
  expect(moving.race.phase).toBe("racing");
  expect(moving.entries.filter((e) => e.car.speed > 5)).toHaveLength(13);
  await expect(page.locator("#team")).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(32);
  const paused = await page.evaluate(() => __driveSnapshot);
  await page.clock.runFor(500);
  expect((await page.evaluate(() => __driveSnapshot)).entries).toEqual(
    paused.entries,
  );
  await expect(page.locator("#pause")).toHaveText("Fortsetzen");
  await page.locator("#fallback").click();
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "2d",
  );
  await expect(page.locator("#raceOrder li")).toHaveCount(13);
  await page.locator("#restart").click();
  await expect(page.locator("#team")).toBeEnabled();
  await expect(page.locator("#raceClock")).toHaveText("0:00.000");
  await expect(page.locator("#pause")).toHaveText("Rennen starten");
  expect(errors).toEqual([]);
});

test("enthält das volle Feld auch im netzwerkfreien Renn-HTML", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { observeFleet: true });
  await page.goto("__arcade_race_offline__/index.html");
  await page.clock.runFor(64);
  await context.setOffline(true);
  page.on("request", (req) => {
    if (req.url().startsWith("http")) requests.push(req.url());
  });
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await page.locator("#quality").selectOption("low");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(5500);
  await page.keyboard.up("w");
  await page.keyboard.press("p");
  await page.clock.runFor(32);
  const s = await page.evaluate(() => __driveSnapshot);
  expect(s.entries).toHaveLength(13);
  expect(s.race.elapsed).toBeGreaterThan(2);
  expect(await page.evaluate(() => __fleetStats.ids.length)).toBe(12);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("fährt ausschließlich über Tastatur ein vollständiges Rennen bis zu 13 echten Ergebnissen", async ({
  page,
}) => {
  test.setTimeout(300000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture2D(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    localStorage.setItem("carpet_gp_race_results_sentinel", "keep");
  });
  await page.goto("race.html");
  await page.clock.runFor(32);
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "2d",
  );
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.locator("#pause").click();
  await page.evaluate(pilotRace);
  for (let step = 0; step < 12; step++) {
    await page.clock.runFor(20000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
      break;
  }
  const s = await page.evaluate(() => __driveSnapshot);
  expect(s.race.phase).toBe("finished");
  expect(s.race.finished).toBe(13);
  expect(
    s.entries.every((e) => e.timing.completed === 3 && e.finishTime > 60),
  ).toBe(true);
  expect(await page.evaluate(() => __racePilotDone)).toBe(true);
  const peaks = await page.evaluate(() => __racePilotPeakSpeeds);
  expect(
    s.entries
      .filter((e) => !e.player)
      .every((e) => Math.round(peaks[e.id]) >= 119),
  ).toBe(true);
  await expect(page.locator("#raceResults")).toBeVisible();
  await expect(page.locator("#resultRows tr")).toHaveCount(13);
  await expect(page.locator("#resultRows .is-player")).toHaveCount(1);
  await expect(page.locator("#resultState")).toContainText(
    "Alle 13 Fahrzeuge sind im Ziel",
  );
  await expect(page.locator("#pause")).toBeDisabled();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  await page.locator("#restart").click();
  await expect(page.locator("#raceResults")).toBeHidden();
  await expect(page.locator("#position")).toHaveText("13 / 13");
  expect(errors).toEqual([]);
});
