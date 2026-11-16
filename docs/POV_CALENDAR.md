# POV-Kalender mit allen 22 Strecken

Folgepaket auf `codex/pov-remaining-tracks`, Ausgangsbasis: veröffentlichtes
`main` `57fb54422c0f70eb032bd82b85ab828a4e1e3dc8`. Kein automatischer Merge.

Rennen mit 13 Fahrzeugen, freier 3D-Fahrtest und Draufsicht verwenden jetzt
denselben vollständigen Kalender. Die vier abgenommenen POV-Datensätze samt
Seilkonturen für Bahrain, Luxemburg, Kanada und Frankreich bleiben exakt erhalten.
Auswahl vor dem Rennen, Neustart, direkte `?track=`-Links, Team-/Grafikerhalt und
alle drei eigenständigen Offline-HTML-Dateien unterstützen die neuen Strecken.

## Fahrbare Aufbereitung

Die ursprünglichen Zeichnungen, Namen, Kalenderindizes, Sektoren und Boxengassen
werden weiterhin nur gelesen. POV-Profile vergrößern die Geometrie nach der
Normierung. Enge neue Vorlagen erhalten mehr Kurvenraum und eine Fahrbahnbreite
von mindestens rund 32 internen Einheiten. Fahrzeuge werden dabei nicht vergrößert.
Die längeren Fahrwege können Rundenzeiten gegenüber der Originaldarstellung erhöhen.

| Kalenderindex | Kennung | Strecke | Größere Radien/Abstände | Breite gegenüber Vorlage |
| ---: | --- | --- | ---: | ---: |
| 0 | bahrain | Bahrain | abgenommen, unverändert | unverändert |
| 1 | luxembourg | Luxemburg | abgenommen, unverändert | unverändert |
| 2 | canada | Kanada | abgenommen, unverändert | unverändert |
| 3 | france | Frankreich | abgenommen, unverändert | unverändert |
| 4 | switzerland | Schweiz | +20 % | unverändert |
| 5 | portugal | Portugal | +35 % | +10 % |
| 6 | india | Indien | +20 % | unverändert |
| 7 | brazil | Brasilien | +35 % | +23 % |
| 8 | south-africa | Südafrika | +20 % | unverändert |
| 9 | korea | Korea | +30 % | +2 % |
| 10 | usa | USA | +20 % | unverändert |
| 11 | belgium | Belgien | +35 % | +8 % |
| 12 | sweden | Schweden | +20 % | unverändert |
| 13 | germany | Deutschland | +35 % | +23 % |
| 14 | japan | Japan | +20 % | unverändert |
| 15 | china | China | +35 % | +14 % |
| 16 | russia | Russland | +40 % | unverändert |
| 17 | australia | Australien | +35 % | +20 % |
| 18 | england | England | +20 % | +5 % |
| 19 | italy | Italien | +20 % | unverändert |
| 20 | hungary | Ungarn | +20 % | unverändert |
| 21 | abu-dhabi | Abu Dhabi | +20 % | unverändert |

## Geschlossene Seile und Brücken

Die 16 neuen ebenen Strecken werden als geschlossene Fahrflächen aufbereitet.
Für diese neuen Konturen nutzt der Entwicklungsbuild `clipper-lib@6.4.2` auf
einem festen Raster von 0,00001 Welteinheiten. So werden die instabilen
Gleitkomma-Vereinigungen dichter Kapseln vermieden. Die vier vorhandenen
Strecken behalten ihre bisherige Berechnung und exakt dieselben Konturen.
Beide Polygonbibliotheken sind reine Entwicklungsabhängigkeiten; im Spiel
werden nur die fertig erzeugten Koordinaten geladen.

Korea hat eine, Russland zwei Brücken an den Originalkreuzungen. Die Aufbereitung
teilt den Kurs in überlappende Boden- und Brückenkorridore. Umschalten erfolgt
im ebenen Überlappungsbereich, fern der geometrischen Endkappen. Die sichtbaren
Längsseile stammen aus denselben Konturen; Endkappen werden am offenen
Rampenanschluss nicht gezeichnet. Ein Korridor mit zusätzlichen Öffnungen lässt
den Build scheitern. Die hellen Fahrbahnen bleiben frei.

