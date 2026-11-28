import {it,expect} from 'vitest';
import {loadArcade} from '../helpers/arcade.js';
it('plant auf allen 22 Strecken eine gemeinsame sichere stehende Anfahrt ohne Pitlane- oder Seildurchdringung',()=>{
  const {api:A,data}=loadArcade({race:true}),parameters=Object.fromEntries(data.roster.teams.map(t=>[t.id,A.VehiclePerformance.get(t.id,A.VehiclePerformance.campaign).parameters]));
  for(const track of A.TrackCatalog.tracks){const surface=A.Surface.create(track),approach=A.QualifyingApproach.select(surface,parameters),car=A.Physics.spawn(surface,approach.s);
    expect(approach.s).toBeLessThanOrEqual(-80);expect(approach.distance).toBeGreaterThanOrEqual(200);
    expect(car.speed).toBe(0);expect(car.vx).toBe(0);expect(car.vy).toBe(0);
    expect(surface.boundary.blocksFootprint(A.VehicleContacts.footprint(car,parameters.t13),car.s)).toBe(false);
    expect(A.PitLane.contains(surface,car)).toBe(false);
  }
});
it('startet die einzige Zeit erst an der Linie, beendet sie beim zweiten Überqueren und überlebt Reload ohne zweite versteckte Runde',()=>{
  const {api:A}=loadArcade({race:true}),weekend=A.QualifyingSession.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',performance:A.VehiclePerformance.campaign,difficulty:'expert'});
  weekend.pause(false);expect(weekend.snapshot().car.speed).toBe(0);
  expect(weekend.snapshot().car.s).toBeLessThan(-100);
  const display=A.RacePresentation.create({track:()=>weekend.surface});expect(display.update(weekend.snapshot()).lap).toBe('ANFAHRT');
  const driver=A.Opponents.create(weekend.surface,weekend.parameters,{difficulty:'expert'}),memory=driver.memory(12);
  let first=false,restored=null,finished=false;
  for(let frame=0;frame<180*30;frame++){
    const s=weekend.snapshot(),cars=driver.prepare([{...s.car,id:'t13'}]),input=driver.input(cars[0],cars,memory);
    weekend.advance(input,1/30);if(restored)restored.advance(input,1/30);
    const next=weekend.snapshot();
    if(!first&&next.timing.started){first=true;expect(next.timing.completed).toBe(0);expect(next.qualifying.player.bestLap).toBeNull();expect(next.car.speed*weekend.parameters.metersPerUnit*3.6).toBeGreaterThan(95);
      expect(display.update(next).lap).toBe('SCHNELLE RUNDE 1/1');weekend.pause(true);restored=A.QualifyingSession.restore(weekend.exportState());expect(restored.snapshot()).toEqual(weekend.snapshot());weekend.pause(false);restored.pause(false);
    }
    if(next.qualifying.finished){finished=true;weekend.pause(true);restored.pause(true);break;}
  }
  expect(first&&finished).toBe(true);expect(weekend.exportState()).toEqual(restored.exportState());
  const q=weekend.snapshot();expect(q.qualifying.format).toBe('flying-one-v1');expect(q.qualifying.timedLaps).toBe(1);expect(q.timing.completed).toBe(1);
  expect(display.update(q).lap).toBe('QUALIFYING ABGESCHLOSSEN');
  for(const row of q.qualifying.standings){expect(row.completed).toBe(1);expect(row.laps).toHaveLength(1);expect(row.bestLap).toBe(row.laps[0]);expect(row.bestLap).toBe(q.entries.find(e=>e.id===row.id).timing.lastLap.seconds);}
  const profiles=q.entries.map(e=>[e.id,e.performance]);
  const native=A.RaceWeekend.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',performance:A.VehiclePerformance.campaign,difficulty:'expert'});native.startQualifying();
  // Compose a valid weekend checkpoint using the ACTUAL finished native
  // qualifying session above; no times, cars or sector states are invented.
  const checkpoint=native.exportState();checkpoint.session=weekend.exportState();
  const loaded=A.RaceWeekend.restore(checkpoint);loaded.advance({},0);
  expect(loaded.snapshot().entries.map(e=>[e.id,e.performance]).sort()).toEqual(profiles.sort());
  expect(loaded.snapshot().paused).toBe(true);expect(loaded.snapshot().race.phase).toBe('grid');expect(loaded.acceptQualifying()).toBe(false);
  expect(loaded.takeTransition()).toBe(true);expect(loaded.takeTransition()).toBe(false);
  expect(A.RaceWeekend.restore(loaded.exportState()).snapshot().qualifyingResult).toEqual(loaded.snapshot().qualifyingResult);
},120000);
it('lehnt fehlende, neuere oder gemischte Formatkennungen ab und erhält die ursprüngliche Sicherung',()=>{
  const {api:A}=loadArcade({race:true}),weekend=A.RaceWeekend.create(A.TrackCatalog.get('bahrain'));
  weekend.startQualifying();const good=weekend.exportState();
  for(const change of [x=>delete x.session.format,x=>x.session.format='flying-two-v99',x=>x.session.race.config.laps=3,x=>delete x.session.race.config.qualifyingStartS,x=>x.session.race.config.qualifyingStartS=12,x=>delete x.session.race.config.performance]){
    const bad=structuredClone(good);change(bad);expect(()=>A.POVCheckpoint.weekend(bad)).toThrow();
  }
  expect(weekend.exportState()).toEqual(good);
});
