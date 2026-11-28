// Full native weekends, ordinary controls, unchanged vehicle/track limits.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { racingDiagnostics } from './lib/racing-diagnostics.js';
const opt=(key,fallback)=>process.argv.find(a=>a.startsWith(key+'='))?.slice(key.length+1)??fallback;
const root=opt('--root',process.cwd()), stage=opt('--stage','after'),
  tracks=opt('--tracks','bahrain,canada,korea,france,england,russia,italy,japan').split(','),
  conditions=opt('--conditions','off,on').split(','), output=opt('--output',`docs/driver-racing/${stage}.json`);
const {loadArcade}=await import(pathToFileURL(root+'/tests/helpers/arcade.js').href),{api:A,data}=loadArcade({race:true});
const sources=['data/campaign-config','data/driver-attributes','racing/driver-personalities','racing/opponents','racing/race-session','racing/qualifying-session','racing/qualifying-drivers','racing/vehicle-performance','racing/physics'];
const hashes=Object.fromEntries(sources.filter(p=>existsSync(root+'/src/'+p+'.js')).map(p=>[p,createHash('sha256').update(readFileSync(root+'/src/'+p+'.js')).digest('hex')]));
if(stage==='before') for(const [p,hash] of Object.entries(hashes)) {
  const original=execFileSync('git',['show',`d8c4d31cb7daacf594f24bbc08b367c601a4f03a:src/${p}.js`]);
  if(createHash('sha256').update(original).digest('hex')!==hash)throw Error('Baseline modified: '+p);
}
const result={stage,driverModel:stage==='before'?null:A.DriverPersonalities.version,baseCommit:'d8c4d31cb7daacf594f24bbc08b367c601a4f03a',hashes,
  driverIntentAvailable:stage==='after',
  protocol:'Expert; full default race lengths; 13 real native participants; campaign vehicle v1. Two conditions: catchup off/seed4171 and on/seed9011. Same manual player reference uses normal AI commands and full traffic, with the selected driver profile in after. Qualifying is isolated; natural standing approach and exactly one flying lap. Observation 30Hz; contacts observed at native 120Hz by transparent resolve wrapper. No state/time/position edits. Track gaps use native passage history; alone = no active opponent within 30m along the circuit, lapping included, separate late fraction from completed lap3. Passing requires full-body clearance, excludes lapping and finished cars; position changes also reported, not equated with overtakes.',weekends:[]};
mkdirSync(output.slice(0,output.lastIndexOf('/'))||'.',{recursive:true});
for(const trackId of tracks)for(const condition of conditions){
  const seed=condition==='on'?9011:4171, track=A.TrackCatalog.get(trackId), lineup=A.CampaignConfig.lineup('t13','d012',trackId),
    driving=stage==='after'?A.DriverPersonalities.create(lineup,seed):null,
    weekend=A.RaceWeekend.create(track,{playerTeam:'t13',difficulty:'expert',catchup:condition==='on',performance:A.VehiclePerformance.campaign,diagnostics:true,...(driving?{driving}:{})});
  weekend.startQualifying();
  function pilot(qualifying){
    const controller=A.Opponents.create(weekend.surface,weekend.parameters,{difficulty:'expert',diagnostics:true}),memory=controller.memory(12);
    if(qualifying)memory.qualifying=A.QualifyingDrivers.create(data.roster.teams,{technical:true}).t13;
    if(driving) {delete memory.qualifying; memory.personality={id:lineup.t13,seed,mode:qualifying?'qualifying':'race',model:driving.version};}
    return {input(s){const traffic=controller.prepare((qualifying?s.entries.filter(e=>e.player):s.entries).map(e=>({...e.car,id:e.id,inRace:e.finishTime===null,slipstream:e.slipstream,catchup:e.catchup})));return controller.input(traffic.find(e=>e.id==='t13'),traffic,memory);},memory};
  }
  let player=pilot(true), q=weekend.snapshot();
  for(let frame=0;frame<180*30;frame++) {weekend.advance(player.input(q),1/30);q=weekend.snapshot();if(q.qualifyingResult)break;}
  if(!q.qualifyingResult)throw Error('Qualifying did not finish: '+trackId);
  const qualifying=q.qualifyingResult.map(e=>({id:e.id,driverId:lineup[e.id],position:e.position,bestLap:e.bestLap}));
  const observer=racingDiagnostics(A,weekend.surface),contacts=[],original=A.VehicleContacts;let currentPairs=new Set();
  A.VehicleContacts={...original,resolve(...args){const value=original.resolve(...args),pairs=new Set(value.contacts.map(c=>c.key));
    for(const c of value.contacts)if(!currentPairs.has(c.key))contacts.push({time:weekend.snapshot().race.elapsed,pair:c.pair.map(i=>q.entries[i].id)});
    currentPairs=pairs;return value;}};
  player=pilot(false);weekend.pause(false);let s=weekend.snapshot();
  for(let frame=0;frame<800*30;frame++){weekend.advance(player.input(s),1/30);s=weekend.snapshot();
    // Include the external player's actual decision diagnostics in the observer.
    s.entries.find(e=>e.player).telemetry=player.memory.telemetry;
    observer.observe(s);if(frame%1800===0)console.log(stage,trackId,condition,s.race.elapsed.toFixed(1),s.race.finished);
    if(s.race.phase==='finished')break;
  }
  A.VehicleContacts=original;
  if(s.race.phase!=='finished')throw Error('Race did not finish: '+trackId);
  const diagnostics=observer.result();
  result.weekends.push({trackId,condition,seed,lineup,laps:s.race.laps,qualifying,
    order:s.race.standings.map(e=>({...e,driverId:lineup[e.id],grid:qualifying.find(q=>q.id===e.id).position})),contacts,...diagnostics});
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log('completed',stage,trackId,condition,'passes',diagnostics.passes.length,'contacts',contacts.length);
}
