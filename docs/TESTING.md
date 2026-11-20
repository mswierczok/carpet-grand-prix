# Aktueller Bahrain-Zimmerausbau

Der Master-Kinderzimmer-Ausbau ergänzt `master-bedroom.test.js`: unabhängiger
Zimmeraufbau, Modulbibliothek, Möbelabstände, beide Durchfahrten, Fenstergrenzen,
Kamera-Kompatibilität, Übersicht und Freigabe aller Szenengeometrien.
Die bisherigen Weltprüfungen bleiben erhalten. Für das ausdrücklich größere
Zimmer gelten 45.000 Dreiecke im freien Fahrtest sowie 90.000 Dreiecke und
190 Draw Calls im vollständigen Startfeld. Die unveränderten anderen Strecken
behalten ihre bisherigen Grenzen. Vergleichbare Messwerte, tatsächliche
Spielaufnahmen und die offene iPhone-Geräteprüfung stehen in
[MASTER_BEDROOM.md](MASTER_BEDROOM.md).

Die folgenden Angaben zu 30.000/80.000 Dreiecken beschreiben den ursprünglichen
kleineren Bahrain-Umbau und bleiben als Ausgangsgrundlage dokumentiert.

# Tests

Der Bahrain-Grafikumbau hat zusätzlich `bahrain-world.test.js` (bytegleiche
Rennsysteme/Originalporträts, tatsächliche Fahrbahndreiecke, Requisitenabstände
und Kamera-Sichtstrahlen) und `bahrain-world.spec.js` (echte Desktop-/Mobilrennen
über acht Runden mit 13 Autos, Offlinebetrieb, Streckenwechsel und unveränderliche
Rendereingaben). Eigene Grafik-CI-Jobs halten diese Fahrten vom übrigen Browserjob
getrennt. Auch Bahrain hält im freien Fahrtest die ursprüngliche Grenze von
30.000 Dreiecken ein. Für die komplette Startaufstellung gilt ein zusätzliches
Budget von 80.000 Dreiecken und 170 Draw Calls. Shaderfehler und WebGL-Fehler
werden ausdrücklich geprüft. Die Offline-Kameraprüfung fährt zwei echte Runden,
zeichnet im Software-Renderer jeden dritten Zwischenframe und prüft weiterhin
über 600 tatsächliche Kamerabilder bei unveränderten Physik-/Eingabeschritten.
Ungebremste Rendering-Messungen erfolgen separat. Messwerte und Grenzen:
[BAHRAIN_VISUAL.md](BAHRAIN_VISUAL.md).

Nach beiden Offline-Builds erzeugt `node scripts/build-bahrain-review.js` ein
eigenständig öffnungsfähiges Abnahmepaket unter `dist/bahrain-review/` mit Galerie,
Original-Spielaufnahmen und spielbarem Rennen. CI stellt es als
`carpet-grand-prix-bahrain-review` bereit. Es wird keine Vorschau auf `main`
veröffentlicht; der Merge bleibt freigabepflichtig.

Node.js 24 LTS verwenden. `npm ci`, anschließend einmalig
`npx playwright install --with-deps chromium` ausführen.

