import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT, html } from '../helpers/game.js';
import { originalHTML } from '../helpers/original-html.js';
import { createOfflineHTML, manifest } from '../../scripts/build-offline.js';

const authoredCars = new Set(Array.from({ length: 12 }, (_, i) => `assets/cars/team-t${String(i + 2).padStart(2, '0')}.webp`));

it('erhält Vauclair, Strecken und Hintergrund bytegenau und prüft die zwölf freigegebenen Lackierungen', () => {
  const originalImages = [...originalHTML().matchAll(/data:image\/[\w+.-]+;base64,([A-Za-z0-9+/=]+)/g)];
  expect(manifest.images).toHaveLength(36);
  manifest.images.forEach((image, i) => {
    const bytes = readFileSync(new URL(image.path, ROOT));
    const equalsOriginal = bytes.equals(Buffer.from(originalImages[i][1], 'base64'));
    expect(equalsOriginal).toBe(!authoredCars.has(image.path));
    expect(bytes.length).toBe(image.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(image.sha256);
  });
});

it('erhält CSS-Kaskade, Spielcode und Daten beim Zusammenbauen vollständig', () => {
  // Normalize only the approved presentation changes listed below and the
  // twelve earlier livery payloads. All remaining code/data/styles/images must
  // reconstruct the byte-identical original. Never regenerate the oracle.
  let normalized = createOfflineHTML();
  const pilotCSS = readFileSync(new URL('styles/art-pilot.css', ROOT), 'utf8');
  expect(normalized.split(pilotCSS)).toHaveLength(2);
  normalized = normalized.replace(pilotCSS, '');
  for (const marker of ['illustrated-pilot-bridge', 'illustrated-pilot-surface', 'illustrated-pilot-surface-close']) {
    const block = new RegExp(` *// ${marker}:start\\n[\\s\\S]*? *// ${marker}:end\\n`);
    expect(normalized.match(block)).not.toBeNull();
    normalized = normalized.replace(block, '');
    if (marker === 'illustrated-pilot-bridge') normalized = normalized.replace('\n\nfunction countryFlag', '\nfunction countryFlag');
  }
  const pilotCalls = [
    ["function drawGridSlot(ctx,slot,w,ink='#fff3d9')", 'function drawGridSlot(ctx,slot,w)'],
    ["ctx.strokeStyle=ink;ctx.lineWidth=Math.max", "ctx.strokeStyle='#fff3d9';ctx.lineWidth=Math.max"],
    ["ctx.strokeStyle=pilotSurface?'#42766b':'#91d7c2'", "ctx.strokeStyle='#91d7c2'"],
    ["ctx.strokeStyle=pilotSurface?'#78634b':'#f5e9bb'", "ctx.strokeStyle='#f5e9bb'"],
    ["${window.CGPPilotVehicles?.assets[t.id]?' pilot-illustrated':''}", ''],
    ['illustratedTeamCar(t.id)||TEAMSELECT_CAR_ASSETS.t07', 'TEAMSELECT_CAR_ASSETS[t.id]||TEAMSELECT_CAR_ASSETS.t07'],
    ["image=illustratedTeamCar(t.id)||''", "image=TEAMSELECT_CAR_ASSETS[t.id]||''"],
    ['window.CGPRenderMotion?.remember(qualAnim.session,qualAnim.session.cars,car=>qualPose(qualAnim.session,car));', ''],
    ['window.CGPRenderMotion?.remember(anim.race,anim.race.cars,car=>racePose(anim.race,car));', ''],
    ['const raw=qualifying?qualPose(qualifying,r):(race?racePose(race,r):grid[i].p),p=qualifying||race?renderCarPose(qualifying||race,r,raw):raw;', 'const p=qualifying?qualPose(qualifying,r):(race?racePose(race,r):grid[i].p);'],
    ['setLiveHTML(tower,qualTower(q))', 'tower.innerHTML=qualTower(q)'],
    ['setLiveHTML(ctrl,qualifyControls())', 'ctrl.innerHTML=qualifyControls()'],
    ['setLiveHTML(timing,liveTimingTower(r))', 'timing.innerHTML=liveTimingTower(r)'],
    ['setLiveHTML(controls,raceControls())', 'controls.innerHTML=raceControls()'],
    ['setLiveHTML(events,liveEvents(r))', 'events.innerHTML=liveEvents(r)'],
    ['setLiveHTML(overlay,raceOverlayContent(r))', 'overlay.innerHTML=raceOverlayContent(r)'],
    ["setLiveHTML(events,`<div class=\"race-events\">${q.events.slice(0,7).map(e=>`<div>${esc(e.text)}</div>`).join('')}</div>`)", "events.innerHTML=`<div class=\"race-events\">${q.events.slice(0,7).map(e=>`<div>${esc(e.text)}</div>`).join('')}</div>`"],
  ];
  for (const [current, original] of pilotCalls) {
    expect(normalized.split(current), current).toHaveLength(2);
    normalized = normalized.replace(current, original);
  }
  const gridInk = "drawGridSlot(ctx,slot,g.width,pilotSurface?'#78634b':undefined)";
  expect(normalized.split(gridInk)).toHaveLength(3);
  normalized = normalized.replaceAll(gridInk, 'drawGridSlot(ctx,slot,g.width)');
  const hudCSS = readFileSync(new URL('styles/team-driver-hud.css', ROOT), 'utf8');
  expect(normalized.split(hudCSS)).toHaveLength(2);
  normalized = normalized.replace(hudCSS, '');
  const hudSlot = '<section id="teamDriverHud" class="team-driver-hud" aria-label="Deine Fahrer" hidden></section>';
  expect(normalized.split(hudSlot)).toHaveLength(2);
  normalized = normalized.replace(hudSlot, '');
  for (const marker of ['render', 'refresh']) {
    const block = new RegExp(` \\/\\/ team-driver-hud-${marker}:start\\n[\\s\\S]*? \\/\\/ team-driver-hud-${marker}:end\\n`);
    expect(normalized.match(block)).not.toBeNull();
    normalized = normalized.replace(block, '');
  }
  const hudModel = /\/\/ team-driver-hud-model:start\n[\s\S]*?\/\/ team-driver-hud-model:end\n\n/;
  expect(normalized.match(hudModel)).not.toBeNull();
  normalized = normalized.replace(hudModel, '');
  // Approved four-team rendering preview: exclude exactly its separate module
  // and restore exactly the single former paint call. All simulation stays under
  // the original byte-for-byte guard.
  const previewBlock = /<!-- race-sprites-preview:start -->[\s\S]*?<!-- race-sprites-preview:end -->\n/;
  expect(normalized.match(previewBlock)).not.toBeNull();
  normalized = normalized.replace(previewBlock, '');
  const previewCall = "if(!window.CGPRaceSprites?.draw(ctx,v.p,tm.id,g.width/64,!!v.r.dnf))";
  expect(normalized.split(previewCall)).toHaveLength(2);
  normalized = normalized.replace(previewCall, '');
  // Explicitly requested workshop presentation: remove only the shared-SVG
  // early return; the complete legacy workshop and all upgrade logic stay guarded.
  const workshopBlock = / \/\/ shared-workshop-sprite:start\n[\s\S]*? \/\/ shared-workshop-sprite:end\n/;
  expect(normalized.match(workshopBlock)).not.toBeNull();
  normalized = normalized.replace(workshopBlock, '');
  for (const marker of ['race-camera', 'race-camera-restore', 'race-camera-layout']) {
    const block = new RegExp(` \\/\\/ ${marker}:start\\n[\\s\\S]*? \\/\\/ ${marker}:end\\n`);
    expect(normalized.match(block)).not.toBeNull();
    normalized = normalized.replace(block, '');
  }
  expect(normalized).toContain('y<c.height-35;');
  normalized = normalized.replace('y<c.height-35;', 'y<705;');
  expect(normalized).toContain('590,window.CGPRaceCamera?.resize?c.height-8:716);');
  normalized = normalized.replace('590,window.CGPRaceCamera?.resize?c.height-8:716);', '590,716);');
  const followCopies = [
    ["window.CGPRaceCamera?.follow?(focusedDriverId===c.id?'nicht mehr verfolgen':'verfolgen'):(focusedDriverId===c.id?'nicht mehr hervorheben':'hervorheben')", "focusedDriverId===c.id?'nicht mehr hervorheben':'hervorheben'"],
    ["window.CGPRaceCamera?.follow?(focusedDriverId===c.id?'Gesamtstrecke anzeigen':'Mit Kamera verfolgen'):(focusedDriverId===c.id?'Markierung aufheben':'Auf der Strecke markieren')", "focusedDriverId===c.id?'Markierung aufheben':'Auf der Strecke markieren'"],
    ["${window.CGPRaceCamera?.follow?'Fahrer antippen: Kamera folgt · erneut tippen: Gesamtstrecke':'Fahrer antippen: Auto leuchtet auf · erneut tippen: abwählen'}", 'Fahrer antippen: Auto leuchtet auf · erneut tippen: abwählen'],
    ["${window.CGPRaceCamera?.follow?'Aktiven Fahrer anklicken: Kamera folgt · erneut klicken: Gesamtstrecke':'Fahrer anklicken: Auto hervorheben'}", 'Fahrer anklicken: Auto hervorheben'],
    ['focusedDriverId===v.r.id)&&!window.CGPRaceCamera?.follow;', 'focusedDriverId===v.r.id);'],
    ['appPrefs.showLeaderMarker&&race&&!race.finished&&!followedPose', 'appPrefs.showLeaderMarker&&race&&!race.finished'],
  ];
  for (const [current, original] of followCopies) {
    expect(normalized.split(current)).toHaveLength(2);
    normalized = normalized.replace(current, original);
  }
  const originalImages = [...originalHTML().matchAll(/data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/g)];
  manifest.images.forEach((image, index) => {
    if (!authoredCars.has(image.path)) return;
    const uri = `data:${image.mime};base64,${readFileSync(new URL(image.path, ROOT)).toString('base64')}`;
    expect(normalized.split(uri)).toHaveLength(2);
    normalized = normalized.replace(uri, originalImages[index][0]);
  });
  expect(createHash('sha256').update(normalized).digest('hex')).toBe(createHash('sha256').update(originalHTML()).digest('hex'));
});

it('liefert die Online-Version ohne eingebettete Bilddaten oder Inline-Stylesheet aus', () => {
  expect(html).not.toMatch(/data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/);
  expect(html).not.toContain('<style>');
  const links = [...html.matchAll(/<link rel="stylesheet" href="\.\/(styles\/[^" ]+)">/g)].map(m => m[1]);
  expect(links).toEqual(manifest.styles);
  for (const path of manifest.styles) expect(readFileSync(new URL(path, ROOT), 'utf8')).not.toContain('data:image/');
});
