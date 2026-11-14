(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    root = document.getElementById("arcadeApp"),
    canvas = document.getElementById("arcadeCanvas");
  const session = A.Session.create(CGPArcadeData.tracks.bahrain),
    renderer = A.Renderer.create(canvas, session.surface),
    teams = CGPArcadeData.roster.teams;
  const el = (id) => document.getElementById(id),
    format = (seconds) => {
      const ms = Math.max(0, Math.round(seconds * 1000));
      return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    };
  let teamId = teams[0].id,
    overview = false,
    dirty = true,
    lastFrame = performance.now(),
    lastUI = 0;
  const set = (id, text) => {
    const node = el(id);
    if (node.textContent !== text) node.textContent = text;
  };
  const controls = A.Controls.attach(root, {
    pause: () => togglePause(),
    recover: () => recover(),
    onBlur: () => {
      session.pause(true);
      dirty = true;
      updateUI();
    },
  });
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.name;
    el("team").append(option);
  });
  function updateUI() {
    const s = session.snapshot(),
      t = s.timing;
    set(
      "speed",
      String(Math.round(s.car.speed * session.parameters.metersPerUnit * 3.6)),
    );
    set("lapTime", format(s.lapSeconds));
    set("bestLap", t.bestLap === null ? "—" : format(t.bestLap));
    set("laps", String(t.completed));
    set("pause", s.paused ? "▶ Fahren" : "Pause");
    const status = s.paused
      ? "Bereit zum Fahren"
      : s.car.hitWall
        ? "Randkontakt · bei Bedarf R zum Zurücksetzen"
        : t.invalid
          ? "Runde ungültig · Strecke verlassen"
          : s.car.offroad
            ? "Teppichrand · weniger Grip"
            : t.started
              ? "Deine Runde läuft"
              : "Fahre über Start/Ziel";
    set("status", status);
    set(
      "checkpoint",
      t.started
        ? `Kontrollpunkte ${t.nextGate === 0 ? 32 : t.nextGate}/32`
        : "Zur Startlinie fahren",
    );
    set(
      "lastLap",
      t.lastLap
        ? `Letzte Runde ${format(t.lastLap.seconds)}${t.lastLap.valid ? "" : " · ungültig"}`
        : "Noch keine vollständige Runde",
    );
  }
  function togglePause() {
    session.pause(!session.snapshot().paused);
    controls.clear();
    if (!session.snapshot().paused && matchMedia("(pointer: coarse)").matches) {
      canvas.scrollIntoView({ block: "center" });
    }
    lastFrame = performance.now();
    dirty = true;
    updateUI();
  }
  function recover() {
    session.recover();
    controls.clear();
    dirty = true;
    updateUI();
  }
  el("pause").onclick = togglePause;
  el("recover").onclick = recover;
  el("restart").onclick = () => {
    session.restart();
    controls.clear();
    dirty = true;
    updateUI();
  };
  el("overview").onclick = () => {
    overview = !overview;
    el("overview").setAttribute("aria-pressed", String(overview));
    set("overview", overview ? "Fahrzeug verfolgen" : "Gesamtstrecke");
    dirty = true;
  };
  el("team").onchange = (event) => {
    teamId = event.target.value;
    dirty = true;
  };
  const resize = () => {
    dirty = true;
  };
  window.addEventListener("resize", resize);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function frame(now) {
    const delta = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!document.hidden) session.advance(controls.read(), delta);
    const snapshot = session.snapshot();
    if (!snapshot.paused || dirty) {
      renderer.draw(snapshot, teamId, overview);
      dirty = false;
    }
    if (now - lastUI > 80) {
      updateUI();
      lastUI = now;
    }
    requestAnimationFrame(frame);
  }
  updateUI();
  requestAnimationFrame(frame);
  Object.freeze(A);
})();
