import { it, expect } from "vitest";
import { measureDriver } from "../../scripts/measure-ai-balance.js";

it("kalibriert die vier Bahrain-Stufen anhand einer eingefrorenen Tastaturreferenz ohne andere Fahrzeuggrenzen", () => {
  const reference = measureDriver("bahrain", "keyboard-reference", { bins: false }),
    runs = ["beginner", "normal", "hard", "expert"].map((id) => measureDriver("bahrain", id, { bins: false })),
    change = (run) => (run.referenceSeconds / reference.referenceSeconds - 1) * 100;
  // Targets are approximate. Three laps with 30Hz binary commands have a
  // finite time resolution; allow 0.2 percentage points around the bands.
  expect(reference.clean).toBe(true);
  expect(change(runs[0])).toBeGreaterThanOrEqual(5.8);
  expect(change(runs[0])).toBeLessThanOrEqual(9.2);
  expect(change(runs[1])).toBeGreaterThanOrEqual(1.8);
  expect(change(runs[1])).toBeLessThanOrEqual(4.2);
  expect(Math.abs(change(runs[2]))).toBeLessThanOrEqual(1.2);
  expect(change(runs[3])).toBeGreaterThanOrEqual(-3.2);
  expect(change(runs[3])).toBeLessThanOrEqual(-1.8);
  expect(runs.map((r) => r.referenceSeconds)).toEqual(
    runs.map((r) => r.referenceSeconds).sort((a, b) => b - a));
  for (const run of runs) {
    expect(run.clean).toBe(true);
    expect(run.wallSteps).toBe(0);
    expect(run.peakKmh).toBeCloseTo(118.8, 6);
    expect(run.lapSeconds).toHaveLength(4);
    expect(run.sectors.every((s) => s.kmh <= 118.800001)).toBe(true);
  }
}, 120000);
