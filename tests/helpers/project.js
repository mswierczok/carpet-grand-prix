import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export const ROOT = new URL("../../", import.meta.url);
export const plain = value => JSON.parse(JSON.stringify(value));
export const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const historicalMaster = JSON.parse(readFileSync(new URL("src/data/historical/master.json", ROOT), "utf8"));
export const historicalTracks = JSON.parse(readFileSync(new URL("src/data/historical/tracks.json", ROOT), "utf8"));
export const historicalInvariants = JSON.parse(readFileSync(new URL("tests/fixtures/historical-invariants.json", ROOT), "utf8"));
