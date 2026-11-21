// Compatibility command: the primary offline entry now opens the current game.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createPOVMenuOffline, writeArcadeOffline } from "./build-arcade-offline.js";
export const createOfflineHTML = createPOVMenuOffline;
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeArcadeOffline();
}
