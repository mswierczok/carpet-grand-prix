(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    n = (tag, text) => {
      const e = document.createElement(tag);
      if (text !== undefined) e.textContent = text;
      return e;
    },
    write = (node, text) => {
      text = String(text);
      if (node.textContent !== text) node.textContent = text;
    },
    format = (seconds) =>
      A.RacePresentation
        ? A.RacePresentation.format(seconds)
        : A.CampaignView.format(seconds);
  function fill(body, rows, kind, playerTeam) {
    const existing = new Map(
      [...body.children].map((el) => [el.dataset.team, el]),
    );
    for (const [i, row] of rows.entries()) {
      let tr = existing.get(row.teamId || row.id);
      if (!tr) {
        tr = n("tr");
        tr.dataset.team = row.teamId || row.id;
        for (let c = 0; c < (kind === "race" ? 5 : 4); c++) tr.append(n("td"));
      }
      tr.classList.toggle("is-player", tr.dataset.team === playerTeam);
      const value =
        kind === "qualifying"
          ? row.bestLap === null
            ? "Keine Zeit"
            : format(row.bestLap)
          : row.finishTime === null
            ? "Noch im Rennen"
            : i === 0
              ? format(row.finishTime)
              : `+${(row.finishTime - rows[0].finishTime).toFixed(3)} s`;
      const values = [
        row.position,
        row.driverName,
        row.teamName,
        value,
        ...(kind === "race"
          ? [row.startPosition ? "P" + row.startPosition : "—"]
          : []),
      ];
      values.forEach((v, index) => write(tr.children[index], v));
      // Keep times visible on phones while retaining team/start information.
      const details =
        row.teamName +
        (kind === "race" && row.startPosition
          ? " · Start P" + row.startPosition
          : "");
      if (tr.children[1].dataset.details !== details)
        tr.children[1].dataset.details = details;
      if (body.children[i] !== tr)
        body.insertBefore(tr, body.children[i] || null);
    }
    for (const tr of [...body.children])
      if (!rows.some((r) => (r.teamId || r.id) === tr.dataset.team))
        tr.remove();
  }
  function attach(parent) {
    const dialog = n("dialog");
    dialog.id = "campaignResultDialog";
    dialog.className = "racing-dialog campaign-result-dialog";
    const heading = n("div");
    heading.className = "settings-heading";
    const title = n("h2");
    title.id = "archiveResultTitle";
    dialog.setAttribute("aria-labelledby", title.id);
    const close = n("button", "Schließen");
    close.type = "button";
    close.onclick = () => dialog.close();
    heading.append(title, close);
    const summary = n("p"),
      tabs = n("div");
    tabs.className = "result-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Grand-Prix-Ergebnisse");
    const sections = {},
      buttons = {};
    for (const [kind, label] of [
      ["race", "Rennergebnis"],
      ["qualifying", "Qualifying"],
    ]) {
      const button = n("button", label);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.dataset.archiveTab = kind;
      tabs.append(button);
      buttons[kind] = button;
      const section = n("section"),
        scroll = n("div"),
        table = n("table"),
        head = n("thead"),
        tr = n("tr"),
        body = n("tbody");
      section.setAttribute("role", "tabpanel");
      section.id = "archive-" + kind;
      button.setAttribute("aria-controls", section.id);
      section.setAttribute("aria-labelledby", "archive-tab-" + kind);
      button.id = "archive-tab-" + kind;
      section.dataset.archivePanel = kind;
      scroll.className = "result-scroll";
      body.dataset.archiveRows = kind;
      for (const text of [
        "Pos.",
        "Fahrer",
        "Team",
        kind === "race" ? "Zeit / Abstand" : "Bestzeit",
        ...(kind === "race" ? ["Start"] : []),
      ])
        tr.append(n("th", text));
      head.append(tr);
      table.append(head, body);
      scroll.append(table);
      section.append(scroll);
      sections[kind] = { section, body };
      button.onclick = () => select(kind);
      button.onkeydown = (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = kind === "race" ? "qualifying" : "race";
          select(next);
          buttons[next].focus();
        }
      };
    }
    function select(kind) {
      for (const key of Object.keys(sections)) {
        sections[key].section.hidden = key !== kind;
        buttons[key].setAttribute("aria-selected", String(key === kind));
        buttons[key].tabIndex = key === kind ? 0 : -1;
      }
    }
    dialog.append(
      heading,
      summary,
      tabs,
      sections.race.section,
      sections.qualifying.section,
    );
    parent.append(dialog);
    let prior;
    dialog.addEventListener("close", () =>
      prior?.focus?.({ preventScroll: true }),
    );
    function open(record, playerTeam) {
      prior = document.activeElement;
      const own = record.order.find((r) => r.teamId === playerTeam),
        q = record.qualifying?.find((r) => r.teamId === playerTeam);
      title.textContent = CGPArcadeData.tracks[record.trackId].name;
      summary.textContent = `${own.driverName} · ${own.teamName} · Qualifying ${q ? "P" + q.position : "nicht gespeichert"} · Rennen P${own.position} · ${format(own.finishTime)} · ${record.recordedAt ? new Date(record.recordedAt).toLocaleDateString("de-DE") : record.id}`;
      fill(sections.race.body, record.order, "race", playerTeam);
      fill(
        sections.qualifying.body,
        record.qualifying || [],
        "qualifying",
        playerTeam,
      );
      let note = sections.qualifying.section.querySelector("p");
      if (!note) {
        note = n("p");
        sections.qualifying.section.prepend(note);
      }
      note.textContent = record.qualifying
        ? ""
        : "Für diesen früheren Grand Prix wurde kein Qualifying gespeichert.";
      select("race");
      if (!dialog.open) dialog.showModal();
    }
    return Object.freeze({ open, close: () => dialog.close() });
  }
  A.ResultDetails = Object.freeze({ fill, attach });
})();
