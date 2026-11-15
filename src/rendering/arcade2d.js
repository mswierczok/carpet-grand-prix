(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  function create(canvas, surface) {
    const ctx = canvas.getContext("2d"),
      g = surface.g,
      path = new Path2D();
    g.pts.forEach((p, i) =>
      i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y),
    );
    path.closePath();
    const border = new Path2D();
    for (const ring of surface.boundary?.loops || []) {
      ring.forEach((p, i) =>
        i ? border.lineTo(p[0], p[1]) : border.moveTo(p[0], p[1]),
      );
      border.closePath();
    }
    let width = 0,
      height = 0;
    const xs = g.pts.map((p) => p.x),
      ys = g.pts.map((p) => p.y),
      bounds = {
        left: Math.min(...xs) - g.width,
        right: Math.max(...xs) + g.width,
        top: Math.min(...ys) - g.width,
        bottom: Math.max(...ys) + g.width,
      };
    function resize() {
      const rect = canvas.getBoundingClientRect(),
        ratio = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const w = Math.round(width * ratio),
        h = Math.round(height * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw(snapshot, teamId, overview = false) {
      resize();
      ctx.fillStyle = "#c4af8b";
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      const fit = Math.min(
          (width - 24) / (bounds.right - bounds.left),
          (height - 24) / (bounds.bottom - bounds.top),
        ),
        scale = overview ? fit : Math.max(fit, 2.6);
      const focus = overview
        ? {
            x: (bounds.left + bounds.right) / 2,
            y: (bounds.top + bounds.bottom) / 2,
          }
        : snapshot.visual;
      ctx.translate(width / 2 - focus.x * scale, height / 2 - focus.y * scale);
      ctx.scale(scale, scale);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Outer solid yarn rail, softer carpet shoulder, then the unchanged-width road.
      if (surface.boundary) {
        ctx.fillStyle = "#b9a17d";
        ctx.fill(border, "evenodd");
        ctx.strokeStyle = "#544736";
        ctx.lineWidth = surface.boundary.railRadius * 2;
        ctx.stroke(border);
      } else {
        ctx.strokeStyle = "#544736";
        ctx.lineWidth = surface.outerRadius * 2 + 2;
        ctx.stroke(path);
        ctx.strokeStyle = "#b9a17d";
        ctx.lineWidth = surface.outerRadius * 2 - 1;
        ctx.stroke(path);
      }
      ctx.strokeStyle = "#f5e5bb";
      ctx.lineWidth = g.width + 2;
      ctx.stroke(path);
      ctx.strokeStyle = "#d8c6a4";
      ctx.lineWidth = g.width;
      ctx.stroke(path);
      ctx.strokeStyle = "#8b7657";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 8]);
      ctx.stroke(path);
      ctx.setLineDash([]);
      const stripe = surface.at(0);
      ctx.save();
      ctx.translate(stripe.x, stripe.y);
      ctx.rotate(stripe.ang);
      const finishWidth =
        (surface.outerRadius - (surface.boundary?.railRadius || 0)) * 2;
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? "#25343a" : "#faf0d7";
          ctx.fillRect(
            (j - 1) * 2,
            -finishWidth / 2 + (i * finishWidth) / 8,
            2,
            finishWidth / 8,
          );
        }
      ctx.restore();
      ctx.font = "bold 9px system-ui";
      ctx.fillStyle = "#3e564d";
      ctx.textAlign = "center";
      for (const [i, u] of [0, ...g.sectors].entries()) {
        const p = surface.at(u * g.len);
        ctx.fillText(i ? "S" + i : "S/Z", p.x, p.y - g.width * 0.9);
      }
      for (const u of [0.04, 0.34, 0.68]) {
        const p = surface.at(u * g.len);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.strokeStyle = "#786449";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-4, -3);
        ctx.lineTo(1, 0);
        ctx.lineTo(-4, 3);
        ctx.stroke();
        ctx.restore();
      }
      const gate = surface.gates[snapshot.timing.nextGate];
      ctx.save();
      ctx.translate(gate.x, gate.y);
      ctx.rotate(gate.ang);
      ctx.strokeStyle = "#c18531";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, -g.width * 0.4);
      ctx.lineTo(0, g.width * 0.4);
      ctx.stroke();
      ctx.restore();
      const pose = {
        x: snapshot.visual.x,
        y: snapshot.visual.y,
        ang: snapshot.visual.heading,
      };
      globalThis.CGPRaceSprites.draw(ctx, pose, teamId, g.width / 64, false);
      if (snapshot.car.hitWall) {
        ctx.strokeStyle = "#ad513a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(pose.x, pose.y, g.width * 0.24, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (snapshot.paused) {
        ctx.fillStyle = "#16252b85";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#fff0ce";
        ctx.textAlign = "center";
        ctx.font = "700 23px system-ui";
        ctx.fillText("FAHRTEST PAUSIERT", width / 2, height / 2 - 8);
        ctx.font = "15px system-ui";
        ctx.fillText("Mit „Fahren“ loslegen", width / 2, height / 2 + 20);
      }
    }
    return Object.freeze({ draw });
  }
  A.Renderer = Object.freeze({ create });
})();
