// Presentation metadata is not part of the historical physics replay. Keep
// the entire original snapshot/source comparison after removing only this field.
export function withoutStartLights(snapshot) {
  const result=JSON.parse(JSON.stringify(snapshot));
  delete result.race.startLights;
  return result;
}
export function withoutStartLightsSource(source) {
  return source.replace('          startLights: { red: phase === "countdown" ? Math.min(5, 1 + Math.floor((3 - countdown + 1e-9) / 0.6)) : 0,\n            green: phase === "racing" && elapsed < 2 },\n','');
}
