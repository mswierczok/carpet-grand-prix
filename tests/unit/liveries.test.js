import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT, historicalMaster } from '../helpers/project.js';

const liveries = JSON.parse(readFileSync(new URL('assets/cars/liveries.json', ROOT)));
const mapping = {
  t02: ['Alderwick Racing', 'alderwick.jpg'], t03: ['Falkenheim GP', 'falkenheim.jpg'],
  t04: ['Scuderia Bellarossa', 'bellarossa.jpg'], t05: ['Eisenbach Motorsport', 'eisenbach.jpg'],
  t06: ['Orange', 'orange.jpg'], t07: ['Ragos Racing', 'ragos.jpg'],
  t08: ['Mugan', 'mugan.jpg'], t09: ['Lincoln', 'lincoln.jpg'],
  t10: ['Panther Racing', 'panther.jpg'], t11: ['Rivage Racing', 'rivage.jpg'],
  t12: ['Scuderia Vespera', 'vespera.jpg'], t13: ['Redwood GP', 'redwood.jpg'],
};
const bytes = path => readFileSync(new URL(path, ROOT));
const hash = data => createHash('sha256').update(data).digest('hex');

it('ordnet jedes der zwölf Fotos dem richtigen unveränderten Team zu', () => {

  expect(liveries.entries.map(entry => entry.id).sort()).toEqual(Object.keys(mapping));
  for (const entry of liveries.entries) {
    expect(entry.team).toBe(mapping[entry.id][0]);
    expect(entry.reference).toBe(`assets/references/${mapping[entry.id][1]}`);
    expect(historicalMaster.teams.find(team => team.id === entry.id).name).toBe(entry.team);
    expect(entry.asset).toBe(`assets/cars/team-${entry.id}.webp`);
    expect(hash(bytes(entry.reference))).toBe(entry.referenceSHA256);
  }
});

it('bewahrt Vauclair und das ursprüngliche weiße Basismodell unverändert', () => {
  expect(hash(bytes('assets/cars/team-t01.webp'))).toBe(liveries.preservedVauclair.sha256);
  expect(hash(bytes(liveries.base.path))).toBe(liveries.base.sha256);
});

it('liefert zwölf unterschiedliche WebP-Designs innerhalb des Ladebudgets', () => {
  const hashes = new Set();
  for (const entry of liveries.entries) {
    const image = bytes(entry.asset);
    expect(image.toString('ascii', 0, 4)).toBe('RIFF');
    expect(image.toString('ascii', 8, 12)).toBe('WEBP');
    expect(image.length).toBe(entry.bytes);
    expect(image.length).toBeLessThanOrEqual(250_000);
    expect(hash(image)).toBe(entry.sha256);
    hashes.add(entry.sha256);
  }
  expect(hashes.size).toBe(12);
});
