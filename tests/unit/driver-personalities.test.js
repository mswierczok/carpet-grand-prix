import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadArcade} from '../helpers/arcade.js';
import {plain} from '../helpers/project.js';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
it('gibt allen 39 unveränderten Identitäten feste, getrennte Fahrerattribute ohne Teamstärke-Bonus',()=>{
 const {api:A,data}=loadArcade({race:true}), C=A.CampaignConfig,P=A.DriverPersonalities;
 expect(Object.keys(A.DriverAttributes.profiles)).toHaveLength(39);
 for(const d of C.drivers){const p=P.get(d.id);expect(Object.keys(p).sort()).toEqual([...P.attributes].sort());for(const value of Object.values(p))expect(Number.isInteger(value)&&value>=0&&value<=100).toBe(true);}
 expect(new Set(C.drivers.map(d=>JSON.stringify(P.get(d.id)))).size).toBe(39);
 expect(P.get('d012').potential).toBe(88);expect(P.get('campaign-veteran-001').consistency).toBeGreaterThan(P.get('d035').consistency);
 expect(P.get('d035').aggression).toBeGreaterThan(P.get('campaign-veteran-001').aggression);
 expect(data.roster.teams.find(t=>t.id==='t13').baseStrength).toBe(72);expect(A.VehiclePerformance.get('t13',A.VehiclePerformance.campaign).strength).toBe(64);
});
it('trennt Qualifying/Rennpace, konstante Identität, Seed und begrenzte kontinuierliche Fahrentscheidungen',()=>{
 const {api:A}=loadArcade({race:true}),P=A.DriverPersonalities;
 for(const d of A.CampaignConfig.drivers){for(const mode of ['qualifying','race']){
  const m={id:d.id,seed:4171,mode},a=P.decision(m,1.2,'bahrain'),b=P.decision(m,1.200001,'bahrain');
  expect(P.decision(m,1.2,'bahrain')).toEqual(a);expect(a.cornerScale).toBeGreaterThanOrEqual(.895);expect(a.cornerScale).toBeLessThan(1);
  expect(Math.abs(a.lineOffset)).toBeLessThanOrEqual(1.1);expect(Math.abs(a.cornerScale-b.cornerScale)).toBeLessThan(.00001);
 }}
 const m={id:'d012',seed:4171};expect(P.decision({...m,mode:'qualifying'},.5,'france').cornerScale).not.toBe(P.decision({...m,mode:'race'},.5,'france').cornerScale);
});
it('erzeugt mit verschiedenen Fahrern echte andere Eingaben bei identischen Fahrzeuggrenzen',()=>{
 const {api:A}=loadArcade({race:true}),surface=A.Surface.create(A.TrackCatalog.get('bahrain')),p=A.VehiclePerformance.get('t13',A.VehiclePerformance.campaign).parameters,
   controller=A.Opponents.create(surface,p,{difficulty:'expert'}),sequences=[];
 for(const id of A.CampaignConfig.starters){let car=A.Physics.spawn(surface,-220),state=controller.memory(12);state.personality={id,seed:17,mode:'race'};const commands=[];
  for(let frame=0;frame<300;frame++){const cars=controller.prepare([{...car,id:'t13'}]),input=controller.input(cars[0],cars,state);commands.push(input);for(let n=0;n<4;n++)car=A.Physics.step(car,input,surface,p,1/120);}
  sequences.push(JSON.stringify(commands));
 }
 expect(new Set(sequences).size).toBe(3);
});
it('sichert neue Fahrerzuordnung/Seed und setzt reale KI-Entscheidungen exakt fort; falsche Versionen bleiben abgelehnt',()=>{
 const {api:A}=loadArcade({race:true}),game=A.Campaign.create({driverId:'d012'}),w=A.CampaignWeekend.create(game,{diagnostics:true});w.startQualifying();w.advance({},.05);
 w.pause(true);const q=w.exportState();expect(q.config.driving.lineup).toEqual(game.lineup);expect(A.RaceWeekend.restore(q).exportState()).toEqual(q);
 const r=A.RaceSession.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',driving:q.config.driving,performance:A.VehiclePerformance.campaign,diagnostics:true});r.pause(false);
 for(let i=0;i<150;i++)r.advance({throttle:1},1/30);r.pause(true);const saved=r.exportState(),restored=A.RaceSession.restore(saved);expect(restored.exportState()).toEqual(saved);
 for(const s of [r,restored]){s.pause(false);for(let i=0;i<60;i++)s.advance({throttle:1,steer:.1},1/30);s.pause(true);}expect(restored.exportState()).toEqual(r.exportState());
 const bad=plain(saved);bad.config.driving.version=99;expect(()=>A.RaceSession.restore(bad)).toThrow();
 const swapped=plain(saved);swapped.state.entries[0].driver.personality.id=game.lineup.t02;expect(()=>A.RaceSession.restore(swapped)).toThrow();
 expect(A.RaceSession.create(A.TrackCatalog.get('bahrain')).exportState().config.driving).toBeUndefined();
});
it('lässt menschliche Eingaben und Fahrzeugparameter unabhängig von Attributen unverändert',()=>{
 const {api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain'),a=A.CampaignConfig.lineup('t13','d012','bahrain'),b={...a,t13:'d035'},sessions=[a,b].map(lineup=>A.RaceSession.create(track,{isolated:true,playerTeam:'t13',performance:A.VehiclePerformance.campaign,driving:A.DriverPersonalities.create(lineup,77)}));
 for(const s of sessions){s.pause(false);for(let i=0;i<150;i++)s.advance({throttle:1,brake:0,steer:i>135?.2:0},1/30);}
 expect(sessions[0].snapshot().car).toEqual(sessions[1].snapshot().car);expect(sessions[0].parameters).toBe(sessions[1].parameters);
});
it('setzt reale PR56-Rennen und Ein-Runden-Qualifyings ohne neue Fahrerlogik exakt fort',()=>{
 const {api:A}=loadArcade({race:true}),f=JSON.parse(readFileSync(new URL('../fixtures/driver-pr56-legacy.json',import.meta.url)));
 for(const[file,hash]of Object.entries(f.hashes))expect(createHash('sha256').update(execFileSync('git',['show',f.sourceCommit+':src/'+file])).digest('hex')).toBe(hash);
 for(const c of f.cases){const w=A.RaceWeekend.restore(c.before);expect(w.exportState()).toEqual(c.before);expect(w.exportState().config.driving).toBeUndefined();w.pause(false);for(let i=0;i<60;i++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);expect(w.exportState()).toEqual(c.after);}
});
it('schert physikalisch passend aus und fährt einem bereits benachbarten Fahrzeug nicht quer in die Spur',()=>{
 const{api:A}=loadArcade({race:true}),surface=A.Surface.create(A.TrackCatalog.get('bahrain')),p=A.VehiclePerformance.get('t13',A.VehiclePerformance.campaign).parameters,c=A.Opponents.create(surface,p,{difficulty:'expert',diagnostics:true});
 const car=(id,s,lane,speed)=>{const pose=A.Physics.spawn(surface,s),at=surface.at(s,lane);return{...pose,id,x:at.x,y:at.y,heading:at.ang,speed,longitudinalSpeed:speed,vx:Math.cos(at.ang)*speed,vy:Math.sin(at.ang)*speed,inRace:true};};
 let state=c.memory(12);state.personality={id:'d035',seed:17,mode:'race'};
 const a=car('t13',30,0,70),b=car('t12',64,0,35);c.input(a,c.prepare([a,b]),state);expect(state.attacking).toBe('t12');expect(state.lane).not.toBe(0);
 state=c.memory(12);state.personality={id:'d035',seed:17,mode:'race'};
 const left=car('t11',32,-8,70),right=car('t10',32,8,70);c.input(a,c.prepare([a,b,left,right]),state);expect(state.lane).toBe(0);expect(state.attacking).toBeUndefined();
});
it('verteidigt höchstens einmal pro Verfolgerkontakt und wechselt neben einem Auto nicht quer',()=>{
 const{api:A}=loadArcade({race:true}),surface=A.Surface.create(A.TrackCatalog.get('bahrain')),p=A.VehiclePerformance.get('t13',A.VehiclePerformance.campaign).parameters,c=A.Opponents.create(surface,p,{difficulty:'expert'});
 let s=0,bend=0;for(;s<surface.g.len;s+=5){const a=surface.at(s+20),b=surface.at(s+90);bend=Math.atan2(Math.sin(b.ang-a.ang),Math.cos(b.ang-a.ang));if(Math.abs(bend)>.25)break;}
 const inside=Math.sign(bend)*8,make=(id,at,lane,speed)=>{const car=A.Physics.spawn(surface,at),pose=surface.at(at,lane);return{...car,id,x:pose.x,y:pose.y,heading:pose.ang,speed,longitudinalSpeed:speed,inRace:true};},a=make('t13',s,-inside,50),rear=make('t12',s-30,-inside,60),state=c.memory(12,-inside);
 state.personality={id:'campaign-veteran-001',seed:1,mode:'race'};c.input(a,c.prepare([a,rear]),state);expect(state.defenseLock).toBe('t12');expect(state.lane).toBe(inside);
 state.hold=0;state.defending=null;c.input(a,c.prepare([a,rear]),state);expect(state.defending).toBeNull();expect(state.defenseLock).toBe('t12');
 const blocked=c.memory(12,-inside);blocked.personality=state.personality;const adjacent=make('t11',s+1,inside,50);c.input(a,c.prepare([a,rear,adjacent]),blocked);expect(blocked.defenseLock).toBeUndefined();
});
it('verwendet den gespeicherten Run-Seed, erhält ihn beim Reload und verweigert eine falsche Fahrer-Archivzuordnung',()=>{
 const{api:A}=loadArcade({race:true}),R=A.RogueliteRun;
 const start=seed=>{let r=R.create({id:'run-driver-seed-000000'+seed,seed,driverId:'d012'});return R.beginRace(R.chooseAbility(r,r.startOffers[0]));};
 const a=start(42),b=start(43),w=A.RunWeekend.create(a),v=A.RunWeekend.create(b);
 expect(w.exportState().config.driving.seed).not.toBe(v.exportState().config.driving.seed);
 const saved=R.capture(a,w.exportState(),1000);expect(A.RunWeekend.create(saved).exportState().config.driving).toEqual(w.exportState().config.driving);
 const bad=plain(saved),config=bad.campaign.weekend.config.driving;config.lineup.t01='d002';bad.campaign.weekend.session.config.driving.lineup.t01='d002';bad.campaign.weekend.session.state.entries.find(e=>e.id==='t01').driver.personality.id='d002';expect(()=>R.validate(bad)).toThrow();
});
