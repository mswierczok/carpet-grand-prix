import { driveButton, raceAction, selectRaceOption, openRaceMenu } from "../helpers/racing-menu.js";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";
import { povIds } from "../helpers/pov-catalog.js";
const group = process.env.CGP_ENV_TEST_GROUP;
const selected = process.env.CGP_ENV_TEST_IDS?.split(",");
const ids = povIds
  .slice(1)
  .filter((_, i) => group === undefined || i % 3 === Number(group))
  .filter((id) => !selected || selected.includes(id));
const output = process.env.CGP_ENV_ARTIFACT_DIR || "docs/calendar-environments";
test("Streckenwelten: 21 Themen in echtem WebGL, Übersicht und Startansicht", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  mkdirSync(output, { recursive: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await capture3D(page, { reviewCamera: true });
  await page.goto("race.html");
  await page.clock.runFor(64);
  const rows = [];
  for (const id of ids) {
    await selectRaceOption(page, "track", id);
    await page.clock.runFor(64);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    const s = await page.evaluate(() => ({
      d: __inspect3D.diagnostics(),
      entries: __driveSnapshot.entries.length,
    }));
    expect(s.d.world.theme).toBe(id);
    expect(s.entries).toBe(13);
    expect(s.d.drawCalls).toBeLessThanOrEqual(190);
    expect(s.d.triangles).toBeLessThan(90000);
    expect(s.d.geometries).toBeLessThanOrEqual(160);
    await page
      .locator("#arcadeCanvas")
      .screenshot({ path: `${output}/${info.project.name}-${id}-pov.png` });
    await page.evaluate(() => {
      const A = CGPArcade,
        id = document.getElementById("track").value,
        surface = A.Surface.create(A.TrackCatalog.get(id)),
        cfg = A.TrackEnvironments.scene(surface),
        layout = A.EnvironmentLayout.create(surface, cfg),
        types = new Set([
          "woodBridge",
          "toyBridge",
          "plasticTube",
          "bedPassage",
          "dollhouse",
          "cushionTunnel",
        ]),
        size = A.CalendarWorld3D.sizes[cfg.signature],
        spec = types.has(cfg.signature)
          ? layout.passage(
              cfg.signature,
              cfg.signature === "bedPassage" ? 0.53 : 0.27,
            )
          : layout.place(
              "signature-landmark",
              cfg.signature,
              ...size,
              0.25,
              -1,
            ),
        aspect =
          document.getElementById("arcadeCanvas").clientWidth /
          document.getElementById("arcadeCanvas").clientHeight,
        distance =
          (Math.hypot(spec.w, spec.d) * 0.65) /
          (Math.tan((55 * Math.PI) / 360) * Math.min(1, aspect)),
        at = spec.at,
        ang = at.ang + (types.has(cfg.signature) ? Math.PI / 2 : 0),
        eye = {
          x: at.x - Math.sin(ang) * distance + Math.cos(ang) * distance * 0.22,
          y: Math.max(55, spec.h * 0.75 + distance * 0.12),
          z: at.y + Math.cos(ang) * distance + Math.sin(ang) * distance * 0.22,
        };
      globalThis.__reviewDetail = {
        position: [eye.x, eye.y, eye.z],
        target: [at.x, spec.h * 0.4, at.y],
      };
      __inspect3D.draw(
        __driveSnapshot,
        __driveSnapshot.race.playerTeam,
        false,
        1 / 60,
      );
    });
    await page
      .locator("#arcadeCanvas")
      .screenshot({ path: `${output}/${info.project.name}-${id}-detail.png` });
    await page.evaluate(() => {
      globalThis.__reviewDetail = null;
      __inspect3D.draw(
        __driveSnapshot,
        __driveSnapshot.race.playerTeam,
        false,
        1 / 60,
      );
    });
    await raceAction(page, "overview");
    await page.clock.runFor(64);
    await page.locator("#arcadeCanvas").screenshot({
      path: `${output}/${info.project.name}-${id}-overview.png`,
    });
    rows.push({ id, ...s.d });
    await raceAction(page, "overview");
    await page.clock.runFor(32);
  }
  writeFileSync(
    `${output}/${info.project.name}-metrics-${group ?? (selected ? "focused" : "all")}.json`,
    JSON.stringify(rows, null, 2) + "\n",
  );
  expect(errors).toEqual([]);
});
for (const id of ids)
  test(`Streckenwelten: echte Runde und sichere Durchfahrt auf ${id}`, async ({
    page,
  }, info) => {
    test.setTimeout(240000);
    mkdirSync(output, { recursive: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await capture3D(page, { renderEvery: 60 });
    await page.addInitScript(() => {
      let module;
      Object.defineProperty(CGPArcade, "RaceWeekend", {
        configurable: true,
        get: () => module,
        set(value) {
          module = {
            ...value,
            create(track, options) {
              return value.create(track, { ...options, laps: 1 });
            },
          };
        },
      });
    });
    await page.goto(`race.html?track=${id}`);
    await page.clock.runFor(64);
    const passage = await page.evaluate(() => {
      const A = CGPArcade,
        s = A.Surface.create(
          A.TrackCatalog.get(document.getElementById("track").value),
        );
      return __inspect3D.diagnostics().world.passages[0] || null;
    });
    let captured = false,
      entered = false,
      near = false;
    await driveButton(page);
    await page.evaluate(pilotRace);
    for (let i = 0; i < 360; i++) {
      await page.clock.runFor(near ? 125 : 500);
      const state = await page.evaluate(() => ({
        s: __driveSnapshot.car.s,
        phase: __driveSnapshot.race.phase,
        finished: __driveSnapshot.race.finished,
      }));
      near = !!passage && Math.abs(state.s - passage.s) < 210;
      if (
        passage &&
        !entered &&
        state.s - passage.s > -150 &&
        state.s - passage.s < -80
      ) {
        await page.evaluate(() =>
          __inspect3D.draw(
            __driveSnapshot,
            __driveSnapshot.race.playerTeam,
            false,
            1 / 60,
          ),
        );
        await page.locator("#arcadeCanvas").screenshot({
          path: `${output}/${info.project.name}-${id}-entry.png`,
        });
        entered = true;
      }
      if (
        passage &&
        !captured &&
        state.s - passage.s >= 20 &&
        state.s - passage.s <= 38
      ) {
        await page.evaluate(() =>
          __inspect3D.draw(
            __driveSnapshot,
            __driveSnapshot.race.playerTeam,
            false,
            1 / 60,
          ),
        );
        await page.locator("#arcadeCanvas").screenshot({
          path: `${output}/${info.project.name}-${id}-passage.png`,
        });
        captured = true;
      }
      if (state.phase === "finished") break;
    }
    const s = await page.evaluate(() => __driveSnapshot);
    expect(s.race.phase).toBe("finished");
    expect(s.race.finished).toBe(13);
    expect(
      s.entries.every(
        (e) =>
          e.timing.completed === 1 &&
          e.timing.lastLap.valid &&
          e.finishTime !== null,
      ),
    ).toBe(true);
    if (passage) {
      expect(entered).toBe(true);
      expect(captured).toBe(true);
    }
    expect(errors).toEqual([]);
  });

if (group === undefined || group === "0")
  test("Streckenwelten: Offline-Galerie und Spielseiten benötigen keine externen Ressourcen", async ({
    page,
    context,
  }) => {
    test.setTimeout(180000);
    await capture3D(page);
    await context.setOffline(true);
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (
        r.url().startsWith("http") &&
        !(r.isNavigationRequest() && r.url().includes("/dist/calendar-review/"))
      )
        requests.push(r.url());
    });
    const allowed = new Set([
      "index.html",
      "carpet-grand-prix-race-offline.html",
      "carpet-grand-prix-menu-offline.html",
      "carpet-grand-prix-arcade-offline.html",
      "carpet-grand-prix-arcade3d-offline.html",
      "carpet-grand-prix-offline.html",
    ]);
    // The managed browser prohibits file:// navigation. Deliver the exact built
    // HTML bytes at the permitted local test origin, including offline navigation.
    await page.route("**/dist/calendar-review/*.html*", (route) => {
      const file = new URL(route.request().url()).pathname.split("/").at(-1);
      if (!allowed.has(file)) return route.abort();
      return route.fulfill({
        contentType: "text/html",
        body: readFileSync(resolve("dist/calendar-review", file), "utf8"),
      });
    });
    await page.goto("dist/calendar-review/index.html");
    await expect(page.locator("article")).toHaveCount(21);
    for (const device of ["mobile-chromium", "chromium"]) {
      await page.locator(`[data-device="${device}"]`).click();
      expect(
        await page
          .locator("article img")
          .first()
          .evaluate(async (img) => {
            await img.decode();
            return img.naturalWidth;
          }),
      ).toBeGreaterThan(100);
    }
    await page.locator("#italy a.play").click();
    await page.clock.runFor(128);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    expect(
      await page.evaluate(() => __inspect3D.diagnostics().world.theme),
    ).toBe("italy");
    for (const id of ["india", "china", "bahrain", "luxembourg"]) {
      await selectRaceOption(page, "track", id);
      await page.clock.runFor(64);
      expect(await page.evaluate(() => __driveSnapshot.entries.length)).toBe(
        13,
      );
      if (id !== "bahrain")
        expect(
          await page.evaluate(() => __inspect3D.diagnostics().world.theme),
        ).toBe(id);
    }
    await openRaceMenu(page, "save");
    await page
      .locator('a[href*="carpet-grand-prix-menu-offline.html"]')
      .first()
      .click();
    expect(page.url()).toContain("carpet-grand-prix-menu-offline.html");
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
