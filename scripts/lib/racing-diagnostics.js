// Development-only observer. Never changes inputs, timing, poses or standings.
export function racingDiagnostics(A, surface) {
  const p = A.Physics.parameters, clear = p.halfLength * 2 + 3,
    proximity = 30 / p.metersPerUnit, gaps = A.RaceGaps.create(),
    rows = new Map(), pairs = new Map(), passes = [], changes = [], samples = [];
  let prior = null, nextSample = 0;
  function observe(s) {
    if (!['racing', 'finishing', 'finished'].includes(s.race.phase)) return;
    const dt = prior ? Math.max(0, s.race.elapsed - prior.race.elapsed) : 0;
    const active = s.entries.filter(e => e.finishTime === null);
    for (const e of s.entries) {
      if (!rows.has(e.id)) rows.set(e.id, { laps: [], seconds: 0, aloneSeconds: 0,
        lateSeconds: 0, lateAloneSeconds: 0, wallFrames: 0, offroadFrames: 0,
        attackSeconds: 0, defenseSeconds: 0, attackEpisodes: 0, defenseEpisodes: 0 });
      const r = rows.get(e.id), before = prior?.entries.find(x => x.id === e.id);
      if (e.timing.completed > (before?.timing.completed || 0)) r.laps.push(e.timing.lastLap.seconds);
      if (e.finishTime !== null || !before) continue;
      const close = active.some(o => o.id !== e.id &&
        Math.abs(surface.gap(e.car.s, o.car.s)) <= proximity &&
        Math.abs((o.car.elevation || 0) - (e.car.elevation || 0)) < 5);
      r.seconds += dt; if (!close) r.aloneSeconds += dt;
      if (e.timing.completed >= 3) { r.lateSeconds += dt; if (!close) r.lateAloneSeconds += dt; }
      r.wallFrames += Number(e.car.hitWall); r.offroadFrames += Number(e.car.offroad);
      for (const [tactic, key] of [['attack', 'attack'], ['defend', 'defense']]) {
        if (e.telemetry?.tactic === tactic) {
          r[key + 'Seconds'] += dt;
          if (before.telemetry?.tactic !== tactic) r[key + 'Episodes']++;
        }
      }
      gaps.observe(e.id, e.progress, s.race.elapsed);
    }
    if (s.race.elapsed >= 8) for (let i=0;i<active.length;i++) for (let k=i+1;k<active.length;k++) {
      const a=active[i], b=active[k];
      if (!a.timing.started || !b.timing.started) continue;
      const distance=a.progress-b.progress, key=[a.id,b.id].sort().join(':');
      // Exclude lapping and swaps among already finished cars. Require the
      // complete body to clear, not a momentary nose crossing in a corner.
      if (Math.abs(distance)>surface.g.len*.5 || Math.abs(distance)<clear) continue;
      const leading=distance>0?a:b, following=distance>0?b:a, old=pairs.get(key);
      if (old && old!==leading.id) passes.push({time:s.race.elapsed, passer:leading.id, passed:following.id});
      pairs.set(key,leading.id);
    }
    if (prior && s.race.elapsed>=8) for (const e of active) {
      const before=prior.entries.find(x=>x.id===e.id);
      if(before?.position!==e.position) changes.push({time:s.race.elapsed,id:e.id,from:before.position,to:e.position});
    }
    if(s.race.elapsed>=nextSample){
      nextSample=s.race.elapsed+2;
      const ordered=[...active].sort((a,b)=>b.progress-a.progress);
      samples.push({time:s.race.elapsed,neighbors:ordered.slice(1).map((e,i)=>{
        const front=ordered[i],at=gaps.crossing(front.id,e.progress);
        return {front:front.id,rear:e.id,meters:(front.progress-e.progress)*p.metersPerUnit,seconds:at===null?null:s.race.elapsed-at};
      })});
    }
    prior=s;
  }
  function result(){return {proximityMeters:30,clearanceUnits:clear,passes,changes,samples,
    drivers:Object.fromEntries([...rows].map(([id,r])=>{const mean=r.laps.reduce((a,b)=>a+b,0)/(r.laps.length||1);
      return [id,{...r,lapMean:mean,lapSD:Math.sqrt(r.laps.reduce((v,t)=>v+(t-mean)**2,0)/(r.laps.length||1)),aloneFraction:r.seconds?r.aloneSeconds/r.seconds:0,lateAloneFraction:r.lateSeconds?r.lateAloneSeconds/r.lateSeconds:null}];}))};}
  return {observe,result};
}
