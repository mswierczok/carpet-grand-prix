import { it, expect } from "vitest";
import { historicalInvariants } from "../helpers/project.js";
import { loadArcade } from "../helpers/arcade.js";
function result(data, player = "t01") {
  return { race: { phase: "finished", finished: 13, playerTeam: player,
    standings: data.roster.teams.map((t,i) => ({ id: t.id, finishTime: 30+i, position: i+1 })) } };
}
function season(api, data, game) {
  for (let i = 0; i < 22; i++) {
    const before = game, next = api.POVCareer.record(game, result(data));
    expect(next.career.results).toHaveLength(i+1);
    expect(api.POVCareer.record(next, result(data))).toBeNull();
    expect(before.career.results).toHaveLength(i);
    game = i < 21 ? api.POVCareer.nextRound(next) : next;
  }
  return game;
}
it("wertet 22 Strecken genau einmal nach den bestehenden Team-Punkten und Prämien aus und beginnt eine neue Saison", () => {
  const { api, data } = loadArcade({ race: true });
  let game = api.POVCareer.create({ mode: "championship", teamId: "t01" });
  game = season(api,data,game);
  expect(api.POVCareer.standings(game)[0].points).toBe(550);
  expect(game.career.teams[0].credits).toBe(248);
  expect(game.career.teams[0].research).toBe(128);
  expect(game.career.results.map(r => r.trackId)).toEqual(api.TrackCatalog.tracks.map(t => t.id));
  expect(api.POVCareer.nextRound(game)).toBeNull();
  const next = api.POVCareer.nextSeason(game);
  expect(next.career.season).toBe(2); expect(next.career.history).toHaveLength(1);
  expect(next.trackId).toBe("bahrain"); expect(next.career.results).toHaveLength(0);
  expect(next).not.toHaveProperty("drivers");
  expect(api.POVCareer.validate(JSON.parse(JSON.stringify(next)))).toEqual(next);
  const sortedJSON = JSON.stringify(next, (_, value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b))) : value);
  expect(api.POVCareer.validate(JSON.parse(sortedJSON))).toEqual(next);
});
it("übernimmt Entwicklungskosten, F&E und Halbjahreslimits ohne Änderung der POV-Fahrphysik", () => {
  const { api, data } = loadArcade({ race: true }), parameters = { ...api.Physics.parameters };
  let game = api.POVCareer.create({ mode: "championship", teamId: "t01" });
  expect(api.POVWorkshop.buy(game,"power")).toBeNull();
  game = api.POVCareer.nextSeason(season(api,data,game));
  const before = JSON.stringify(game);
  const study = api.POVWorkshop.buyStudy(game);
  expect(study.career.teams[0].research).toBe(13);
  expect(study.career.teams[0].parts.aero).toBeCloseTo(87.85);
  expect(api.POVWorkshop.buyStudy(study)).toBeNull();
  const one = api.POVWorkshop.buy(game,"power"), two = api.POVWorkshop.buy(one,"handling");
  expect(one.career.teams[0].parts.power).toBeCloseTo(89.8);
  expect(two.career.teams[0].credits).toBe(101); expect(two.career.teams[0].research).toBe(32);
  expect(api.POVWorkshop.buy(two,"aero")).toBeNull();
  expect(JSON.stringify(game)).toBe(before);
  expect(api.Physics.parameters).toEqual(parameters);
  expect(api.POVWorkshop.drivingEffectsActive).toBe(false);
});
it("schreibt POV-Spielstände atomar und bewahrt klassische Daten sowie beschädigte und neuere Stände", () => {
  const { api } = loadArcade({ race: true }), store = api.POVGameStore,
    values = new Map([["carpet_gp_v072", "classic-save"]]),
    storage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)) },
    game = api.POVCareer.create({ teamId: "t01" });
  const before = [...values]; expect(store.load(storage).status).toBe("empty"); expect([...values]).toEqual(before);
  expect(store.save(game,{ storage, now: 100 })).toBe(true);
  const good = storage.getItem(store.key);
  expect(store.load(storage).game.savedAt).toBe(100);
  expect(() => store.importJSON('{"version":1}',{ storage })).toThrow();
  expect(storage.getItem(store.key)).toBe(good);
  for (const raw of ['{broken', '{"version":2}']) {
    storage.setItem(store.key,raw); expect(store.load(storage).status).toBe("invalid");
    expect(store.save(game,{ storage })).toBe(false); expect(storage.getItem(store.key)).toBe(raw);
  }
  storage.setItem(store.key,good);
  expect(store.save(game,{ storage: { getItem: storage.getItem, setItem() { throw Error("Quota"); } } })).toBe(false);
  expect(storage.getItem(store.key)).toBe(good); expect(storage.getItem("carpet_gp_v072")).toBe("classic-save");
});

it("verwendet genau die vorhandenen Kosten- und Entwicklungsformeln des ursprünglichen Spiels", () => {
  const { api } = loadArcade({ race: true });
  for (const [n, cost] of historicalInvariants.workshop.costs.entries()) expect(api.POVWorkshop.cost(n)).toEqual(cost);
  for (const { value, gain } of historicalInvariants.workshop.gains) expect(api.POVWorkshop.gain(value)).toBe(gain);
});
