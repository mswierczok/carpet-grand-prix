// Developer measurement only; no game hooks and no fixture regeneration.
import { performance } from "node:perf_hooks";
import { deepStrictEqual } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { loadArcade } from "../tests/helpers/arcade.js";
const { api } = loadArcade({ race: true }), session = api.RaceWeekend.create(api.TrackCatalog.get("bahrain"));
let game = api.POVCareer.create({ teamId:"t01" });
const samples = [], storage = new Map(), adapter = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,v) };
session.pause(false);
for (let i=0;i<3000;i++) {
  session.advance({ throttle:0, brake:0, steer:0 },1/30);
  if ((i+1)%150 === 0) {
    game = { ...game, weekend:session.exportState() };
    if (!api.POVGameStore.save(game,{ storage:adapter, now:0 })) throw Error("Autosave failed");
  }
}
session.pause(true);
for (let i=0;i<3;i++) {
  const begin = performance.now(); game = { ...game, weekend:session.exportState() }; const exported = performance.now();
  if (!api.POVGameStore.save(game,{ storage:adapter, now:0 })) throw Error("Save failed");
  samples.push({ exportMs:+(exported-begin).toFixed(3), validateAndSerializeMs:+(performance.now()-exported).toFixed(3) });
}
const resumed = api.RaceWeekend.restore(JSON.parse(storage.get(api.POVGameStore.key)).weekend);
deepStrictEqual(resumed.snapshot(), session.snapshot());
session.pause(false); resumed.pause(false);
for (let i=0;i<80;i++) {
  const input = { throttle:0, brake:0, steer:0 };
  session.advance(input,1/30); resumed.advance(input,1/30);
}
deepStrictEqual(resumed.snapshot(), session.snapshot());
const files = ["scripts/measure-pov-save.js", "src/racing/physics.js", "src/racing/rope-contact.js", "src/racing/opponents.js", "src/data/arcade-tracks.js", "src/data/arcade-roster.js", "src/racing/race-session.js","src/racing/race-gaps.js","src/racing/race-weekend.js","src/persistence/pov-checkpoint.js","src/persistence/pov-game-store.js","src/championship/pov-career.js"];
const data = { measuredAt:new Date().toISOString(), scenario:"100 seconds parked player, 12 actual AI cars, autosave every 5 seconds; paused checkpoint; identical resume after history expiry", resumeIdentical:true, bytes:Buffer.byteLength(storage.get(api.POVGameStore.key)),
  storage:"in-memory adapter, no browser/localStorage/GPU timing", samples,
  hashes:Object.fromEntries(files.map(path=>[path,createHash("sha256").update(readFileSync(path)).digest("hex")])) };
mkdirSync("docs/pov-save",{recursive:true}); writeFileSync("docs/pov-save/measurement.json",JSON.stringify(data,null,2)+"\n");
console.log(JSON.stringify(data));
