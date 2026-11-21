import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import { loadArcade } from "../helpers/arcade.js";

test.use({ hasTouch: true });
async function prepare(
  page,
  { session = "race", offline = false, threeD = false } = {},
) {
  if (threeD) await capture3D(page, { renderEvery: 8 });
  else {
    await capture2D(page, { renderEvery: 8 });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : original.call(this, type, ...args);
      };
    });
  }
  if (session === "campaign") {
    const game = loadArcade({ race: true }).api.Campaign.create({
      driverId: "d035",
    });
    await page.addInitScript(
      (game) =>
        localStorage.setItem("carpet_gp_campaign_v1", JSON.stringify(game)),
      game,
    );
  }
  const file = offline
    ? session === "campaign"
      ? "__campaign_offline__/index.html"
      : "__arcade_race_offline__/index.html"
    : "race.html";
  await page.goto(
    file + (session === "campaign" ? "?mode=campaign" : "?new=single"),
  );
  await page.clock.runFor(64);
}
async function begin(page, session) {
  if (session === "race") {
    await page.locator("#openSettings").tap();
    await page.locator("#directRace").tap();
    await page.locator("#pause").tap();
  } else await page.locator("#startQualifying").tap();
  await page.clock.runFor(4200);
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("racing");
}
async function settings(page) {
  await page.locator("#openSettings").tap();
  await page.locator('[data-menu-target="settings"]').tap();
  await page.clock.runFor(32);
}
const frozen = (page) =>
  page.evaluate(() => ({
    elapsed: __driveSnapshot.race.elapsed,
    lap: __driveSnapshot.lapSeconds,
    cars: __driveSnapshot.entries.map((e) => [
      e.id,
      e.car.x,
      e.car.y,
      e.car.heading,
      e.timing.completed,
    ]),
  }));
for (const config of [
  { session: "race", offline: false, exit: "close" },
  { session: "race", offline: true, exit: "resume" },
  { session: "qualifying", offline: false, exit: "escape" },
  { session: "campaign", offline: false, exit: "close" },
  { session: "campaign", offline: true, exit: "resume" },
])
  test(`Fortsetzen: ${config.session} ${config.offline ? "offline" : "online"} über ${config.exit} wartet mit 3–2–1 volle drei Sekunden`, async ({
    page,
    context,
  }) => {
    await prepare(page, config);
    if (config.offline) await context.setOffline(true);
    await begin(page, config.session);
    await settings(page);
    const before = await frozen(page);
    expect(before.cars).toHaveLength(13);
    if (config.exit === "close") await page.locator("#closeSettings").tap();
    else if (config.exit === "escape") await page.keyboard.press("Escape");
    else {
      await page
        .locator('[data-menu-screen="settings"] [data-menu-back]')
        .tap();
      await expect(page.locator("#resumeCountdown")).toBeHidden();
      await page.locator("#resumeRace").tap();
    }
    await expect(page.locator("#resumeCountdownNumber")).toHaveText("3");
    await expect(page.locator("#resumeCountdown")).toBeVisible();
    for (const number of ["2", "1"]) {
      await page.clock.runFor(1040);
      await expect(page.locator("#resumeCountdownNumber")).toHaveText(number);
      expect(await frozen(page)).toEqual(before);
    }
    // A fresh press can prepare the controls while the whole field stays paused.
    await page.keyboard.down("w");
    await page.clock.runFor(840);
    expect(await frozen(page)).toEqual(before);
    expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
    await page.clock.runFor(200);
    await expect(page.locator("#resumeCountdown")).toBeHidden();
    expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(false);
    expect(
      await page.evaluate(() => __driveSnapshot.race.elapsed),
    ).toBeGreaterThan(before.elapsed);
    expect(
      await page.evaluate(() => __driveSnapshot.car.speed),
    ).toBeGreaterThan(0);
    await page.keyboard.up("w");
  });

test("Fortsetzen: Menü erneut öffnen und Fokusverlust brechen den Countdown ab", async ({
  page,
}) => {
  await prepare(page);
  await begin(page, "race");
  await settings(page);
  const before = await frozen(page);
  await page.locator("#closeSettings").tap();
  await page.clock.runFor(1040);
  await page.locator("#openSettings").tap();
  await expect(page.locator("#resumeCountdown")).toBeHidden();
  await page.clock.runFor(4000);
  expect(await frozen(page)).toEqual(before);
  await page.locator("#resumeRace").tap();
  await page.clock.runFor(1040);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(4000);
  await expect(page.locator("#resumeCountdown")).toBeHidden();
  expect(await frozen(page)).toEqual(before);
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await page.locator("#openSettings").tap();
  await page.locator("#resumeRace").tap();
  await page.clock.runFor(3040);
  expect(
    await page.evaluate(() => __driveSnapshot.race.elapsed),
  ).toBeGreaterThan(before.elapsed);
});

test("Fortsetzen: Aufstellung und Klassement-Rücknavigation starten kein Rennen; Neuladen bleibt pausiert", async ({
  page,
}) => {
  await prepare(page);
  await settings(page);
  await page.locator("#closeSettings").tap();
  await page.clock.runFor(4000);
  await expect(page.locator("#resumeCountdown")).toBeHidden();
  expect(await page.evaluate(() => __driveSnapshot.race.phase)).toBe("grid");
  await begin(page, "race");
  await page.locator("#openSettings").tap();
  await page.locator('[data-menu-target="classification"]').tap();
  await page.locator("#closeSettings").tap();
  await expect(page.locator("#raceSettings")).toBeVisible();
  await expect(page.locator("#resumeCountdown")).toBeHidden();
  await page.clock.runFor(32);
  const before = await frozen(page);
  await page.clock.runFor(4000);
  expect(await frozen(page)).toEqual(before);
  await page.locator("#resumeRace").tap();
  await page.clock.runFor(1040);
  await page.reload();
  await page.clock.runFor(64);
  await expect(page.locator("#resumeCountdown")).toBeHidden();
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await page.clock.runFor(4000);
  expect(await frozen(page)).toEqual(before);
});

test("Fortsetzen: verzögerte Frames schlagen keine Countdown-Zeit auf das Rennen auf", async ({
  page,
}) => {
  await prepare(page);
  await begin(page, "race");
  await settings(page);
  const before = await frozen(page);
  await page.locator("#closeSettings").tap();
  await page.clock.fastForward(4000);
  await expect(page.locator("#resumeCountdown")).toBeHidden();
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(false);
  expect(await frozen(page)).toEqual(before);
  await page.clock.runFor(64);
  expect(
    await page.evaluate(() => __driveSnapshot.race.elapsed),
  ).toBeGreaterThan(before.elapsed);
});

test("Fortsetzen: sichtbarer Countdown über der tatsächlichen POV-Szene", async ({
  page,
}, info) => {
  await prepare(page, { session: "qualifying", threeD: true });
  await begin(page, "qualifying");
  await settings(page);
  await page.locator("#closeSettings").tap();
  await page.clock.runFor(1040);
  await expect(page.locator("#resumeCountdownNumber")).toHaveText("2");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-rendering",
    "3d",
  );
  const b = await page.locator("#resumeCountdownNumber").boundingBox(),
    viewport = page.viewportSize();
  expect(Math.abs(b.x + b.width / 2 - viewport.width / 2)).toBeLessThan(10);
  expect(Math.abs(b.y + b.height / 2 - viewport.height / 2)).toBeLessThan(50);
  await page.screenshot({
    path: `docs/racing-hud/${info.project.name}-resume-countdown.png`,
  });
});
