# Carpet Grand Prix: Entwicklungsregeln

- Hauptprodukt ist das statische Arcade-Rennspiel mit Roguelite-Kampagne.
  `index.html` führt zu `play.html`; `campaign.html` verwaltet die Kampagne,
  `race.html` das gemeinsame Rennwochenende. `arcade.html` / `arcade3d.html`
  sind technische Fahrtests. Orientierung: `docs/ARCHITECTURE.md`,
  `docs/TESTING.md`, `docs/CAMPAIGN.md`, `docs/SAVE_FORMAT.md`.
- Auf einem neuen `codex/*`-Branch vom aktuellen `main` arbeiten.
  Keine direkten Änderungen auf `main`. Jeder PR benötigt vor dem Merge
  die ausdrückliche Nutzerfreigabe für diesen konkreten PR.
- Die passive 26-Fahrer-Simulation ist archiviert unter
  `classic-simulation-archive-2026-11-21` (Commit `fc338593c33c8e25063fc5ffd22511f7ded9b3c9`).
  Keine neuen Funktionen darauf aufbauen und keine alten VM-/UI-Testadapter
  zurückholen. Historische Dokumente unter `docs/history/` und alte
  Stilgalerien sind keine Grundlage des aktuellen Rennsystems.
- Cleanup-Fortschritt und bewusst verbleibende Arbeit: `docs/LEGACY_CLEANUP.md`.
  Die Entfernung nachweislich überflüssiger klassischer Komponenten ist für
  diesen Auftrag freigegeben. Aktuelle Spielsysteme bleiben geschützt.
- Physik, KI, Balancing, Zufallsaufrufe, Rennlängen, Streckenführung und
  aktuelle Oberfläche nur auf ausdrücklichen Auftrag ändern. Keine neue
  Engine und kein Framework einführen. Darstellung liest Rennzustand.
- Alle 13 Teams, 92 historischen Fahrer, 39 Kampagnenfahrerplätze,
  22 Strecken, acht Kampagnenstrecken und Originalillustrationen erhalten.
  Datenquelle: `src/data/historical/`; versionierte Exporte mit
  `npm run check:arcade-data` prüfen. Kein Build liest Simulations-HTML.
- Kampagne, POV-Meisterschaft, POV-Werkstatt und freies Rennen getrennt
  erhalten. Speicherkennungen, IDs, Datenbank-Prüfsumme und validierte
  Migrationen nicht beiläufig ändern. Fehlerhafte/neuere Importe dürfen
  gültige Daten nicht überschreiben. Klassische Browserschlüssel niemals
  löschen oder umwidmen; `archive.html` darf sie nur lesend exportieren.
- GitHub Pages muss unter `/carpet-grand-prix/` ohne Anwendungsserver
  funktionieren. Die aktuellen Offline-Ausgaben einschließlich Navigation
  und eingebetteter Assets erhalten.
- Passende Tests vor/nach Änderungen ausführen. Referenz-Fixtures nicht
  zum Beseitigen roter Tests überschreiben. Neue Referenzen brauchen einen
  dokumentierten, unveränderten Ausgangsstand. Test-Hooks ausschließlich
  in temporären Testkopien; keine Sonderphysik oder Testzufälle im Spiel.
- Auf Deutsch kommunizieren. Änderungen, Prüfergebnisse und Grenzen im PR
  nennen; mobile Chromium-Emulation ausdrücklich von echtem Safari trennen.
