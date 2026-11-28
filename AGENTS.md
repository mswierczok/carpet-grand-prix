# Carpet Grand Prix: Entwicklungsregeln

- Hauptprodukt ist das statische Arcade-Rennspiel mit Roguelite-Kampagne.
  `index.html` führt zu `play.html`; `run.html` verwaltet die Run-Kampagne,
  `campaign.html` erhält frühere Kampagnenspielstände,
  `race.html` das gemeinsame Rennwochenende. `arcade.html` / `arcade3d.html`
  sind technische Fahrtests. Orientierung: `docs/ARCHITECTURE.md`,
  `docs/TESTING.md`, `docs/CAMPAIGN.md`, `docs/SAVE_FORMAT.md`.
- Auf einem neuen `codex/*`-Branch vom aktuellen `main` arbeiten.
  Keine direkten Änderungen auf `main`. Jeder PR benötigt vor dem Merge
  die ausdrückliche Nutzerfreigabe für diesen konkreten PR.
- Die passive 26-Fahrer-Simulation ist archiviert unter
  `classic-simulation-archive-2026-11-21` (Commit `fc338593c33c8e25063fc5ffd22511f7ded9b3c9`).
  Keine neuen Funktionen darauf aufbauen und keine alten VM-/UI-Testadapter
  zurückholen. Historisch gekennzeichnete Dokumente und `docs/history/` sind keine
  Grundlage des aktuellen Rennsystems. Entfernte klassische Module nicht zurückholen.
- Abgeschlossener Legacy-Cleanup, Löschbelege und bewusst erhaltene Quellen:
  `docs/LEGACY_CLEANUP.md`. Keine weiteren kosmetischen Cleanup-Pakete einplanen.
  Run Phase 1 ist unter `docs/ROGUELITE_RUN_SYSTEM.md` dokumentiert. Weitere
  Phasen, echte Fähigkeiten, Items, Crew und Meta-Systeme benötigen eigene Aufträge.
- Physik, KI, Balancing, Zufallsaufrufe, Rennlängen, Streckenführung und
  aktuelle Oberfläche nur auf ausdrücklichen Auftrag ändern. Keine neue
  Engine und kein Framework einführen. Darstellung liest Rennzustand.
- Alle 13 Teams, 92 historischen Fahrer, 39 Kampagnenfahrerplätze,
  22 Strecken, acht Kampagnenstrecken und Originalillustrationen erhalten.
  Datenquelle: `src/data/historical/`; versionierte Exporte mit
  `npm run check:arcade-data` prüfen. Kein Build liest Simulations-HTML.
- Fahrzeugmodell v2 und `flying-one-v1` gelten für neue Wochenenden.
  Gespeicherte v1-Wochenenden und deren Neustarts bleiben v1; explizite alte
  API-Deskriptoren bleiben gepinnt, aktuelle stehen unter `VehiclePerformance.current`.
  Fehlende Leistungs-/Qualifying-Kennungen erhalten alte uniforme Physik und
  Auslaufrunde + zwei schnelle Runden. Formeln/Overlays nur mit neuer Modellversion
  ändern; alte Checkpoints und Archivzeiten erhalten. Messungen und Vertrag:
  `docs/VEHICLE_PERFORMANCE_AND_QUALIFYING.md` und `docs/VEHICLE_BALANCE_V2.md`.
- Neue Kampagnenwochenenden verwenden zusätzlich `driving` v3 mit gespeichertem
  Seed und tatsächlicher Startliste. Fehlende Kennung erhält PR-56-KI; freie
  Rennen/POV-Meisterschaft erhalten keine stillen Fahrerboni. Fahrerattribute
  verändern normale KI-Entscheidungen, niemals manuelle Eingaben oder Fahrzeugwerte.
  Die Entwicklungsfassungen v1 und v2 bleiben fortsetzbar. Modelländerungen benötigen eine neue Version; keine alten Referenzen ersetzen.
  Vertrag/Messungen: `docs/DRIVER_PERSONALITIES_AND_DYNAMIC_RACING.md`.
- Run-Speicher (`carpet_gp_roguelite_run_v1`) und frühere Kampagne niemals
  automatisch ineinander migrieren. Gespeicherte Angebote/Route/Ergebnisse und
  Niederlagen schützen; gewertete Run-Rennen können nicht neu gestartet werden.
- Kampagne, POV-Meisterschaft, POV-Werkstatt und freies Rennen getrennt
  erhalten. Speicherkennungen, IDs, Datenbank-Prüfsumme und validierte
  Migrationen nicht beiläufig ändern. Fehlerhafte/neuere Importe dürfen
  gültige Daten nicht überschreiben. Klassische Browserschlüssel niemals
  löschen oder umwidmen; `archive.html` darf sie nur lesend exportieren.
- GitHub Pages muss unter `/carpet-grand-prix/` ohne Anwendungsserver
  funktionieren. Die aktuellen Offline-Ausgaben einschließlich Navigation
  und eingebetteter Assets erhalten.
- Assetquellen und Generatoren: `docs/ASSETS.md`. Ein historischer Dateiname
  ist kein Löschgrund; gemeinsame Fahrzeug- und Porträtquellen bleiben aktiv.
- Passende Tests vor/nach Änderungen ausführen. Referenz-Fixtures nicht
  zum Beseitigen roter Tests überschreiben. Neue Referenzen brauchen einen
  dokumentierten, unveränderten Ausgangsstand. Test-Hooks ausschließlich
  in temporären Testkopien; keine Sonderphysik oder Testzufälle im Spiel.
- Auf Deutsch kommunizieren. Änderungen, Prüfergebnisse und Grenzen im PR
  nennen; mobile Chromium-Emulation ausdrücklich von echtem Safari trennen.
