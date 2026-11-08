# Tests

Node.js 24 LTS verwenden. `npm ci`, anschließend einmalig
`npx playwright install --with-deps chromium` ausführen.

| Befehl | Inhalt |
| --- | --- |
| `npm test` | Stammdaten, Speicherung, Management, Geometrie, Qualifying, Replays, Bildbytes und vollständiger Rückvergleich |
| `npm run test:browser` | Chromium auf Desktop und Mobilformat, einschließlich visueller Originalvergleiche und Offline-Ausgabe |
| `npm run test:extended` | Referenzrennen, komplette 22-Rennen-Saison und Saisonwechsel |
| `npm run test:all` | Standardtests plus Browserprüfungen |
| `npm run serve:test` | Anwendung nur unter `/carpet-grand-prix/` |
| `npm run build:offline` | Eigenständige HTML-Datei mit allen Bildern und Styles unter `dist/` |
| `npm run build:race-preview` | 13 reproduzierbare Rennsprite-SVGs und eigenständige Grafikvorschau unter `dist/` |

Optional lokal `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` setzen.
CI benutzt den zur Lockdatei gehörenden Playwright-Browser.

## Referenzen und Adapter

`tests/helpers/game.js` führt das Originalscript in einer isolierten Node-VM aus.
Nur die temporäre Testkopie gibt Interna frei; HTML wird nicht verändert. DOM-Neuzeichnung
ist dort ersetzt. Echte Bedienung, Rendering und Storage prüft Playwright separat.
Die Testkopie kontrolliert `Math.random()`; das öffentliche Spiel bleibt unverändert.
Die langen synchronen Rennläufe laufen in separaten Node-Prozessen mit hartem
Zeitlimit und Fortschrittsausgabe, damit ein festhängendes Szenario begrenzt bleibt.
Referenzen sichern Spielstände, Geometrie/Boxen/Ideallinien aller 22 Strecken sowie
Bewegung, KI-Modi, Ereignisse und Zufallszustand in Rennszenarien.

Nach der Modularisierung Adapter durch echte Imports ersetzen und JSON-Erwartungen
erhalten. Referenzen nie automatisch in CI erzeugen oder zum Beseitigen roter Tests ändern.
Generator und Herkunft stehen in `tests/fixtures/README.md`.

## Browser und CI

Jeder Test hat ein frisches Browserprofil. Geprüft werden Start/Modi, Teamauswahl,
sechs Ansichten/Bilder, Q1/Q2/Q3, Rennstart, Pause/Geschwindigkeit, Neuladen,
JSON-Export/Import, beschädigte Importe, laufendes Q1 und getrennte Einstellungen.
Ungefangene JavaScript-Fehler und fehlende lokale Ressourcen führen zum Fehlschlag.
Zusätzliche Asset-Tests vergleichen zehn Darstellungen mit dem unveränderten Original:
Start, Teamauswahl, sechs Ansichten und pausiertes Rennen/Qualifying. Alle 36 Bilder
müssen dekodieren; die Offline-Ausgabe muss ohne weitere HTTP-Ressourcen spielbar sein.
CSSOM-Regeln müssen in derselben Reihenfolge identisch sein. Pixelmatch verwendet
Schwelle 0,05 und ignoriert Kantenglättung; darüber sind null abweichende Pixel erlaubt.
Die Prüfung der unveränderten Bilddateien und des Spielquelltexts bleibt bytegenau.
Für die zwölf ausdrücklich beauftragten Fahrzeuglackierungen normalisiert der
Quelltext-Rückvergleich ausschließlich deren Bilddaten. Vauclair bleibt unverändert;
zusätzliche Tests prüfen Fotozuordnung, Prüfsummen, Bildmaße, Ladebudget und alle
13 Fahrzeuge in der Teamauswahl. Details in [CAR_LIVERIES.md](CAR_LIVERIES.md).
Für die beauftragten Top-Down-Rennfahrzeuge entfernt der Quelltext-Rückvergleich
zusätzlich exakt den neuen Script-Tag und den Renderer-Aufruf vor `drawToy()`.
Der übrige Spielcode bleibt bytegenau abgesichert. Historische Bildvergleiche
verwenden ausschließlich im Test den alten Fahrzeugrenderer; zusätzliche Tests
prüfen alle 13 Sprites im echten Renn-Canvas auf Desktop und Mobilformat,
unveränderten Speicher beim Neuzeichnen und die separate Bewegungsvorschau.
Die Offline-Prüfung verwendet ebenfalls den tatsächlichen neuen Renderer.
Formgleichheit, unterschiedliche Muster, SVG-Reproduzierbarkeit und Canvas-Cache
prüfen eigene Modultests. Details in [TOPDOWN_PREVIEW.md](TOPDOWN_PREVIEW.md).
Der Testserver erzwingt den Pages-Projektpfad.

Standard-CI läuft auf PRs, Pushes nach `main` und manuell. Erweiterte CI läuft
wöchentlich und manuell. Keine der Prüfungen veröffentlicht das Spiel. Fehlerberichte
enthalten Traces und Screenshots. Visuelle Referenzen stammen aus dem unveränderten,
per SHA-256 geprüften Git-Original. Dafür ist dessen Git-Historie erforderlich
(`git fetch --unshallow`, falls ein flacher Checkout verwendet wird). CI lädt sie mit
`fetch-depth: 0`. Erfolgreiche Läufe stellen die Offline-Datei als Download-Artefakt bereit.
Die bestehende Pages-Veröffentlichung wird nicht umgestellt.

## Grenzen

Künstliche Referenzstände ersetzen keine historischen Nutzerdateien. Mobilformat
ersetzt keine echten Safari-/iPhone-Tests. Gezielte Verkehr-/Kontakt-/Boxenszenarien,
Langzeitreglementtests und Performancevergleiche vor der jeweiligen
Auslagerung ergänzen. Ein grüner Lauf beweist nicht jede mögliche Spielsituation.
