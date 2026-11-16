import { test, expect } from "@playwright/test";
import { capture2D, capture3D } from "../helpers/arcade-browser.js";
import { pilotRace } from "../helpers/arcade-race-browser.js";

async function noWebGL(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    localStorage.setItem("carpet_gp_v072", "classic-save-sentinel");
  });
}

test("wechselt alle vier echten 3D-Strecken, erhält das Team und gibt alte WebGL-Kontexte frei", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.goto("race.html?track=luxembourg");
  await page.clock.runFor(64);
  await expect(page.locator("#track option")).toHaveCount(22);
  await page.locator("#quality").selectOption("low");
  await page.locator("#team").selectOption("t05");
  for (const id of ["canada", "france", "bahrain", "luxembourg"]) {
    await page.evaluate(
      () =>
        (globalThis.__previousGL = document
          .getElementById("arcadeCanvas")
          .getContext("webgl2")),
    );
    await page.locator("#track").selectOption(id);
    await page.clock.runFor(100);
    await expect(page.locator("#arcadeApp")).toHaveAttribute("data-track", id);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    await expect(page.locator("#team")).toHaveValue("t05");
    await expect(page.locator("#quality")).toHaveValue("low");
    const result = await page.evaluate(() => {
      const track = CGPArcade.TrackCatalog.get(
          document.getElementById("track").value,
        ),
        surface = CGPArcade.Surface.create(track),
        expected = surface.at(-22, -6);
      return {
        name: track.name,
        snapshot: __driveSnapshot,
        expected,
        released: __previousGL.isContextLost(),
        current: document
          .getElementById("arcadeCanvas")
          .getContext("webgl2")
          .isContextLost(),
        diagnostics: __inspect3D.diagnostics(),
      };
    });
    expect(result.released).toBe(true);
    expect(result.current).toBe(false);
    expect(result.snapshot.entries).toHaveLength(13);
    expect(result.snapshot.race.playerTeam).toBe("t05");
    expect(result.snapshot.race.elapsed).toBe(0);
    expect(result.snapshot.paused).toBe(true);
    expect(result.snapshot.entries[0].car.x).toBeCloseTo(result.expected.x, 8);
    expect(result.snapshot.entries[0].car.y).toBeCloseTo(result.expected.y, 8);
    expect(result.diagnostics.geometries).toBeLessThan(180);
    await expect(page.locator("[data-track-name]").last()).toHaveText(
      result.name,
    );
    await expect(page.locator(".new-view")).toHaveAttribute(
      "href",
      new RegExp("track=" + id),
    );
  }
  expect(errors).toEqual([]);
});

