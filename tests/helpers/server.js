// Intentionally serves only the project prefix, to catch Pages path mistakes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { originalHTML } from './original-html.js';
import { createOfflineHTML } from '../../scripts/build-offline.js';

const root = resolve('.');
const prefix = '/carpet-grand-prix/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    if (relative === '__reference__/index.html' || relative === '__offline__/index.html') {
      const html = relative.startsWith('__reference__') ? originalHTML() : createOfflineHTML();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html); return;
    }
    const file = resolve(root, relative);
    if (!file.startsWith(root + '/') || relative.split('/').some(p => p.startsWith('.'))) {
      res.writeHead(404).end(); return;
    }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
server.listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
