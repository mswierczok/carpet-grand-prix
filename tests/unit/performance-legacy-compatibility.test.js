import { it,expect } from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadArcade} from '../helpers/arcade.js';
import {ROOT} from '../helpers/project.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/vehicle-performance-legacy-v1.json',import.meta.url)));
it('liest einen nativ gewonnenen alten Vier-Rennen-Run samt unveränderten 13er-Archiven',()=>{
  const {api:A}=loadArcade({race:true}),old=JSON.parse(readFileSync(new URL('../fixtures/vehicle-performance-legacy-won-run.json',import.meta.url)));
  expect(old.sourceCommit).toBe(fixture.sourceCommit);const before=JSON.stringify(old.save),run=A.RunStore.inspect(before).active;
  expect(run.status).toBe('won');expect(run.campaign.completed).toHaveLength(4);expect(run.campaign.completed.every(r=>r.order.length===13&&r.qualifying.length===13&&r.order.find(x=>x.teamId==='t13').position===1)).toBe(true);
  expect(JSON.stringify(old.save)).toBe(before);expect(run.campaign.weekend.config.performance).toBeUndefined();
});
it('belegt die unveränderte PR55-Herkunft der alten Renn- und Zwei-Runden-Qualifying-Checkpoints',()=>{
  expect(fixture.sourceCommit).toBe('b4a797c7b9b390243db6b72213e99fffb081e876');
  for(const [file,hash] of Object.entries(fixture.hashes))expect(createHash('sha256').update(execFileSync('git',['show',fixture.sourceCommit+':src/'+file],{cwd:ROOT})).digest('hex')).toBe(hash);
});
it('setzt ein begonnenes altes Rennen mit exakt den bisherigen uniformen Parametern und Ergebnissen fort',()=>{
  const {api:A}=loadArcade({race:true}),race=A.RaceWeekend.restore(fixture.raceBefore);
  expect(race.parameters).toBe(A.Physics.parameters);expect(race.exportState()).toEqual(fixture.raceBefore);
  expect(()=>A.RaceSession.create(A.TrackCatalog.get('bahrain'),{...fixture.raceBefore.session.config,performance:A.VehiclePerformance.campaign,restore:fixture.raceBefore.session})).toThrow();
  race.pause(false);for(let i=0;i<60;i++)race.advance({throttle:1,brake:0,steer:0},1/30);race.pause(true);
  expect(race.exportState()).toEqual(fixture.raceAfter);
});
it('beendet ein altes laufendes Qualifying mit voller Auslaufrunde und ZWEI schnellen Runden bytegleich zur PR55-Engine',()=>{
  const {api:A}=loadArcade({race:true}),weekend=A.RaceWeekend.restore(fixture.qualifyingBefore),
    driver=A.Opponents.create(weekend.surface,weekend.parameters,{difficulty:'expert'}),memory=structuredClone(fixture.driverMemory);
  expect(weekend.snapshot().qualifying.timedLaps).toBe(2);expect(weekend.snapshot().qualifying.format).toBeUndefined();
  expect(weekend.exportState()).toEqual(fixture.qualifyingBefore);
  weekend.pause(false);
  for(let frame=0;frame<180*30&&!weekend.snapshot().qualifying.finished;frame++){
    const s=weekend.snapshot(),cars=driver.prepare([{...s.car,id:'t13'}]);weekend.advance(driver.input(cars[0],cars,memory),1/30);
  }
  weekend.pause(true);expect(weekend.exportState()).toEqual(fixture.qualifyingAfter);
  expect(weekend.acceptQualifying()).toBe(true);expect(weekend.snapshot().qualifyingResult.every(e=>e.laps.length===2&&e.completed===3)).toBe(true);
  expect(weekend.parameters).toBe(A.Physics.parameters);expect(weekend.exportState().config).not.toHaveProperty('performance');
},120000);
