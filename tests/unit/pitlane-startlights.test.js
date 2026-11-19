import { it, expect } from "vitest";
import { loadArcade } from "../helpers/arcade.js";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
const base = "1d94d8f8c8433e891b4f38686d046ae6af2a80e5";
it("erreicht in der Boxengasse 80 km/h ohne Randdrag; Aufholhilfe und Windschatten umgehen das Limit nicht", () => {
  const {api} = loadArcade({race:true}), surface = api.Surface.create(api.TrackCatalog.get("bahrain")), p=api.Physics.parameters;
  for (const context of [null,{strength:1,catchup:.012}]) {
    let car={...api.Physics.spawn(surface),x:650,y:145,heading:0,s:surface.project({x:650,y:145}).s};
    expect(api.PitLane.contains(surface,car)).toBe(true);
    for(let i=0;i<190;i++) car=api.Physics.step(car,{throttle:1,brake:0,steer:0},surface,p,1/120,context);
    expect(car.speed*p.metersPerUnit*3.6).toBeCloseTo(80,8);
    expect(car.offroad).toBe(false); expect(car.hitWall).toBe(false);
    expect(car.x).toBeGreaterThan(710);
  }
});
it("bremst bei zu schneller Einfahrt physikalisch und lässt Rückwärtsfahren zu",()=>{
  const {api}=loadArcade({race:true}),surface=api.Surface.create(api.TrackCatalog.get("bahrain")),p=api.Physics.parameters;
  let car={...api.Physics.spawn(surface),x:650,y:145,heading:0,vx:110,vy:0,speed:110,longitudinalSpeed:110,s:surface.project({x:650,y:145}).s};
  const next=api.Physics.step(car,{throttle:1,brake:0,steer:0},surface,p);
  expect(next.speed).toBeLessThan(110); expect(next.speed).toBeGreaterThan(108);
  expect(next.x).toBeGreaterThan(car.x); expect(next.x-car.x).toBeLessThan(110/120);
  for(let i=0;i<60;i++) car=api.Physics.step(car,{throttle:1,brake:0,steer:0},surface,p);
  expect(car.speed*p.metersPerUnit*3.6).toBeCloseTo(80,8);
  car={...car,vx:0,vy:0,speed:0,longitudinalSpeed:0};
  for(let i=0;i<80;i++) car=api.Physics.step(car,{throttle:0,brake:1,steer:0},surface,p);
  expect(car.longitudinalSpeed).toBeLessThan(-1);
});
it("lässt Hauptstrecke, dunklen Rand und sämtliche anderen Strecken physikalisch unverändert",()=>{
  const {api}=loadArcade({race:true}),old={CGPArcade:{...api}};
  for(const file of ['physics','bridge-physics','slipstream','catchup']) runInNewContext(execFileSync('git',['show',`${base}:src/racing/${file}.js`],{encoding:'utf8'}),old);
  for(const id of ['bahrain','france','russia']) {
    const surface=api.Surface.create(api.TrackCatalog.get(id));
    for(const offset of [0,surface.roadRadius+2]){
      let a=api.Physics.spawn(surface,-200),b=a;
      const pose=surface.at(-200,offset); a=b={...a,x:pose.x,y:pose.y};
      expect(api.PitLane.contains(surface,a)).toBe(false);
      for(let i=0;i<120;i++){
        const input={throttle:1,brake:0,steer:.03};
        a=api.Physics.step(a,input,surface); b=old.CGPArcade.Physics.step(b,input,surface);
        expect(a).toEqual(b);
      }
    }
  }
});
it("zeigt fünf aufeinanderfolgende Rotlichter, hält alle Fahrer bis Grün fest und erhält Pausen/Spielstände",()=>{
  const {api}=loadArcade({race:true}),race=api.RaceSession.create(api.TrackCatalog.get('bahrain')),
    input={throttle:1,brake:0,steer:0},poses=race.snapshot().entries.map(e=>e.car);
  expect(race.snapshot().race.startLights).toEqual({red:0,green:false}); race.pause(false);
  expect(race.snapshot().race.startLights.red).toBe(1);
  for(let count=2;count<=5;count++){
    for(let i=0;i<18;i++) race.advance(input,1/30);
    expect(race.snapshot().race.startLights).toEqual({red:count,green:false});
    expect(race.snapshot().entries.map(e=>e.car)).toEqual(poses);
  }
  race.pause(); const frozen=race.snapshot().race.startLights;
  race.advance(input,.2); expect(race.snapshot().race.startLights).toEqual(frozen);
  const saved=race.exportState(),restored=api.RaceSession.restore(saved);
  expect(restored.snapshot().race.startLights).toEqual(frozen);
  expect(saved.state).not.toHaveProperty('startLights'); race.pause(false);
  for(let i=0;i<18;i++)race.advance(input,1/30);
  expect(race.snapshot().race.phase).toBe('racing');
  expect(race.snapshot().race.startLights).toEqual({red:0,green:true});
  race.advance(input,1/30); expect(race.snapshot().car.speed).toBeGreaterThan(0);
});
