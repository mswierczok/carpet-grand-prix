# Bahrain – The Carpet Desert Grand Prix

Ausgangsbasis ist `34a7c07ac683ababd4e5f130b3a75e9029448560` (PR #39), der
aktuelle funktionsfähige POV-Stand auf `main`. Die offenen Entwicklungszweige
wurden geprüft: Der einzige offene PR #13 betrifft die klassische Fahreransicht,
nicht neuere POV-Funktionen. Dieser Umbau erfolgt separat und benötigt Abnahme.

## Visuelle und technische Bestandsaufnahme

Alle Originale `assets/drivers/portraits/d001.png`–`d035.png` wurden als
Kontaktbogen betrachtet, d001 und d018 zusätzlich in Originalauflösung.
Die Dateien bleiben unverändert. Prägend sind kräftige dunkle Silhouetten,
etwa halb so starke innere Materiallinien, flächige cremefarbene Lichter,
warme kompakte Schatten und sparsame gesättigte Akzente. Stofffalten, Nähte und
Materialstriche beschreiben die Form; sie bilden keine fotorealistische Textur.
Gesichter und Accessoires haben bewusst leicht übertriebene Proportionen.

Der vorhandene WebGL-2-Renderer verwendet die lokal gebündelte Three.js-Version,
Toon-Materialien, invertierte Fahrzeugkonturen und gebündelte Gegnergeometrie.
Die bisherige Welt besteht hauptsächlich aus einer Texturkarte, flacher Fahrbahn,
Seilschläuchen und einzelnen Kästen. Es gibt keine dynamischen Schattenkarten.
`Surface` und generierte Polygonkonturen liefern die unveränderte Fahrfläche.
Kamera: 26 Einheiten hinter dem Fahrzeug, 17 Einheiten über dem Boden.
Bahrain: 2.755,295 Einheiten Länge, 32,842 helle Fahrbahnbreite und 27,916
Einheiten äußerer Radius inklusive weiterhin verlangsamendem dunklem Teppich.

## Umsetzung

Die Bahrain-Gestaltung ist ein eigener Renderer-Zweig; alle anderen Strecken
behalten ihre bisherige Welt. Keine neue Bibliothek und kein Produktions-Build
werden benötigt. Die gemeinsame Fahrzeuggeometrie und die Lackierungen bleiben
erhalten. Lediglich die Beleuchtung der Bahrain-Szene wirkt auch auf die Fahrzeuge.

- `bahrain-materials3d.js`: kleine deterministisch gezeichnete Canvas-Texturen,
  Mipmaps und zurückhaltende Teppichschlingen, Mattlack, Holz, Stoff und Schilder.
- `illustrated-kit3d.js`: wiederverwendbare abgerundete Bauklötze, Zylinder,
  Stoffformen, Konturen und weiche Kontaktflächen; statische Teile werden pro
  Objekt und Material zusammengefasst. Quellen werden wiederverwendet.
- `bahrain-layout.js`: Platzierung anhand der tatsächlichen Streckengeometrie,
  Prüfung kompletter Requisitenflächen gegen alle benachbarten Streckenarme.
- `bahrain3d.js`: Boden, Seile, Markierungen, Boxen, Tunnel, Stoffkamel,
  Garnrollen, Stofffalten, Flutlicht, Tribüne, Papierbanden und Kinderzimmer.

Die Lichtstimmung verwendet warme gerichtete und Hemisphärenbeleuchtung für die
bisherigen Fahrzeuge und die Seile. Statische Requisiten erhalten drei warme
Lichtstufen anhand ihrer tatsächlichen Weltnormalen einmalig als Vertexfarben.
Das vermeidet ihre wiederholte Pixelbeleuchtung. Kleine Details erhalten nur die
für ihre Bildschirmgröße notwendige Geometrie; Nähte sind flache Markierungen.
Hinzu kommen flächige illustrative Schatten und helle Lampenflächen. Keine Schattenkarten,
Pointlights, Bloom-Pässe oder pro Faser modellierte Teppichgeometrie.
Die Teppichdetails werden in der Entfernung durch Mipmaps vereinfacht.
Fiktive Banden tragen u.a. „Sunstitch“, „Loop & Co.“ und „Dune Thread“.

Die sichtbaren Seile folgen denselben Konturpunkten wie zuvor. Texturkoordinaten
orientieren sich an ihrer tatsächlichen Länge, wodurch die Windungen auch bei
unterschiedlichen Punktabständen gleichmäßig bleiben. Konturen und Kontaktschatten
sind rein visuell. Eine Blickwinkelkontur im bestehenden Toon-Shader zeichnet
den Seilrand im selben Pass; eine zweite komplette Seilgeometrie entfällt.
Die 13 Startmarkierungen entsprechen den bestehenden Spawn-
Positionen. Die kleine Ampel liest ausschließlich den vorhandenen Startzustand.

Der Bauklotztunnel sitzt bei 88,2 % der Runde auf der langen Geraden vor der
Startaufstellung. Seine Durchfahrt hat 63 Einheiten Breite und 22 Höhe. Der
unveränderte äußere Fahrkorridor ist 55,832 breit; die normale Kamera liegt auf
17 Höhe. Die Stützen liegen außerhalb der gesamten Fahrfläche. Eine lokale
Darstellungsausblendung verhindert, dass die frei ausrichtbare Kamera bei einem
absichtlichen Blick quer zur Strecke das Innere eines Requisiten zeigt. Sie
ändert weder Kamerapose noch Fahrzeug oder Kollisionen. Der Tunnel bleibt während
der normalen Durchfahrt sichtbar; sein großer leerer Innenraum wird nicht als
solider Körper behandelt.

## Aufnahmen und Prüfung

`scripts/review-bahrain.js` fährt das wirkliche Spiel ausschließlich über normale
Tastaturbefehle. Desktop: vollständiges Standardrennen über acht Runden mit
allen 13 Fahrzeugen bis zum Ende. Mobilformat: mehr als eine volle Runde.
Für die Screenshots wird über die normale Pausefunktion angehalten; weder
Fahrzeugposen noch Ergebnisse werden gesetzt. Die Bilder stammen aus WebGL.

Vorher-Aufnahmen und Messwerte: [bahrain-world/before/](bahrain-world/before/).
Nachher-Aufnahmen: [bahrain-world/after/](bahrain-world/after/).
Die JSON-Fahrprotokolle enthalten Posen, Ergebnisse, Grafikzähler und Prüfsummen.
Der reproduzierbare Messbefehl ist in beiden Versionen derselbe:

```
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/review-bahrain.js --output=docs/bahrain-world/after
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/measure-arcade3d.js --software-webgl --race --output=docs/bahrain-world/after/performance.json
```

`--mobile` ergänzt die Performance-Stichprobe im 390×844-Format. Die Messung
verwendet Chromium/SwiftShader, keinen echten iPhone-Grafikchip. CPU-Abgabezeit,
Frame-Abstände, Draw Calls, Dreiecke und Texturzahlen sind getrennt zu bewerten;
sie belegen keine garantierten 60 FPS oder Safari-Gerätekompatibilität.
Die kurze Performance-Stichprobe fährt geradeaus; vollständige Streckenabdeckung
kommt aus den separaten Fahrprotokollen.

## Messwerte und gewählte Renderbudgets

Der frühe Entwurf war im Software-Renderer deutlich teurer. Die Endfassung
verwendet statisch vorbeleuchtete Requisiten, einen einzelnen Seil-Zeichenpass,
zusammengefasste Schatten und reduzierte Detailgeometrie. Die ursprüngliche
30.000-Dreiecke-Grenze des freien 3D-Fahrtests wird wieder eingehalten.

`node scripts/measure-bahrain-world.js` vergleicht dieselbe echte pausierte
13er-Startaufstellung mit den ursprünglichen Rendererdateien aus dem genannten
Basiscommit. Temporäre Testantworten liefern diese Referenz; das veröffentlichte
Spiel enthält keinen Vergleichsschalter. Beide Varianten verwenden identisch
0,75 Render-Pixelratio im Automatikmodus. Zehn Aufwärmbilder und 30 Messbilder
werden in echten Animationsframes gezeichnet; ein Ein-Pixel-Readback synchronisiert
die Software-GPU. [Rohdaten](bahrain-world/paired-performance.json).

| Gleiche Auflösung, 13 stehende Autos | Vorher | Nachher |
| --- | ---: | ---: |
| Desktop Draw Calls | 136 | 150 |
| Desktop Dreiecke | 52.109 | 67.356 |
| Desktop CPU-Abgabe, Median | 2,2 ms | 2,2 ms |
| Desktop Frame-Abstand, Median | 116,7 ms | 150,0 ms |
| Mobil Draw Calls | 130 | 144 |
| Mobil Dreiecke | 52.071 | 66.666 |
| Mobil CPU-Abgabe, Median | 1,8 ms | 2,0 ms |
| Mobil Frame-Abstand, Median | 100,0 ms | 116,7 ms |

Die zusätzliche Gestaltung benötigt bei gleicher Auflösung mehr GPU-Arbeit.
Der vorhandene Modus „Sparsam“ verwendet deshalb **nur für Bahrain** 0,65 statt
0,75 Pixelratio, etwa 25 % weniger Renderpixel. Die Größe des Canvas, der HUD,
die Fahrzeuggeometrie und die Verfolgungskamera ändern sich dadurch nicht.
Der bisherige Automatikmodus behält sein volles Auflösungsbudget und schaltet
bei länger zu langsamer Fahrt weiterhin auf den sparsamen Modus. Die anderen
21 Strecken behalten auch ihr bisheriges sparsames Renderbudget.

In der separaten kurzen Fahrprobe mit tatsächlichem Feld blieb der Median mit
dieser Anpassung auf dem Ausgangsniveau:

| Fahrprobe „Sparsam“ | Vorher, Pixelratio 0,75 | Nachher, Pixelratio 0,65 |
| --- | ---: | ---: |
| Desktop Frame-Abstand, Median / P95 | 116,7 / 166,6 ms | 116,7 / 150,1 ms |
| Mobil Frame-Abstand, Median / P95 | 100,0 / 116,7 ms | 100,0 / 133,4 ms |

Das sind kurze SwiftShader-Stichproben, keine garantierte Geräte-Bildrate.
Readback-Messung, stehende Szene und fahrendes Feld sind unterschiedliche
Szenarien. Die höher aufgelösten Abnahmebilder wurden in der normalen Pause mit
Automatikqualität aufgenommen; die vollständigen Fahrten verwenden „Sparsam“.

## Abnahmeumfang und Grenzen

- 185 bestehende Modul-/Integrationsfälle waren im Gesamtlauf erfolgreich;
  die drei neuen Weltfälle wurden nach dem abschließenden Ausbau gezielt erneut
  geprüft. Dazu gehören bytegleiche Rennsysteme, alle 35 Original-PNGs, endliche
  Geometriedaten, wirkliche Requisitenabstände und freie Kamera-Sichtstrahlen.
- Echte Standardrennen mit 13 Fahrzeugen und acht Runden wurden auf Desktop und
  im Mobilformat bis zum Ende gefahren. Die Aufnahmefahrt dokumentiert zusätzlich
  ein ganzes Desktop-Rennen und über eine Mobilrunde mit allen geforderten Blicken.
- Shaderfehler, Kontextverlust/-wiederherstellung, 13 Fahrzeuglackierungen,
  Streckenwechsel, freigegebene alte WebGL-Kontexte, Speicherung ohne Änderung
  und der vollständige Offlinebetrieb haben eigene Browserprüfungen.
- Ein physischer iPhone-/Safari-Test ist noch offen. Die Draufsicht behält ihre
  bisherige Gestaltung. Die Boxenanlage ist Kulisse: Dieser Auftrag ergänzt
  keine Boxenstoppmechanik. Statische Lichtfarben und Kontaktflächen ersetzen
  dynamische Echtzeitschatten. Bei extremer freier Kameradrehung greift die
  dokumentierte Objekt-Ausblendung.
- Die verwaltete Testumgebung sperrt `file://` administrativ. Die identischen
  Paketdateien werden deshalb über lokale Testantworten bei vollständig
  abgeschaltetem Netzwerk geprüft, einschließlich Galerie → Rennen → Hauptmenü.
  Eine direkte lokale Dateiöffnung lässt sich hier nicht als Gerätetest bestätigen.

Die [Abnahmegalerie](../previews/bahrain-world/index.html) enthält ausschließlich
echte Spielaufnahmen. Nach `build:offline` und `build:arcade-offline` erzeugt
`node scripts/build-bahrain-review.js` ein eigenständig öffnungsfähiges Paket
unter `dist/bahrain-review/`. Darin `index.html` öffnen und die Testfahrt starten.
Alle Bilder und benötigten Spieldateien liegen bei; es wird kein Server benötigt.
CI bietet dasselbe Paket als `carpet-grand-prix-bahrain-review` an.

Die Abnahme findet auf dem Entwicklungsbranch statt. Ein Merge in `main` und die
damit verbundene GitHub-Pages-Veröffentlichung benötigen die ausdrückliche Freigabe.

## Folgeanpassung: Teppich und Rundbogentor

Die anschließende Nutzeranpassung mit Teppichfahrbahn, versetztem Rundbogentor
und geparkten Spielzeugautos ist in [bahrain-gate/README.md](bahrain-gate/README.md)
beschrieben. Die Abnahmegalerie zeigt diese neueste Fassung.
