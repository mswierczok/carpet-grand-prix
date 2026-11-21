# Historische Stammdaten – unabhängige Quelle

Verlustfrei aus dem letzten geprüften Ausgangsstand extrahiert:
`f24cd7481bf474fa42dda6b9bdfe1088d633c16f:index.html` (21. November 2026).
Es wird ausschließlich statisches JSON gelesen, kein Spielcode ausgewertet.
Die im Master genannte ursprüngliche Excel-Datei `u.xlsx` liegt nicht im
Repository. Ihre eingebettete Datenbank-Prüfsumme bleibt als Identitätsmerkmal
erhalten und wird nicht durch einen Hash der neuen JSON-Datei ersetzt.

| Datei | Ursprüngliche Konstante | Inhalt / Verwendung |
| --- | --- | --- |
| `master.json` | `MASTER` | Alle Eigenschaften der 13 Teams und 92 Fahrer, Herkunft und Datenbank-Prüfsumme; Quelle des Arcade-Rosters |
| `tracks.json` | `digitizedTracks` | Alle 22 vollständigen Originalzeichnungen, inklusive Rohpunkten, Boxen, Breiten, Sektoren und Brücken; Quelle des POV-Kalenders |
| `track-defs.json` | `trackDefs` | Vollständige historische Kalender-Tupel mit Gewichtungen, Beschreibungen und Koordinaten; erhaltene Referenz, kein neuer Einfluss auf POV-Physik |

Eigenschaften, Zahlenwerte, IDs, Array- und Eigenschaftsreihenfolge sind erhalten.
Nur JSON-Einrückung und die Schreibweise gleichwertiger Zahlen (`800.0` → `800`)
ändern sich gegenüber den HTML-Literalen. Die Quelldateien sind keine zusätzlichen
Browser-Downloads. Die klassische Simulation liest in PR 1 weiterhin ihre bisherigen
eingebetteten Kopien; diese werden nicht nachträglich umgebaut.

`npm run build:arcade-data` erzeugt daraus die vorhandenen schreibgeschützten
Browserdateien `../arcade-roster.js` und `../arcade-tracks.js`.
`npm run check:arcade-data` prüft sie ohne Schreibzugriff. Es gibt keinen Fallback
auf HTML und keine Kopplung an `tests/helpers/game.js`. Relative Pfade beziehen
sich auf den Exporter, nicht auf das aktuelle Arbeitsverzeichnis.

Die bestehenden POV-Aufbereitungen bleiben in `scripts/export-arcade-data.js`
und `scripts/lib/bahrain-iteration2.js`. Dazu gehören die Strecken-IDs und
Kalenderindizes, Entzerrungen, Südverlängerungen sowie die freigegebene Bahrain-
Unterbett- und Boxengassenkonfiguration. `campaign-config.js` definiert weiterhin
separat acht aktive Kampagnenstrecken und 39 Fahrerplätze. Historische Teamwerte
bleiben erhalten; Kampagnenüberschreibungen gehören nicht in diese Quelldaten.

`tests/unit/historical-data.test.js` vergleicht sämtliche Felder mit dem genannten
Git-Commit und die erzeugten Browserdateien mit ihren bisherigen SHA-256-Werten.
Die vollständigen generierten Dateien bleiben byteidentisch, einschließlich des
bisherigen Kommentars „Read-only export of classic data“.

Herkunft und nächste Schritte: [LEGACY_CLEANUP.md](../../../docs/LEGACY_CLEANUP.md).
