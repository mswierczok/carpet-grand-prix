// Earlier visual-only tasks froze source bytes. This gameplay task explicitly
// replaces these orchestration modules; native legacy checkpoint replays and
// current profile/session tests now guard their behavior. Keep every other
// module/asset/data comparison, including the unchanged base physics kernel.
const replaced = new Set([
  'src/racing/opponents.js','src/racing/race-session.js','src/racing/race-weekend.js',
  'src/racing/qualifying-session.js','src/racing/qualifying-drivers.js','src/racing/slipstream.js',
  'src/persistence/pov-checkpoint.js','src/championship/campaign-weekend.js',
  'src/persistence/campaign-v1.js','src/championship/pov-career.js',
]);
export const unaffectedByVehicleWork = path => !replaced.has(path);
export function withoutVehicleGripSource(path, source) {
  if(path!=='src/racing/physics.js')return source;
  return source.replace(/  function lateralAcceleration\(p, speed\) \{[\s\S]*?  function spawn\(/,'  function spawn(')
    .replace('grip = lateralAcceleration(p, speed) * (offroad ? p.offroadGrip : 1),','grip = p.maxLateralAcceleration * (offroad ? p.offroadGrip : 1),')
    .replace('parameters, spawn, step, lateralAcceleration, cornerSpeedSquared','parameters, spawn, step');
}
