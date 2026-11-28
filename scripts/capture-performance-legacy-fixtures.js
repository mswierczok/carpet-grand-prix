// Capture genuine PR55 native checkpoints into dist/, never overwrite tests.
// Prepare an unchanged checkout of b4a797c (including tests/helpers/fixtures).
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),value=(key,fallback)=>args.find(x=>x.startsWith(key+'='))?.slice(key.length+1)??fallback;
const source=value('--source-root',null),output=value('--output','dist/vehicle-legacy-reference'),commit='b4a797c7b9b390243db6b72213e99fffb081e876';
if(!source)throw Error('Use --source-root=/path/to/unchanged-PR55-checkout');
const files=['racing/physics.js','racing/race-session.js','racing/qualifying-session.js','racing/qualifying-drivers.js','racing/opponents.js','persistence/pov-checkpoint.js','championship/roguelite-run.js','championship/campaign-weekend.js','data/campaign-config.js'];
for(const file of files)if(!readFileSync(source+'/src/'+file).equals(execFileSync('git',['show',commit+':src/'+file],{maxBuffer:8*1024*1024})))throw Error('Modified baseline: '+file);
const {loadArcade}=await import(pathToFileURL(source+'/tests/helpers/arcade.js').href),{api:A}=loadArcade({race:true}),track=A.TrackCatalog.get('bahrain');
const input={throttle:1,brake:0,steer:0},race=A.RaceWeekend.create(track,{playerTeam:'t13',difficulty:'expert'});
race.pause(false);for(let i=0;i<240;i++)race.advance(input,1/30);race.pause(true);const raceBefore=race.exportState();
race.pause(false);for(let i=0;i<60;i++)race.advance(input,1/30);race.pause(true);const raceAfter=race.exportState();
const q=A.RaceWeekend.create(track,{playerTeam:'t13',difficulty:'expert'});q.startQualifying();
const driver=A.Opponents.create(q.surface,q.parameters,{difficulty:'expert'}),memory=driver.memory(12);
const step=()=>{const s=q.snapshot(),cars=driver.prepare([{...s.car,id:'t13'}]);q.advance(driver.input(cars[0],cars,memory),1/30);};
for(let i=0;i<180*30&&q.snapshot().timing.completed<2;i++)step();q.pause(true);const qualifyingBefore=q.exportState(),driverMemory=JSON.parse(JSON.stringify(memory));q.pause(false);
for(let i=0;i<180*30&&!q.snapshot().qualifying.finished;i++)step();q.pause(true);const qualifyingAfter=q.exportState();
if(!q.snapshot().qualifying.finished)throw Error('No genuine completed old qualifying');
mkdirSync(output,{recursive:true});writeFileSync(output+'/vehicle-performance-legacy-v1.json',JSON.stringify({sourceCommit:commit,hashes:Object.fromEntries(files.slice(0,6).map(f=>[f,createHash('sha256').update(readFileSync(source+'/src/'+f)).digest('hex')])),protocol:'Unmodified PR55. Normal 30Hz inputs; 120Hz physics. raceBefore + 60 throttle frames -> raceAfter. qualifyingBefore is in the second fast lap; continue stored controller memory -> qualifyingAfter. No pose, speed, gate or time writes.',raceBefore,raceAfter,qualifyingBefore,driverMemory,qualifyingAfter}));
const R=A.RogueliteRun,native=A.RaceWeekend;
A.RaceWeekend={...native,create:(t,options={})=>native.create(t,{...options,laps:1})};
let run=R.create({id:'run-native-legacy-winner-b4a797c',seed:55,driverId:'d012',difficulty:'beginner'});run=R.chooseAbility(run,run.startOffers[0]);
function drive(w,stop){const d=A.Opponents.create(w.surface,w.parameters,{difficulty:'expert'}),m=d.memory(12);
  for(let i=0;i<300*30;i++){const s=w.snapshot();if(stop(s))return;const cars=d.prepare((s.visibleEntries||s.entries).map(e=>({...e.car,id:e.id,...(e.slipstream?{slipstream:e.slipstream}:{})})));w.advance(d.input(cars.find(e=>e.id==='t13'),cars,m),1/30);}throw Error('Native legacy weekend did not finish');}
for(const [id,event] of [['bahrain','event-a'],['canada','event-d'],['england','event-f'],['italy',null]]){
  run=R.beginRace(run);const w=A.RunWeekend.create(run);w.startQualifying();drive(w,s=>!!s.qualifyingResult);run=R.capture(run,w.exportState());w.pause(false);drive(w,s=>s.race.phase==='finished');run=R.capture(run,w.exportState());
  console.log(id,run.campaign.result.order.find(r=>r.teamId==='t13').position,run.status);if(run.status==='failed')throw Error('No old native win; results will not be rewritten');
  if(event){run=R.enterEvent(run,event);run=R.completeEvent(run,run.eventContents[event].offers[0].id);}
}
if(run.status!=='won')throw Error('No genuine won Run');
writeFileSync(output+'/vehicle-performance-legacy-won-run.json',JSON.stringify({sourceCommit:commit,protocol:'Unmodified PR55 native engine. Four real qualifying sessions/races with 13 vehicles. Beginner AI, ordinary expert player inputs, existing public one-lap race option only. No pose, speed, rank or time writes. This checks a previous-format win, not a current weak-car win. Capture dates may differ between executions.',save:{version:1,kind:'roguelite-save',active:run,archive:[]}}));
