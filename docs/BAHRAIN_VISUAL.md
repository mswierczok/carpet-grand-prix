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

Die Lichtstimmung verwendet warme gerichtete und Hemisphärenbeleuchtung,
flächige illustrative Schatten und helle Lampenflächen. Keine Schattenkarten,
Pointlights, Bloom-Pässe oder pro Faser modellierte Teppichgeometrie.
Die Teppichdetails werden in der Entfernung durch Mipmaps vereinfacht.
Fiktive Banden tragen u.a. „Sunstit​​ch“, „Loop & Co.“ und „Dune Thread“.

Die sichtbaren Seile folgen denselben Konturpunkten wie zuvor. Texturkoordinaten
orientieren sich an ihrer tatsächlichen Länge, wodurch die Windungen auch bei
unterschiedlichen Punktabständen gleichmäßig bleiben. Konturen und Kontaktschatten
sind rein visuell. Die 13 Startmarkierungen entsprechen den bestehenden Spawn-
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
