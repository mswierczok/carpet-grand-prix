import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
export const manifest = JSON.parse(readFileSync(new URL('assets/manifest.json', root), 'utf8'));

// The editable website remains static. This optional developer command produces
// a portable single file with no stylesheets, images or server needed alongside it.
export function createOfflineHTML() {
  let html = readFileSync(new URL('index.html', root), 'utf8');
  const links = manifest.styles.map(path => `<link rel="stylesheet" href="./${path}">`).join('\n');
  if (!html.includes(links)) throw Error('Reihenfolge der Stylesheets stimmt nicht mit dem Manifest überein.');
  const css = manifest.styles.map(path => readFileSync(new URL(path, root), 'utf8')).join('') + manifest.styleTail;
  html = html.replace(links, `<style>${css}</style>`);
  for (const name of ['race-sprites', 'race-camera']) {
    const path = `src/rendering/${name}.js`;
    const version = name === 'race-camera' ? '?v=2' : '';
    html = html.replace(`<script src="./${path}${version}"></script>`, () =>
      `<script>\n${readFileSync(new URL(path, root), 'utf8')}\n</script>`);
  }
  for (const image of manifest.images) {
    const uri = `data:${image.mime};base64,${readFileSync(new URL(image.path, root)).toString('base64')}`;
    html = html.replaceAll(`../${image.path}`, uri).replaceAll(`./${image.path}`, uri);
  }
  return html;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL('dist/', root), { recursive: true });
  const html = createOfflineHTML();
  writeFileSync(new URL('dist/carpet-grand-prix-offline.html', root), html);
  console.log(`Offline-Ausgabe erstellt: dist/carpet-grand-prix-offline.html (${Buffer.byteLength(html)} Bytes)`);
}
