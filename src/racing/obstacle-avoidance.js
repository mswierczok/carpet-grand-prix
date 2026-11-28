(() => {
  "use strict";
  const A=globalThis.CGPArcade;
  function plan(surface,p,car,traffic,path,state,dt,safeLane) {
    const ahead=traffic.filter(v=>v.gap>0&&v.gap<60&&v.car.speed<1&&
      (Math.abs(v.lane-path.lane)<6||Math.abs(v.lane-car.lane)<6))
      .sort((a,b)=>a.gap-b.gap)[0];
    if(state.avoidance) {
      const obstacle=traffic.find(v=>v.car.id===state.avoidance.id);
      if(!obstacle||obstacle.gap < -2*p.halfLength-10 || (obstacle.car.speed>5&&obstacle.gap>35)) {
        delete state.avoidance;delete state.avoidanceWait;
      }
    }
    if(!state.avoidance) {
      if(ahead&&car.speed<10)state.avoidanceWait=(state.avoidanceWait||0)+dt;
      else delete state.avoidanceWait;
      // Ignore normal standing starts. Act only after persistent obstruction.
      if((state.avoidanceWait||0)<.6)return null;
      const offset=Math.min(8,surface.roadRadius-p.halfWidth-3),
        choices=[-offset,offset].filter(lane=>Math.abs(lane-ahead.lane)>6.5&&safeLane(lane)&&
          [14,32].every(distance=>{const point=surface.at(car.s+distance,lane),pose={x:point.x,y:point.y,heading:point.ang};
            return !surface.boundary.blocksFootprint(A.VehicleContacts.footprint(pose,p),car.s+distance);}));
      choices.sort((a,b)=>Math.abs(a-car.lane)-Math.abs(b-car.lane));
      if(!choices.length)return null;
      state.avoidance={id:ahead.car.id,lane:choices[0]};state.lane=choices[0];state.hold=.6;
    }
    const lane=state.avoidance.lane,
      look=Math.max(12,Math.min(22,8+car.speed*.3)),target=surface.at(car.s+look,lane);
    // Actual steering and the shared collision system decide whether the car
    // reaches this point. No pose/speed assignment or new physical passage.
    return {target,lane,speed:25};
  }
  A.ObstacleAvoidance=Object.freeze({plan});
})();
