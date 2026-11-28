(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    clamp = (n, a, b) => Math.max(a, Math.min(b, n)), planCache = new WeakMap(), previewCache = new WeakMap();
  function create(surface, parameters, options = {}) {
    if (options.parametersByTeam) {
      const delegates = new Map(), byTeam = new Map();
      for (const [id, p] of Object.entries(options.parametersByTeam)) {
        if (!delegates.has(p)) delegates.set(p, create(surface, p, { ...options, parametersByTeam: null }));
        byTeam.set(id, delegates.get(p));
      }
      const first = delegates.values().next().value;
      return Object.freeze({ memory: first.memory, prepare: first.prepare, diagnostics: first.diagnostics,
        input(car, others, memory, dt) {
          const driver = byTeam.get(car.id);
          if (!driver) throw Error("Fahrzeugparameter fehlen für die KI-Planung.");
          return driver.input(car, others, memory, dt);
        } });
    }
    const p = parameters,
      profile = A.AIDifficulty.forDriving(options.difficulty, surface.id,options.drivingVersion),
      returnAnticipation = profile.steeringAnticipation > 0
        ? 1 / Math.expm1(p.steerReturnResponse * Math.log1p(1 / profile.steeringAnticipation) / p.steerResponse) : 0,
      stride = 5,
      passingOffset = Math.min(8, surface.roadRadius - p.halfWidth - 3),
      lines = A.OpponentLine.create(surface, profile);
    if (!planCache.has(surface)) planCache.set(surface, new WeakMap());
    const cached = planCache.get(surface);
    if (!cached.has(p)) cached.set(p, new Map());
    const planKey=profile.cacheKey||profile.id;
    if (!cached.get(p).has(planKey)) cached.get(p).set(planKey, new Map());
    const plans = cached.get(p).get(planKey);
    function plan(lane) {
      if (plans.has(lane)) return plans.get(lane);
      const route = lines.route(lane),
        samples = Math.ceil(route.length / stride);
      // All team profiles use the same geometric route. Sample its curvature
      // once, then solve each vehicle's own grip/braking limits from that data.
      // The calculation order and preview positions remain unchanged.
      if (!previewCache.has(route)) {
        const curvature = new Float64Array(samples * 20);
        for (let i = 0; i < samples; i++) for (let ahead = 0; ahead < 100; ahead += 5) {
          const a = route.at(i * stride + ahead), b = route.at(i * stride + ahead + 8),
            turn = Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang));
          curvature[i * 20 + ahead / 5] = Math.max(.001, Math.abs(turn) / 8);
        }
        previewCache.set(route, curvature);
      }
      const curvatureTable = previewCache.get(route),
        speedTable = Array.from({ length: samples }, (_, i) => {
          let allowed = p.maxSpeed;
          for (let ahead = 0; ahead < 100; ahead += 5) {
            const curvature = curvatureTable[i * 20 + ahead / 5],
              cornerSquared =
                A.Physics.cornerSpeedSquared(p, curvature, lane === 0 ? profile.cornerConfidence : profile.passingConfidence),
              brakingDistance = Math.max(0, ahead - profile.brakeDistance);
            allowed = Math.min(
              allowed,
              Math.sqrt(cornerSquared + 2 * p.braking * profile.brakeConfidence * brakingDistance),
            );
          }
          return allowed;
        });
      const result = { route, speedTable, samples };
      plans.set(lane, result);
      return result;
    }
    function motion(car, state) {
      const { route, speedTable, samples } = plan(state.lane),
        s = route.project(car),
        variation = state.personality ? A.DriverPersonalities.decision(state.personality, car.s / surface.g.len, surface.id)
          : state.qualifying ? A.QualifyingDrivers.at(state.qualifying, car.s / surface.g.len) : null,
        precision = profile.inconsistency * (1 + Math.sin(car.s * 6 * Math.PI / surface.g.len + state.index)),
        index = Math.min(samples - 1, Math.floor(Math.max(0, s - precision) / stride)),
        aheadIndex = variation ? Math.min(samples - 1,
          Math.floor(Math.max(0, s - precision + variation.brakeLead) / stride)) : index,
        sample=s=>{const at=((s%route.length)+route.length)%route.length,i=Math.min(samples-1,Math.floor(at/stride)),
          width=i===samples-1?route.length-i*stride:stride,f=(at-i*stride)/width;
          return speedTable[i]+(speedTable[(i+1)%samples]-speedTable[i])*f;},
        planned = state.personality?.model===4?sample(s-precision+variation.brakeLead):variation ? Math.min(speedTable[index], speedTable[aheadIndex]) : speedTable[index],
        point = route.at(s),
        road = surface.at(point.trackS),
        lane =
          -(point.x - road.x) * Math.sin(road.ang) +
          (point.y - road.y) * Math.cos(road.ang);
      return {
        route,
        s,
        lane,
        distance: Math.hypot(car.x - point.x, car.y - point.y),
        pace: planned,
        ...(state.personality?.model>=2?{cornering:Math.abs(Math.atan2(
          Math.sin(route.at(s+32).ang-point.ang),Math.cos(route.at(s+32).ang-point.ang)))/32>.0035}:{}),
      };
    }
    function passingCostV4(car,target,currentLane) {
      const candidate=plan(target),start=candidate.route.project(car),
        end=candidate.route.project({...surface.at(car.s+120),s:car.s+120}),
        distance=((end-start)%candidate.route.length+candidate.route.length)%candidate.route.length;
      let cost=Math.abs(currentLane-target)/Math.max(40,car.speed)*.2;
      for(let d=0;d<distance;d+=20){const at=(start+d)%candidate.route.length,
        index=Math.min(candidate.samples-1,Math.floor(at/stride));
        cost+=Math.min(20,distance-d)/Math.max(10,candidate.speedTable[index]);}
      return cost;
    }
    const memory = (index, lane = 0) => ({
      lane,
      hold: 0,
      index,
    });
    function prepare(cars) {
      return cars.map((car) => {
        const road = surface.project(car, car.s);
        return {
          ...car,
          lane:
            -(car.x - road.x) * Math.sin(road.ang) +
            (car.y - road.y) * Math.cos(road.ang),
        };
      });
    }
    function input(car, others, state, dt = 1 / 30) {
      const personality = state.personality ? A.DriverPersonalities.decision(state.personality, car.s / surface.g.len, surface.id) : null,
        attackDistance = personality ? profile.attackDistance * (.75 + personality.attackDistance / 240) : profile.attackDistance;
      const projection = surface.project(car, car.s),
        lane =
          car.lane ??
          -(car.x - projection.x) * Math.sin(projection.ang) +
            (car.y - projection.y) * Math.cos(projection.ang),
        traffic = others
          .filter((other) => other.id !== car.id)
          .map((other) => {
            const road =
              other.lane === undefined ? surface.project(other, other.s) : null;
            return {
              car: other,
              gap: surface.gap(car.s, other.s),
              ...(state.personality?.model===4?{clearance:p.halfWidth*(Math.abs(Math.cos(car.heading-projection.ang))+Math.abs(Math.cos(other.heading-projection.ang)))+
                p.halfLength*(Math.abs(Math.sin(car.heading-projection.ang))+Math.abs(Math.sin(other.heading-projection.ang)))+.8}:{}),
              lane:
                other.lane ??
                -(other.x - road.x) * Math.sin(road.ang) +
                  (other.y - road.y) * Math.cos(road.ang),
            };
          }),
        ahead = traffic
          .filter(
            (v) => v.gap > 0 && v.gap < attackDistance && Math.abs(v.lane - lane) < 5.8,
          )
          .sort((a, b) => a.gap - b.gap)[0];
      state.hold = Math.max(0, state.hold - dt);
      // A V4 passing route is relative to the racing line. Safety always uses
      // its actual road-space destination, not the logical route offset.
      const actualLane=target=>profile.relativePassing?motion(car,{...state,lane:target}).lane:target,
        safePhysicalLane = (target, behind = personality?.safeRear ?? -16) => !traffic.some((v) =>
        (v.gap > behind && v.gap < 35 && Math.abs(v.lane - target) < Math.max(6.5,v.clearance||0)) ||
        // Check the swept lateral corridor too; never move across an adjacent
        // car just because the destination lane itself is vacant.
        (personality && Math.abs(v.gap) < 2*p.halfLength+5 &&
          v.lane > Math.min(lane,target)-Math.max(2*p.halfWidth+1,v.clearance||0) && v.lane < Math.max(lane,target)+Math.max(2*p.halfWidth+1,v.clearance||0))),
        safeLane=(target,behind)=>safePhysicalLane(actualLane(target),behind);
      const rear = car.inRace === false ? null : traffic.find((v) => v.car.inRace !== false && v.gap < -2 * p.halfLength - 8 &&
        v.gap > -profile.defenseDistance * (personality ? .65 + personality.profile.defensiveSkill*.0065 : 1) && v.car.speed > car.speed + 2);
      if(personality && state.defenseLock && !traffic.some(v=>v.car.id===state.defenseLock&&v.car.inRace!==false&&v.gap>-150&&v.gap<25))state.defenseLock=null;
      if (state.defending && (car.inRace === false || !traffic.some((v) => v.car.inRace !== false && v.car.id === state.defending && v.gap < -12 && v.gap > -60)))
        state.defending = null;
      if(personality && state.attacking && state.lane!==0 &&
        traffic.some(v=>v.gap>0&&v.gap<24&&Math.abs(v.lane-(profile.relativePassing?actualLane(state.lane):state.lane))<6.5)&&safeLane(0)) {
        // A newly blocked passing lane is not a commitment to collide. Return
        // only through a clear corridor; otherwise the normal blocker brake wins.
        state.lane=0;state.attacking=null;state.hold=.6;
      }
      if (!ahead && !state.defending && rear && state.hold === 0 && (!personality || state.defenseLock!==rear.car.id)) {
        const a = surface.at(car.s + 20), b = surface.at(car.s + 90),
          bend = Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang)),
          inside = Math.sign(bend) * passingOffset;
        // One early move while the attacker is still behind. Never sweep
        // across an adjacent car, assign a position or force an overtake.
        if (Math.abs(bend) > 0.2 && Math.abs(inside - lane) > 3 && safeLane(inside, -24)) {
          state.lane = inside;
          state.hold = 1.5;
          state.defending = rear.car.id;
          if(personality)state.defenseLock=rear.car.id;
        }
      }
      let path = motion(car, state);
      const passing = ahead && Math.abs(path.lane - ahead.lane) > 6.5;
      // Compare equal TRACK progress, not equal distances on different-radius
      // routes. A racecraft driver can exploit a genuinely shorter clear line
      // before a speed difference has appeared; there is no assigned overtake.
      if(state.personality?.model===4&&ahead&&!passing&&state.hold===0&&profile.smartPassing&&personality.smartPassing&&ahead.gap<60){
        const choices=[-passingOffset,passingOffset].filter(target=>Math.abs(actualLane(target)-lane)>3&&safeLane(target));
        choices.sort((a,b)=>passingCostV4(car,a,state.lane)-passingCostV4(car,b,state.lane));
        if(choices.length&&passingCostV4(car,choices[0],state.lane)+.012+(100-personality.profile.racecraft)*.0003<passingCostV4(car,state.lane,state.lane)){
          state.lane=choices[0];state.hold=personality.maneuverHold;state.attacking=ahead.car.id;
        }
      }
      if (
        ahead &&
        !passing &&
        state.hold === 0 &&
        (ahead.car.speed < (state.personality?.model===4?car.speed:path.pace) - (personality?.closingThreshold ?? 2) ||
          (state.personality?.model===4?ahead.gap<18+personality.risk*6&&car.speed>=ahead.car.speed-.2:ahead.gap < 20))
      ) {
        const choices = [-passingOffset, passingOffset].filter(
          (target) =>
            Math.abs(actualLane(target) - lane) > 3 &&
            safeLane(target),
        );
        if (choices.length) {
          const cost = (target) => {
            if(state.personality?.model===4&&profile.smartPassing&&personality.smartPassing)return passingCostV4(car,target,state.lane);
            if (!profile.smartPassing || (personality && !personality.smartPassing)) return Math.abs(target - lane);
            const candidate = plan(target), at = candidate.route.project(car);
            let seconds = Math.abs(target - lane) / Math.max(40, car.speed) * 0.2;
            for (let look = 0; look <= 80; look += 20) {
              const index = Math.floor(((at + look) % candidate.route.length) / stride);
              seconds += 20 / Math.max(10, candidate.speedTable[Math.min(candidate.samples - 1, index)]);
            }
            return seconds;
          };
          choices.sort((a, b) => cost(a) - cost(b));
          state.lane = choices[0];
          state.hold = personality?.maneuverHold ?? 2;
          if(personality)state.attacking=ahead.car.id;
        }
      } else if (!ahead && !state.defending && state.hold === 0 && state.lane !== 0) {
        const nominal = motion(car, { ...state, lane: 0 });
        // The leading car may merge into a clear racing line. A car ahead
        // gets priority, so adjacent drivers do not converge simultaneously.
        const busy = traffic.some(
          (v) =>
            v.gap > -18 &&
            v.gap < 28 &&
            (Math.abs(v.lane - nominal.lane) < 5.8 ||
              (v.gap > 0 && Math.abs(v.lane - nominal.lane) < 12)),
        );
        if (!busy) {
          state.lane = 0;
          state.hold = 0.6;
          if(personality)state.attacking=null;
        }
      }
      path = motion(car, state);
      const avoidance=state.personality?.model>=3?A.ObstacleAvoidance.plan(surface,p,
        {...car,lane},traffic,path,state,dt,profile.relativePassing?safePhysicalLane:safeLane):null;
      if(avoidance)path={...path,lane:avoidance.lane};
      if(personality && state.attacking && !traffic.some(v=>v.car.id===state.attacking&&v.gap>-30&&v.gap<120))state.attacking=null;
      const lineOffset = personality && !traffic.some(v=>Math.abs(v.gap)<30) ? personality.lineOffset : 0;
      const look = clamp(8 + car.speed * profile.look, 12, 35),
        baseTarget = path.route.at(path.s + look),
        target = avoidance?.target || (lineOffset ? {...baseTarget,x:baseTarget.x-Math.sin(baseTarget.ang)*lineOffset,y:baseTarget.y+Math.cos(baseTarget.ang)*lineOffset} : baseTarget),
        error = Math.atan2(
          Math.sin(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
          Math.cos(
            Math.atan2(target.y - car.y, target.x - car.x) - car.heading,
          ),
        ),
        maxSteer =
          p.maxSteer /
          (1 +
            p.steerSpeedReduction * (car.speed / p.steerSpeedReference) ** 2),
        chord = Math.hypot(target.x - car.x, target.y - car.y),
        steeringDistance = Math.max(4, look + (chord - look) * profile.steeringPrecision),
        wantedSteering = Math.atan2(2 * p.wheelbase * Math.sin(error), steeringDistance),
        turnIn = wantedSteering + profile.steeringAnticipation * (wantedSteering - car.steering),
        correctedSteering = turnIn * car.steering < 0 && wantedSteering * car.steering >= 0
          ? 0
          : wantedSteering * car.steering < 0
            ? wantedSteering + returnAnticipation * (wantedSteering - car.steering)
            : turnIn,
        steer = clamp(
          correctedSteering / maxSteer,
          -1,
          1,
        );
      let desired = avoidance?Math.min(path.pace,avoidance.speed):path.pace,
        reason = desired < p.maxSpeed ? "corner-preview" : "straight";
      // Signed V4 execution changes the corner plan before all settling,
      // traffic, edge and recovery safeguards. A good phase cannot undo them.
      if(state.personality?.model===4&&!avoidance&&desired>=40&&(desired<p.maxSpeed||path.cornering))
        desired=Math.min(p.maxSpeed,desired*personality.cornerScale);
      // A merge can start far from its new path. Settle onto it before using
      // qualifying pace, rather than running wide with the old steering angle.
      if (path.distance > profile.settleDistance && Math.abs(error) > profile.settleAngle) {
        desired = Math.min(desired, 65);
        reason = "settling";
      }
      // Brake before a blocked nose; do not hold the brake into reverse.
      const blocker = traffic
        .filter(
          (v) =>
            v.gap > 0 &&
            v.gap < 80 &&
            (Math.abs(v.lane - path.lane) < Math.max(6,v.clearance||0) || Math.abs(v.lane - lane) < Math.max(6,v.clearance||0)),
        )
        .sort((a, b) => a.gap - b.gap)[0];
      if (blocker) {
        const freeDesired = desired;
        // Keep room for the body, reaction and braking away closing speed.
        // Matched-speed cars do not need a large speed-dependent empty gap.
        const closing = Math.max(
            0,
            car.speed - Math.max(0, blocker.car.longitudinalSpeed),
          ),
          buffer =
            2 * p.halfLength +
            (personality?.reactionGap ?? 2) +
            car.speed * (state.personality?.model===4?.055:.035) +
            closing * 0.15 +
            (closing * closing) / (2 * p.braking * 0.8);
        if (blocker.gap < buffer)
          desired = Math.min(
            desired,
            Math.max(
              0,
              blocker.car.longitudinalSpeed + (blocker.gap - buffer) * 1.5,
            ),
          );
        if (Math.abs(path.lane - blocker.lane) > 6.5 && desired < 8) {
          // Progress alone is too conservative beside a parked car. Creep only
          // if the actual oriented rectangle has room in the chosen direction.
          const predicted = {
            ...car,
            x: car.x + Math.cos(car.heading) * 1.5,
            y: car.y + Math.sin(car.heading) * 1.5,
          };
          if (
            !surface.boundary.blocksFootprint(
              A.VehicleContacts.footprint(predicted, p),
              predicted.s,
            ) &&
            !others.some(
              (other) =>
                other.id !== car.id &&
                A.VehicleContacts.overlap(predicted, other, p),
            )
          )
            desired = 8;
        }
        if (desired < freeDesired) reason = "traffic";
      }
      if (profile.edgePreview > 0 && car.longitudinalSpeed > 35) {
        const tau = profile.edgePreview, v = car.longitudinalSpeed,
          targetSteering = steer * maxSteer,
          response = steer === 0 || car.steering * targetSteering < 0
            ? p.steerReturnResponse : p.steerResponse,
          meanSteering = targetSteering + (car.steering - targetSteering) *
            (-Math.expm1(-response * tau)) / (response * tau),
          grip = A.Physics.lateralAcceleration(p, v) * (car.offroad ? p.offroadGrip : 1),
          omega = clamp(v / p.wheelbase * Math.tan(meanSteering), -grip / v, grip / v),
          h = car.heading, w = h + omega * tau,
          future = { ...car,
            x: car.x + (Math.abs(omega) > 0.0001 ? v / omega * (Math.sin(w) - Math.sin(h)) : v * Math.cos(h) * tau) + (car.vx - v * Math.cos(h)) * tau,
            y: car.y + (Math.abs(omega) > 0.0001 ? v / omega * (Math.cos(h) - Math.cos(w)) : v * Math.sin(h) * tau) + (car.vy - v * Math.sin(h)) * tau },
          forecast = surface.project(future, car.s + v * tau);
        if (forecast.distance > surface.roadRadius - 0.3 && forecast.distance > projection.distance + 0.1) {
          desired = Math.min(desired, Math.max(35, car.speed - p.braking * 0.12));
          reason = "edge-preview";
        }
      }
      if (Math.abs(error) > 0.9 && desired > 40) {
        const recovery=state.personality?.model===4&&Math.abs(error)<1.4&&path.distance<profile.settleDistance
          ? clamp(Math.sqrt(A.Physics.lateralAcceleration(p,car.speed)*chord*.85/(2*Math.max(.2,Math.abs(Math.sin(error))))),40,65):40;
        desired = Math.min(desired, recovery);
        reason = "heading-recovery";
      }
      state.blocked =
        car.hitWall && car.speed < 0.5 ? (state.blocked || 0) + dt : 0;
      // A stopped obstacle can leave too little room to turn onto a clear
      // passing line. Use the same ordinary reverse manoeuvre as at a rail;
      // standing still with steering alone cannot change a vehicle's heading.
      state.trafficBlocked = blocker && blocker.car.speed < 1 &&
        blocker.gap < 2 * p.halfLength + 4 && car.speed < 0.5 && desired < 1 &&
        (path.distance > p.halfWidth * 2 || state.personality?.model>=3)
          ? (state.trafficBlocked || 0) + dt : 0;
      if (state.trafficBlocked > 1.2) {
        state.retreat = 0.9;
        state.trafficBlocked = 0;
      }
      if (state.blocked > 0.2) {
        state.retreat = 0.9;
        state.blocked = 0;
      }
      if (state.retreat > 0) {
        state.retreat = Math.max(0, state.retreat - dt);
        const rear = {
          ...car,
          x: car.x - Math.cos(car.heading) * 3,
          y: car.y - Math.sin(car.heading) * 3,
        };
        const busy = others.some(
          (other) =>
            other.id !== car.id && A.VehicleContacts.overlap(rear, other, p),
        );
        // Ordinary reverse controls, including the shared delay, no reset.
        const command = { throttle: Number(busy), brake: Number(!busy), steer: -steer };
        if (options.diagnostics) state.telemetry = { reason: "reverse-recovery", speed: car.speed,
          desiredSpeed: 0, freeTarget: path.pace, pathError: path.distance,
          headingError: error, lane: state.lane, blockerGap: blocker?.gap ?? null, ...command };
        return command;
      }
      // Retain each driver's execution after the shared recovery/settling
      // limits, which otherwise made every free-lap driver converge to the
      // same 65-unit corner target. A clear straight retains the shared cap.
      if (state.personality?.model!==4 && (state.qualifying || personality) && desired >= 40 && (desired < p.maxSpeed || path.cornering) && !blocker) {
        const execution = personality || A.QualifyingDrivers.at(state.qualifying, car.s / surface.g.len);
        desired *= execution.cornerScale;
      }
      const aerodynamicHeadroom = desired >= p.maxSpeed && car.slipstream
        ? A.Slipstream.settings.maxGainKmh / (p.metersPerUnit * 3.6) : 0;
      const catchupHeadroom = desired >= p.maxSpeed ? p.maxSpeed * (car.catchup?.pace || 0) : 0;
      const command = {
        // At the shared limiter keep the pedal down like a human holding W;
        // lifting for a whole input frame needlessly loses straight-line pace.
        throttle: Number(desired >= p.maxSpeed || car.speed < desired - 0.05),
        brake: Number(
          car.longitudinalSpeed > 0.25 && car.speed > desired + aerodynamicHeadroom + catchupHeadroom + 0.8,
        ),
        steer,
      };
      if(state.personality?.model===4&&desired<p.maxSpeed){
        // Track a corner target with ordinary analogue pedals. Full-brake
        // pulses used to throw away several speed units for a tiny overshoot.
        const error=desired-car.speed,step=Math.max(1/120,Math.min(.05,dt)),
          drag=p.rollingDrag+p.aeroDrag*car.longitudinalSpeed**2;
        command.throttle=clamp((error/step+drag)/p.acceleration,0,1);
        command.brake=car.longitudinalSpeed>.25?clamp((-error/step-drag)/p.braking,0,1):0;
        if(command.brake>0)command.throttle=0;
      }
      if (options.diagnostics) state.telemetry = { reason, speed: car.speed,
        desiredSpeed: desired, freeTarget: path.pace, pathError: path.distance,
        headingError: error, lane: state.lane, blockerGap: blocker?.gap ?? null,
        ...(personality ? {driverId:state.personality.id,tactic:state.defending?'defend':state.attacking?'attack':'line'} : {}),
        ...(state.personality?.model===4?{executionScale:personality.cornerScale,executionWave:personality.executionWave,executionError:personality.executionError,brakeLead:personality.brakeLead}:{}),...command };
      return command;
    }
    // Build every racing/passing profile before the countdown. Input updates
    // must never pay the path-planning cost during a race.
    for (const lane of [-passingOffset, -6, 0, 6, passingOffset]) plan(lane);
    return Object.freeze({ memory, input, prepare,
      diagnostics: (state) => state.telemetry ? { ...state.telemetry } : null });
  }
  A.Opponents = Object.freeze({ create });
})();
