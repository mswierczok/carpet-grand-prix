(() => {
  "use strict";
  const A = globalThis.CGPArcade, clamp = (v,a,b)=>Math.max(a,Math.min(b,v)),
    attributes = ['qualifyingPace','racePace','consistency','racecraft','aggression','defensiveSkill','precision','adaptability','potential'];
  function hash(text) { let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0; }
  function get(id) {
    const p=A.DriverAttributes.profiles[id];
    if(!p || attributes.some(k=>!Number.isInteger(p[k])||p[k]<0||p[k]>100))throw Error('Unbekanntes Fahrerprofil. Der Spielstand bleibt erhalten.');
    return p;
  }
  function validate(value) {
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||![1,2,3].includes(value.version)||!Number.isInteger(value.seed)||value.seed<0||value.seed>4294967295)throw Error('Unbekanntes KI-Fahrermodell.');
    const lineup=value.lineup, teams=CGPArcadeData.roster.teams;
    if(!lineup||Object.keys(lineup).length!==13||new Set(Object.values(lineup)).size!==13||teams.some(t=>!A.CampaignConfig.pools[t.id].includes(lineup[t.id])))throw Error('Ungültige KI-Fahrerzuordnung.');
    for(const id of Object.values(lineup))get(id);
    return Object.freeze({version:value.version,seed:value.seed,lineup:Object.freeze({...lineup})});
  }
  const create=(lineup,seed)=>validate({version:3,seed,lineup});
  function decision(memory,progress,trackId) {
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
  A.DriverPersonalities=Object.freeze({version:3,attributes,get,hash,validate,create,decision});
})();