Die Brücken liegen 24 interne Höheneinheiten über der Unterführung. Cosinus-
Rampen mit waagerechten Anschlüssen verbinden beide Ebenen. Fahrbahn, Seile,
Fahrzeuge, Neigung und Kamera verwenden dieselbe Höhenfunktion. Brücken erhalten
eine Unterseite und Stützen außerhalb der befahrbaren Fläche. Die Draufsicht
zeichnet das Brückendeck über dem unteren Arm und verdeckt unterfahrende Autos.

`bridge-surface.js` wählt anhand des tatsächlichen Streckenfortschritts den
passenden Kollisionskorridor. `bridge-physics.js` ergänzt diese lokale Sicht und
die Straßenhöhe um den **bytegenau unveränderten** Kern `physics.js`. Das Auto
wird nicht auf die Mittellinie gesetzt. Verschiedene Höhen verhindern
Fahrzeugkontakte zwischen Über- und Unterführung. Auf derselben Ebene bleiben
die bisherigen Rechteckkontakte aktiv; seitliches Verlassen des Brückendecks
wird vom zugehörigen Seil begrenzt. Höhen und Neigungen werden in der sichtbaren
Fahrzeugpose zeitlich interpoliert.

Geschwindigkeiten, Beschleunigung, Bremsen, Haftung, Lenkung und KI-Tempoprofile
bleiben unverändert. Das Modell ist straßengebunden; Sprünge, freier Fall oder
eine neue Hangbeschleunigung werden nicht eingeführt.

## Prüfungen und CI

- Alle 22 Kalenderindizes, Originalzeichnungen, Sektoren und unveränderten
  ersten vier POV-Geometrien; `index.html` und Stammdaten bleiben exakt erhalten.
- Vergleich tatsächlicher 13-Auto-Rennzustände auf den ersten vier Strecken
  mit dem vorher veröffentlichten Code, einschließlich KI und Fahrzeugkontakten.
- Neue Startfelder, volle Sektoren und Kameraübersicht auf breiten/schmalen Fenstern.
- Auf jeder neuen Strecke drei echte Runden mit allen 13 Zieleinläufen,
  endlichen Fahrzeugwerten und ohne Seildurchdringung.
- Brückenkontakte, freie Unterführungen, seitliche Seilanschläge vorwärts und
  rückwärts, ebene Rampenanschlüsse sowie reale 3D-Flächen auf beiden Höhen.
- Browserprüfung aller neuen Strecken auf Desktop und Mobilformat: Auswahl,
  Freigabe alter WebGL-Kontexte, Offline-Version, Tastaturrennen und Ergebnisse.
- Tatsächlich angehobenes 3D-Fahrzeug und angepasste Kamera bei Brückenfahrten.
  Diese gezielten Tests zeichnen auf der Software-GPU jedes achte Bild und
  reichen die aufsummierte Darstellungszeit weiter; Physik und Tastatur laufen
  unverändert. Daraus wird keine Hardware-Bildrate abgeleitet.

Die bestehende Testserie läuft weiter. Die umfangreichen zusätzlichen Kalender-
prüfungen werden in CI auf vier Gruppen verteilt; jede neue Strecke ist genau
einer Gruppe zugeordnet. Die bisherigen Browserprüfungen laufen in zwei parallelen
Jobs für Desktop und Mobilformat; keine Prüfung wird dabei ausgelassen.
Modul-/Build-Prüfungen und ihre Vorschauartefakte haben einen eigenen Job.
Lokal prüfen `npm test` und `npm run test:browser`
weiterhin alles. Gruppen sind ausschließlich Testauswahl, kein Spielcode.

## Grenzen

Dieses Paket erweitert den getrennten POV-Modus. Meisterschaft, Qualifying,
Werkstatt-Upgrades und ein Feld mit 26 Fahrern werden weiterhin nicht mit dem
POV-Rennen verbunden. Das klassische Spiel und seine Spielstände bleiben
unverändert. Boxenstoppmechaniken und individuelle Dekoration je Schauplatz
sind weitere Schritte. Chromium im Mobilformat ersetzt keine echte
Safari-/iPhone- oder Hardware-Leistungsprüfung.
