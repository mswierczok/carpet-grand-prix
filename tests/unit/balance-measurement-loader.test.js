import{it,expect}from'vitest';
import{execFileSync}from'node:child_process';
it('verwendet für schnelle Prozessmessungen dieselbe Engine und exakt die nativen V1/V2-Referenzfortsetzungen',()=>{
 const program=`import{readFileSync}from'node:fs';import assert from'node:assert/strict';import{loadArcade}from'./tests/helpers/arcade.js';
 const{api:A}=loadArcade({race:true,processRealm:true});let checked=0;
 for(const file of['driver-pr56-legacy','driver-v1-checkpoints','driver-v2-checkpoints','driver-v3-checkpoints','vehicle-balance-v2-checkpoints']){
  const f=JSON.parse(readFileSync('tests/fixtures/'+file+'.json','utf8'));
  for(const c of f.cases){const w=A.RaceWeekend.restore(c.before);assert.equal(JSON.stringify(w.exportState()),JSON.stringify(c.before));w.pause(false);for(let i=0;i<60;i++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);assert.equal(JSON.stringify(w.exportState()),JSON.stringify(c.after));checked++;}
 }
 assert.throws(()=>Math.random());assert.throws(()=>loadArcade({race:true,processRealm:true}));process.stdout.write(String(checked));`;
 expect(execFileSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',maxBuffer:1024*1024})).toBe('10');
});
