import { test, expect } from "@playwright/test";
import { capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

for (const offline of [false, true])
  test(`Seilkontakt: ${offline ? "offline · " : ""}fährt per Tastatur oder Mehrfingereingabe ans Seil und löst sich mit Gas und Gegenlenken`, async ({
    page,
    context,
    isMobile,
  }, info) => {
    test.setTimeout(120000);
    const errors = [];
    const requests = [];
    page.on("request", (r) => {
      if (r.url().startsWith("http")) requests.push(r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await capture3D(page, { renderEvery: 8 });
    await page.goto(
      offline
        ? "__arcade3d_offline__/index.html?track=bahrain"
        : "arcade3d.html?track=bahrain",
    );
    if (offline) await context.setOffline(true);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    await page.locator("#quality").selectOption("low");
    await page.locator("#pause").click();
    const held = new Map(),
      cdp = isMobile ? await context.newCDPSession(page) : null,
      keys = { throttle: "w", right: "d", left: "a" },
      ids = { throttle: 1, right: 2, left: 3 };
    async function press(action, down) {
      if (!isMobile)
        return down
          ? page.keyboard.down(keys[action])
          : page.keyboard.up(keys[action]);
      const hadTouches = held.size > 0;
      if (down) {
        await page.locator(".touch-controls").scrollIntoViewIfNeeded();
        const b = await page.locator(`[data-drive="${action}"]`).boundingBox();
        held.set(action, {
          id: ids[action],
          x: b.x + b.width / 2,
          y: b.y + b.height / 2,
        });
      } else held.delete(action);
      // CDP touchEnd has no points. Restart the gesture when its finger set
      // changes; each driving phase still holds gas and steering together.
      if (hadTouches)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      if (held.size)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [...held.values()],
        });
    }
    await press("throttle", true);
    await page.clock.runFor(800);
    await press("right", true);
    for (let n = 0; n < 100; n++) {
      await page.clock.runFor(32);
      if (await page.evaluate(() => __driveSnapshot.car.hitWall)) break;
    }
    const impact = await page.evaluate(() => __driveSnapshot);
    expect(impact.car.hitWall).toBe(true);
    expect(impact.car.speed).toBeGreaterThan(0);
    await page.evaluate(() =>
      __inspect3D.draw(__driveSnapshot, "t01", false, 1 / 60),
    );
    await page
      .locator(".drive-view")
      .screenshot({ path: info.outputPath("rope-contact.png") });
    await press("right", false);
    await press("left", true);
    let escaped = false;
    for (let n = 0; n < 120; n++) {
      await page.clock.runFor(32);
      escaped = await page.evaluate(() => {
        const s = __driveSnapshot,
          surface = CGPArcade.Surface.create(
            CGPArcade.TrackCatalog.get("bahrain"),
          );
        return (
          !s.car.hitWall &&
          s.car.longitudinalSpeed > 3 &&
          surface.project(s.car).distance <
            surface.outerRadius - CGPArcade.Physics.parameters.halfLength - 2
        );
      });
      if (escaped) break;
    }
    await press("left", false);
    await press("throttle", false);
    const after = await page.evaluate(() => __driveSnapshot);
    expect(escaped, JSON.stringify(after.car)).toBe(true);
    expect(
      Math.hypot(after.car.x - impact.car.x, after.car.y - impact.car.y),
    ).toBeGreaterThan(5);
    expect(after.car.longitudinalSpeed).toBeGreaterThan(0);
    await page.evaluate(() =>
      __inspect3D.draw(__driveSnapshot, "t01", false, 1 / 60),
    );
    await page
      .locator(".drive-view")
      .screenshot({ path: info.outputPath("rope-escaped.png") });
    expect(errors).toEqual([]);
    if (offline) expect(requests).toHaveLength(1);
  });

test("Seilkontakt: vollständiges Bahrain-Rennen mit 13 gültigen Zieleinläufen", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page, { renderEvery: 90 });
  await page.route("**/src/racing/race-session.js*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
;(() => { const original = CGPArcade.RaceSession;
CGPArcade.RaceSession = Object.freeze({ ...original, create(track, options = {}) {
  return original.create(track, { ...options, laps: options.laps ?? 1 });
} }); })();`,
    });
  });
  await page.goto("race.html?track=bahrain&quality=low");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  await page.locator("#pause").click();
  await page.evaluate(pilotRace);
  for (let n = 0; n < 160; n++) {
    await page.clock.runFor(1000);
    if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
      break;
  }
  const result = await page.evaluate(() => __driveSnapshot);
  expect(result.race.phase).toBe("finished");
  expect(result.race.finished).toBe(13);
  expect(
    result.entries.every(
      (e) => e.timing.completed === 1 && e.timing.lastLap.valid,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
