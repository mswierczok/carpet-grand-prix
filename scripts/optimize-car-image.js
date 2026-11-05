import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Packaging only: paint and graphics are authored in the image editor. Remove
// its outside letterbox padding without rescaling the car, then encode for web.
// Vauclair is deliberately not an accepted target.
const [id, sourcePath] = process.argv.slice(2);
if (!/^t(0[2-9]|1[0-3])$/.test(id || '') || !sourcePath) {
  throw Error('Aufruf: node scripts/optimize-car-image.js t02..t13 /pfad/zum/render.png');
}
const source = resolve(sourcePath);
const [width, height] = execFileSync('magick', ['identify', '-format', '%w %h', source], { encoding: 'utf8' }).trim().split(' ').map(Number);
if (width !== 2172 || height < 555 || height > 800) {
  throw Error(`Render zuerst visuell prüfen: unerwartete Größe ${width}×${height}. Keine automatische Formverzerrung.`);
}
const target = fileURLToPath(new URL(`../assets/cars/team-${id}.webp`, import.meta.url));
execFileSync('magick', [source, '-gravity', 'center', '-crop', '2172x555+0+0', '+repage', '-strip', '-define', 'webp:method=6', '-quality', '88', target]);
const bytes = statSync(target).size;
if (bytes > 250_000) throw Error(`${id}: Ladebudget von 250 kB überschritten (${bytes} Bytes).`);
console.log(`${id}: 2172×555 WebP, ${bytes} Bytes`);
