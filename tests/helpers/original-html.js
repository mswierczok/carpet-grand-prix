import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT } from './game.js';

let cached;
export function originalHTML() {
  if (!cached) {
    cached = execFileSync('git', ['show', 'ea88f1daf238431a1dbac540df7e452dd2a44e54:index.html'], {
      cwd: fileURLToPath(ROOT), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    const sha = createHash('sha256').update(cached).digest('hex');
    if (sha !== 'b35c4fa0f2170df77597979c1a8fdf11bda9ef1fe306401b7151a6bfc1e5c4d1') {
      throw Error('Die unveränderte visuelle Ausgangsversion fehlt. Git-Historie vollständig abrufen.');
    }
  }
  return cached;
}