| Befehl | Inhalt |
| --- | --- |
| `npm test` | Stammdaten, Speicherung, Management, Geometrie, Qualifying, Replays, Bildbytes und vollständiger Rückvergleich |
| `npm run test:browser` | Chromium auf Desktop und Mobilformat, einschließlich visueller Originalvergleiche und Offline-Ausgabe |
| `npm run test:extended` | Referenzrennen, komplette 22-Rennen-Saison und Saisonwechsel |
| `npm run test:all` | Standardtests plus Browserprüfungen |
| `npm run measure:race-duration` | Saubere Referenzrunden aller 22 POV-Strecken und separater KI-Vergleich |
| `npm run measure:race-field` | Volle Standardrennen Bahrain/Frankreich/Russland mit automatisierten Tastaturbefehlen |
| `npm run measure:ai-balance` | Vier Fahrkompetenzstufen, eingefrorene KI/Tastaturreferenz und räumliche Kurven-Telemetrie auf fünf unterschiedlichen Strecken |
| `npm run measure:ai-balance -- --catalog` | Neue Normal-/Schwer-/Experten-KI auf allen 22 Strecken mit identischer Fahrzeugphysik |
| `npm run measure:slipstream` | Windschatten an/aus im tatsächlichen 13er-Feld auf sechs unterschiedlichen Strecken, mit Quellprüfsummen |
| `npm run measure:slipstream -- bahrain france russia --output=docs/slipstream-start/field-ab.json` | Aktuellen Windschattenstand getrennt von historischen Protokollen vermessen |
| `node scripts/measure-close-wake.js` | Seitlichen Geschwindigkeitsvorteil mit PR #31 vergleichen; Ausgabe erneuert das Protokoll unter `docs/slipstream-full/` und ist kein Test der Renn-Startsperre |
| `npm run measure:catchup` | Aufholhilfe an/aus mit unverändert aktivem Windschatten und 13 Fahrzeugen auf sechs unterschiedlichen Strecken |
| `npm run check:race-formats` | Feste Rundentabelle gegen die dokumentierten Messungen prüfen |
| `npm run serve:test` | Anwendung nur unter `/carpet-grand-prix/` |
| `npm run build:offline` | Eigenständige HTML-Datei mit allen Bildern und Styles unter `dist/` |
| `npm run build:race-preview` | 13 reproduzierbare Rennsprite-SVGs und eigenständige Grafikvorschau unter `dist/` |
| `npm run build:arcade-data` | Lesende Exporte der 22 POV-Strecken, 13 Teams und 92 Fahrer erneuern |
| `npm run build:arcade-offline` | Eigenständige 2D- und 3D-Fahrtests unter `dist/` |
| `npm run check:arcade3d-engine` | Reproduzierbaren lokalen Three.js-Build gegen den eingecheckten Stand prüfen |
| `npm run build:arcade-boundaries` | Gemeinsame Seilränder, Trennseile und Brückenkorridore für alle POV-Strecken erzeugen |
| `npm run check:arcade-boundaries` | Seilkonturen reproduzierbar gegen die aktuellen Originaldaten prüfen |
| `npm run measure:arcade3d -- --software-webgl` | Kurze echte Zeitmessung des 3D-Fahrtests bei laufendem Testserver |
| `npm run measure:arcade3d -- --race --software-webgl` | Echtzeitmessung der 13-Fahrzeuge-Ansicht nach dem Countdown |

Optional lokal `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` setzen.
CI benutzt den zur Lockdatei gehörenden Playwright-Browser.

Der neue Fahrtest ist unter `/carpet-grand-prix/arcade.html` erreichbar. Seine
eigenen Modul- und Browserprüfungen laufen in den normalen Befehlen mit.
Umfang, Testfahrten und Grenzen: [ARCADE_PHASE1.md](ARCADE_PHASE1.md).
Die zusätzliche räumliche Fahransicht ist unter `arcade3d.html` erreichbar.
Offline-Build und CI-Artefakt enthalten auch `carpet-grand-prix-arcade3d-offline.html`.
Kamera-, WebGL-Ausfall- und Rundentests sowie die offenen Geräte-/FPS-Prüfungen:
[ARCADE_PHASE2.md](ARCADE_PHASE2.md).
Der Lenkvergleich gegen den veröffentlichten Git-Stand und die Rückwärts-Prüfungen
sind in [ARCADE_DRIVING.md](ARCADE_DRIVING.md) beschrieben. Sie laufen in den
normalen Testbefehlen mit; auch dafür wird die vollständige Git-Historie benötigt.
Die Prüfung geschlossener Seile, gemeinsamer Kollisionsflächen und gültiger
Runden über den dunklen Teppichrand beschreibt [ARCADE_BOUNDARIES.md](ARCADE_BOUNDARIES.md).
Gezielte Fahrversuche gegen die offenen Trennseile, vorwärts/rückwärts und im
echten Browser, beschreibt [ARCADE_SHORTCUTS.md](ARCADE_SHORTCUTS.md).
Das volle Feld unter `race.html`, Kontakt-/KI-/Rennprüfungen und die zusätzliche
Offline-Renndatei beschreibt [ARCADE_FULL_GRID.md](ARCADE_FULL_GRID.md).
Die Sektor-/Randrunden-Regressionsprüfungen und der Vergleich des schnelleren
KI-Fahrers gegen den veröffentlichten Code stehen in [ARCADE_SECTORS.md](ARCADE_SECTORS.md).
Die weitere Tempoabstimmung, Ideallinie, gemeinsamen 119 km/h und der Vergleich
vollständiger Felder stehen in [OPPONENT_PACE.md](OPPONENT_PACE.md).
Auswahl, automatische Seilanschlüsse und vollständige POV-Fahrten auf Luxemburg,
Kanada und Frankreich beschreibt [POV_TRACKS.md](POV_TRACKS.md).
Den vollständigen Kalender, Brückenprüfungen und die vier zusätzlichen CI-Gruppen
beschreibt [POV_CALENDAR.md](POV_CALENDAR.md).

