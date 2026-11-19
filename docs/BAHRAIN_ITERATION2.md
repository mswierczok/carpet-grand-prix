# Bahrain – Unterbett, Boxengasse und Paddock

Ausgangsstand: veröffentlichter Merge `721022f238e85002d8f285c4015a8f02257c3b50`.
Entwicklungszweig: `codex/bahrain-underbed-paddock`. Kein Merge ohne eigene Freigabe.

## Tatsächliche Layoutänderung

Die rote Richtungsmarkierung wird als südwestliche Verlängerung des zentralen
Rücklaufs umgesetzt. Nur der ursprüngliche Bogenlängenbereich 0,490–0,605 wird
ersetzt. Alle ursprünglichen Stützpunkte außerhalb dieses Bereichs, Start/Ziel,
Startplätze, Hauptfahrbahnbreite und die restlichen 21 Strecken bleiben erhalten.

Die Schleife führt südlich um den Bettfuß bei Weltkoordinate (139, 628), taucht
unter dem vorhandenen Bett in den Bereich um (85, 630) ein und kehrt nordöstlich
auf den bisherigen Rücklauf zurück. Die Bettposition wird nicht verschoben.
Der erzeugte Verlauf wird mit maximal sechs Einheiten Abstand abgetastet;
weite Anschlüsse und die vorhandene Fahrzeugphysik bleiben erhalten.

Das Bett bekommt sichtbare Querstreben und Holzverbindungen. Seine Unterkante
liegt mindestens 44,5 Einheiten über dem Boden; die unveränderte Rennkamera
bleibt bei 17. Nur tatsächliche Fuß-/Rahmenvolumen steuern das bisherige
Kamera-Verdeckungsverhalten. Das Bett wird beim Unterfahren nicht ausgeblendet.
Die weiche vorberechnete Bodenverschattung liegt über dem Fahrteppich, ohne
zusätzliche Echtzeitlichter oder Schattenkarten. Zwischen Beinen und tatsächlichem
Seilkorridor bleiben mindestens sechs Einheiten Freiraum.

## Fahrbare Boxengasse

Die neue offene Nebenstrecke zweigt bei (550, 198,67) vor dem Startfeld ab,
führt über (650, 145) bis (780, 145) parallel zur Startgeraden und mündet nach
Start/Ziel bei (840, 224) wieder ein. Die Seilkonturen entstehen aus derselben
Polygonvereinigung wie die physische Fahrfläche. Ein- und Ausfahrt sind offen;
dazwischen trennen zwei Seile die Boxengasse zuverlässig von der Rennstrecke.

Der physische Boxenkorridor hat Radius 12, der helle Teppichstreifen Radius 9,8.
Markierungen, Richtungspfeile und PIT-ENTRY-/PIT-EXIT-Schilder ergänzen ihn.
Die drei bestehenden Holzgaragen stehen direkt daneben, ihre Servicefronten
zeigen zur Boxengasse. Der Ziel-Checkpoint umfasst auch den tatsächlichen
Schnitt der Boxengasse mit der Ziellinienebene. Sektorreihenfolge und `Timing`
bleiben unverändert; ein Boxenbesuch kann eine gültige Runde abschließen.

Es gibt noch keine Service- oder Boxenstopp-Automatik, keine Boxenstrategie und
keinen neuen Geschwindigkeitsbegrenzer. Abseits der Hauptlinie greift weiterhin
die vorhandene Randzonenphysik. Die KI fährt weiterhin ihre normale Rennlinie.
Dies ist die fahrbare Infrastruktur für einen späteren Boxenstopp-Auftrag.

## Event-Bereiche und wiederverwendbare Module

- Ein fester Paddock hinter den Garagen ersetzt die vier verstreuten Spielzeugautos.
  Vier markierte Parkbuchten und drei farbige Support-Transporter bilden eine
  kleine Teamfläche. Die Hintergrundautos verwenden vereinfachte Bausteinschalen;
  die eigentlichen Rennfahrzeuge und Lackierungen werden nicht geändert.
- `paddock` und `supportTrailer` ergänzen die Asset-Bibliothek auf 28 baubare Typen.
- Die drei weißen Tribünendächer bleiben erhalten. 18 sitzende und zwei stehende
  Spielzeugfiguren besitzen erkennbare Köpfe mit Stecknoppen, Gesichter,
  blockförmige Körper, Hände und kleine Flaggen. Keine Animationssysteme.
