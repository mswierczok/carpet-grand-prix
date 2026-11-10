# Gezeichneter Pilot und flüssige Darstellung

Ausgangsbasis: freigegebenes `main` nach PR #10,
`0df7eb0c72bede00479bf12a528198f4ad6149a1`.
Auftrag: hochgeladenes „COMPLETE VISUAL ART DIRECTION & IMPLEMENTATION“,
anschließend drei Hockey-Bilder als Stilreferenz. Die dortige schräge Kamera
wird **nicht** auf die Rennansicht übertragen.

## Umfang zur Abnahme

Die verlangte Phase C ist tatsächlich im Spiel implementiert: Bahrain sowie
Vauclair (t01), Bellarossa (t04), Panther (t10), Eisenbach (t05) in Rennen,
Team-Auswahl und Werkstatt. Hinzu kommen reine Darstellungsverbesserungen
für die Bewegung aller Fahrzeuge auf allen Strecken.
Die übrigen 21 Umgebungen und neun Teamillustrationen behalten ihren
freigegebenen Stand bis zur Stilabnahme. Danach folgen getrennte überprüfbare
Schritte gemäß [ART_STYLE.md](ART_STYLE.md).

[Galerie](../previews/art-pilot/index.html): vier alte/neue Vergleichspaare,
Rennsprites in 16/32/56/160 px, echte Spielaufnahmen von Bahrain, Fahrerkamera
und Werkstatt. `npm run build:pilot-preview` erzeugt zusätzlich eine komplett
eingebettete HTML-Galerie. CI liefert sie zusammen mit dem spielbaren Offline-HTML
im Artefakt `carpet-grand-prix-art-pilot` aus. ZIP entpacken und Galerie oder
Spiel im Browser öffnen; kein Server erforderlich.

## Bestandsaufnahme und Einbindung

- `index.html`: bestehende Daten, Geometrien, Management, Qualifying und
  Simulation bleiben in der geschlossenen Spiel-IIFE. Kleine, markierte
  Darstellungsbrücken binden die neuen Module ein.
- `src/rendering/race-sprites.js`: unveränderte freigegebene Geometrie und
  Lackierungen für alle 13 Teams. Nase zeigt nach +X; gleiche Achsen/Proportionen.
- `src/rendering/pilot-vehicles.js`: ergänzt Konturen/Licht/Schatten für vier
  Teams; umschließt die vorhandene SVG-/Canvas-Schnittstelle. Andere Teams fallen
  auf exakt ihre bisherigen SVGs zurück. Werkstatt und Rennen nutzen dieselbe
  SVG-Quelle. Die Fahrzeughülle von 23 × 120/280 Einheiten bleibt identisch.
- Showroom: vier neue transparente SVGs, weiterhin 2172 × 555 px. Gemeinsame
  Projektion der freigegebenen Konturen, Seitenhöhe und Räder. Eigenständige
  Team-Motive bleiben erhalten; reduzierte neue Fantasiesponsoren.
- `scripts/build-pilot-art.js`: reproduzierbarer Export von Showroom und
  Top-Down-SVGs nach `assets/cars/illustrated/`. Bisherige WebPs und SVGs bleiben
  erhalten. `illustratedTeamCar` wählt nur für die vier Pilotteams die neuen Bilder.
- `src/rendering/pilot-world.js`: Bahrain erhält Teppich, helle Garnbegrenzung,
  Papierboxengasse, Sektoraufkleber und wenige gezeichnete Requisiten.
  Fahrfläche und Boxenpfad stammen direkt aus `g.pts` und `g.pit`; bestehende
  Startaufstellung, Pfeile, Sektorlinien, Beschriftungen und Autos darüber bleiben
  im Originalrenderer. Grid/Pfeile und Sektorlinien erhalten auf dem hellen
  Bahrain-Untergrund kontrastreichere Tintenfarben, bei identischen Positionen. Requisiten werden deterministisch mit Sicherheitsabstand
  zu jedem Strecken- und Boxensegment platziert. Keine zufällige Dekoration.
- `styles/art-pilot.css`: begrenzt auf die vier neuen Showroom-/Werkstattbilder.
  Logo-Upload, Hotspots, Fokus und Upgrades bleiben die bisherigen Funktionen.
- `scripts/build-offline.js`: bettet alle neuen Module, Styles und vier
  Showroom-SVGs ein. Keine CDN-, Font-, WebGL- oder Serverabhängigkeit.

## Warum die Bewegung ruckelte

Die Rennberechnung läuft unverändert mit festen 1/30-Sekunden-Schritten.
Der Browser zeichnet typischerweise häufiger. Bisher zeichneten zwei
aufeinanderfolgende Bilder oft dieselbe Position; eine Verfolgungskamera
verstärkt diesen sichtbaren Sprung.

