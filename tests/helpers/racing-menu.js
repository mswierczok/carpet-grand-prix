// Browser actions through the published HUD/menu. No production hooks.
export async function openRaceMenu(page, screen = "home") {
  if (await page.locator("#sessionResults[open]").count())
    await page.locator("#closeResults").click();
  if (!(await page.locator("#raceSettings[open]").count()))
    await page.locator("#openSettings").click();
  if (screen !== "home") {
    const panel = page.locator(`[data-menu-screen="${screen}"]`);
    if (!(await panel.isVisible())) {
      if (!(await page.locator('[data-menu-screen="home"]').isVisible()))
        await page.locator("[data-menu-back]:visible").click();
      await page.locator(`[data-menu-target="${screen}"]`).click();
    }
  } else if (
    (await page.locator("[data-menu-screen]").count()) &&
    !(await page.locator('[data-menu-screen="home"]').isVisible())
  )
    await page.locator("[data-menu-back]:visible").click();
}
export async function closeRaceMenu(page) {
  if (await page.locator("#raceSettings[open]").count())
    await page.locator("#closeSettings").click();
}
export async function finishResumeCountdown(page) {
  if (await page.locator("#resumeCountdown").isVisible())
    await page.clock.runFor(3040);
}
export async function driveButton(page) {
  if (!(await page.locator(".racing-screen").count())) {
    await page.locator("#pause").click();
    return;
  }
  if (await page.locator("#resumeCountdown").isVisible()) {
    await finishResumeCountdown(page);
    return;
  }
  const paused = await page.locator("#status").textContent();
  if (await page.locator("#sessionResults[open]").count())
    await page.locator("#closeResults").click();
  if (await page.locator("#pause").isVisible()) {
    await closeRaceMenu(page);
    await page.locator("#pause").click();
    return;
  }
  if (await page.locator("#startQualifying").isVisible()) {
    await openRaceMenu(page);
    await page.locator("#directRace").click();
    await page.locator("#pause").click();
    return;
  }
  if (
    (await page.locator("#raceSettings[open]").count()) ||
    paused.includes("PAUSE")
  ) {
    await openRaceMenu(page);
    await page.locator("#resumeRace").click();
    await finishResumeCountdown(page);
  } else await openRaceMenu(page);
}
export async function raceAction(page, id, { close = true } = {}) {
  if (!(await page.locator(".racing-screen").count())) {
    await page.locator("#" + id).click();
    return;
  }
  if (id === "acceptQualifying" || id === "startQualifying") {
    if (await page.locator("#sessionResults[open]").count())
      await page.locator("#closeResults").click();
    if (id === "startQualifying" && !await page.locator("#startQualifying").isVisible()) {
      await openRaceMenu(page);
      await page.locator("#repeatQualifying").click();
      return;
    }
    await closeRaceMenu(page);
    await page.locator("#" + id).click();
    return;
  }
  await openRaceMenu(page);
  if (id === "restart") page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#" + id).click();
  if (close) await closeRaceMenu(page);
}
export async function selectRaceOption(page, id, value) {
  if (await page.locator(".racing-screen").count()) {
    await openRaceMenu(page, "preparation");
    await page.locator("#" + id).selectOption(value);
    await closeRaceMenu(page);
  } else await page.locator("#" + id).selectOption(value);
}
export const pauseControl = (page) =>
  page.locator(
    ".racing-screen #resumeRace, #arcadeApp:not(.racing-screen) #pause",
  );
export async function openLegacySettings(page, screen = "settings") {
  if (await page.locator(".racing-screen").count())
    await openRaceMenu(page, screen);
  else await page.locator("#openSettings").click();
}
export async function backToMenu(page) {
  if (await page.locator(".racing-screen").count())
    await openRaceMenu(page, "save");
  await page.getByRole("link", { name: "← Hauptmenü", exact: true }).click();
}
