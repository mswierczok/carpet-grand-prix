# Technische Bestandsaufnahme

Untersuchung: 4. November 2026. Ausgangsbasis:
`ea88f1daf238431a1dbac540df7e452dd2a44e54` (`Create index.html`).
GitHub-Pages-Lauf `41705038296` war für diesen Commit erfolgreich.

Original: 5.215.314 Bytes, 2.466 Zeilen.
SHA-256: `b35c4fa0f2170df77597979c1a8fdf11bda9ef1fe306401b7151a6bfc1e5c4d1`.
Git-Blob: `04f4258b7ecd7e852a6f636aaa779c9480969fdc`.
Der Titel nennt v0.9.14, der Footer v0.9.12. Speicherformate besitzen eigene Versionen.

## Funktionsinventar

| Bereich | Vorhandenes Verhalten | Einstieg im Original |
| --- | --- | --- |
| Start | Teamchef, Beobachter, Teamauswahl, Einstellungen | `beginNewChampionship`, `enterChampionship` |
| Stammdaten | 13 Teams, 92 feste Fahrer, 26 zufällig besetzte Cockpits | `MASTER`, `newState` |
| Fahrer | Stärke, Konstanz, Potenzial, Entwicklung, Alter, Verträge, Transfers, Rücktritte, Karriere | `ageDrivers`, `renewGrid`, `signDriver` |
| Strecken | 22 Originalzeichnungen, Sektoren, Boxengassen, Fahrbahnbreiten, Originalüberlagerungen | `trackDefs`, `digitizedTracks`, `makeGeometry` |
| Brücken | Korea: eine; Russland: zwei; getrennte Höhenebenen | `onBridgeDeck`, `bodyContact` |
| Qualifying | Q1 26→18, Q2 18→10, Q3; Auslaufrunde und zwei schnelle Runden, Risiko/Ausfahrt | `createQualSession`, `qualStep`, `concludeQualSession` |
| Rennen | 18 Runden, feste Schritte 1/30 s, Beschleunigung, Bremsen, Fehler, Defekte, Schäden, Reparaturen | `createRace`, `stepRace` |
| KI | Individuelle Profile, Ideallinie, Innen-/Außenangriff, Verteidigung, Spurwechsel, Windschatten | `raceMind`, `chooseLane`, `racingSpeed` |
| Verkehr | Kollisionsreservierung, Überrundung, Auflösung festgefahrener Gruppen | `trafficBlocks`, `safeLaneChange`, `stepRace` |
| Ziel | Zielflagge, Beenden der laufenden Runde, Podium vor Verbuchung | `countCrossings`, `raceOrder`, `finalizeRace` |
| Wertungen | Top-10-Punkte, Fahrer-/Teamwertung, Teamwechselhistorie, Karriere, Titel | `recordRace`, `posRank`, `finishSeason` |
| Management | Credits/F&E, Halbzeit-/Saisonprämien, Upgrade-Limits, KI-Entwicklung | `credit`, `spend`, `buyPart`, `aiDevelop` |
| Werkstatt | Vier Fahrzeugbereiche, Forschung, Konzeptgrenzen, Wartung, Reglementwechsel | `buyStudy`, `buyConceptRefit`, `makeWearPlan` |
| UI | Sechs Ansichten, Canvas-Rennen, SVG-Werkstatt, Fahrzeugbilder, eigene Logos | `render`, `drawRace`, `cgWorkshopCar` |
| Bedienung | Pause, 1×/2×/4×, Fahrerfokus, Führendenmarkierung, Debug, Saisonautomatik | `advanceVisible`, `frame`, `autoSeasons` |
| Speicherung | Browser-Autosave, JSON-Import/Export, Sitzungsfortsetzung | `save`, `importV06Data`, `restoreRace` |

Die genannte Excel-Quelle `u.xlsx` liegt nicht im Repository. Stammdaten und deren
eingebettete Prüfsumme sind Kompatibilitätsbestandteile. Der endliche Fahrerpool wird
nicht aufgefüllt; bei zu wenigen Fahrern endet die Fortsetzung mit erhaltenem Archiv.

## Empfindliche Abhängigkeiten

- Eine gemeinsame IIFE enthält Zustand `s`, Daten, UI, Speicherung und Simulation.
  Viele Verwaltungsfunktionen rufen direkt `save`, `render`, `notify` auf.
- `raceMeta` verknüpft Geometrie, Kurvenvorausschau, Ideallinie und Boxen. Strecken
  werden teilweise über Objektidentität und `trackDefs.indexOf()` zugeordnet.
- Simulationszeit steuert Physik/KI; offizielle Zeit ist eine Präsentationsskala.
- Rennen und Qualifying speichern Zufallszustände. Verwaltung verwendet zusätzlich
  `Math.random()`. Reihenfolge und Anzahl aller Aufrufe beeinflussen Ergebnisse.
- Sichtbare und automatische Rennen verwenden denselben Kern. Verborgene Tabs
  pausieren die Live-Simulation; große Frame-Abstände werden begrenzt.
- Ergebnisse und Prämien sind gegen doppelte Verbuchung geschützt.
- Alte Migrationsfunktionen garantieren nicht die Ladbarkeit beliebiger Altversionen.

## Grenzen

Referenzen sind künstliche Spielstände aus dem Original, keine historischen
Nutzerspielstände. Chromium-Mobilformat ersetzt keine echten Geräte. Bestehende
Auffälligkeiten separat erfassen und nicht beim Umbau durch neue Erwartungen verdecken.
