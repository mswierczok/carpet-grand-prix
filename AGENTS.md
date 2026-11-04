# Carpet Grand Prix: verbindliche Entwicklungsregeln

- Ausgangsbasis ist die funktionsfähige Version auf `main`. Referenz vor dem
  Umbau: `ea88f1daf238431a1dbac540df7e452dd2a44e54`.
- Auf einem eigenen `codex/*`- oder Feature-Zweig arbeiten. Keine direkten
  Änderungen auf `main`, kein automatisches Zusammenführen. Vor einem Merge
  ist die ausdrückliche Freigabe des Nutzers für den konkreten PR nötig.
- Keine Funktionen entfernen. Spielmechaniken, Formeln, Balancing, Zufallsaufrufe
  und Stammdaten nur nach ausdrücklicher Zustimmung verändern. Fehlerbehebungen
  mit Verhaltensänderung getrennt vom rein strukturellen Umbau behandeln.
- Spielstände erhalten: IDs, Streckenreihenfolge, Speicherkennungen und
  Datenbank-Prüfsumme nicht beiläufig ändern. Migrationen separat dokumentieren
  und mit bestehenden Dateien testen. Ungültige Importe dürfen den bisherigen
  Spielstand nicht überschreiben.
- GitHub Pages muss unter `/carpet-grand-prix/` ohne Anwendungsserver funktionieren.
  Entwicklungswerkzeuge dürfen keine Laufzeitvoraussetzung für Spieler werden.
- Umbau in kleinen PRs: Referenz/Tests, CSS/Bilder, Daten/Speicherung,
  Management/Meisterschaft, Geometrie/Zeit, Simulation/KI, Oberfläche.
- Vor Änderungen `docs/BASELINE.md`, `docs/ARCHITECTURE.md` und `docs/TESTING.md`
  lesen. Passende Tests ausführen und Ergebnisse samt Grenzen im PR nennen.
- Referenzdateien unter `tests/fixtures/` nicht bloß aktualisieren, um rote Tests
  zu beseitigen. Jede Abweichung zuerst erklären. Neue Referenzen benötigen einen
  nachvollziehbaren Ausgangsstand und bei Spieländerungen Nutzerfreigabe.
- Der Testadapter darf Interna nur in einer temporären Testkopie zugänglich machen.
  Keine Test-Hooks oder abweichenden Zufallsquellen ins veröffentlichte Spiel bauen.
- Mit dem Nutzer verständlich auf Deutsch kommunizieren. Programmierung,
  Tests, Branches und PRs übernimmt der Entwickler; Nutzerfreigaben beziehen
  sich auf konkrete, verständlich beschriebene Ergebnisse.
