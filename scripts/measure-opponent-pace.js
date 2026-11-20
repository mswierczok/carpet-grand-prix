import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { measureField, paceBaseline } from "../tests/helpers/opponent-pace.js";

const root = new URL("../", import.meta.url),
  hash = (path) =>
    createHash("sha256")
      .update(readFileSync(new URL(path, root)))
      .digest("hex");
const result = {
  baseline: paceBaseline,
  method:
    "Three real laps with 12 AI opponents. The same published feedback controller drives the player from P13 in both runs. Normal Physics/RaceSession, 120 Hz physics, 30 Hz input; no pose, timing or contact writes. Not a human-skill or FPS benchmark.",
  userReportedSeconds: { firstFinish: 28.5, secondFinish: 53, raceFinish: 77 },
  physicsSHA256: hash("src/racing/physics.js"),
  ropeContactSHA256: hash("src/racing/rope-contact.js"),
  opponentsSHA256: hash("src/racing/opponents.js"),
  lineSHA256: hash("src/racing/opponent-line.js"),
  before: measureField(true),
  after: measureField(),
};
mkdirSync(new URL("previews/opponent-pace/", root), { recursive: true });
writeFileSync(
  new URL("previews/opponent-pace/field-comparison.json", root),
  JSON.stringify(result, null, 2) + "\n",
);
for (const key of ["before", "after"])
  console.log(
    key,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(result[key]).filter(([k]) => k !== "entries"),
      ),
    ),
  );
