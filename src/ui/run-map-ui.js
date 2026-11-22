(() => {
  "use strict";
  const A = globalThis.CGPArcade, M = A.RunMap, n = A.CampaignView.node;
  function render(board, run, onEnter) {
    board.replaceChildren();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 1000"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true"); svg.classList.add("run-map-lines");
    for (const [from, to] of M.phase.edges) {
      const a = M.get(from), b = M.get(to), path = document.createElementNS(svg.namespaceURI, "path");
      path.dataset.from = from; path.dataset.to = to;
      path.setAttribute("d", `M${a.x * 10},${a.y * 10} L${b.x * 10},${b.y * 10}`);
      const index = run.route.indexOf(from);
      path.classList.toggle("is-chosen", index >= 0 && run.route[index + 1] === to);
      path.classList.toggle("is-pruned", A.RogueliteRun.nodeState(run, to) === "unreachable"); svg.append(path);
    }
    board.append(svg);
    const levels = [...new Set(M.phase.nodes.filter(node => node.kind === "race").map(node => node.level))].sort((a, b) => b - a);
    for (const level of levels) {
      const race = M.phase.nodes.find(node => node.kind === "race" && node.level === level);
      const label = n("p", "RENNEN " + level + (race.final ? " · FINALE" : ""), "run-map-level");
      label.style.top = `calc(${race.y}% - 86px)`; board.append(label);
    }
    for (const node of M.phase.nodes) {
      const state = A.RogueliteRun.nodeState(run, node.id), button = n("button", undefined, "run-node is-" + node.kind);
      button.type = "button"; button.dataset.node = node.id; button.dataset.state = state;
      button.style.left = node.x + "%"; button.style.top = node.y + "%";
      const available = A.RogueliteRun.reachable(run).includes(node.id);
      button.disabled = !available; button.classList.toggle("is-final", !!node.final);
      if (node.id === run.phase.currentNode) button.setAttribute("aria-current", "step");
      const type = node.kind === "event" ? M.eventTypes.find(t => t.id === run.eventContents[node.id].typeId) : null;
      const title = type?.name || CGPArcadeData.tracks[node.trackId].name;
      button.append(n("span", node.kind === "race" ? node.final ? "🏆" : node.flag : type.symbol, "run-node-icon"), n("strong", node.final ? node.flag + " " + title : title), n("small", node.kind === "race" ? node.final ? "NUR P1" : "ZIEL: P" + node.cutoff : "EVENT " + node.letter));
      if (["completed", "won", "failed"].includes(state)) button.append(n("span", state === "won" ? "★" : state === "failed" ? "×" : "✓", "run-node-status"));
      button.setAttribute("aria-label", `${title}${node.kind === "event" ? " · Event " + node.letter : " · Rennen " + node.level} · ${available ? "erreichbar" : state === "completed" ? "abgeschlossen" : state === "won" ? "gewonnen" : "gesperrt"}`);
      button.onclick = () => onEnter(node.id); board.append(button);
    }
    const start = n("div", undefined, "run-map-start");
    start.append(n("small", "RUN START"), n("strong", "Fähigkeit gewählt ✓")); board.append(start);
  }
  function reveal(board, id) {
    requestAnimationFrame(() => {
      const node = [...board.querySelectorAll("[data-node]")].find(n => n.dataset.node === id);
      if (!node) return;
      const scroll = board.parentElement;
      scroll.scrollTop = node.offsetTop - scroll.clientHeight / 2;
      node.scrollIntoView({ block: "center", inline: "nearest" });
    });
  }
  A.RunMapUI = Object.freeze({ render, reveal });
})();
