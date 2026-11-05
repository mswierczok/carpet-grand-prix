import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Script, createContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('src/rendering/race-sprites.js', root), 'utf8');
const context = createContext({});
new Script(source).runInContext(context);
const renderer = context.CGPRaceSprites;
mkdirSync(new URL('assets/cars/topdown/', root), { recursive: true });
for (const id of Object.keys(renderer.teams)) {
  writeFileSync(new URL(`assets/cars/topdown/team-${id}.svg`, root), renderer.svg(id) + '\n');
}
let html = readFileSync(new URL('previews/topdown/index.html', root), 'utf8');
html = html.replace('<script src="../../src/rendering/race-sprites.js"></script>', () => `<script>\n${source}\n</script>`);
for (const id of Object.keys(renderer.teams)) {
  const image = readFileSync(new URL(`assets/cars/team-${id}.webp`, root));
  html = html.replace(`../../assets/cars/team-${id}.webp`, `data:image/webp;base64,${image.toString('base64')}`);
}
html = html.replace('../../index.html', './carpet-grand-prix-offline.html');
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/carpet-grand-prix-topdown-preview.html', root), html);
console.log('Vier SVG-Sprites und eigenständige Vorschauseite erstellt.');
