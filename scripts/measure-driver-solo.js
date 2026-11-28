// Separate driver skill from car performance and traffic, using one unchanged
// campaign Redwood vehicle for every identity. Ordinary inputs only.
import {loadArcade} from '../tests/helpers/arcade.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {api:A}=loadArcade({race:true}),surface=A.Surface.create(A.TrackCatalog.get('bahrain')),
 p=A.VehiclePerformance.get('t13',A.VehiclePerformance.campaign).parameters,
 controller=A.Opponents.create(surface,p,{difficulty:'expert'}),rows=[];
const hashes=Object.fromEntries(['data/driver-attributes','racing/driver-personalities','racing/opponents','racing/physics','racing/vehicle-performance'].map(f=>[f,createHash('sha256').update(readFileSync('src/'+f+'.js')).digest('hex')]));
for(const driver of A.CampaignConfig.drivers){const result={id:driver.id,attributes:A.DriverPersonalities.get(driver.id)};
 for(const mode of ['qualifying','race']){
  let car=A.Physics.spawn(surface,-220),clock=A.Timing.create(),command,wallSteps=0,offroadSteps=0;
  const memory=controller.memory(0),laps=[];memory.personality={id:driver.id,seed:4171,mode};
  for(let tick=0;tick<240*120;tick++){
   if(tick%4===0){const cars=controller.prepare([{...car,id:'t13'}]);command=controller.input(cars[0],cars,memory);}
   const next=A.Physics.step(car,command,surface,p,1/120),timing=A.Timing.step(clock,car,next,surface,1/120);
   wallSteps+=Number(next.hitWall);offroadSteps+=Number(next.offroad);
   if(timing.completed>clock.completed)laps.push(timing.lastLap.seconds);car=next;clock=timing;
   if(laps.length===(mode==='qualifying'?1:4))break;
  }
  if(laps.length!==(mode==='qualifying'?1:4))throw Error('Driver did not finish: '+driver.id);
  const mean=laps.reduce((a,b)=>a+b,0)/laps.length;
  result[mode]={laps,mean,sd:Math.sqrt(laps.reduce((s,t)=>s+(t-mean)**2,0)/laps.length),wallSteps,offroadSteps};
 }
 rows.push(result);console.log(driver.id,result.qualifying.mean.toFixed(3),result.race.mean.toFixed(3),result.race.sd.toFixed(3));
 mkdirSync('docs/driver-racing',{recursive:true});writeFileSync('docs/driver-racing/solo.json',JSON.stringify({hashes,seed:4171,trackId:'bahrain',vehicle:p,protocol:'All 39 identities, same campaign Redwood v1, Expert, 120Hz physics/30Hz ordinary commands. Natural standing approach; qualifying one flying lap, race four complete clean-air laps. No traffic/wake/catchup. No modifications to physical limits, poses or times.',rows},null,2)+'\n');
}
