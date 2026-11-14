(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    root = document.getElementById("arcadeApp");
  let canvas = document.getElementById("arcadeCanvas");
  const session = A.Session.create(CGPArcadeData.tracks.bahrain),
    teams = CGPArcadeData.roster.teams;
  const el = (id) => document.getElementById(id),
    format = (seconds) => {
      const ms = Math.max(0, Math.round(seconds * 1000));
      return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    };
  let teamId = teams[0].id,
    overview = false,
    dirty = true,
    renderer,
    observer,
    active3D = false,
    sinceDraw = 0,
    renderBudget = 0,
    lastFrame = performance.now(),
    lastUI = 0;
  const set = (id, text) => {
    const node = el(id);
    if (node.textContent !== text) node.textContent = text;
  };
  function renderNote(message) {
    if (el("renderNote")) set("renderNote", message);
  }
  function fallbackTo2D(
    message = "Draufsicht aktiv. Du kannst mit derselben Sitzung weiterfahren.",
  ) {
    renderer?.dispose?.();
    const old = canvas;
    canvas = old.cloneNode(false);
    old.replaceWith(canvas);
    if (observer) {
      observer.unobserve(old);
      observer.observe(canvas);
    }
    renderer = A.Renderer.create(canvas, session.surface);
    active3D = false;
    root.dataset.rendering = "2d";
    if (el("fallback")) el("fallback").hidden = true;
    if (el("quality")) el("quality").disabled = true;
    renderNote(message);
    dirty = true;
  }
  if (root.dataset.renderer === "3d") {
    try {
      renderer = A.Renderer3D.create(canvas, session.surface, {
        invalidate: () => {
          dirty = true;
        },
        onContextLost: () => {
          session.pause(true);
          controls.clear();
          renderNote(
            "3D-Grafik unterbrochen. Warte auf Wiederherstellung oder fahre in der Draufsicht weiter.",
          );
          dirty = true;
          updateUI();
        },
        onContextRestored: () => {
          renderNote("3D-Grafik wieder bereit. Mit Fahren fortsetzen.");
          dirty = true;
        },
        onQuality: (value) => {
          if (el("quality")) el("quality").value = value;
          renderNote("Sparsame Grafik aktiv, um die Darstellung zu entlasten.");
        },
      });
      active3D = true;
      root.dataset.rendering = "3d";
    } catch (error) {
      fallbackTo2D(
        "3D ist hier nicht verfügbar. Der Fahrtest startet in der Draufsicht.",
      );
    }
  } else {
    renderer = A.Renderer.create(canvas, session.surface);
    root.dataset.rendering = "2d";
  }
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
    if (el("viewSpeed"))
      set(
        "viewSpeed",
        `${Math.round(s.car.speed * session.parameters.metersPerUnit * 3.6)} km/h`,
      );
    if (el("viewTime")) set("viewTime", format(s.lapSeconds));
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
    renderer.resetCamera?.();
    controls.clear();
    dirty = true;
    updateUI();
  }
  el("pause").onclick = togglePause;
  el("recover").onclick = recover;
  el("restart").onclick = () => {
    session.restart();
    renderer.resetCamera?.();
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
  if (el("fallback"))
    el("fallback").onclick = () => {
      session.pause(true);
      controls.clear();
      fallbackTo2D();
      updateUI();
    };
  if (el("quality"))
    el("quality").onchange = (event) => {
      if (active3D) renderer.setQuality(event.target.value);
      dirty = true;
    };
  const resize = () => {
    dirty = true;
  };
  window.addEventListener("resize", resize);
  observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function frame(now) {
    const delta = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!document.hidden) session.advance(controls.read(), delta);
    const snapshot = session.snapshot();
    sinceDraw += delta;
    renderBudget += delta;
    const interval = renderer.frameInterval?.() || 0;
    if ((!snapshot.paused && renderBudget + 1e-8 >= interval) || dirty) {
      renderer.draw(snapshot, teamId, overview, sinceDraw);
      sinceDraw = 0;
      renderBudget = interval ? renderBudget % interval : 0;
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
