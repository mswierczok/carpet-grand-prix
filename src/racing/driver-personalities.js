(() => {
  "use strict";
  const A = globalThis.CGPArcade, executionCache=new WeakMap(),clamp = (v,a,b)=>Math.max(a,Math.min(b,v)),
    attributes = ['qualifyingPace','racePace','consistency','racecraft','aggression','defensiveSkill','precision','adaptability','potential'];
  function hash(text) { let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0; }
  function get(id) {
    const p=A.DriverAttributes.profiles[id];
    if(!p || attributes.some(k=>!Number.isInteger(p[k])||p[k]<0||p[k]>100))throw Error('Unbekanntes Fahrerprofil. Der Spielstand bleibt erhalten.');
    return p;
  }
  function validate(value) {
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||![1,2,3,4].includes(value.version)||!Number.isInteger(value.seed)||value.seed<0||value.seed>4294967295)throw Error('Unbekanntes KI-Fahrermodell.');
    const lineup=value.lineup, teams=CGPArcadeData.roster.teams;
    if(!lineup||Object.keys(lineup).length!==13||new Set(Object.values(lineup)).size!==13||teams.some(t=>!A.CampaignConfig.pools[t.id].includes(lineup[t.id])))throw Error('Ungültige KI-Fahrerzuordnung.');
    for(const id of Object.values(lineup))get(id);
    return Object.freeze({version:value.version,seed:value.seed,lineup:Object.freeze({...lineup})});
  }
  const create=(lineup,seed)=>validate({version:4,seed,lineup});
  // Saved v1/v2/v3 decisions below remain literal. V4 uses signed, smooth
  // lap/section execution rather than charging low consistency a constant loss.
  function executionV4(memory,progress,trackId) {
    const p=get(memory.id),qualifying=memory.mode==='qualifying',pace=qualifying?p.qualifyingPace:p.racePace,
      key='execution-v4:'+memory.seed+':'+memory.id+':'+trackId+':'+memory.mode,
      random=label=>{let h=hash(key+':'+label);h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return((h^(h>>>16))>>>0)/4294967295*2-1;},
      noise=(label,x)=>{const i=Math.floor(x),f=x-i,t=f*f*(3-2*f),
        a=random(label+':'+i),b=random(label+':'+(i+1));return a+(b-a)*t;},
      wave=.6*noise('lap',progress)+.4*noise('section',progress*11),
      amplitude=qualifying?(1-p.consistency/100)**1.5*.025:
        .006*(1-p.consistency/100)+.20*(Math.max(0,85-p.consistency)/85)**.65,
      section=progress*11,part=section-Math.floor(section),chance=.18*(1-p.consistency/100)**2,
      draw=(random('error:'+Math.floor(section))+1)/2,
      mistake=!qualifying&&draw<chance?(1-draw/chance)*Math.sin(Math.PI*part)**2:0,
      identity=A.CampaignConfig.getDriver(memory.id),track=A.CampaignConfig.tracks.find(t=>t.id===trackId),
      fit=track?identity.affinity.reduce((n,v,i)=>n+v*track.affinity[i],0)/track.affinity.reduce((a,b)=>a+b,0)/3:1,
      adaptation=(1-fit)*(1-p.adaptability/100)*.004;
    return {brakeLead:clamp((100-p.precision)*.012+(100-pace)*.004-wave*amplitude*120+mistake*4,-8,8),
      cornerScale:clamp((qualifying?1-(100-pace)*.00016:1+(pace-65)*.00065)-adaptation+wave*amplitude-.055*mistake,.90,1.055),executionWave:wave,executionError:mistake,
      lineOffset:noise('line',progress*17)*(1-p.precision/100)*.65,
      attackDistance:55+p.racecraft*.26+p.aggression*.18,
      closingThreshold:3.5-p.aggression*.025,maneuverHold:2.3-p.racecraft*.009,
      defenseDistance:15+p.defensiveSkill*.38,reactionGap:2+(100-p.racecraft)*.012,
      safeRear:-16-(100-p.racecraft)*.08,smartPassing:p.racecraft>=60,risk:p.aggression/100,profile:p};
  }
  function decision(memory,progress,trackId) {
    if(memory.model===4){const old=executionCache.get(memory);
      if(old&&old.progress===progress&&old.trackId===trackId&&old.id===memory.id&&old.seed===memory.seed&&old.mode===memory.mode)return old.value;
      const value=Object.freeze(executionV4(memory,progress,trackId));executionCache.set(memory,{progress,trackId,id:memory.id,seed:memory.seed,mode:memory.mode,value});return value;}
    const p=get(memory.id), phase=hash(memory.id+':'+memory.seed)/4294967296*Math.PI*2,
      qualifying=memory.mode==='qualifying', pace=qualifying?p.qualifyingPace:p.racePace,
      // Two smooth, bounded section rhythms. Progress includes completed laps;
      // the seed is saved, no runtime random calls or changing vehicle limits.
      wave=.65*Math.sin(progress*2*Math.PI*1.37+phase)+.35*Math.sin(progress*2*Math.PI*.61+phase*1.7),
      variance=(1-p.consistency/100)*(qualifying?.025:.065),
      identity=A.CampaignConfig.getDriver(memory.id), track=A.CampaignConfig.tracks.find(t=>t.id===trackId),
      fit=track?identity.affinity.reduce((n,v,i)=>n+v*track.affinity[i],0)/track.affinity.reduce((a,b)=>a+b,0)/3:1,
      adaptation=(1-fit)*(1-p.adaptability/100)*.012,
      loss=clamp(.002+(100-pace)*.0007+adaptation+variance*(.5+.5*wave),.002,.105);
    return {brakeLead:(100-p.precision)*.045+(100-pace)*.018+wave*variance*12,
      cornerScale:1-loss,
      lineOffset:Math.sin(progress*2*Math.PI*4.17+phase)*(1-p.precision/100)*1.1,
      attackDistance:55+p.racecraft*.26+p.aggression*.18,
      closingThreshold:3.5-p.aggression*.025,
      maneuverHold:2.3-p.racecraft*.009,
      defenseDistance:15+p.defensiveSkill*.38,
      reactionGap:2+(100-p.racecraft)*.012,
      safeRear:-16-(100-p.racecraft)*.08,
      smartPassing:p.racecraft>=60,
      risk:p.aggression/100,
      profile:p};
  }
  A.DriverPersonalities=Object.freeze({version:4,attributes,get,hash,validate,create,decision});
})();
