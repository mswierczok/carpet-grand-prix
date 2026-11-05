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
  // The user authorized exactly twelve new car graphics. Restore ONLY those
  // image payloads in memory; all game code, data, CSS and other images must still
  // reconstruct the byte-identical original. Never regenerate the original oracle.
  let normalized = createOfflineHTML();
  const originalImages = [...originalHTML().matchAll(/data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/g)];
  manifest.images.forEach((image, index) => {
    if (!authoredCars.has(image.path)) return;
    const uri = `data:${image.mime};base64,${readFileSync(new URL(image.path, ROOT)).toString('base64')}`;
    expect(normalized.split(uri)).toHaveLength(2);
    normalized = normalized.replace(uri, originalImages[index][0]);
  });
  expect(normalized).toBe(originalHTML());
});

it('liefert die Online-Version ohne eingebettete Bilddaten oder Inline-Stylesheet aus', () => {
  expect(html).not.toMatch(/data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/);
  expect(html).not.toContain('<style>');
  const links = [...html.matchAll(/<link rel="stylesheet" href="\.\/(styles\/[^" ]+)">/g)].map(m => m[1]);
  expect(links).toEqual(manifest.styles);
  for (const path of manifest.styles) expect(readFileSync(new URL(path, ROOT), 'utf8')).not.toContain('data:image/');
});
