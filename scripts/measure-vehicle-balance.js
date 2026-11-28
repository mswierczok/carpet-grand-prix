// Ordinary native sessions only. This tool never assigns poses, times or ranks.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{dirname}from'node:path';
import{pathToFileURL}from'node:url';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{racingDiagnostics}from'./lib/racing-diagnostics.js';
import{vehicleBench,technicalSolo}from'./lib/vehicle-balance-bench.js';
import{loadArcade}from'../tests/helpers/arcade.js';
const opt=(k,f)=>process.argv.find(a=>a.startsWith(k+'='))?.slice(k.length+1)??f,
 version=Number(opt('--version','2')),root=opt('--root',process.cwd()),mode=opt('--mode','race'),
 tracks=opt('--tracks','bahrain,canada,korea,france,england,russia,italy,japan').split(','),
 seeds=opt('--seeds','4171,9011').split(',').map(Number),conditions=opt('--conditions','natural,campaign').split(','),
 playerDriver=opt('--driver','d035'),output=opt('--output',`dist/vehicle-balance/v${version}-${mode}.json`),baseCommit='622a1cf295437d38d9b12055a777e634777fb05d',processRealm=opt('--realm','vm')==='process';
if(![1,2].includes(version)||!['race','solo'].includes(mode)||seeds.some(s=>!Number.isInteger(s)||s<0||s>4294967295)||conditions.some(c=>!['natural','campaign'].includes(c)))throw Error('Invalid measurement options');
const{api:A,data}=loadArcade({race:true,sourceRoot:pathToFileURL(root+'/'),processRealm}),model={version,context:'campaign'};
const files=['racing/vehicle-performance','racing/physics','racing/opponents','racing/driver-personalities','racing/obstacle-avoidance','data/driver-attributes','data/campaign-config','racing/race-session','racing/race-weekend','racing/qualifying-session','racing/qualifying-approach','racing/vehicle-contacts','racing/catchup','racing/slipstream','data/race-formats','data/arcade-tracks','data/arcade-boundaries'];
const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(root+'/src/'+f+'.js')).digest('hex')]));
if(version===1)for(const[f,hash]of Object.entries(hashes)){const original=execFileSync('git',['show',baseCommit+':src/'+f+'.js']);if(createHash('sha256').update(original).digest('hex')!==hash)throw Error('Modified V1 baseline: '+f);}
const result={schemaVersion:1,baseCommit,version,mode,driverModel:A.DriverPersonalities.version,hashes,
 protocol:'Expert; native 120Hz physics, normal 30Hz controls. Solo: same controller/memory, no personality/traffic/wake/catchup, two complete laps after standing approach; second measured. Race: full default weekends and all 13 actual campaign identities; standing one-lap qualifying. Two seeds independently tested with wake/no catchup and wake/existing catchup. Manual player reference uses the selected driver through normal inputs and full traffic. No pose, speed, timing or result assignments. Pair contacts observed transparently at 120Hz; race observer 30Hz, proximity 30m.',
 teams:data.roster.teams.map(t=>({id:t.id,name:t.name,profile:A.VehiclePerformance.get(t.id,model),bench:vehicleBench(A,A.VehiclePerformance.get(t.id,model).parameters)})),solos:[],weekends:[]};
