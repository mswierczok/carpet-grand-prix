import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './game.js';
import { createReference, BASE_HTML_SHA256 } from './reference.js';

const sha = createHash('sha256').update(readFileSync(new URL('index.html', ROOT))).digest('hex');
if (sha !== BASE_HTML_SHA256) throw Error('Referenzen dürfen nur aus dem dokumentierten Original erzeugt werden.');
for (const name of ['initial', 'qualified', 'activeRace', 'activeQualifying', 'completedWeekend', 'reference']) {
  if (existsSync(new URL(`tests/fixtures/${name}.json`, ROOT))) {
    throw Error(`Referenz ${name}.json existiert bereits; bewusst prüfen, nicht automatisch überschreiben.`);
  }
}
const files = createReference();
for (const [name, data] of Object.entries(files)) {
  const target = new URL(`tests/fixtures/${name}.json`, ROOT);
  // Refuse accidental replacement of reviewed regression fixtures.
  writeFileSync(target, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  console.log(`Created ${name}.json`);
}