test("sperrt den Rennstreckenwechsel nach dem Start und startet nach Neustart sauber mit der neuen Strecke", async ({
  page,
}) => {
  await capture2D(page);
  await noWebGL(page);
  await page.goto("race.html?track=france");
  await page.clock.runFor(32);
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(4500);
  await page.keyboard.up("w");
  await expect(page.locator("#track")).toBeDisabled();
  const before = await page.evaluate(() => __driveSnapshot.race.elapsed);
  await page.evaluate(() => {
    const select = document.getElementById("track");
    select.value = "canada";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.clock.runFor(64);
  await expect(page.locator("#track")).toHaveValue("france");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-track",
    "france",
  );
  expect(
    await page.evaluate(() => __driveSnapshot.race.elapsed),
  ).toBeGreaterThanOrEqual(before);
  await page.locator("#restart").click();
  await expect(page.locator("#track")).toBeEnabled();
  await page.locator("#track").selectOption("canada");
  await page.clock.runFor(32);
  await expect(page.locator("#raceClock")).toHaveText("0:00.000");
  expect(
    await page.evaluate(() =>
      __driveSnapshot.entries.every(
        (e) => e.car.speed === 0 && e.timing.completed === 0,
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("carpet_gp_v072")),
  ).toBe("classic-save-sentinel");
});

test("wechselt im freien POV-Fahren sicher die Strecke und löst gehaltene Eingaben", async ({
  page,
}) => {
  test.setTimeout(120000);
  await capture3D(page);
  await page.goto("arcade3d.html?track=canada");
  await page.clock.runFor(32);
  await page.locator("#quality").selectOption("low");
  await page.locator("#team").selectOption("t10");
  await page.locator("#pause").click();
  await page.keyboard.down("w");
  await page.clock.runFor(400);
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBeGreaterThan(
    5,
  );
  await page.locator("#track").selectOption("france");
  await page.clock.runFor(64);
  await expect(page.locator("#team")).toHaveValue("t10");
  expect(await page.evaluate(() => __driveSnapshot.paused)).toBe(true);
  await page.locator("#pause").click();
  await page.clock.runFor(300);
  expect(await page.evaluate(() => __driveSnapshot.car.speed)).toBe(0);
  await page.keyboard.up("w");
  await expect(page.locator("#quality")).toHaveValue("low");
  await expect(page.locator("#arcadeCanvas")).toHaveAttribute(
    "aria-label",
    /^Frankreich/,
  );
});

test("fällt bei einer unbekannten Streckenkennung auf Bahrain zurück", async ({
  page,
}) => {
  await capture2D(page);
  await noWebGL(page);
  await page.goto("race.html?track=atlantis");
  await page.clock.runFor(32);
  await expect(page.locator("#track")).toHaveValue("bahrain");
  await expect(page.locator("#arcadeApp")).toHaveAttribute(
    "data-track",
    "bahrain",
  );
  expect(
    await page.evaluate(() =>
      CGPArcade.TrackCatalog.tracks.filter((t) => t.bridgeU.length).map((t) => ({
        id: t.id,
        kind: CGPArcadeData.boundaries[t.id].kind,
      })),
    ),
  ).toEqual([
    { id: "korea", kind: "bridges" },
    { id: "russia", kind: "bridges" },
  ]);
});

test("enthält alle vier POV-Strecken samt Auswahl und Seilen in der netzwerkfreien Rennversion", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await capture3D(page);
  await page.goto("__arcade_race_offline__/index.html?track=france");
  await page.clock.runFor(64);
  await context.setOffline(true);
  page.on("request", (r) => {
    if (r.url().startsWith("http")) requests.push(r.url());
  });
  await page.locator("#quality").selectOption("low");
  for (const id of ["luxembourg", "canada", "bahrain", "france"]) {
    await page.locator("#track").selectOption(id);
    await page.clock.runFor(64);
    await expect(page.locator("#arcadeApp")).toHaveAttribute("data-track", id);
    await expect(page.locator("#arcadeApp")).toHaveAttribute(
      "data-rendering",
      "3d",
    );
    expect(await page.evaluate(() => __driveSnapshot.entries.length)).toBe(13);
  }
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const id of ["luxembourg", "canada", "france"])
  test(`fährt auf ${id} über echte Tastaturbefehle ein Drei-Runden-Rennen bis zu 13 Zieleinläufen`, async ({
    page,
  }) => {
    test.setTimeout(300000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await capture2D(page);
    await noWebGL(page);
    await page.goto(`race.html?track=${id}`);
    await page.clock.runFor(32);
    const storage = await page.evaluate(() => ({ ...localStorage }));
    await page.locator("#pause").click();
    await page.evaluate(pilotRace);
    for (let i = 0; i < 15; i++) {
      await page.clock.runFor(20000);
      if (await page.evaluate(() => __driveSnapshot.race.phase === "finished"))
        break;
    }
    const snapshot = await page.evaluate(() => __driveSnapshot);
    expect(
      snapshot.race.phase,
      JSON.stringify(
        snapshot.entries.map((e) => ({
          id: e.id,
          lap: e.timing.completed,
          s: e.car.s,
          speed: e.car.speed,
        })),
      ),
    ).toBe("finished");
    expect(snapshot.race.finished).toBe(13);
    expect(
      snapshot.entries.every(
        (e) =>
          e.timing.completed === 3 &&
          e.timing.lastLap.valid &&
          e.finishTime > 0,
      ),
    ).toBe(true);
    const peaks = await page.evaluate(() => __racePilotPeakSpeeds);
    expect(
      snapshot.entries
        .filter((e) => !e.player)
        .every((e) => Math.round(peaks[e.id]) >= 119),
    ).toBe(true);
    await expect(page.locator("#resultRows tr")).toHaveCount(13);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
    expect(errors).toEqual([]);
  });
