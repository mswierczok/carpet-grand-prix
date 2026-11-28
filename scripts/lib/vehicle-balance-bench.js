export function vehicleBench(A,p){
 const flat={roadRadius:1000,outerRadius:2000,g:{width:1000},at:s=>({x:s,y:0,ang:0,s}),project:v=>({s:v.x,distance:Math.abs(v.y),ang:0})};
 let car=A.Physics.spawn(flat,0),to80=null,to100=null;
 for(let i=0;i<15*120;i++){car=A.Physics.step(car,{throttle:1,brake:0,steer:0},flat,p,1/120);const kmh=car.speed*p.metersPerUnit*3.6;if(to80===null&&kmh>=80)to80=(i+1)/120;if(to100===null&&kmh>=100)to100=(i+1)/120;}
 const topKmh=car.speed*p.metersPerUnit*3.6;car=A.Physics.spawn(flat,0);
 for(let i=0;i<15*120&&car.speed*p.metersPerUnit*3.6<100;i++)car=A.Physics.step(car,{throttle:1,brake:0,steer:0},flat,p,1/120);
 const from=car.x,brakeStartKmh=car.speed*p.metersPerUnit*3.6;
 for(let i=0;i<10*120&&car.longitudinalSpeed>.01;i++)car=A.Physics.step(car,{throttle:0,brake:1,steer:0},flat,p,1/120);
 return {to80,to100,topKmh,brakeStartKmh,brakeMeters:(car.x-from)*p.metersPerUnit};
}
export function technicalSolo(A,surface,p){
 const driver=A.Opponents.create(surface,p,{difficulty:'expert'}),memory=driver.memory(0),laps=[];
 let car=A.Physics.spawn(surface,-220),clock=A.Timing.create(),input,wallSteps=0,offroadSteps=0,brakeSteps=0,cornerKmh=0,cornerTicks=0,exitKmh=0,exits=0,wasCorner=false,bridgeSteps=0,peakKmh=0;
 for(let tick=0;tick<180*120;tick++){
  if(tick%4===0){const cars=driver.prepare([{...car,id:'reference'}]);input=driver.input(cars[0],cars,memory);}
  const next=A.Physics.step(car,input,surface,p,1/120),timing=A.Timing.step(clock,car,next,surface,1/120),kmh=next.speed*p.metersPerUnit*3.6;
  wallSteps+=Number(next.hitWall);offroadSteps+=Number(next.offroad);brakeSteps+=Number(input.brake>0);bridgeSteps+=Number((next.elevation||0)>1);peakKmh=Math.max(peakKmh,kmh);
  const a=surface.at(next.s-5),b=surface.at(next.s+5),corner=Math.abs(Math.atan2(Math.sin(b.ang-a.ang),Math.cos(b.ang-a.ang)))/10>.004;
  if(clock.completed>=1){if(corner){cornerKmh+=kmh;cornerTicks++;}if(wasCorner&&!corner){exitKmh+=kmh;exits++;}}
  if(timing.completed>clock.completed)laps.push(timing.lastLap.seconds);car=next;clock=timing;wasCorner=corner;
  if(laps.length===2)return {laps,measuredLap:laps[1],wallSteps,offroadSteps,brakeSteps,bridgeSteps,peakKmh,cornerKmh:cornerTicks?cornerKmh/cornerTicks:null,exitKmh:exits?exitKmh/exits:null};
 }
 throw Error('Technical solo did not finish');
}