## Referenzen und Adapter

Das optionale POV-Qualifying hat eigene Modul-/Browserprüfungen für tatsächliche
Bestzeiten aus zwei schnellen Runden, Startlistenübernahme, Direktstart-Replay,
Neustart/Verwerfen und Offlinebetrieb. Das Solo-Qualifying prüft zusätzlich
unveränderte Gegnerposen bei anderer Spielerfahrt, fehlende Fahrzeugkontakte,
tatsächlich ausgeblendete 3D-Modelle und Spieler-Sprites in 2D. Im Rennen muss
das volle Feld wieder sichtbar sein. Details: [POV_QUALIFYING.md](POV_QUALIFYING.md).
Individuelle Hintergrundfahrer haben zusätzliche Brems-/Eigenschaftstests und
einen realen Expertenlauf gegen die gemeldeten fast gleichen Zeiten.
`node scripts/measure-qualifying-drivers.js` misst neue Vorher-/Nachher-Läufe
ohne Einfluss der eigenen Spielerzeit; Einzelheiten: [QUALIFYING_DRIVERS.md](QUALIFYING_DRIVERS.md).

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

Die Werkstatt verwendet ebenfalls die gemeinsamen SVGs. Ihr genau markierter
Darstellungsaufruf wird zusätzlich im Quelltextvergleich ausgenommen; die alte
Werkstatt und die gesamte Upgrade-Logik bleiben bytegenau abgesichert.
Historische UI-Vergleiche verwenden nur im Test die alte Werkstattgrafik.
Eigene Desktop-/Mobiltests prüfen die gemeinsamen SVG-Flächen für alle 13 Teams,
Bereichsfokus, Logo-Upload/-Entfernung samt Neuladen und Paketentwicklung.
Details in [WORKSHOP_CARS.md](WORKSHOP_CARS.md).

Die Rennkamera hat eigene Tests für alle 22 unveränderten Streckengeometrien,
Straßenränder, Boxengassen und Beschriftungen in zwei Canvas-Größen. Browsertests
prüfen die tatsächliche Vergrößerung und das Zurücksetzen der Canvas-Transformation
in Startaufstellung, Qualifying und Rennen auf Desktop und im Mobilformat.
Historische Bildvergleiche deaktivieren ausschließlich im Test die neue Kamera;
Spiel- und Offline-Tests verwenden den tatsächlichen Zoom. Der Quelltextvergleich
nimmt nur die markierten Kamera-Aufrufe sowie die Darstellungskoordinaten für
Hintergrund und Fußzeile zusätzlich aus. Der adaptive Rahmen hat eigene Prüfungen
für alle 22 Strecken; Browsertests sichern randnahe Einpassung, unverzerrte
Canvas-Proportionen und die aufgehobene CSS-Höhenbegrenzung ab.
Details in [RACE_CAMERA.md](RACE_CAMERA.md).

