(() => {
  "use strict";
  const A = globalThis.CGPArcade, engine = "pov-checkpoint-1", signatures = new Map();
  const fail = () => { throw Error("Der POV-Spielstand ist unvollständig, beschädigt oder nicht kompatibel."); };
  const object = v => !!v && typeof v === "object" && !Array.isArray(v);
  const number = (v, min = -1e9, max = 1e9) => Number.isFinite(v) && v >= min && v <= max;
  const integer = (v, min = 0, max = 1e9) => Number.isInteger(v) && number(v, min, max);
  const need = value => { if (!value) fail(); };
  const keys = (v, allowed) => { need(object(v)); need(Object.keys(v).every(k => allowed.includes(k))); };
  const ids = () => CGPArcadeData.roster.teams.map(t => t.id);
  const copy = v => JSON.parse(JSON.stringify(v));
  const decode = v => JSON.parse(JSON.stringify(v), (_, x) => x === "~negative-infinity" ? -Infinity : x);
  function signature(trackId) {
    need(Object.hasOwn(CGPArcadeData.tracks, trackId));
    if (!signatures.has(trackId)) {
      const text = JSON.stringify([engine, CGPArcadeData.roster.sourceSHA256, CGPArcadeData.tracks[trackId]]);
      let hash = 2166136261;
      for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
      signatures.set(trackId, engine + ":" + hash.toString(16));
    }
    return signatures.get(trackId);
  }
  function config(v) {
    keys(v, ["playerTeam", "difficulty", "catchup", "slipstream", "isolated", "qualifying", "laps", "gridOrder", "diagnostics", "performance", "qualifyingFormat", "qualifyingStartS", "driving"]);
    if ("driving" in v) { A.DriverPersonalities.validate(v.driving); need(v.performance?.context==='campaign'); }
    if ("performance" in v) A.VehiclePerformance.validate(v.performance);
    if ("qualifyingFormat" in v) need(v.qualifyingFormat === "flying-one-v1");
    need(ids().includes(v.playerTeam) && ["beginner", "normal", "hard", "expert"].includes(v.difficulty));
    for (const k of ["catchup", "slipstream", "isolated", "qualifying", "diagnostics"]) need(typeof v[k] === "boolean");
    need(integer(v.laps, 1, 100));
    need(v.gridOrder === null || (Array.isArray(v.gridOrder) && v.gridOrder.length === 13 && new Set(v.gridOrder).size === 13 && v.gridOrder.every(id => ids().includes(id))));
    if (v.isolated) need(!v.catchup && !v.slipstream);
    if (v.qualifying) need(v.isolated && v.laps === (v.qualifyingFormat ? 1 : 3));
    if (v.qualifying && v.qualifyingFormat) need(number(v.qualifyingStartS, -1e6, -80));
    else need(!("qualifyingStartS" in v));
  }
  function car(v, bridge = false) {
    keys(v, ["x", "y", "heading", "vx", "vy", "s", "steering", "speed", "longitudinalSpeed", "reverseHold", "offroad", "hitWall", "hitCar", "understeer", "elevation", "pitch"]);
    for (const k of ["x", "y", "heading", "vx", "vy", "s", "steering", "speed", "longitudinalSpeed", "reverseHold", "understeer"]) need(number(v[k]));
    need(number(v.speed, 0, 1000) && number(v.reverseHold, 0) && number(v.understeer, 0));
    for (const k of ["offroad", "hitWall"]) need(typeof v[k] === "boolean");
    for (const k of ["hitCar"]) if (k in v) need(typeof v[k] === "boolean");
    for (const k of ["elevation", "pitch"]) { if (bridge) need(number(v[k])); else if (k in v) need(number(v[k])); }
  }
  function timing(v, laps) {
    keys(v, ["elapsed", "nextGate", "started", "lapStart", "completed", "lastLap", "bestLap", "invalid"]);
    need(number(v.elapsed, 0) && integer(v.nextGate, 0, 2) && integer(v.completed, 0, laps));
    need(typeof v.started === "boolean" && v.invalid === false);
    need(v.started ? number(v.lapStart, 0, v.elapsed + 1e-6) : v.lapStart === null && v.completed === 0);
    need(v.bestLap === null || number(v.bestLap, 1e-9));
    if (v.lastLap !== null) { keys(v.lastLap, ["seconds", "valid"]); need(number(v.lastLap.seconds, 1e-9) && v.lastLap.valid === true); }
    need((v.completed === 0) === (v.lastLap === null) && (v.completed === 0) === (v.bestLap === null));
    if (!v.started) need(v.nextGate === 0);
  }
  function command(v) { keys(v, ["throttle", "brake", "steer"]); need(number(v.throttle, 0, 1) && number(v.brake, 0, 1) && number(v.steer, -1, 1)); }
  function driver(v, qualifying, personality) {
    keys(v, ["lane", "hold", "index", "defending", "blocked", "trafficBlocked", "retreat", "qualifying", "telemetry", "personality", "defenseLock", "attacking", "avoidance", "avoidanceWait"]);
    need(number(v.lane, -10, 10) && number(v.hold, 0, 10) && integer(v.index, 0, 12));
    if ("defending" in v) need(v.defending === null || ids().includes(v.defending));
    for (const k of ["blocked", "trafficBlocked", "retreat"]) if (k in v) need(number(v[k], 0, 100));
    if (personality) {
      keys(v.personality,['id','seed','mode','model']);
      need(v.personality.id===personality.id&&v.personality.seed===personality.seed&&v.personality.mode===(qualifying?'qualifying':'race'));
      need(personality.version>=2?v.personality.model===personality.version:!('model' in v.personality));
      need(!('qualifying' in v));
    } else need(!('personality' in v)&&!('defenseLock' in v)&&!('attacking' in v));
    if(personality?.version>=3){
      if('avoidanceWait' in v)need(number(v.avoidanceWait,0));
      if('avoidance' in v){keys(v.avoidance,['id','lane']);need(ids().includes(v.avoidance.id)&&number(v.avoidance.lane,-10,10));}
    }else need(!('avoidanceWait' in v)&&!('avoidance' in v));
    for(const key of ['defenseLock','attacking'])if(key in v)need(v[key]===null||ids().includes(v[key]));
    if (qualifying && !personality) {
      keys(v.qualifying, ["brakeLead", "caution", "execution", "phase", "rhythm"]);
      for (const key of ["brakeLead", "caution", "execution", "phase", "rhythm"]) need(number(v.qualifying[key], 0, 10));
    } else need(!("qualifying" in v));
    if (v.telemetry) {
      keys(v.telemetry, ["reason", "speed", "desiredSpeed", "freeTarget", "pathError", "headingError", "lane", "blockerGap", "throttle", "brake", "steer", "driverId", "tactic"]);
      if('driverId' in v.telemetry||'tactic' in v.telemetry)need(personality&&v.telemetry.driverId===personality.id&&['line','attack','defend'].includes(v.telemetry.tactic));
      need(["corner-preview", "straight", "settling", "traffic", "edge-preview", "heading-recovery", "reverse-recovery"].includes(v.telemetry.reason));
      for (const key of ["speed", "desiredSpeed", "freeTarget", "pathError", "headingError", "lane", "throttle", "brake", "steer"]) need(number(v.telemetry[key]));
      need(v.telemetry.blockerGap === null || number(v.telemetry.blockerGap));
    }
  }
  function wake(v) {
    keys(v, ["strength", "sourceId", "distanceLengths", "lateral", "dragReduction"]);
    need(number(v.strength, 0, 1) && number(v.dragReduction, 0, 1));
    need(v.sourceId === null || ids().includes(v.sourceId));
    for (const k of ["distanceLengths", "lateral"]) need(v[k] === null || number(v[k]));
  }
  function support(v) {
    keys(v, ["pace", "target", "position", "leaderGapSeconds", "duelFactor", "recoveryRemaining", "errorSeconds", "armed", "suppressed", "recoveryUntil", "contactUntil"]);
    for (const k of ["pace", "target"]) need(number(v[k], 0, .01200001));
    need(v.position === null || integer(v.position, 1, 13));
    need(v.leaderGapSeconds === null || number(v.leaderGapSeconds, 0));
    need(number(v.duelFactor, 0, 1) && number(v.recoveryRemaining, 0, 8.00001) && number(v.errorSeconds, 0));
    need(typeof v.armed === "boolean" && typeof v.suppressed === "boolean");
    for (const k of ["recoveryUntil", "contactUntil"]) need(v[k] === "~negative-infinity" || number(v[k]));
  }
  function gaps(v) {
    need(Array.isArray(v) && v.length <= 13 && new Set(v.map(r => r.id)).size === v.length);
    for (const r of v) {
      keys(r, ["id", "points", "expiredThrough", "distance", "lastSample", "current"]);
      need(ids().includes(r.id) && number(r.distance));
      need(r.expiredThrough === "~negative-infinity" || number(r.expiredThrough));
      need(number(r.lastSample, 0));
      need(Array.isArray(r.points) && r.points.length > 0 && r.points.length <= 2200);
      let time = -1, distance = -Infinity;
      for (const p of [...r.points, r.current]) {
        need(Array.isArray(p) && p.length === 2 && number(p[0]) && number(p[1], 0));
        need(p[1] >= time && p[0] >= distance); distance = p[0]; time = p[1];
      }
      need(r.current[0] === r.distance && r.current[1] >= r.lastSample);
    }
  }
  function race(value, clone = true) {
    const v = value;
    keys(v, ["kind", "version", "trackId", "signature", "config", "state"]);
    need(v.kind === "race" && v.version === 1 && v.signature === signature(v.trackId)); config(v.config);
    const s = v.state;
    keys(s, ["phase", "countdown", "elapsed", "accumulator", "paused", "tick", "pairs", "playerContacts", "entries", "gaps"]);
    need(["grid", "countdown", "racing", "finishing", "finished"].includes(s.phase));
    need(number(s.countdown, 0, 3) && number(s.elapsed, 0) && number(s.accumulator, 0, .1 + 1e-8));
    need(typeof s.paused === "boolean" && integer(s.tick) && integer(s.playerContacts));
    need(Array.isArray(s.pairs) && s.pairs.length <= 78 && new Set(s.pairs).size === s.pairs.length);
    for (const pair of s.pairs) { need(typeof pair === "string" && /^\d+:\d+$/.test(pair)); const a = pair.split(":").map(Number); need(a[0] < a[1] && a[0] >= 0 && a[1] <= 12); }
    need(Array.isArray(s.entries) && s.entries.length === 13 && new Set(s.entries.map(e => e.id)).size === 13);
    const defaultOrder = [...ids().filter(id => id !== v.config.playerTeam), v.config.playerTeam];
    const expectedOrder = v.config.gridOrder || defaultOrder;
    need(s.entries.every((e,i) => e.id === expectedOrder[i]));
    for (const e of s.entries) {
      keys(e, ["id", "car", "previous", "timing", "finishTime", "lastSafe", "driver", "command", "slipstream", "catchup"]);
      need(ids().includes(e.id) && e.driver?.index === defaultOrder.indexOf(e.id)); car(e.car, CGPArcadeData.tracks[v.trackId].bridgeU.length > 0); car(e.previous, CGPArcadeData.tracks[v.trackId].bridgeU.length > 0); timing(e.timing, v.config.laps); driver(e.driver, v.config.qualifying, v.config.driving ? {id:v.config.driving.lineup[e.id],seed:v.config.driving.seed,version:v.config.driving.version} : null); command(e.command);
      need(number(e.lastSafe) && (e.finishTime === null || number(e.finishTime, 0, s.elapsed + 1e-6)));
      need((e.finishTime !== null) === (e.timing.completed === v.config.laps));
      if (e.finishTime !== null) need(e.finishTime === e.timing.lapStart);
      if (v.config.slipstream) wake(e.slipstream); else need(!("slipstream" in e));
      if (v.config.catchup) support(e.catchup); else need(!("catchup" in e));
    }
    const finished = s.entries.filter(e => e.finishTime !== null).length;
    if (s.phase === "grid" || s.phase === "countdown") need(s.elapsed === 0 && s.tick === 0 && finished === 0);
    if (s.phase === "finished") need(finished === 13 && s.paused);
    if (s.phase === "finishing") need(finished > 0 && finished < 13 && s.entries.find(e => e.id === v.config.playerTeam).finishTime !== null);
    if (v.config.catchup) gaps(s.gaps); else need(s.gaps === null);
    return clone ? copy(v) : v;
  }
  function qualifying(value, clone = true) {
    const v = value; keys(v, ["kind", "version", "race", "records", "format"]);
    need(v.kind === "qualifying" && v.version === 1); race(v.race, false); need(v.race.config.qualifying);
    if ("format" in v) need(v.format === "flying-one-v1");
    need((v.format || null) === (v.race.config.qualifyingFormat || null));
    const outLaps = v.format === "flying-one-v1" ? 0 : 1;
    need(Array.isArray(v.records) && v.records.length === 13 && new Set(v.records.map(r => r.id)).size === 13);
    for (const r of v.records) {
      keys(r, ["id", "name", "player", "seed", "completed", "laps"]);
      const entry = v.race.state.entries.find(e => e.id === r.id);
      need(entry && r.name === CGPArcadeData.roster.teams.find(t => t.id === r.id).name);
      need(r.player === (r.id === v.race.config.playerTeam) && integer(r.seed, 0, 12) && r.completed === entry.timing.completed);
      need(r.seed === [...ids().filter(id => id !== v.race.config.playerTeam), v.race.config.playerTeam].indexOf(r.id));
      need(Array.isArray(r.laps) && r.laps.length === Math.max(0, r.completed - outLaps) && r.laps.every(x => number(x, 1e-9)));
    }
    return clone ? copy(v) : v;
  }
  function result(v, playerTeam, format) {
    need(Array.isArray(v) && v.length === 13 && new Set(v.map(e => e.id)).size === 13);
    for (const [i, e] of v.entries()) {
      keys(e, ["id", "name", "player", "seed", "completed", "laps", "bestLap", "position"]);
      need(ids().includes(e.id) && e.name === CGPArcadeData.roster.teams.find(t => t.id === e.id).name && e.player === (e.id === playerTeam));
      need(e.position === i + 1 && integer(e.seed, 0, 12) && e.completed === (format ? 1 : 3) && Array.isArray(e.laps) && e.laps.length === (format ? 1 : 2) && e.laps.every(x => number(x, 1e-9)));
      need(e.bestLap === Math.min(...e.laps));
    }
  }
  function weekend(value, clone = true) {
    const v = value; keys(v, ["kind", "version", "trackId", "config", "qualifying", "result", "session"]);
    need(v.kind === "weekend" && v.version === 1 && typeof v.qualifying === "boolean"); config(v.config);
    const r = v.qualifying ? qualifying(v.session, false).race : race(v.session, false);
    need(r.config.qualifying === v.qualifying);
    need((r.config.performance?.version || null) === (v.config.performance?.version || null) &&
      (r.config.performance?.context || null) === (v.config.performance?.context || null));
    need((r.config.qualifyingFormat || null) === (v.config.qualifyingFormat || null));
    need(JSON.stringify(r.config.driving||null)===JSON.stringify(v.config.driving||null));
    need(r.trackId === v.trackId && r.config.playerTeam === v.config.playerTeam && r.config.difficulty === v.config.difficulty);
    if (!v.qualifying) need(r.config.catchup === v.config.catchup && r.config.slipstream === v.config.slipstream && r.config.laps === v.config.laps);
    if (v.result !== null) result(v.result, v.config.playerTeam, v.config.qualifyingFormat);
    if (v.qualifying) need(v.result === null);
    return clone ? copy(v) : v;
  }
  A.POVCheckpoint = Object.freeze({ engine, copy, decode, signature, race, qualifying, weekend });
})();
