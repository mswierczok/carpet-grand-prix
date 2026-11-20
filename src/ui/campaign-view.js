(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    C = A.CampaignConfig;
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  const imagePath = (path) => A.CampaignImages?.[path] || path;
  function car(teamId) {
    const img = node("img", undefined, "campaign-car");
    img.src = imagePath(`./assets/cars/team-${teamId}.webp`);
    img.alt = C.getTeam(teamId).name + " – Teamfahrzeug";
    img.draggable = false;
    return img;
  }
  function portrait(driver) {
    const frame = node("div", undefined, "campaign-portrait");
    if (driver.portrait) {
      const image = node("img");
      image.src = imagePath(driver.portrait);
      image.alt = driver.name;
      image.draggable = false;
      frame.append(image);
    } else {
      frame.classList.add("is-placeholder");
      frame.append(
        node(
          "b",
          driver.name
            .split(/\s+/)
            .map((n) => n[0])
            .slice(0, 2)
            .join(""),
        ),
        node("span", "Illustration folgt"),
      );
      frame.setAttribute(
        "aria-label",
        driver.name + ": vorläufiger Porträtplatzhalter",
      );
    }
    return frame;
  }
  function label(game, entry) {
    const driver = C.getDriver(game.lineup[entry.id]);
    return entry.name + " · " + driver.name;
  }
  function result(game) {
    const box = node("section", undefined, "campaign-panel campaign-interim");
    box.append(
      node("p", "KAMPAGNEN-ZWISCHENSTAND", "eyebrow"),
      node("h2", "Dein erster Grand Prix."),
    );
    const own = game.result.order.find((r) => r.teamId === game.teamId);
    box.append(
      node(
        "p",
        `Bahrain abgeschlossen · Platz ${own.position} · ${format(own.finishTime)}`,
        "campaign-result-lead",
      ),
      node(
        "p",
        "Dein Ergebnis ist gesichert. Weitere Stationen, Run-Länge und Belohnungen werden später ergänzt.",
        "hint",
      ),
    );
    const table = node("table"),
      caption = node("caption", "Rennergebnis · Fahrer und Teams"),
      head = node("thead"),
      row = node("tr");
    for (const text of ["Platz", "Team / Fahrer", "Zeit"])
      row.append(node("th", text));
    head.append(row);
    const body = node("tbody");
    for (const e of game.result.order) {
      const tr = node("tr");
      tr.dataset.team = e.teamId;
      if (e.teamId === game.teamId) tr.className = "is-player";
      const name = node("td");
      name.append(
        node("strong", C.getDriver(e.driverId).name),
        node("small", C.getTeam(e.teamId).name),
      );
      tr.append(
        node("td", String(e.position)),
        name,
        node("td", format(e.finishTime)),
      );
      body.append(tr);
    }
    table.append(caption, head, body);
    box.append(table);
    return box;
  }
  function format(seconds) {
    const ms = Math.round(seconds * 1000);
    return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  }
  A.CampaignView = Object.freeze({
    node,
    car,
    portrait,
    label,
    result,
    format,
  });
})();
