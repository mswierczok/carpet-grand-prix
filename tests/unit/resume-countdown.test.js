import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

it("zeigt bei leicht älteren RAF-Zeitstempeln keine 4 und setzt nach Abbruch oder Ablauf nie doppelt fort", () => {
  const overlay = { hidden: true },
    number = { textContent: "" },
    classes = new Set(),
    root = {
      querySelector: (id) => (id === "#resumeCountdown" ? overlay : number),
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
      },
    },
    scope = { CGPArcade: {} };
  runInNewContext(readFileSync("src/ui/resume-countdown.js", "utf8"), scope);
  let resumed = 0;
  const timer = scope.CGPArcade.ResumeCountdown.attach(root, {
    onResume: () => resumed++,
  });
  timer.start(100.5);
  timer.tick(100); // RAF timestamp can precede the event's performance.now().
  expect(number.textContent).toBe("3");
  timer.tick(1100.5);
  expect(number.textContent).toBe("2");
  timer.tick(2100.5);
  expect(number.textContent).toBe("1");
  expect(resumed).toBe(0);
  expect(timer.tick(3100.5)).toBe(true);
  timer.tick(9000);
  expect(resumed).toBe(1);
  expect(overlay.hidden).toBe(true);
  expect(classes.has("is-resuming")).toBe(false);
  timer.start(10000);
  timer.cancel();
  timer.tick(14000);
  expect(resumed).toBe(1);
});