Die eigenen Fahreranzeigen haben Modulprüfungen für Teamzuordnung, Reihenfolge,
Abstände nach vorn/hinten, Sonderfälle und sichere Ausgabe. Browsertests prüfen
Tower-/Karten-Fokus in beide Richtungen, Tastatur, unveränderte Speicherung,
stabile Schaltflächen bei Live-Updates und die Anordnung ohne Fahrbahnüberdeckung.
Der bestehende Sprite-Test wählt seinen Fokusknopf jetzt ausdrücklich im Tower,
da derselbe Fahrer zusätzlich eine Karte besitzt. Historische Bildvergleiche
deaktivieren nur im Test die Karten und filtern ausschließlich ihr neues
Stylesheet aus dem CSS-Vergleich. Der Quelltextvergleich normalisiert zusätzlich
nur dieses Stylesheet, den Platzhalter und die markierten Darstellungsblöcke.
Details in [TEAM_DRIVER_HUD.md](TEAM_DRIVER_HUD.md).

Die Verfolgungskamera hat zusätzliche Modultests für Zielzentrierung auf allen
22 Strecken, Boxengassen, Randpositionen und mobil lesbaren Zoom. Browsertests
prüfen anhand der tatsächlich gezeichneten Fahrzeugposition die Bildmitte,
Bewegung, Fensteränderung, Wechsel/Rückkehr und Qualifying. Die bisherigen
Fahreranzeigen-Tests prüfen weiterhin dieselbe gemeinsame Auswahl; der Effekt
auf der Strecke ist nun die Kamera. Neue Kamerahinweise und die zwei geänderten
Markierungsbedingungen werden im Quelltextvergleich gezielt normalisiert.
Details in [FOLLOW_CAMERA.md](FOLLOW_CAMERA.md).

Standard-CI läuft auf PRs, Pushes nach `main` und manuell. Erweiterte CI läuft
wöchentlich und manuell. Keine der Prüfungen veröffentlicht das Spiel. Fehlerberichte
enthalten Traces und Screenshots. Visuelle Referenzen stammen aus dem unveränderten,
per SHA-256 geprüften Git-Original. Dafür ist dessen Git-Historie erforderlich
(`git fetch --unshallow`, falls ein flacher Checkout verwendet wird). CI lädt sie mit
`fetch-depth: 0`. Erfolgreiche Läufe stellen die Offline-Datei als Download-Artefakt bereit.
Die bestehende Pages-Veröffentlichung wird nicht umgestellt.

## Grenzen

`pov-checkpoint.test.js` und `pov-career.test.js` prüfen Fortsetzung, KI-Zustand,
Speichervalidierung, die 22-Rennen-Teamwertung und Entwicklungskonten. Die sechs
Browserfälle in `pov-career.spec.js` haben eigene Desktop-/Mobil-CI-Jobs und werden
aus den allgemeinen Browserjobs ausgenommen. Sie prüfen echte Runden und
Rückkehr, Qualifying/Grid, Ergebnisse, Werkstatt und Offlinebetrieb. Details und
Speicher-Messprotokoll: [POV_CAREER.md](POV_CAREER.md).

`pov-menu.spec.js` prüft den neuen normalen Einstieg, die Teamfahrzeugbilder,
gespeicherte Auswahl, gemeinsame Einstellungen, 3D-Übergabe, Storagefehler und
Offline-Navigation. Die früheren Browserfälle öffnen ausdrücklich `?legacy=1`.
Quellschutz normalisiert nur den einzelnen genehmigten Weiterleitungs-Tag;
der übrige alte Spielcode bleibt bytegenau geschützt. Details:
[POV_MAIN_MENU.md](POV_MAIN_MENU.md).