if(process.argv.includes('--resume')){
 const previous=JSON.parse(readFileSync(output,'utf8'));
 if(previous.version!==version||previous.mode!==mode||JSON.stringify(previous.hashes)!==JSON.stringify(hashes)||JSON.stringify(previous.teams)!==JSON.stringify(result.teams))throw Error('Cannot resume different measurement source/model');
 result.solos=previous.solos;result.weekends=previous.weekends.map(r=>({...r,executionRealm:r.executionRealm||'isolated-vm'}));
}
mkdirSync(dirname(output),{recursive:true});const save=()=>writeFileSync(output,JSON.stringify(result)+'\n');
for(const trackId of tracks){const track=A.TrackCatalog.get(trackId);
 if(mode==='solo'){const surface=A.Surface.create(track);for(const team of data.roster.teams){if(result.solos.some(r=>r.trackId===trackId&&r.id===team.id))continue;const measured=technicalSolo(A,surface,A.VehiclePerformance.get(team.id,model).parameters);result.solos.push({trackId,id:team.id,...measured});save();console.log('solo',version,trackId,team.id,measured.measuredLap); }continue;}
 for(const seed of seeds)for(const condition of conditions){
  if(result.weekends.some(r=>r.trackId===trackId&&r.seed===seed&&r.condition===condition&&r.playerDriver===playerDriver))continue;
  const lineup=A.CampaignConfig.lineup('t13',playerDriver,trackId),driving=A.DriverPersonalities.create(lineup,seed),
   weekend=A.RaceWeekend.create(track,{playerTeam:'t13',difficulty:'expert',catchup:condition==='campaign',slipstream:true,performance:model,driving,diagnostics:true});
  function pilot(qualifying){const controller=A.Opponents.create(weekend.surface,weekend.parameters,{difficulty:'expert',diagnostics:true}),memory=controller.memory(12);memory.personality={id:playerDriver,seed,mode:qualifying?'qualifying':'race',model:driving.version};
   return{memory,input(s){const cars=controller.prepare((qualifying?s.entries.filter(e=>e.player):s.entries).map(e=>({...e.car,id:e.id,inRace:e.finishTime===null,slipstream:e.slipstream,catchup:e.catchup})));return controller.input(cars.find(e=>e.id==='t13'),cars,memory);}};}
  weekend.startQualifying();let player=pilot(true),q=weekend.snapshot();
  for(let i=0;i<180*30;i++){weekend.advance(player.input(q),1/30);q=weekend.snapshot();if(q.qualifyingResult)break;}
  if(!q.qualifyingResult)throw Error('Qualifying did not finish: '+trackId);
  const qualifying=q.qualifyingResult.map(e=>({id:e.id,driverId:lineup[e.id],position:e.position,bestLap:e.bestLap})),observer=racingDiagnostics(A,weekend.surface),contacts=[],milestones={},
   support=Object.fromEntries(data.roster.teams.map(t=>[t.id,{frames:0,wakeFrames:0,wakeStrength:0,helpSum:0,maxHelp:0}])),original=A.VehicleContacts;let previousPairs=new Set();
  A.VehicleContacts={...original,resolve(...args){const v=original.resolve(...args),pairs=new Set(v.contacts.map(c=>c.key));for(const c of v.contacts)if(!previousPairs.has(c.key))contacts.push({time:weekend.snapshot().race.elapsed,pair:c.pair.map(i=>q.entries[i].id)});previousPairs=pairs;return v;}};
  weekend.pause(false);player=pilot(false);let s=weekend.snapshot();
  for(let frame=0;frame<800*30;frame++){weekend.advance(player.input(s),1/30);s=weekend.snapshot();s.entries.find(e=>e.player).telemetry=player.memory.telemetry;observer.observe(s);
   for(const e of s.entries)if(e.finishTime===null&&s.race.elapsed>0){const v=support[e.id],pace=e.catchup?.pace||0,strength=e.slipstream?.strength||0;v.frames++;v.wakeFrames+=Number(strength>.05);v.wakeStrength+=strength;v.helpSum+=pace;v.maxHelp=Math.max(v.maxHelp,pace);}
   const leader=s.race.standings[0],saveMilestone=label=>{milestones[label]={time:s.race.elapsed,order:s.race.standings.map(e=>({...e,driverId:lineup[e.id]}))};};
   if(leader.completed>=1&&!milestones.lap1)saveMilestone('lap1');if(leader.completed>=3&&!milestones.lap3)saveMilestone('lap3');
   if(leader.progress>=s.race.laps*weekend.surface.g.len*2/3&&!milestones.lastThird)saveMilestone('lastThird');
   if(frame%1800===0)console.log('race',version,trackId,seed,condition,s.race.elapsed.toFixed(1),s.race.finished);if(s.race.phase==='finished')break;
  }
  A.VehicleContacts=original;if(s.race.phase!=='finished')throw Error('Race did not finish: '+trackId);
  result.weekends.push({trackId,seed,condition,playerDriver,lineup,laps:s.race.laps,qualifying,order:s.race.standings.map(e=>({...e,driverId:lineup[e.id],grid:qualifying.find(q=>q.id===e.id).position})),contacts,milestones,support,executionRealm:processRealm?'main-process':'isolated-vm',...observer.result()});save();console.log('completed',version,trackId,seed,condition);
 }
}
