// Development calibration: ordinary shared physics, no adjusted clocks or poses.
import {loadArcade} from '../tests/helpers/arcade.js';
import {mkdirSync,writeFileSync} from 'node:fs';
const {api:A,data}=loadArcade({race:true}),surface=A.Surface.create(A.TrackCatalog.get('bahrain')),
  candidates=[0,.16,.20,.24],anchors={acceleration:.94,topSpeed:.975,braking:.97,handling:.97,grip:.97,highSpeedGrip:0},
  centers={acceleration:.91,topSpeed:.955,braking:.95,handling:.95,grip:.94,highSpeedGrip:0},rows=[];
for(const compression of candidates){const group=[];
 for(const team of data.roster.teams){const old=A.VehiclePerformance.get(team.id,{version:1,context:'campaign'}),b=A.Physics.parameters,
   factors=Object.fromEntries(Object.keys(anchors).map(k=>[k,anchors[k]+compression*(old.factors[k]-centers[k])])),
   p={...b,acceleration:b.acceleration*factors.acceleration,maxSpeed:b.maxSpeed*factors.topSpeed,braking:b.braking*factors.braking,
     steerResponse:b.steerResponse*factors.handling,steerReturnResponse:b.steerReturnResponse*factors.handling,
     maxLateralAcceleration:b.maxLateralAcceleration*factors.grip,highSpeedGrip:factors.highSpeedGrip,gripSpeedReference:b.maxSpeed*factors.topSpeed},
   controller=A.Opponents.create(surface,p,{difficulty:'expert'}),memory=controller.memory(0),laps=[];
   let car=A.Physics.spawn(surface,-220),clock=A.Timing.create(),input,wall=0,offroad=0;
   for(let i=0;i<120*150;i++){if(i%4===0){const cars=controller.prepare([{...car,id:'reference'}]);input=controller.input(cars[0],cars,memory);}
    const next=A.Physics.step(car,input,surface,p,1/120),timing=A.Timing.step(clock,car,next,surface,1/120);wall+=Number(next.hitWall);offroad+=Number(next.offroad);
    if(timing.completed>clock.completed)laps.push(timing.lastLap.seconds);car=next;clock=timing;if(laps.length===2)break;
   }
   if(laps.length!==2)throw Error('Calibration did not finish');group.push({id:team.id,laps,factors,wall,offroad});
 }
 const times=group.map(r=>r.laps[1]);rows.push({compression,spread:Math.max(...times)-Math.min(...times),mean:times.reduce((a,b)=>a+b)/13,teams:group});
 mkdirSync('dist/vehicle-balance',{recursive:true});writeFileSync('dist/vehicle-balance/calibration.json',JSON.stringify({anchors,centers,protocol:'Identical Expert reference driver, no personality, two complete native laps; second measured. No traffic/wake/catchup. Standing spawn -220, ordinary inputs.',rows},null,2)+'\n');
 console.log(JSON.stringify({compression,spread:rows.at(-1).spread,mean:rows.at(-1).mean}));
}
