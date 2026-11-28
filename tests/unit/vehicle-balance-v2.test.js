import{it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
import{gunzipSync}from'node:zlib';
import{loadArcade}from'../helpers/arcade.js';
const source='622a1cf295437d38d9b12055a777e634777fb05d';
it('bindet neue V2-Rennen und Qualifyings an echte Folgezustände des unveränderten Implementierungscommits',()=>{
 const{api:A}=loadArcade({race:true}),f=JSON.parse(readFileSync(new URL('../fixtures/vehicle-balance-v2-checkpoints.json',import.meta.url)));
 for(const[file,hash]of Object.entries(f.hashes))expect(createHash('sha256').update(execFileSync('git',['show',f.sourceCommit+':src/'+file])).digest('hex')).toBe(hash);
 for(const c of f.cases){expect(c.before.config.performance.version).toBe(2);const w=A.RaceWeekend.restore(c.before);expect(w.exportState()).toEqual(c.before);w.pause(false);for(let i=0;i<60;i++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);expect(w.exportState()).toEqual(c.after);}
});
it('liefert getrennte feste V1/V2-Profile und erhält Daten, Schwerpunkte sowie den Physikkern',()=>{
 const{api:A,data}=loadArcade({race:true}),V=A.VehiclePerformance;
 expect(V.version).toBe(2);expect(V.campaign.version).toBe(1);expect(V.current.campaign.version).toBe(2);
 for(const context of ['campaign','historical'])for(const t of data.roster.teams){const a=V.get(t.id,{version:1,context}),b=V.get(t.id,{version:2,context});
  expect(a).not.toBe(b);expect(V.get(t.id,{version:2,context})).toBe(b);expect(Object.isFrozen(b.parameters)).toBe(true);
  expect(b.strength).toBe(a.strength);expect(b.focus).toBe(a.focus);expect(b.developmentPotential).toBe(a.developmentPotential);
  for(const k of ['wheelbase','halfLength','halfWidth','metersPerUnit','maxSteer','offroadGrip','offroadDrag'])expect(b.parameters[k]).toBe(a.parameters[k]);
 }
 expect(V.get('t13',V.current.campaign).strength).toBe(64);expect(V.get('t12',V.current.campaign).strength).toBe(72);
 expect(V.get('t13').strength).toBe(72);expect(V.get('t12').strength).toBe(64);
 // V4 deliberately adds new decisions; native V1/V2/V3 and V2-vehicle
 // checkpoint replays above/in driver-personalities retain exact old states.
 for(const f of ['racing/physics','racing/catchup','racing/slipstream','data/driver-attributes','data/campaign-config'])expect(createHash('sha256').update(readFileSync('src/'+f+'.js')).digest('hex')).toBe(createHash('sha256').update(execFileSync('git',['show',source+':src/'+f+'.js'])).digest('hex'));
 for(const value of [{version:3,context:'campaign'},{version:2,context:'bogus'},{version:2,context:'campaign',bonus:1}])expect(()=>V.validate(value)).toThrow();
});
it('verwendet V2 nur beim neuen Wochenende aller Modi und behält V1 bei Fortsetzung und Neustart',()=>{
 const{api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain'),game=A.Campaign.create({driverId:'d035'});
 for(const w of [A.RaceSession.create(track),A.RaceWeekend.create(track),A.CampaignWeekend.create(game)])expect(w.exportState().config.performance.version).toBe(2);
 const q=A.QualifyingSession.create(track,{performance:A.VehiclePerformance.current.campaign});expect(q.exportState().race.config.performance.version).toBe(2);
 const old=A.RaceWeekend.create(track,{playerTeam:game.teamId,...game.options,performance:A.VehiclePerformance.campaign,driving:A.DriverPersonalities.create(game.lineup,17)}),saved=A.Campaign.capture(game,old.exportState(),1000),restored=A.CampaignWeekend.create(saved);
 expect(restored.exportState().config.performance.version).toBe(1);expect(restored.restart()).toBe(true);expect(restored.exportState().config.performance.version).toBe(1);
 restored.startQualifying();expect(restored.exportState().session.race.config.performance.version).toBe(1);
 const r=A.RogueliteRun.create({id:'run-balance-version-0001',seed:42,driverId:'d035'}),entered=A.RogueliteRun.beginRace(A.RogueliteRun.chooseAbility(r,r.startOffers[0]));
 expect(A.RunWeekend.create(entered).exportState().config.performance.version).toBe(2);
 const oldRunWeekend=A.RaceWeekend.create(track,{playerTeam:entered.campaign.teamId,...entered.campaign.options,performance:A.VehiclePerformance.campaign,driving:A.DriverPersonalities.create(entered.campaign.lineup,17)}),oldRun=A.RogueliteRun.capture(entered,oldRunWeekend.exportState(),2000);
 const resumed=A.RunWeekend.create(oldRun);expect(resumed.exportState().config.performance.version).toBe(1);expect(resumed.restart()).toBe(true);expect(resumed.exportState().config.performance.version).toBe(1);
 expect(oldRun.route).toEqual(['bahrain']);expect(oldRun.seed).toBe(42);expect(oldRun.startAbility).toBe(r.startOffers[0]);
});
it('fährt dieselben menschlichen Eingaben unabhängig vom gewählten Fahrer und setzt V2 deterministisch fort',()=>{
 const{api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain'),sessions=['d012','d035'].map(id=>A.RaceSession.create(track,{isolated:true,playerTeam:'t13',performance:A.VehiclePerformance.current.campaign,driving:A.DriverPersonalities.create(A.CampaignConfig.lineup('t13',id,'bahrain'),42)}));
 for(const r of sessions){r.pause(false);for(let i=0;i<150;i++)r.advance({throttle:1,steer:i>140?.1:0},1/30);r.pause(true);}
 expect(sessions[0].snapshot().car).toEqual(sessions[1].snapshot().car);
 const r=sessions[0],copy=A.RaceSession.restore(r.exportState());expect(copy.exportState()).toEqual(r.exportState());
 for(const s of[r,copy]){s.pause(false);for(let i=0;i<60;i++)s.advance({throttle:1,steer:.1},1/30);s.pause(true);}expect(copy.exportState()).toEqual(r.exportState());
 const bad=structuredClone(r.exportState());bad.config.performance.version=3;expect(()=>A.RaceSession.restore(bad)).toThrow();
});
it('übergibt allen 13 Fahrzeugen dieselben eigenen V2-Grenzen an Physik und KI-Planung',()=>{
 const{api:A}=loadArcade({race:true}),V=A.VehiclePerformance,physics=A.Physics,opponents=A.Opponents,seen=[];let planned;
 A.Physics={...physics,step(...args){seen.push(args[3]);return physics.step(...args);}};
 A.Opponents={...opponents,create(surface,p,options){planned=options.parametersByTeam;return opponents.create(surface,p,options);}};
 const r=A.RaceSession.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',performance:V.current.campaign,catchup:false,slipstream:false}),entries=r.snapshot().entries;
 r.pause(false);for(let i=0;i<95;i++)r.advance({throttle:1},1/30);
 for(const[i,e]of entries.entries()){const p=V.get(e.id,V.current.campaign).parameters;expect(seen[i]).toBe(p);expect(planned[e.id]).toBe(p);}
 expect(r.parameters).toBe(V.get('t13',V.current.campaign).parameters);
});
it('behält sichere Anfahrten aller acht Strecken und den bisherigen Windschatten-/Aufholhilfe-Vertrag',()=>{
 const{api:A,data}=loadArcade({race:true}),profiles=Object.fromEntries(data.roster.teams.map(t=>[t.id,A.VehiclePerformance.get(t.id,A.VehiclePerformance.current.campaign).parameters]));
 for(const t of A.CampaignConfig.tracks){const surface=A.Surface.create(A.TrackCatalog.get(t.id)),start=A.QualifyingApproach.select(surface,profiles);
  expect(start.s).toBeLessThanOrEqual(-80);for(const p of Object.values(profiles)){const car=A.Physics.spawn(surface,start.s);expect(car.speed).toBe(0);expect(surface.boundary.blocksFootprint(A.VehicleContacts.footprint(car,p),car.s)).toBe(false);expect(A.PitLane.contains(surface,car)).toBe(false);}}
 const flat={roadRadius:1000,outerRadius:2000,g:{width:1000},at:s=>({x:s,y:0,ang:0,s}),project:c=>({s:c.x,distance:Math.abs(c.y),ang:0})};
 for(const p of Object.values(profiles)){let c=A.Physics.spawn(flat,0);for(let i=0;i<18*120;i++)c=A.Physics.step(c,{throttle:1,brake:0,steer:0},flat,p,1/120,{strength:1,catchup:.012});expect(c.speed*p.metersPerUnit*3.6).toBeCloseTo(p.maxSpeed*1.012*p.metersPerUnit*3.6+5,3);}
});
it('belegt alle gemessenen Fahrzeug-/Rennvergleiche statt Zeiten oder Reihenfolgen vorzugeben',()=>{
 const read=name=>JSON.parse(gunzipSync(readFileSync(new URL('../../docs/vehicle-balance-v2/'+name+'.json.gz',import.meta.url)))),{api:A}=loadArcade({race:true}),previous=JSON.parse(readFileSync(new URL('../../docs/vehicle-performance/vehicles.json',import.meta.url)));
 for(const version of [1,2]){const solo=read('solo-v'+version),races=read('races-v'+version);expect(solo.solos).toHaveLength(104);expect(races.weekends).toHaveLength(32);
  expect(new Set(solo.solos.map(r=>r.trackId+':'+r.id)).size).toBe(104);expect(new Set(races.weekends.map(r=>r.trackId+':'+r.seed+':'+r.condition)).size).toBe(32);
  for(const r of races.weekends){expect(r.qualifying).toHaveLength(13);expect(r.order).toHaveLength(13);expect(r.order.every(e=>e.finishTime>0&&e.completed===r.laps)).toBe(true);expect(r.laps).toBe(A.RaceFormats.get(r.trackId).laps);expect(r.order.every(e=>e.driverId===r.lineup[e.id])).toBe(true);}
  for(const row of solo.teams)expect(A.VehiclePerformance.get(row.id,{version,context:'campaign'})).toEqual(row.profile);
  if(version===1)for(const row of solo.solos)expect(row.measuredLap).toBeCloseTo(previous.tracks.find(t=>t.id===row.trackId).solo.find(t=>t.id===row.id).flyingSeconds,6);
  for(const[f,hash]of Object.entries(races.hashes)){const bytes=execFileSync('git',['show',(version===1?source:'1760fc07d0ce5d4e480fbdbe662aaf92e3063d45')+':src/'+f+'.js']);expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);}
 }
 const b=read('solo-v2').solos.filter(r=>r.trackId==='bahrain').map(r=>r.measuredLap),spread=Math.max(...b)-Math.min(...b);expect(spread).toBeGreaterThanOrEqual(.4);expect(spread).toBeLessThanOrEqual(.8);
});
