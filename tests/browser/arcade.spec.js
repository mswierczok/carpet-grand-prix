import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { driveDarkShoulder, installPausedClock } from "../helpers/arcade-browser.js";
const save = JSON.parse(
  readFileSync(new URL("../fixtures/activeRace.json", import.meta.url)),
);
async function prepare(page) {
  await installPausedClock(page);
  await page.addInitScript((save) => {
    localStorage.setItem("carpet_gp_v072", JSON.stringify(save));
    localStorage.setItem("carpet_gp_arcade_test_sentinel", "keep");
    let sprites;
    Object.defineProperty(globalThis, "CGPRaceSprites", {
      configurable: true,
      get: () => sprites,
      set: (value) => {
        sprites = {
          ...value,
          draw(ctx, pose, ...args) {
            globalThis.__arcadeDrawPose = { ...pose };
            return value.draw(ctx, pose, ...args);
          },
        };
      },
    });
  }, save);
}
test("fährt per Tastatur frei, bremst, pausiert und lässt den klassischen Spielstand unverändert", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page);
  await page.goto("arcade.html");
  const before = await page.evaluate(() => ({ ...localStorage })),
    start = await page.evaluate(() => __arcadeDrawPose);
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(1000);
  expect(Number(await page.locator("#speed").innerText())).toBeGreaterThan(40);
  const moving = await page.evaluate(() => __arcadeDrawPose);
  expect(Math.hypot(moving.x - start.x, moving.y - start.y)).toBeGreaterThan(
    20,
  );
  await page.keyboard.down("d");
  await page.clock.runFor(350);
  await page.keyboard.up("d");
  expect((await page.evaluate(() => __arcadeDrawPose)).ang).toBeGreaterThan(
    moving.ang + 0.05,
  );
  await page.keyboard.up("w");
  await page.keyboard.down("s");
  // Release before the new hold-after-stop gesture selects reverse.
  await page.clock.runFor(600);
  await page.keyboard.up("s");
  await expect(page.locator("#speed")).toHaveText("0");
  await page.keyboard.press("p");
  await expect(page.locator("#pause")).toHaveText("▶ Fahren");
  const time = await page.locator("#lapTime").innerText();
  await page.clock.runFor(1000);
  await expect(page.locator("#lapTime")).toHaveText(time);
  await page.locator("#recover").click();
  await page.locator("#restart").click();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  expect(errors).toEqual([]);
});
test("löst gehaltenes Gas bei Fokusverlust und ignoriert Fahrbefehle im Auswahlfeld", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("arcade.html");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(400);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#pause")).toHaveText("▶ Fahren");
  await page.locator("#restart").click();
  await page.locator("#pause").click();
  await page.clock.runFor(500);
  await expect(page.locator("#speed")).toHaveText("0");
  await page.keyboard.up("w");
  await page.locator("#team").focus();
  await page.keyboard.down("w");
  await page.clock.runFor(500);
  await page.keyboard.up("w");
  await expect(page.locator("#speed")).toHaveText("0");
  await page.locator("#arcadeCanvas").focus();
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(200);
  const beforeRelease = Number(await page.locator("#speed").innerText());
  await page.keyboard.up("w");
  await page.clock.runFor(200);
  expect(Number(await page.locator("#speed").innerText())).toBeGreaterThan(
    beforeRelease,
  );
  await page.keyboard.up("ArrowUp");
});
test("ist mit Zeigertasten bedienbar, skaliert mobil und öffnet ohne weitere Ressourcen offline", async ({
  page,
  context,
}) => {
  await prepare(page);
  const requests = [];
  page.on("request", (r) => {
    if (r.url().startsWith("http")) requests.push(r.url());
  });
  await page.goto("__arcade_offline__/index.html");
  await context.setOffline(true);
  await page.locator("#pause").click();
  await page.locator('[data-drive="throttle"]').scrollIntoViewIfNeeded();
  const box = await page.locator('[data-drive="throttle"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(500);
  expect(Number(await page.locator("#speed").innerText())).toBeGreaterThan(10);
  await page.mouse.up();
  await page.locator("#pause").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(requests).toHaveLength(1);
});
test("absolviert im echten Canvas drei Runden mit ausschließlich Tastaturereignissen", async ({
  page,
}) => {
  test.setTimeout(120000);
  await prepare(page);
  await page.goto("arcade.html");
  await page.locator("#pause").click();
  await driveDarkShoulder(page);
  await expect(page.locator("#status")).toContainText("Dunkler Teppich");
  await expect(page.locator("#arcadeApp")).not.toContainText("ungültig");
  await page.evaluate(() => {
    const surface = CGPArcade.Surface.create(CGPArcadeData.tracks.bahrain),
      p = CGPArcade.Physics.parameters;
    let hint = -surface.g.width * 0.9;
    const held = new Set();
    const key = (code, pressed) => {
      if (pressed === held.has(code)) return;
      pressed ? held.add(code) : held.delete(code);
      window.dispatchEvent(
        new KeyboardEvent(pressed ? "keydown" : "keyup", {
          code,
          key: code,
          bubbles: true,
        }),
      );
    };
    function steer() {
      const pose = globalThis.__arcadeDrawPose;
      if (pose) {
        const projection = surface.project(pose, hint);
        hint = projection.s;
        const speed =
            Number(document.getElementById("speed").textContent) /
            (p.metersPerUnit * 3.6),
          look = Math.max(12, Math.min(30, 12 + speed * 0.18)),
          target = surface.at(hint + look),
          angle = Math.atan2(
            Math.sin(
              Math.atan2(target.y - pose.y, target.x - pose.x) - pose.ang,
            ),
            Math.cos(
              Math.atan2(target.y - pose.y, target.x - pose.x) - pose.ang,
            ),
          );
        let curvature = 0.001;
        for (let ahead = 0; ahead < 70; ahead += 7) {
          const a = surface.at(hint + ahead),
            b = surface.at(hint + ahead + 8);
          curvature = Math.max(
            curvature,
            Math.abs(
              Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang)),
            ) / 8,
          );
        }
        const desired = Math.min(
          92,
          Math.sqrt((p.maxLateralAcceleration * 0.62) / curvature),
        );
        key("KeyW", speed < desired);
        key("KeyS", speed > desired + 3);
        key("KeyA", angle < -0.065);
        key("KeyD", angle > 0.065);
      }
      if (Number(document.getElementById("laps").textContent) < 3)
        requestAnimationFrame(steer);
      else for (const code of [...held]) key(code, false);
    }
    requestAnimationFrame(steer);
  });
  await page.clock.runFor(125000);
  expect(
    Number(await page.locator("#laps").innerText()),
  ).toBeGreaterThanOrEqual(3);
  await expect(page.locator("#bestLap")).not.toHaveText("—");
  await expect(page.locator("#lastLap")).not.toContainText("ungültig");
});
