# Bahrain: Teppichfahrbahn, Rundbogentor und Spielzeugautos

Ausgangsbasis: veröffentlichter `main`-Commit
`908ede96ad4ead7ce37096ef88994d2c39f07932` (PR #40).
Entwicklungsbranch: `codex/bahrain-carpet-arch-gate`.

## Sichtbare Änderungen

- Die Fahrbahn verwendet dieselbe Teppichtextur und dieselben Weltkoordinaten
  (32 Einheiten pro Wiederholung) wie die Umgebung. Die dunklere Randzone,
  Seile, Startboxen und Ziellinie bleiben sichtbar.
- Der frühere flache Tunnel auf der Zielgeraden ist durch ein kurzes
  Bauklotztor ersetzt: zwei Holzklotzstapel, zwölf gebogene Bogensteine und
  fünf dreieckige Dachsteine. Standort: 12 % der vorhandenen Streckenlänge,
  ungefähr in der Mitte der langen Geraden zwischen erster und zweiter Kurve.
- Der Durchgang ist mindestens 64 Einheiten breit und 22 hoch. In der Mitte
  steigt der Innenbogen bis auf 34. Die reguläre Kamera bleibt auf Höhe 17.
- Vier geparkte Spielzeugautos mit Fenstern, Rädern und kleinen Lichtflächen:
  Rot vor dem Tor, Blau dahinter, Grün am mittleren Streckenabschnitt und
  Gelb nahe der Zielgeraden. Die vollständigen Stellflächen haben mindestens
  9,65 Einheiten Abstand zum äußeren Fahrkorridor, auch gegenüber benachbarten
  Streckenarmen.

Alle neuen Teile verwenden die bestehenden Materialbatches und statisch
vorberechnete Beleuchtung. Es gibt keine neuen Laufzeitabhängigkeiten,
Lichter oder Kollisionskörper. Der interne Name `block-tunnel` und dessen
Diagnosefelder bleiben für bestehende Renderwerkzeuge erhalten.

## Schutz der bestehenden Rennen

Keine Änderungen an Fahrbahn- oder Kollisionsdaten, Physik, KI, Geschwindigkeit,
Rennformaten, Startpositionen, Zeitnahme, Speicherformaten oder Fahrzeuglackierungen.
Die ursprünglichen 35 Porträt-PNGs bleiben bytegenau erhalten.
Andere Strecken verwenden weiterhin ihren bisherigen Renderer.

## Prüfung und tatsächliche Spielaufnahmen

- Drei Modultests: bytegenauer Schutz der Rennsysteme/Daten/Porträts,
  unveränderte Fahrbahndreiecke, gemeinsame Teppichtextur und UV-Koordinaten,
  sichere reale Requisitenflächen sowie Sichtstrahlen der unveränderten
  Verfolgungskamera durch das Tor auf sieben Fahrspuren bis ±25,5 Einheiten.
- Desktop: sieben Browsertests bestanden, einschließlich WebGL-Kontextverlust,
  Rückfall auf 2D, Streckenwechsel, zwei vollständig gefahrenen Offline-Runden
  und vollständigem Acht-Runden-Rennen mit allen 13 Fahrzeugen.
- Mobilformat: alle drei Bahrain-Browsertests bestanden, einschließlich des
  vollständigen Acht-Runden-Rennens mit allen 13 Fahrzeugen und Offlinebetrieb.
- Offline-Ausgaben für das klassische Spiel und alle vier POV-Einstiege erstellt.
- `after/drive.json`: reguläre Tastaturfahrt über eine Runde in beiden Formaten,
  echte Gegnerposen, Renderdiagnose und Quelltext-Prüfsummen. Die Gesamtansicht
  verwendet die vorhandene Schaltfläche; keine Fahrzeugposition wurde versetzt.
- Abnahmepaket zusätzlich mit abgeschaltetem Netzwerk geprüft: alle zehn
  eingebetteten Galeriebilder dekodieren; der Spielknopf öffnet das tatsächliche
  Offline-3D-Rennen. Keine unerwarteten Ressourcenanforderungen oder JavaScript-Fehler.
  Die Prüfung verwendet lokale Testrouten, da die verwaltete Chromium-Umgebung
  direkte `file://`-Navigation sperrt.
- [Aktuelle Abnahmegalerie](../../previews/bahrain-world/index.html).
  Der Fahrbahnvergleich verwendet als Vorher-Aufnahme die veröffentlichte
  PR-40-Fassung, keine neu erzeugte Illustration.

Reproduktion bei laufendem `npm run serve:test`:

```sh
npx vitest run tests/unit/bahrain-world.test.js
npx playwright test tests/browser/bahrain-world.spec.js tests/browser/arcade3d.spec.js --project=chromium
npx playwright test tests/browser/bahrain-world.spec.js --project=mobile-chromium
node scripts/review-bahrain.js --gate --quick --output=docs/bahrain-gate/after
node scripts/measure-bahrain-world.js --reference=908ede96ad4ead7ce37096ef88994d2c39f07932 --output=docs/bahrain-gate/paired-performance.json
npm run build:offline
npm run build:arcade-offline
node scripts/build-bahrain-review.js
```

Chromium im Mobilformat und Software-WebGL ersetzen keinen echten iPhone-/Safari-
Test. Hohe Torabschnitte verlassen bei unmittelbarer Annäherung den oberen
Bildrand der bestehenden Kamera; die Sicht auf die Fahrbahn bleibt frei.

## Vergleich der Renderkosten

[Messprotokoll](paired-performance.json): derselbe unveränderte, pausierte
13-Fahrzeuge-Start, gleiche Auflösung und Qualität, je 30 Messbilder nach
10 Aufwärmbildern. Quellen der Vorher-Fassung stammen ausschließlich aus dem
oben genannten veröffentlichten Commit. Keine parallele Testfahrt während der
Messung. Werte sind Software-WebGL-Messungen dieses Rechners, keine iPhone-FPS.

| Messwert | Desktop vorher → jetzt | Mobilformat vorher → jetzt |
| --- | --- | --- |
| Draw Calls | 150 → 156 | 144 → 144 |
| Dreiecke | 67.356 → 68.838 | 66.666 → 66.674 |
| Verwendete GPU-Texturen | 23 → 22 | 23 → 22 |
| Synchronisierte Renderzeit, Median | 129,0 → 134,7 ms | 111,7 → 103,7 ms |

Der zusätzliche Aufwand liegt in der Desktop-Startansicht bei rund 2,2 % mehr
Dreiecken. Die Renderzeiten schwanken auf Software-WebGL; sie belegen weder eine
allgemeine Beschleunigung noch eine bestimmte Bildrate auf echter Hardware.
Die vorhandenen automatischen Grafikgrenzen und Qualitätsstufen bleiben erhalten.
