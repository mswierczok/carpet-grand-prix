import { it } from 'vitest';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// A separate Node process bounds CPU-heavy synchronous simulation and streams
// progress without waiting for the test runner's intercepted console buffer.
function scenario(name) {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [
      fileURLToPath(new URL('../helpers/extended-scenario.js', import.meta.url)), name,
    ], { timeout: 840_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${name}: ${error.message}\n${stdout}\n${stderr}`));
      else resolve();
    });
    child.stdout.on('data', data => process.stdout.write(data));
    child.stderr.on('data', data => process.stderr.write(data));
  });
}

it('beendet das Referenzrennen mit unveränderter Klassifikation und Wertung', () => scenario('reference-race'));
it('beendet 22 Rennwochenenden, vergibt Titel und beginnt die Folgesaison', () => scenario('season'));
