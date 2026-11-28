// Reproducible native simulations. No pose, speed, sector or finish-time writes.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {pathToFileURL} from 'node:url';
const args = process.argv.slice(2), option = (key, fallback) => args.find(a=>a.startsWith(key+'='))?.slice(key.length+1) ?? fallback;
const stage = option('--stage','vehicles'), requestedTracks = option('--tracks','bahrain,canada,korea,france,england,russia,italy,japan');
const baselineRoot=option('--baseline-root',null);
if(stage==='baseline'&&!baselineRoot)throw Error('Baseline requires an unchanged checkout via --baseline-root. Never measure modified code as the old baseline.');
const {loadArcade}=await import(stage==='baseline'?pathToFileURL(baselineRoot+'/tests/helpers/arcade.js').href:'../tests/helpers/arcade.js');
const {api:A,data} = loadArcade({race:true}), dt=1/120, difficulty='expert';
const trackIds=requestedTracks==='all'?A.TrackCatalog.tracks.map(t=>t.id):requestedTracks.split(',');
const round = n => Number.isFinite(n) ? Math.round(n*1e6)/1e6 : null;
const descriptor = stage==='baseline' ? null : {version:1,context:'campaign'};
const parameter = id => descriptor && A.VehiclePerformance ? A.VehiclePerformance.get(id,descriptor).parameters : A.Physics.parameters;
const straight = {roadRadius:1000,outerRadius:2000,g:{width:1000},at:s=>({x:s,y:0,ang:0,s}),project:p=>({s:p.x,distance:Math.abs(p.y),ang:0})};
function bench(p) {
  let car=A.Physics.spawn(straight,0), to80=null, to100=null;
  for(let i=0;i<15*120;i++) {
    car=A.Physics.step(car,{throttle:1,brake:0,steer:0},straight,p,dt);
    const kmh=car.speed*p.metersPerUnit*3.6;
    if(to80===null&&kmh>=80)to80=(i+1)*dt;
    if(to100===null&&kmh>=100)to100=(i+1)*dt;
  }
  const top=car.speed*p.metersPerUnit*3.6;
  car=A.Physics.spawn(straight,0);
  for(let i=0;i<15*120&&car.speed*p.metersPerUnit*3.6<100;i++) car=A.Physics.step(car,{throttle:1,brake:0,steer:0},straight,p,dt);
  const start=car.x, brakeKmh=car.speed*p.metersPerUnit*3.6;
  for(let i=0;i<10*120&&car.longitudinalSpeed>0.01;i++)car=A.Physics.step(car,{throttle:0,brake:1,steer:0},straight,p,dt);
  return {zeroTo80Seconds:round(to80),zeroTo100Seconds:round(to100),topKmh:round(top),brakeStartKmh:round(brakeKmh),brakeMeters:round((car.x-start)*p.metersPerUnit)};
}
function solo(surface,p,driver) {
  let car=A.Physics.spawn(surface,-220),timing=A.Timing.create(),input,wall=0,shoulder=0,peak=0,cornerSpeed=0,cornerTicks=0,exitSpeed=0,exits=0,wasCorner=false,bridgeTicks=0;
  const memory=driver.memory(0),laps=[],firstCrossings=[];
  for(let tick=0;tick<300*120;tick++) {
    if(tick%4===0){const cars=driver.prepare([{...car,id:'reference'}]);input=driver.input(cars[0],cars,memory);}
    const next=A.Physics.step(car,input,surface,p,dt),clock=A.Timing.step(timing,car,next,surface,dt),kmh=next.speed*p.metersPerUnit*3.6;
    wall+=Number(next.hitWall);shoulder+=Number(next.offroad);peak=Math.max(peak,kmh);bridgeTicks+=Number((next.elevation||0)>1);
    if(clock.started&&!timing.started)firstCrossings.push(kmh);
    const a=surface.at(next.s-5),b=surface.at(next.s+5),curvature=Math.abs(Math.atan2(Math.sin(b.ang-a.ang),Math.cos(b.ang-a.ang)))/10,corner=curvature>.004;
    if(timing.completed>=1){if(corner){cornerSpeed+=kmh;cornerTicks++;}if(wasCorner&&!corner){exitSpeed+=kmh;exits++;}}
    if(clock.completed>timing.completed){laps.push(clock.lastLap.seconds);if(laps.length===2)return {laps: laps.map(round),flyingSeconds:round(laps[1]),peakKmh:round(peak),firstCrossingKmh:round(firstCrossings[0]),wallSteps:wall,shoulderSteps:shoulder,technicalKmh:round(cornerSpeed/cornerTicks),exitKmh:round(exitSpeed/exits),bridgeTicks};}
    car=next;timing=clock;wasCorner=corner;
  }
  return {failed:true,completed:timing.completed,s:round(car.s),wallSteps:wall,shoulderSteps:shoulder};
}
function qualifying(track,onlyApproach=false) {
  const q=A.QualifyingSession.create(track,{difficulty,playerTeam:'t13',...(descriptor?{performance:descriptor}:{})}),surface=q.surface,p=q.parameters,
    driver=A.Opponents.create(surface,p,{difficulty}),state=driver.memory(12);
  // Equal execution for the player reference too. This never grants a bonus.
  state.qualifying=A.QualifyingDrivers.create(data.roster.teams,{technical:!!descriptor}).t13;
  const initial=q.snapshot(),spawnS=initial.car.s,crossings={},metrics=Object.fromEntries(data.roster.teams.map(t=>[t.id,{wallSteps:0,shoulderSteps:0,peakKmh:0}]));
  const originalTiming=A.Timing,order=initial.entries.map(e=>e.id);let calls=0;
  A.Timing={...originalTiming,step(old,from,to,surface,dt){const result=originalTiming.step(old,from,to,surface,dt),id=order[calls++%13];
    if(!old.started&&result.started){const fraction=(result.lapStart-old.elapsed)/dt;crossings[id]=Math.hypot(from.vx+(to.vx-from.vx)*fraction,from.vy+(to.vy-from.vy)*fraction)*p.metersPerUnit*3.6;}
    return result;}};
  q.pause(false);
  let prior=q.snapshot();
  for(let frame=0;frame<360*30;frame++) {
    const s=q.snapshot(),cars=driver.prepare([{...s.car,id:'t13'}]),input=driver.input(cars[0],cars,state);q.advance(input,1/30);
    const next=q.snapshot();for(const e of next.entries){const m=metrics[e.id];m.wallSteps+=Number(e.car.hitWall);m.shoulderSteps+=Number(e.car.offroad);m.peakKmh=Math.max(m.peakKmh,e.car.speed*p.metersPerUnit*3.6);}
    prior=next;
    if(next.qualifying.finished||(onlyApproach&&Object.keys(crossings).length===13)){A.Timing=originalTiming;return {format:next.qualifying.format||'legacy-two-v1',spawnS:round(spawnS),attemptsComplete:next.qualifying.finished,
      ...(A.QualifyingApproach?{geometry:A.QualifyingApproach.select(surface,Object.fromEntries(data.roster.teams.map(t=>[t.id,parameter(t.id)])))}:{}),
      rows:next.qualifying.standings.map(r=>({id:r.id,position:r.position,laps:r.laps.map(round),bestLap:round(r.bestLap),firstCrossingKmh:round(crossings[r.id]),...Object.fromEntries(Object.entries(metrics[r.id]).map(([k,v])=>[k,round(v)]))}))};}
  }
  A.Timing=originalTiming;throw Error(track.id+': qualifying did not finish');
}
function traffic(track,catchup) {
  const race=A.RaceSession.create(track,{playerTeam:'t13',difficulty,catchup,performance:descriptor,diagnostics:true}),p=race.parameters,
    driver=A.Opponents.create(race.surface,p,{difficulty}),memory=driver.memory(12),support=Object.fromEntries(data.roster.teams.map(t=>[t.id,{maxPace:0,wallFrames:0,shoulderFrames:0}]));
  race.pause(false);
  for(let frame=0;frame<900*30;frame++) {
    const s=race.snapshot(),cars=driver.prepare([{...s.car,id:'t13'}]);race.advance(driver.input(cars[0],cars,memory),1/30);
    const next=race.snapshot();for(const e of next.entries){const m=support[e.id];m.maxPace=Math.max(m.maxPace,e.catchup?.pace||0);m.wallFrames+=Number(e.car.hitWall);m.shoulderFrames+=Number(e.car.offroad);}
    if(frame%1800===0)console.log(track.id,catchup?'catchup-on':'catchup-off','elapsed',round(next.race.elapsed),'finished',next.race.finished);
    if(next.race.phase==='finished')return {catchup,laps:next.race.laps,seconds:round(next.race.elapsed),contacts:next.contacts,rows:next.race.standings.map(e=>({id:e.id,position:e.position,finishTime:round(e.finishTime),...support[e.id]}))};
  }
  throw Error(track.id+': race did not finish');
}
const paths=['src/racing/physics.js','src/racing/vehicle-performance.js','src/racing/qualifying-approach.js','src/racing/opponents.js','src/racing/qualifying-drivers.js','src/racing/qualifying-session.js','src/racing/race-session.js','src/racing/race-weekend.js','src/racing/slipstream.js','src/racing/catchup.js','src/data/arcade-roster.js','src/data/arcade-tracks.js'];
const source=p=>stage==='baseline'?baselineRoot+'/'+p:p;
const result={stage,baseCommit:stage==='baseline'?'b4a797c7b9b390243db6b72213e99fffb081e876':execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),difficulty,hz:120,hashes:Object.fromEntries(paths.filter(p=>existsSync(source(p))).map(p=>[p,createHash('sha256').update(readFileSync(source(p))).digest('hex')])),protocol:'Native Physics.step, ordinary 30Hz inputs, 120Hz fixed steps. Solo: identical expert controller, no execution variation, no traffic/wake/catchup, two full laps after standing launch (second measured). Bench: flat straight, ordinary acceleration to 100km/h then ordinary full brake. Traffic: all 13 native vehicles and normal race lengths, catchup off/on. Qualifying: actual isolated sessions; player reference uses ordinary expert inputs. First crossing speeds interpolate native velocity components at the exact Timing crossing fraction, before any entrant finishes. Timing observer returns the unmodified original Timing result. No pose/speed/gate/time writes.',teams:data.roster.teams.map(t=>({id:t.id,name:t.name,historicalStrength:t.baseStrength,developmentPotential:t.developmentPotential,focus:t.focus,profile:descriptor&&A.VehiclePerformance?A.VehiclePerformance.get(t.id,descriptor):null,bench:bench(parameter(t.id))})),tracks:[]};
mkdirSync('docs/vehicle-performance',{recursive:true});
const output=option('--output',`docs/vehicle-performance/${stage}.json`);
for(const id of trackIds){const track=A.TrackCatalog.get(id),surface=A.Surface.create(track),entry={id};
  if(['baseline','vehicles'].includes(stage)){const controllers=new Map();entry.solo=data.roster.teams.map(t=>{const p=parameter(t.id);if(!controllers.has(p))controllers.set(p,A.Opponents.create(surface,p,{difficulty}));const r=solo(surface,p,controllers.get(p));console.log(id,t.id,r.flyingSeconds??'FAILED');return {id:t.id,...r};});}
  if(['baseline','qualifying'].includes(stage)){entry.qualifying=qualifying(track);console.log(id,'qualifying complete');}
  if(stage==='approach'){entry.approach=qualifying(track,true);console.log(id,'approach complete');}
  if(stage==='traffic'){entry.races=[traffic(track,false),traffic(track,true)];console.log(id,'traffic complete');}
  result.tracks.push(entry);writeFileSync(output,JSON.stringify(result,null,2)+'\n');
}