- Der Teppich reicht unter das Bett und die neue Schleife; alle Möbel behalten
  ihre festen Zimmeranker. Der vorhandene Bauklotzbogen, Holztunnel, das Kamel,
  Garnrollen, Flutlicht und die warme Zimmerkulisse bleiben erhalten.
- Kleine Holzseilhalter sind einfache Bausteine. Der sichtbare Seilquerschnitt
  verwendet fünf statt sechs Seiten; Radius und sämtliche Kollisionskonturen
  werden davon nicht verändert. Texturwindungen und illustrative Seilkante bleiben.

## Architektur und Schutzgrenzen

`scripts/lib/bahrain-iteration2.js` erzeugt ausschließlich beim Datenexport das
explizite POV-Profil mit Weltkoordinaten, Sektorabbildung und Boxenverlauf.
Die Originalzeichnung in `index.html` und die rohen exportierten Zeichnungsfelder
bleiben unverändert. `Surface` liest optional dieses Profil; die bisherigen
Geometriepfade für andere Strecken behalten ihre Standardwerte und Berechnungen.

Die Randkonturen werden reproduzierbar aus Hauptstrecke und Nebenstrecke erzeugt.
Keine zusätzliche Laufzeitabhängigkeit. Native statische Dateien und die
Standalone-Builds bleiben mit GitHub Pages kompatibel. Cache-URLs aller geänderten
Laufzeitmodule werden gemeinsam auf `bahrain-iteration-2` angehoben.

Unverändert: Physikparameter, Bremsen, Motor/Grip, KI-Code, Schwierigkeit,
Windschatten, Aufholbonus, Fahrzeugmodelle, Rennrundenzahl, Teams/Fahrer,
Originalporträts, Fortschritt und Speicherformate. Die acht Bahrain-Runden sind
wegen des längeren Weges tatsächlich länger; die bisherigen historischen
Rennlängen-/KI-Kalibrierprotokolle werden nicht als neue Messung ausgegeben.

Historische Tempo-/Geometrievergleiche können die explizite, unveränderliche
Bahrain-Referenz vom Ausgangscommit laden. Die normalen Tests und Browserfahrten
verwenden die neue Strecke. Quellschutz normalisiert nur das freigegebene
Bahrain-Profil, die Bahrain-Konturen und den optionalen Surface-Adapter;
alle anderen Quelldateien und die 21 übrigen Strecken bleiben streng geschützt.
Die neuen Tests prüfen separat reale Runden, Boxenfahrt, Zielwertung,
Bett-/Kamerafreiraum und die lokal begrenzte Änderung. Keine Fixtures ersetzt.

## Reproduktion

```sh
npm run build:arcade-data
npm run build:arcade-boundaries
npx vitest run tests/unit/bahrain-iteration2.test.js
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/review-bahrain.js --iteration2 --output=docs/bahrain-iteration2/after
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/review-bahrain-pitlane.js
```

Das Aufnahmescript fährt mit tatsächlichen Tastaturereignissen und liest nur
Sitzungsschnappschüsse. Keine gesetzten Fahrzeugposen, Ergebnis- oder Zeitänderungen.
Die Boxenfahrt umfasst zunächst eine ganze Hauptstreckenrunde, danach die
Nebenstrecke und den Anschluss. Desktop und Mobilformat werden getrennt gefahren.

## Grenzen

Ein physisches iPhone mit Safari steht hier nicht zur Verfügung. Mobilformat,
Mehrfinger-Regressionen und Software-WebGL ersetzen diesen Gerätetest nicht.

Das Speicherformat bleibt erhalten. Ein bereits laufender Bahrain-Spielstand
kann jedoch Fahrzeugpositionen auf dem nun ersetzten Straßenstück enthalten.
Vor Übernahme in main sollten solche Rennen beendet werden; die neue Route
wird mit frisch gestarteten Rennen abgenommen. Kein stilles Zurücksetzen oder
Manipulieren laufender alter Spielstände.

Diese Iteration ändert nicht die Hauptmenüs, Teamfahrer oder die übrigen Strecken.


## Abschließende Verifikation

- 200 Modul-/Integrationsprüfungen bestanden, darunter die fünf gezielten
  Iterationsprüfungen. Zwei historische Kalender-/Brückenregressionen wurden
  zusätzlich separat ausgeführt.
