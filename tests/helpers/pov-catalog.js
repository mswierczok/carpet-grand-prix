export const povIds = [
  "bahrain",
  "luxembourg",
  "canada",
  "france",
  "switzerland",
  "portugal",
  "india",
  "brazil",
  "south-africa",
  "korea",
  "usa",
  "belgium",
  "sweden",
  "germany",
  "japan",
  "china",
  "russia",
  "australia",
  "england",
  "italy",
  "hungary",
  "abu-dhabi",
];
const group = process.env.CGP_POV_TEST_GROUP;
if (group !== undefined && !/^[0-3]$/.test(group))
  throw Error("Ungültige POV-Testgruppe.");
export const newPovIds = povIds
  .slice(4)
  .filter((_, i) => group === undefined || i % 4 === Number(group));
