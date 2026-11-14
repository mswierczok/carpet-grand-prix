import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
const root = new URL('../', import.meta.url), scope = createContext({});
for (const file of ['race-sprites', 'pilot-vehicles']) new Script(readFileSync(new URL(`src/rendering/${file}.js`, root), 'utf8')).runInContext(scope);
mkdirSync(new URL('assets/cars/illustrated/', root), { recursive: true });
for (const id of scope.CGPPilotVehicles.ids) {
  writeFileSync(new URL(`assets/cars/illustrated/team-${id}.svg`, root), scope.CGPPilotVehicles.showroomSvg(id) + '\n');
  writeFileSync(new URL(`assets/cars/illustrated/topdown-${id}.svg`, root), scope.CGPPilotVehicles.svg(id) + '\n');
}
console.log('13 gemeinsame Renn-/Werkstatt-SVGs und archivierte Showroom-Illustrationen erstellt.');