`render-motion.js` merkt sich die sichtbaren Posen vor jedem unveränderten
Simulationsschritt in einer WeakMap. Beim Zeichnen wird abhängig vom Rest des
Zeitschrittakkumulators zwischen vorheriger und aktueller Pose interpoliert.
Kamera und Auto lesen exakt dieselbe interpolierte Position. Winkel verwenden
den kürzesten Übergang. Beim Pausieren, Fortsetzen ohne Snapshot, Ebenenwechsel
und großen Positionssprüngen gilt direkt die aktuelle Position. Das kostet
höchstens einen Rechenschritt Darstellungslatenz (33 ms Spielzeit); die
Rennberechnung wird weder beschleunigt noch verändert. Kein neuer Timer.

`live-dom.js` aktualisiert Text/Attribute und sortiert vorhandene, nach Fahrer-ID
identifizierte Buttons, statt alle 220 ms die gesamte Live-Oberfläche zu ersetzen.
Unverändertes HTML wird übersprungen. Canvas-Pfade, Textur und Fahrzeugbitmaps
werden zwischengespeichert. Es werden keine Fotos im Animationsloop geladen.

## Vergleichsmessung

`node scripts/benchmark-rendering.js /tmp/result.json`, lokales Chromium,
1440 × 1100, derselbe gespeicherte Bahrain-Start mit 26 Autos, 1×, eigene
Fahrerkamera; 1 Sekunde Aufwärmen, 4 Sekunden Messung, keine weiteren Browsertests
parallel. Vorher: oben genannter Ausgangsstand; nachher: dieser Pilot.
Rohdaten: [vorher](performance/pilot-before.json), [nachher](performance/pilot-after.json).

| Messgröße | Vorher | Pilot |
| --- | ---: | ---: |
| Gemessene Bilder | 238 | 234 |
| Mittlere Arbeit im Frame-Callback | 1,98 ms | 1,63 ms |
| 95. Perzentil im Frame-Callback | 4,60 ms | 4,20 ms |
| Identische Kameraposition zwischen Bildern | 49,37 % | 0 % |
| Bildabstände über 50 ms | 0 | 0 |

Die Bewegung wurde kontinuierlicher; der Callback war in dieser Stichprobe
rund 18 % günstiger. Das ist keine garantierte Bildrate für andere Geräte und
misst weder GPU-Präsentationszeit noch eine ganze Saison. Die vorherige Messung
hatte ebenfalls keine Abstände über 50 ms. Mobilgeräte können weiterhin durch
Rechenlast, Energiesparen oder Browserlimits gebremst werden.

## Schutz und Risiken

Die bytegenaue Originalrekonstruktion erlaubt weiterhin nur die ausdrücklich
benannten Darstellungsänderungen; keine neue Referenz wurde erzeugt. Für den
Pilot werden nur seine separaten Module/Styles und exakt benannte Bild-,
Interpolations- und DOM-Aufrufe normalisiert. Der Rest muss weiterhin exakt
zum historischen Original passen. Replays, Speicherung/Fortsetzung, Geometrien,
Kontakt-/Boxenfälle und Managementtests bleiben aktiv.

Neue Tests prüfen Exportreproduzierbarkeit, gemeinsame Konturen, Rückfall auf
neun alte Sprites, Requisitenabstand, Winkelinterpolation/Teleport/Pause,
DOM-Identität bei Sortierung, aktive Steuerung, alle 13 Team-Auswahlbilder,
Logo-Upload/Upgrades, Galeriebilder und die Pilotfahrzeuge ohne Netzwerk.
Historische Pixelvergleiche deaktivieren nur neue Darstellungsmodule im
Testbrowser; die tatsächliche neue Darstellung wird separat geprüft.

Offen zur visuellen Abnahme: Farbkontrast, Größe der Requisiten, vereinfachte
Showroom-Projektion und Lesbarkeit bei 16 px. Der Pilot ist eine handgezeichnet
wirkende Vektorinterpretation, keine Kopie des Hockeyspiels. Reale iOS-/Safari-
Geräte und Langzeitperformance auf schwachen Handys sind noch nicht geprüft.
Keine Geometrie-, KI-, Balancing-, Kalender-, Speicherkennungs- oder Datenänderung.
Kein Merge ohne konkrete Nutzerfreigabe.

## Prüfstand dieses Piloten

Lokal bestanden: `npm test` (46 Prüfungen) und `npm run test:browser`
(60 Prüfungen: Desktop- und Mobil-Chromium). Offline-, Pilotgalerie- und
bisheriger Top-Down-Vorschaubuild erfolgreich. Die abschließende Pause-/
Fortsetzen-Korrektur wurde zusätzlich mit den drei Pilot-Modultests und den
gezielten Kamera-/Pilot-Browsertests geprüft. Keine Referenzstände geändert.
