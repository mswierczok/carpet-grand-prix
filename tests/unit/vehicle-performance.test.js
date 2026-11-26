import { it, expect } from 'vitest';
import { loadArcade } from '../helpers/arcade.js';
import {readFileSync} from 'node:fs';
const flat={roadRadius:1000,outerRadius:2000,g:{width:1000},at:s=>({x:s,y:0,ang:0,s}),project:p=>({s:p.x,distance:Math.abs(p.y),ang:0})};
it('bindet Leistungsmodell v1 an die tatsächlich gemessenen 13 Parameterpakete statt gespeicherte Wochenenden still neu zu balancieren',()=>{
  const {api:A}=loadArcade({race:true}),measurement=JSON.parse(readFileSync(new URL('../../docs/vehicle-performance/vehicles.json',import.meta.url)));
  for(const row of measurement.teams)expect(A.VehiclePerformance.get(row.id,A.VehiclePerformance.campaign)).toEqual(row.profile);
});
it('liefert 13 feste validierte Profile; verwendet 64/72 nur im Kampagnenkontext und keinen Potenzialbonus',()=>{
  const {api:A,data}=loadArcade({race:true}), before=JSON.stringify(data.roster),V=A.VehiclePerformance;
  expect(V.get('t13',V.campaign).strength).toBe(64);expect(V.get('t12',V.campaign).strength).toBe(72);
  expect(V.get('t13').strength).toBe(72);expect(V.get('t12').strength).toBe(64);
  for(const team of data.roster.teams){const profile=V.get(team.id,V.campaign),p=profile.parameters;
    expect(V.get(team.id,V.campaign)).toBe(profile);expect(Object.isFrozen(p)).toBe(true);
    expect(profile.developmentPotential).toBe(team.developmentPotential);
    for(const name of ['acceleration','maxSpeed','braking','steerResponse','steerReturnResponse','maxLateralAcceleration'])expect(Number.isFinite(p[name])&&p[name]>0).toBe(true);
    for(const name of ['wheelbase','maxSteer','halfLength','halfWidth','metersPerUnit','offroadGrip','offroadDrag'])expect(p[name]).toBe(A.Physics.parameters[name]);
    expect(p).not.toHaveProperty('developmentPotential');
  }
  expect(JSON.stringify(data.roster)).toBe(before);
  for(const bad of [{version:2,context:'campaign'},{version:1,context:'bogus'},{version:1,context:'campaign',bonus:1},null])expect(()=>V.validate(bad)).toThrow();
  expect(()=>V.get('t99')).toThrow();
});
it('weist versehentlich vertauschte Kampagnen-/POV-Leistungskontexte im Speicher zurück',()=>{
  const {api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain'),game=A.Campaign.create({driverId:'d012'}),
    historical=A.RaceWeekend.create(track,{playerTeam:'t13'}),campaign=A.CampaignWeekend.create(game);
  expect(()=>A.Campaign.capture(game,historical.exportState())).toThrow();
  const saved=A.Campaign.capture(game,campaign.exportState());expect(A.Campaign.validate(saved)).toEqual(saved);
  const invalid=structuredClone(saved);invalid.weekend.config.performance.context='historical';invalid.weekend.session.config.performance.context='historical';
  expect(()=>A.CampaignWeekend.create(invalid)).toThrow();
  const pov=A.POVCareer.create({teamId:'t13'});pov.weekend=historical.exportState();expect(A.POVCareer.validate(pov)).toEqual(pov);
  pov.weekend=campaign.exportState();expect(()=>A.POVCareer.validate(pov)).toThrow();
});
it('misst unterschiedliche Beschleunigung, Bremswege und Grip mit derselben Physik und normalen Pedalen',()=>{
  const {api:A}=loadArcade({race:true}),V=A.VehiclePerformance;
  const run=id=>{const p=V.get(id,V.campaign).parameters;let car=A.Physics.spawn(flat,0),to80=null;
    for(let i=0;i<10*120;i++){car=A.Physics.step(car,{throttle:1,brake:0,steer:0},flat,p,1/120);if(to80===null&&car.speed*p.metersPerUnit*3.6>=80)to80=(i+1)/120;}
    const top=car.speed,from=car.x;
    while(car.longitudinalSpeed>.01)car=A.Physics.step(car,{throttle:0,brake:1,steer:0},flat,p,1/120);
    return {to80,top,brakeDistance:car.x-from,p};};
  const weak=run('t13'),strong=run('t01');expect(weak.to80).toBeGreaterThan(strong.to80);expect(weak.top).toBeLessThan(strong.top);
  // Compare a common starting speed, without assigning velocity.
  const stop=id=>{const p=V.get(id,V.campaign).parameters;let c=A.Physics.spawn(flat,0);while(c.speed*p.metersPerUnit*3.6<100)c=A.Physics.step(c,{throttle:1,brake:0,steer:0},flat,p,1/120);const from=c.x;while(c.longitudinalSpeed>.01)c=A.Physics.step(c,{throttle:0,brake:1,steer:0},flat,p,1/120);return c.x-from;};
  expect(stop('t13')).toBeGreaterThan(stop('t01'));expect(weak.p.maxLateralAcceleration).toBeLessThan(strong.p.maxLateralAcceleration);
  const aero=V.get('t02',V.campaign).parameters;expect(A.Physics.lateralAcceleration(aero,aero.maxSpeed)).toBeGreaterThan(A.Physics.lateralAcceleration(aero,20));
});
it('reicht dieselben teamabhängigen Werte an Spielerphysik und KI-Planung weiter und hält sie über Wiederherstellung fest',()=>{
  const {api:A}=loadArcade({race:true}),V=A.VehiclePerformance,original=A.Physics,seen=[];
  A.Physics={...original,step(...args){seen.push(args[3]);return original.step(...args);}};
  const race=A.RaceSession.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',performance:V.campaign,catchup:false,slipstream:false}),start=race.snapshot();
  expect(new Set(start.entries.map(e=>e.performance.parameters.acceleration)).size).toBeGreaterThan(8);
  race.pause(false);for(let i=0;i<92;i++)race.advance({throttle:1,brake:0,steer:0},1/30);
  for(let i=0;i<13;i++)expect(seen[i]).toBe(V.get(start.entries[i].id,V.campaign).parameters);
  expect(race.parameters).toBe(V.get('t13',V.campaign).parameters);
  race.pause(true);const checkpoint=race.exportState(),restored=A.RaceSession.restore(checkpoint);
  expect(restored.snapshot()).toEqual(race.snapshot());expect(restored.exportState()).toEqual(checkpoint);
  const tampered=structuredClone(checkpoint);tampered.config.performance.version=99;expect(()=>A.RaceSession.restore(tampered)).toThrow();
  const weekend=A.RaceWeekend.create(A.TrackCatalog.get('bahrain'),{performance:V.campaign,playerTeam:'t13'});
  const p=weekend.parameters;weekend.startQualifying();expect(weekend.parameters).toBe(p);
  expect(weekend.snapshot().entries.every(e=>e.performance.context==='campaign')).toBe(true);
});
it('ist bei gleichen Eingaben deterministisch und erhält das historische uniforme Modell explizit für alte Wochenenden',()=>{
  const {api:A}=loadArcade({race:true}),t=A.TrackCatalog.get('korea'),a=A.RaceSession.create(t),b=A.RaceSession.create(t);
  a.pause(false);b.pause(false);for(let i=0;i<200;i++){const input={throttle:1,brake:0,steer:Math.sin(i/70)*.2};a.advance(input,1/30);b.advance(input,1/30);}
  expect(a.snapshot()).toEqual(b.snapshot());
  const legacy=A.RaceWeekend.create(t,{performance:null});expect(legacy.parameters).toBe(A.Physics.parameters);
  expect(legacy.exportState().config).not.toHaveProperty('performance');
  const loaded=A.RaceWeekend.restore(legacy.exportState());loaded.startQualifying();expect(loaded.parameters).toBe(A.Physics.parameters);
  expect(loaded.exportState().session.race.config).not.toHaveProperty('performance');
});
it('erhält den 5-km/h-Windschatten und die begrenzte Aufholhilfe relativ zum eigenen Fahrzeugprofil',()=>{
  const {api:A,data}=loadArcade({race:true});
  for(const team of data.roster.teams){const p=A.VehiclePerformance.get(team.id,A.VehiclePerformance.campaign).parameters;let car=A.Physics.spawn(flat,0);
    for(let i=0;i<18*120;i++)car=A.Physics.step(car,{throttle:1,brake:0,steer:0},flat,p,1/120,{strength:1,catchup:.012});
    expect(car.speed*p.metersPerUnit*3.6).toBeCloseTo(p.maxSpeed*1.012*p.metersPerUnit*3.6+5,3);
    expect(p.maxLateralAcceleration).toBe(A.VehiclePerformance.get(team.id,A.VehiclePerformance.campaign).parameters.maxLateralAcceleration);
  }
});
