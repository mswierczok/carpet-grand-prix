# Validierung dieser Phase

Historisches Prüfprotokoll der Phase-0-Lieferung. Die spätere Phase-1-Implementierung
und ihre Prüfungen stehen separat in [ARCADE_PHASE1.md](../ARCADE_PHASE1.md).

Grundlage: `main` 194f6e491dcd91d43f7d5d417008a3d53d0e962b.

- `npm test`: 52 bestehende Modul-/Integrationstests bestanden. Dazu gehören
  Originalrekonstruktion, Spielstände, Replays, Geometrien und Porträt-/Assetprüfungen.
- Vergleich der geschützten Projektbereiche mit `origin/main`: keine Änderungen
  an `index.html`, `src`, `assets`, `styles`, Paketen, vorhandenen Tests,
  Entwicklungswerkzeugen oder Workflows.
- SHA-256 der 35 Original-PNGs und des aktuellen `index.html` gegen das vor der
  Ausarbeitung erstellte Audit geprüft; alle identisch.
- Die neue statische Vergleichsseite wurde mit Headless-Chromium bei 1440 × 1100
  und 393 × 852 geprüft: alle 35 Original-PNGs und das Konzeptbild dekodiert,
  35 eindeutige Referenzen, alle Dokumentlinks erreichbar, Vergrößerungsdialog,
  Escape-Schließen, Vergleichsumschaltung, keine horizontal überlaufende Seite,
  keine JavaScript- oder Ressourcenfehler. Screenshots zusätzlich visuell geprüft.
- Die erzeugte Konzept-PNG wurde unverändert aus dem Bildwerkzeug übernommen;
  Herkunft/Referenzen und Hash stehen in `style-study.json`.

In diesem Branch sind nur neue Dateien unter `docs/arcade-phase0/` und
`previews/arcade-phase0/` vorgesehen. Keine neuen Bibliotheken und keine
Produktionsmodule für spätere Phasen. Vorhandene Referenzwerte wurden nicht neu erzeugt.

Die Sichtprüfung einer HTML-Seite und eines Konzeptbilds ist kein Nachweis für
3D-FPS, fahrbare Perspektive oder Fahrspaß. Dafür existiert noch kein neuer
Prototyp. Safari/iPhone und schwache physische Mobilgeräte wurden nicht geprüft.
Die im Renderingvergleich genannten Leistungsbudgets sind Vorschläge.