Die kompakten POV-Einstellungen und Mehrfinger-Eingaben haben eigene Desktop-/
Mobilprüfungen in `race-settings.spec.js`: nativer Dialog, Fokus/Escape, Pause,
Reset oben, Offlinebetrieb und echte CDP-Touchfolgen mit Abbruch und erneuter
Bedienung. Historische Bytevergleiche schützen weiterhin Physik und Daten;
die ausdrücklich geänderte `controls.js` wird durch Verhaltensprüfungen abgedeckt.
Details und Safari-Grenzen: [POV_SETTINGS_TOUCH.md](POV_SETTINGS_TOUCH.md).

Künstliche Referenzstände ersetzen keine historischen Nutzerdateien. Mobilformat
ersetzt keine echten Safari-/iPhone-Tests. Gezielte Verkehr-/Kontakt-/Boxenszenarien,
Langzeitreglementtests und Performancevergleiche vor der jeweiligen
Auslagerung ergänzen. Ein grüner Lauf beweist nicht jede mögliche Spielsituation.

## Art-Pilot

`npm run build:pilot-art` exportiert die vier Pilotfahrzeuge reproduzierbar.
`npm run build:pilot-preview` erstellt die Vergleichsgalerie und deren
Standalone-HTML; CI liefert sie zusammen mit dem Offline-Spiel als Artefakt
`carpet-grand-prix-art-pilot`. Entwickleraufnahmen können bei laufendem Testserver
mit `node scripts/capture-pilot-preview.js` aktualisiert werden.

Neue Modul-/Browsertests prüfen Konturen/Export, Requisitenabstände,
zustandsfreie Interpolation, DOM-Erhalt, tatsächliche Canvas-Pilotbilder,
Galerie und netzwerkfreie Team-Auswahl. Historische Vergleiche schalten allein
für ihren Vergleich den Bahrain-Pilot aus und filtern sein Stylesheet.
Der Quelltextschutz erlaubt nur einzeln aufgeführte Präsentationsaufrufe;
abschließend wird weiterhin die vollständige Originaldatei per SHA-256 verglichen.
Benchmarkmethode, Rohdaten und Grenzen: [ART_PILOT.md](ART_PILOT.md).

Der vollständige Rollout ergänzt exakte 92-ID-Abdeckung, Helm-/Identitätsstabilität,
reproduzierbare Porträt-SVGs und sichere Dekoration auf allen 22 Geometrien.
Zusätzliche Desktop-/Mobiltests prüfen die Gesamtgalerie, Anzugwechsel,
Profil-Tastaturbedienung, Vertragswahl, Speicherunveränderlichkeit und Offlineprofile.
`npm run build:world-review` erstellt die Gesamtvorschau; CI bietet sie mit dem
spielbaren Offline-HTML als `carpet-grand-prix-world-and-drivers` an.

Für die 35 hochgeladenen Porträts prüfen zusätzliche Tests ID/Kürzel-Zuordnung,
Original- und Export-Prüfsummen, Dateibudget, unveränderte Quelle bei Transfers,
Rückfall auf 57 Vektorfiguren sowie Dekodierung aller WebPs online und offline.
`build:uploaded-portraits` ist ein optionaler Entwicklerexport mit ImageMagick;
CI und das veröffentlichte Spiel benötigen nur die versionierten WebP-Dateien.

Die historischen Quelltextvergleiche für Rennlänge und südliche Verlängerungen
normalisieren in `camera3d.js` ausschließlich die freigegebene Erweiterung um
Kameraoptionen. Die ursprünglichen Standardwerte und der restliche Quelltext
werden weiterhin bytegenau verglichen; die neue Zimmerprüfung vergleicht
zusätzlich tatsächliche Standardkameraposen mit dem veröffentlichten Original.
Der Cache-Test verlangt für die veränderte Kamera eine neue Script-URL.