- Alle acht Bahrain-Browserfälle auf Desktop und Mobilformat bestanden:
  Standardrennen mit 13 Zieleinläufen und acht gültigen Runden, echte
  Unterbett-/Boxenfahrt mit gezählter Runde, unveränderliche Rendereingabe,
  Streckenwechsel, Offlinebetrieb und sicherer 2D-Rückfall.
- Die freien 3D-Fahrtests halten weiterhin 45.000 Dreiecke / 150 Draw Calls ein;
  das volle Startfeld bleibt unter 90.000 Dreiecken / 190 Draw Calls.
- Tatsächlicher Aufnahmelauf: Desktop acht Runden, alle 13 im Ziel; zusätzlich
  eine Mobilrunde und getrennte tatsächliche Boxendurchfahrten beider Formate.
- Die optimierte Dekorations-Abstandsprüfung überspringt anhand exakter unterer
  Schranken weit entfernte Boxensegmente. `clearance-equivalence.json` belegt
  identische Platzierungen, alle Abstandswerte und denselben Geometrie-Hash.
  Die ältere Quellprüfsumme dieser einzigen Aufnahmedatei bleibt im ursprünglichen
  Aufnahmeprotokoll erhalten; es wurden keine Screenshots als neu ausgegeben.

### Performancevergleich mit demselben Pixelbudget

Pausiertes reales 13er-Startfeld; DPR 0,75, zehn Aufwärm- und 30 Messbilder,
GPU-Abschluss per Readback. Die Startpositionen sind zwischen beiden Versionen
identisch und werden während der Messung nicht verändert. Keine weiteren
Testjobs laufen während der Stichprobe. Rohdaten: `bahrain-iteration2/paired-performance.json`.

| Messwert | Desktop vorher → jetzt | Mobilformat vorher → jetzt |
| --- | --- | --- |
| Draw Calls | 166 → 173 | 153 → 161 |
| Dreiecke | 77.998 → 87.807 | 74.160 → 84.585 |
| Szenengeometrie-Arrays | 12,44 → 13,43 MB | 12,44 → 13,43 MB |
| Browser-Heap, Schätzung | 31,95 → 33,33 MB | 31,77 → 33,33 MB |
| Ladezeit | 5,01 → 3,61 s | 4,51 → 3,22 s |
| Szenenaufbau | 1,63 → 1,09 s | 1,28 → 1,00 s |
| Synchronisierte Renderzeit, Median | 180,0 → 198,4 ms | 129,1 → 147,0 ms |
| Synchronisierte Renderzeit, P95 | 228,5 → 350,7 ms | 192,8 → 294,3 ms |

Der Aufbau ist in dieser Stichprobe schneller; die reichere Szene benötigt
rund 10 % bzw. 14 % mehr mediane Renderzeit und etwa 1 MB mehr Geometriearrays.
Die höheren P95-Werte werden ausdrücklich mitgeführt. Das sind Software-WebGL-
Messwerte und keine Behauptung über iPhone-FPS oder garantierte Ladezeiten.
Die vorhandene sparsame Pixelratio 0,65 bleibt erhalten.

### Bilder und Testpaket

`previews/bahrain-iteration2/index.html` enthält die Galerie mit tatsächlichen
POV-, Übersichts- und ausdrücklich bezeichneten Detailkamera-Aufnahmen.
Die Detailkamera ändert ausschließlich den Blick auf die echte Spielszene,
keine Fahrzeugpositionen. Die Vergleichsbilder stammen aus der vorhandenen
Galerie des veröffentlichten Zimmerstands und werden als solche bezeichnet.

Nach beiden Offline-Builds erzeugt `node scripts/build-bahrain-review.js` unter
`dist/bahrain-review/` eine eingebettete Galerie und alle eigenständigen Spiele.
Entpacken und `index.html` im Browser öffnen. Die CI-Ausgabe heißt weiterhin
`carpet-grand-prix-bahrain-review`.

`node scripts/check-bahrain-review.js` prüft die identischen Paketdateien bei
abgeschaltetem Browsernetzwerk über lokale Testrouten. Direkte `file://`-
Navigation ist in der verwalteten Testumgebung gesperrt; die Prüfung umgeht
diese Sperre nicht. Sie prüft Bilderdekodierung und Übergang in das echte
3D-Rennen ohne externe Anforderungen. `package-check.json` enthält Datei-
Prüfsummen und das tatsächliche Ergebnis.
