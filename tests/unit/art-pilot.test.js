import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
import { ROOT } from '../helpers/project.js';
const scope = createContext({});
for (const file of ['race-sprites', 'pilot-vehicles']) new Script(readFileSync(new URL(`src/rendering/${file}.js`, ROOT), 'utf8')).runInContext(scope);

it('erzeugt vier transparente Illustrationen reproduzierbar und erhält alle gemeinsamen Geometriepfade', () => {
  const api = scope.CGPPilotVehicles;
  expect(api.ids).toHaveLength(13);
  for (const id of api.ids) {
    const top = api.svg(id), showroom = api.showroomSvg(id);
    expect(top + '\n').toBe(readFileSync(new URL(`assets/cars/illustrated/topdown-${id}.svg`, ROOT), 'utf8'));
    expect(showroom + '\n').toBe(readFileSync(new URL(`assets/cars/illustrated/team-${id}.svg`, ROOT), 'utf8'));
    for (const d of Object.values(scope.CGPRaceSprites.geometry)) expect(top).toContain(`d="${d}"`);
    expect(top).toContain('viewBox="-140 -60 280 120"');
    expect(showroom).toContain('width="2172" height="555"');
    expect(top + showroom).not.toMatch(/<image|<script|(?:href|src)="https?:|<rect[^>]+width="100%"/);
  }
  for (const id of Object.keys(scope.CGPRaceSprites.teams).filter(id => !api.ids.includes(id))) {
    expect(api.svg(id)).toBeNull();
    expect(scope.CGPRaceSprites.svg(id) + '\n').toBe(readFileSync(new URL(`assets/cars/topdown/team-${id}.svg`, ROOT), 'utf8'));
  }
});