Die zweite Bahrain-Iteration hat eigene Prüfungen für lokal veränderte Geometrie,
21 unveränderte Strecken, zwei echte Runden, eine physische Boxendurchfahrt mit
Zielwertung und sichtbares Bett mit freien Kamerastrahlen. Historische
KI-Kalibrierungen verwenden ausdrücklich die alte Bahrain-Referenz; normale
Spiel-/Browserprüfungen verwenden das neue Layout. Die Schutz-Normalisierung
ist auf das freigegebene Profil und den optionalen Geometrieadapter begrenzt.
Keine Referenz-Fixtures und keine KI- oder Physikwerte werden angepasst.

Die verbleibenden historischen Browser-Zeitgrenzen werden für das ausdrücklich
verlängerte Bahrain proportional zur dokumentierten Streckenlänge skaliert:
125 Sekunden Fahrbudget für drei Runden sowie das bisherige 180–240-Sekunden-
Fenster für das Standardrennen. Rundenzahlen und die Prüfungen aller 13
gültigen Zieleinläufe bleiben streng erhalten. Andere Strecken behalten ihre
bisherigen Grenzen. Auch das reale Test-Zeitlimit skaliert mit dem längeren
Fahrbudget. Dies ändert ausschließlich Tests, keine Spielparameter.

Die Geometriepuffer-Grenze der Teamwechsel-Prüfung wird von weniger als 160
(höchstens 159) auf höchstens 160 angehoben. Die zusätzlichen Bahrain-Bauteile
erreichen auf Desktop exakt 160. Das erlaubt genau einen weiteren Puffer;
Dreiecks- und Draw-Call-Grenzen werden nicht erhöht.

Der lange Standardformat-Test rendert jedes 40. Bild statt jedes 8. Bild.
Snapshots, Physikschritte und echte Tastatureingaben laufen weiterhin in
jedem normalen Spielschritt; die separaten Grafik- und Performanceprüfungen
werden dadurch nicht ausgedünnt.

Die langen Browserfahrten prüfen den natürlichen Abschluss in Ein-Sekunden-
Schritten. Das maximale simulierte Fahrbudget bleibt gleich; bereits beendete
Rennen werden nicht mehr bis zum nächsten 20-Sekunden-Block als pausierte
Szene erneut gezeichnet. Auch die Dreirundenfahrt beendet den Prüflauf erst
nach den drei tatsächlichen Runden, statt anschließend weiter zu zeichnen.

## 21 weitere Umgebungen

`calendar-environments.test.js` schützt die unveränderten Rennsysteme und Daten,
prüft alle neuen Modelle sowie Durchfahrten und tatsächliche Dachflächen.
`calendar-environments.spec.js` lädt alle Themen in echtem WebGL und fährt je
Strecke eine vollständige Runde mit 13 Zieleinläufen. `CGP_ENV_TEST_GROUP=0..2`
teilt die Bild-/Fahrprüfungen auf drei Gruppen auf; CI prüft jede Gruppe auf
Desktop und Mobil. Die separaten Jobs halten den bestehenden Browserlauf klein.
Parallele lokale Playwright-Prozesse benötigen unterschiedliche `--output`-Pfade.
Nach den Offline-Builds erzeugt `npm run build:calendar-review` die spielbare
Abnahmegalerie. Details: [CALENDAR_ENVIRONMENTS.md](CALENDAR_ENVIRONMENTS.md).


## Seilkontakt und Befreiung

`rope-contact.test.js` vergleicht den alten Stopp mit echtem Gleiten, prüft
Gas/Lenken zur Befreiung und sichert alle 22 Strecken samt Brückenebenen und
Trennseilen über vollständige Rechtecke ab. `rope-contact.spec.js` fährt mit
Tastatur und mobilen Mehrfingereingaben tatsächlich ans Seil und wieder weg,
online und offline; zwei echte Bahrain-Rennen verlangen alle 13 gültigen
Zieleinläufe. Alte Brücken-Replays isolieren weiterhin den damaligen Adapter,
indem nur dort der neue Kontaktadapter explizit nicht geladen wird. Referenz-
Fixtures bleiben erhalten. Details: [ROPE_CONTACT.md](ROPE_CONTACT.md).
