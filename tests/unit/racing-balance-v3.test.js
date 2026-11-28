import{it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{execFileSync}from'node:child_process';
import{loadArcade}from'../helpers/arcade.js';
const base='1760fc07d0ce5d4e480fbdbe662aaf92e3063d45';
it('versioniert neue Kampagnenentscheidungen als V4 und erhält Fahrzeugmodell V2 und alle Fahrerwerte',()=>{
 const{api:A}=loadArcade({race:true}),game=A.Campaign.create({driverId:'d035'}),w=A.CampaignWeekend.create(game),config=w.exportState().config;
 expect(config.driving.version).toBe(4);expect(config.performance.version).toBe(2);expect(config.driving.lineup).toEqual(game.lineup);
 for(const file of ['racing/vehicle-performance.js','racing/physics.js','racing/catchup.js','racing/slipstream.js','data/driver-attributes.js','data/campaign-config.js','data/arcade-roster.js','data/arcade-tracks.js','data/race-formats.js'])
  expect(readFileSync('src/'+file).equals(execFileSync('git',['show',base+':src/'+file]))).toBe(true);
 expect(A.RaceWeekend.create(A.TrackCatalog.get('bahrain')).exportState().config.driving).toBeUndefined();
 expect(()=>A.DriverPersonalities.validate({...config.driving,version:5})).toThrow();
});
it('erzeugt begrenzte, reproduzierbare gute und schlechte Abschnitte mit deutlich unterschiedlicher Konstanz',()=>{
 const{api:A}=loadArcade({race:true}),P=A.DriverPersonalities,series=id=>Array.from({length:2000},(_,i)=>P.decision({id,seed:4171,mode:'race',model:4},i/100,'bahrain')),
  low=series('d035'),high=series('campaign-veteran-001'),sd=rows=>{const mean=rows.reduce((n,r)=>n+r.cornerScale,0)/rows.length;return Math.sqrt(rows.reduce((n,r)=>n+(r.cornerScale-mean)**2,0)/rows.length);};
 expect(sd(low)).toBeGreaterThan(sd(high)*4);
 for(const rows of[low,high]){expect(rows.some(r=>r.executionWave>.25)).toBe(true);expect(rows.some(r=>r.executionWave<-.25)).toBe(true);
  for(const r of rows){expect(r.cornerScale).toBeGreaterThanOrEqual(.9);expect(r.cornerScale).toBeLessThanOrEqual(1.055);expect(Math.abs(r.brakeLead)).toBeLessThanOrEqual(8);expect(r.executionError).toBeGreaterThanOrEqual(0);expect(r.executionError).toBeLessThanOrEqual(1);}}
 const m={id:'d035',seed:9011,mode:'race',model:4};expect(P.decision(m,2.413,'bahrain')).toEqual(P.decision({...m},2.413,'bahrain'));
 expect(P.decision(m,2.413,'bahrain')).not.toEqual(P.decision(m,3.413,'bahrain'));
 expect(P.decision(m,2.413,'bahrain')).not.toEqual(P.decision({...m,seed:4171},2.413,'bahrain'));
 const q=P.decision({...m,mode:'qualifying'},2.413,'bahrain');expect(q.executionError).toBe(0);expect(q.cornerScale).not.toBe(P.decision(m,2.413,'bahrain').cornerScale);
});
it('setzt gespeicherte V3-Wochenenden auch nach warmer V4-Routenplanung exakt fort und hält Neustarts bei V3',()=>{
 const{api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain'),game=A.Campaign.create({driverId:'d012'});
 A.CampaignWeekend.create(game); // populate V4 plans first: cache keys must not leak.
 const f=JSON.parse(readFileSync(new URL('../fixtures/driver-v3-checkpoints.json',import.meta.url)));
 for(const c of f.cases){const w=A.RaceWeekend.restore(c.before);w.pause(false);for(let i=0;i<60;i++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);expect(w.exportState()).toEqual(c.after);}
 // The historical fixture includes an intentionally direct technical race;
 // campaign restart uses a valid saved grid with mandatory qualifying.
 const old=A.RaceWeekend.create(track,{playerTeam:game.teamId,...game.options,performance:A.VehiclePerformance.current.campaign,
  driving:{version:3,seed:4171,lineup:game.lineup}}),saved=A.Campaign.capture(game,old.exportState(),1000),wrapped=A.CampaignWeekend.create(saved);
 expect(wrapped.restart()).toBe(true);expect(wrapped.exportState().config.driving.version).toBe(3);wrapped.startQualifying();expect(wrapped.exportState().session.race.config.driving.version).toBe(3);
});
it('speichert V4-Entscheidungen mit exakter Fortsetzung, ohne menschliche Eingaben nach Fahrerwerten zu verändern',()=>{
 const{api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain'),sessions=['d035','campaign-veteran-001'].map(id=>A.RaceSession.create(track,{playerTeam:'t13',isolated:true,performance:A.VehiclePerformance.current.campaign,
  driving:A.DriverPersonalities.create(A.CampaignConfig.lineup('t13',id,'bahrain'),42),diagnostics:true}));
 for(const s of sessions){s.pause(false);for(let i=0;i<240;i++)s.advance({throttle:1,brake:0,steer:i>215?.1:0},1/30);s.pause(true);}
 expect(sessions[0].snapshot().car).toEqual(sessions[1].snapshot().car);const state=sessions[0].exportState(),restored=A.RaceSession.restore(state);
 expect(restored.exportState()).toEqual(state);for(const s of[sessions[0],restored]){s.pause(false);for(let i=0;i<60;i++)s.advance({throttle:1,brake:0,steer:.1},1/30);s.pause(true);}expect(restored.exportState()).toEqual(sessions[0].exportState());
 const bad=structuredClone(state);bad.config.driving.version=3;expect(()=>A.RaceSession.restore(bad)).toThrow();
});
it('behält alle vier bisherigen Schwierigkeiten und trennt deren alte und neue Plan-Caches',()=>{
 const{api:A}=loadArcade({race:true});expect(A.AIDifficulty.profiles.map(p=>p.id)).toEqual(['beginner','normal','hard','expert']);
 for(const id of A.AIDifficulty.profiles.map(p=>p.id)){const old=A.AIDifficulty.forTrack(id,'bahrain');expect(A.AIDifficulty.forDriving(id,'bahrain',3)).toBe(old);
  const current=A.AIDifficulty.forDriving(id,'bahrain',4);expect(current.id).toBe(old.id);expect(current.cacheKey).not.toBe(old.cacheKey);expect(current).toBe(A.AIDifficulty.forDriving(id,'bahrain',4));}
});
