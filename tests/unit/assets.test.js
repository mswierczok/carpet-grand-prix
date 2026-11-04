import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT, html } from '../helpers/game.js';
import { originalHTML } from '../helpers/original-html.js';
import { createOfflineHTML, manifest } from '../../scripts/build-offline.js';

it('erhält alle 36 Bilddateien bytegenau aus der ursprünglichen HTML-Datei', () => {
  const originalImages = [...originalHTML().matchAll(/data:image\/[\w+.-]+;base64,([A-Za-z0-9+/=]+)/g)];
  expect(manifest.images).toHaveLength(36);
  manifest.images.forEach((image, i) => {
    const bytes = readFileSync(new URL(image.path, ROOT));
    expect(bytes.equals(Buffer.from(originalImages[i][1], 'base64'))).toBe(true);
    expect(bytes.length).toBe(image.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(image.sha256);
  });
});

it('erhält CSS-Kaskade, Spielcode und Daten beim Zusammenbauen vollständig', () => {
  // This extraction-phase guard proves that changing file locations is the ONLY
  // change. Future intentional UI changes must revise this guard explicitly.
  expect(createOfflineHTML()).toBe(originalHTML());
});

it('liefert die Online-Version ohne eingebettete Bilddaten oder Inline-Stylesheet aus', () => {
  expect(html).not.toMatch(/data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/);
  expect(html).not.toContain('<style>');
  const links = [...html.matchAll(/<link rel="stylesheet" href="\.\/(styles\/[^" ]+)">/g)].map(m => m[1]);
  expect(links).toEqual(manifest.styles);
  for (const path of manifest.styles) expect(readFileSync(new URL(path, ROOT), 'utf8')).not.toContain('data:image/');
});
