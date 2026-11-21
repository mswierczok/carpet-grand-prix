import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClassicArchiveOffline, createCampaignOffline } from "../../scripts/build-arcade-offline.js";
const classic = readFileSync(new URL("../fixtures/activeRace.json", import.meta.url), "utf8");
const saved = {
  carpet_gp_v072: classic,
  carpet_gp_preferences_v1: '{"speed":2}',
  carpet_grand_prix_workshop_logos_v1: '{"t13":"existing-logo"}',
  carpet_gp_backup_pre_v03: "existing-backup-3",
  carpet_gp_backup_pre_v04: "existing-backup-4",
};
async function seed(page) {
  await page.goto("play.html");
  await page.evaluate(values => Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value)), saved);
}
async function unchanged(page) {
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(saved))).toEqual(saved);
}
test("Archiv: Root und alte Links laden ausschließlich aktuelle Menüs und lassen Browserstände unverändert", async ({ page }) => {
  const errors = [], requests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => requests.push(r.url()));
  await seed(page);
  await page.goto("./");
  await expect(page).toHaveURL(/play.html$/);
  await expect(page.locator("#openCampaign")).toBeVisible();
  await expect(page.locator("#newDrive")).toBeVisible();
  await unchanged(page);
  await page.goto("./?legacy=1");
  await expect(page).toHaveURL(/archive.html$/);
  await expect(page.getByRole("heading", { name: "Die klassische Simulation ist archiviert" })).toBeVisible();
  await page.reload();
  await unchanged(page);
  await page.getByRole("link", { name: "Zum aktuellen Hauptmenü" }).click();
  await expect(page).toHaveURL(/play.html$/);
  expect(requests.some(url => /styles\/(?:base|race|workshop|team-driver-hud)\.css|src\/(?:ui\/team-driver-hud|rendering\/pilot-world)\.js/.test(url))).toBe(false);
  expect(errors).toEqual([]);
});
test("Archiv: exportiert alte JSON-Daten unverändert und schreibt keinen Speicherbereich", async ({ page }) => {
  await seed(page);
  await page.goto("archive.html");
  const downloadEvent = page.waitForEvent("download");
  await page.locator("#exportClassicSave").click();
  const download = await downloadEvent;
  expect(readFileSync(await download.path(), "utf8")).toBe(classic);
  await unchanged(page);
  await expect(page.locator("#archiveStatus")).toContainText("bleiben erhalten");
  await page.evaluate(() => localStorage.setItem("carpet_gp_v072", "{damaged-raw-data"));
  const damagedEvent = page.waitForEvent("download");
  await page.locator("#exportClassicSave").click();
  expect(readFileSync(await (await damagedEvent).path(), "utf8")).toBe("{damaged-raw-data");
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBe("{damaged-raw-data");
});
test("Archiv: meldet fehlenden oder gesperrten Speicher ohne Daten anzulegen", async ({ page }) => {
  await page.goto("archive.html");
  await page.locator("#exportClassicSave").click();
  await expect(page.locator("#archiveStatus")).toContainText("kein klassischer Spielstand");
  expect(await page.evaluate(() => localStorage.getItem("carpet_gp_v072"))).toBeNull();
  await page.evaluate(() => { Storage.prototype.getItem = () => { throw new DOMException("Denied", "SecurityError"); }; });
  await page.locator("#exportClassicSave").click();
  await expect(page.locator("#archiveStatus")).toContainText("keinen Zugriff");
});
test("Archiv: Offlineinformation benötigt kein Netzwerk und kann den alten Stand exportieren", async ({ page, context }) => {
  await seed(page);
  await page.route("**/__archive_offline__/index.html", route => route.fulfill({ contentType: "text/html", body: createClassicArchiveOffline() }));
  await page.goto("__archive_offline__/index.html");
  await context.setOffline(true);
  const event = page.waitForEvent("download");
  await page.locator("#exportClassicSave").click();
  expect(readFileSync(await (await event).path(), "utf8")).toBe(classic);
  await unchanged(page);
});
test("Aktuelle Assets: alle 35 Originalporträts und 13 Teamfahrzeuge dekodieren online und vollständig eingebettet", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto("play.html");
  const decoded = await page.evaluate(async () => {
    const manifest = await (await fetch("./assets/drivers/portraits/manifest.json")).json();
    const paths = [...manifest.entries.map(p => p.src), ...CGPArcadeData.roster.teams.map(t => `./assets/cars/team-${t.id}.webp`)];
    await Promise.all(paths.map(async path => { const image = new Image(); image.src = path; await image.decode(); if (!image.naturalWidth) throw Error(path); }));
    return { portraits: manifest.entries.length, teams: CGPArcadeData.roster.teams.length };
  });
  expect(decoded).toEqual({ portraits: 35, teams: 13 });
  await page.route("**/__assets_offline__/index.html", route => route.fulfill({ contentType: "text/html", body: createCampaignOffline() }));
  await page.goto("__assets_offline__/index.html");
  await context.setOffline(true);
  expect(await page.evaluate(async () => {
    const images = Object.values(CGPArcade.CampaignImages);
    await Promise.all(images.map(async src => { if (!src.startsWith("data:")) throw Error("External asset"); const image = new Image(); image.src = src; await image.decode(); }));
    return images.length;
  })).toBe(48);
});
