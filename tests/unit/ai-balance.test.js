import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { measureDriver } from "../../scripts/measure-ai-balance.js";
const baseline="1d94d8f8c8433e891b4f38686d046ae6af2a80e5";
function original(api) {
  for(const file of ["ai-difficulty","opponent-line"])
    runInNewContext(execFileSync("git",["show",`${baseline}:src/racing/${file}.js`],{encoding:"utf8"}),{CGPArcade:api});
}
it("bewahrt die historische Bahrain-Kalibrierung als eingefrorene Referenz", () => {
  const reference = measureDriver("bahrain", "keyboard-reference", { bins: false, historicalBahrain: true, configure:original }),
    runs = ["beginner", "normal", "hard", "expert"].map((id) => measureDriver("bahrain", id, { bins: false, historicalBahrain: true, configure:original })),
    change = (run) => (run.referenceSeconds / reference.referenceSeconds - 1) * 100;
  expect(reference.clean).toBe(true);
  expect(change(runs[0])).toBeGreaterThanOrEqual(5.8);
  expect(change(runs[0])).toBeLessThanOrEqual(9.2);
  expect(change(runs[1])).toBeGreaterThanOrEqual(1.8);
  expect(change(runs[1])).toBeLessThanOrEqual(4.2);
  expect(Math.abs(change(runs[2]))).toBeLessThanOrEqual(1.2);
  expect(change(runs[3])).toBeGreaterThanOrEqual(-3.2);
  expect(change(runs[3])).toBeLessThanOrEqual(-1.8);
  for(const run of runs)expect(run.clean).toBe(true);
}, 120000);
it("erhöht alle vier Bahrain-Stufen gegenüber dem freigegebenen Stand ohne höhere Fahrzeuggrenzen oder Seilkontakte",()=>{
  const runs=[];
  for(const mode of ["beginner","normal","hard","expert"]){
    const before=measureDriver("bahrain",mode,{bins:false,configure:original}),
      after=measureDriver("bahrain",mode,{bins:false});
    expect(after.referenceSeconds,mode).toBeLessThan(before.referenceSeconds-.05);
    expect(after.referenceSeconds,mode).toBeGreaterThan(before.referenceSeconds*.94);
    expect(after.clean,mode).toBe(true);expect(after.wallSteps).toBe(0);
    expect(after.peakKmh).toBeCloseTo(118.8,6);
    expect(after.sectors.every(s=>s.kmh<=118.800001)).toBe(true);
    runs.push(after.referenceSeconds);
  }
  expect(runs).toEqual([...runs].sort((a,b)=>b-a));
  // Human report: 31.576 s. Expert must close the former large gap through
  // a real shorter racing line, without an opponent-only speed/grip bonus.
  expect(runs[3]).toBeLessThan(32);
},240000);
