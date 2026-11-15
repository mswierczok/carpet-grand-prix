# Geschlossene Seilränder und gültige Randrunden

Nachfolgende Korrektur: [Trennseile gegen Abkürzungen](ARCADE_SHORTCUTS.md).
Die hier dokumentierten Konturen und die Randrundenwertung bleiben erhalten.

15. November 2026. Nutzerauftrag: Keine ungültigen Rundenzeiten auf dem dunklen
Teppichrand; dessen Verlangsamung erhalten und die gezeigten Seilkreuzungen und
Knoten korrigieren. Ausgangspunkt: veröffentlichtes `main`
`d1beac627f741304f07e1029057da4cc3062912e`, Branch
`codex/clean-track-boundaries`. Betrifft ausschließlich `arcade.html` und
`arcade3d.html`. Klassische Simulation, Fahrer, Teams und Spielstände bleiben
unverändert. Die historischen Aussagen zur Rundenungültigkeit in Phase 1/2
werden durch diese ausdrücklich gewünschte Regel ersetzt.

## Verhalten

Jede vollständig über die 32 Kontrollpunkte gefahrene Runde zählt auch dann,
wenn das Auto zwischendurch auf dem dunklen Rand fährt. Start/Ziel und die
Kontrollpunkte erfassen die ganze Breite bis zur Seilgrenze. Die Reihenfolge
und die Sperre gegen rückwärts ausgelöste Kontrollpunkte bleiben erhalten.
`invalid` bleibt als kompatibles Zustandsfeld vorhanden, ist aber immer `false`;
abgeschlossene Runden haben `valid: true`. Die Oberfläche meldet keine ungültige
Runde mehr. Rollwiderstand, geringerer Grip und Tempoverlust auf dem dunklen
Teppich behalten ihre bisherigen Koeffizienten. Auch Lenkung, Rückwärtsgang,
Fahrzeugmaße und die übrigen Fahrparameter werden nicht neu abgestimmt.

## Ursache und Korrektur

Die bisherigen zwei seitlich versetzten Linien überschnitten sich in engen
Kurven und zwischen nahe beieinanderliegenden Streckenarmen. Die zusätzliche
Spline-Glättung verschärfte die Dreiecke und quer laufenden Seile. Der neue
Generator vereinigt die Kapseln um alle 470 Segmente der ursprünglichen
Mittellinie. Der Radius bleibt `width * 0.85`, für Bahrain
27,915810396 Streckeneinheiten. Die Mittellinie und Fahrbahnbreite ändern sich
nicht. Aus der Vereinigung entstehen eine Außenkontur und drei geschlossene
Inselkonturen. Die Vereinfachung verwendet 0,08 Streckeneinheiten Toleranz;
bei erkannten Kreuzungen würde der Generator auf die exakte Kontur zurückfallen.

Die versionierten Koordinaten stehen in `src/data/arcade-boundaries.js`.
`BoundaryField` erzeugt daraus dieselben Grenzen für dunkle Fläche, 2D-Seile,
3D-Seile und Fahrzeugkontakt. Der 3D-Schlauch folgt den Polygonkanten ohne
überschwingenden Spline. Das ganze gedrehte Fahrzeugrechteck wird gegen die
Kontur einschließlich des Seilradius von 0,8 geprüft: Ecken, Kanten und im
Rechteck eingeschlossene Inselspitzen. Eine entfernte falsche Seillinie hinterlässt
dadurch keine unsichtbare Kollisionswand. Bei auseinanderlaufender lokaler
Fortschrittsschätzung wird der nähere Streckenarm verwendet; die Fahrzeugposition
wird dabei nicht versetzt. Die Rundenwertung bleibt an geordnete Kontrollpunkte
gebunden.

## Vorschau und Vergleich

`previews/track-boundaries/index.html` zeigt fünf frühere Engstellen und eine
Übersicht mit dem tatsächlichen gemeinsamen Spielrenderer. Es handelt sich um
statische Kamerapositionen, nicht um einen Testzugang zur laufenden Simulation.

| Stelle | Vorher | Nachher |
| --- | --- | --- |
| Spitzkehre | [Aufnahme](../previews/track-boundaries/before-hairpin.png) | [Aufnahme](../previews/track-boundaries/after-hairpin.png) |
| Benachbarte Geraden | [Aufnahme](../previews/track-boundaries/before-straights.png) | [Aufnahme](../previews/track-boundaries/after-straights.png) |

[Gesamtübersicht](../previews/track-boundaries/overview.png).
Die Vorher-Bilder verwenden ausschließlich per Test-Routenabfang den Renderer
und das Three-Bundle des genannten Ausgangscommits. Gleiche Posen, gleiche Kamera,
gleiche Daten; Herkunft und Bildgröße stehen in
`previews/track-boundaries/capture.json`. Kein Produktions-Testhook.

## Build und Abhängigkeiten

`npm run build:arcade-boundaries` erzeugt die Koordinaten;
`npm run check:arcade-boundaries` prüft sie bytegenau gegen einen frischen Export
der Originalstrecke. Der zweite Befehl läuft auch in CI. Nach einer künftig
genehmigten Änderung der Mittellinie muss der Export erneuert werden.

Neu ist ausschließlich beim Entwickeln **polygon-clipping 0.15.7 (MIT)**,
exakt gepinnt, 350.159 entpackte Paketbytes. Die Lockdatei enthält zusätzlich
**robust-predicates 3.0.3 (Unlicense)** und **splaytree 3.2.3 (MIT)**.
Die vollständigen Texte liegen unter `licenses/`. `npm audit --json` meldete
nach der Installation null bekannte Meldungen in allen Schweregraden.
Alternativ wäre eine eigene Polygonvereinigung zu pflegen; die geprüfte Bibliothek
wird nur zum Erzeugen der Daten verwendet. Spieler laden keine dieser Bibliotheken,
sondern 14.454 Bytes statische Koordinaten. Es gibt keine zusätzliche Laufzeit-
Paketinstallation oder CDN-Verbindung.

Das bestehende lokale Three.js 0.187.0 exportiert nun `Curve` und `ShapeUtils`
anstelle von `CatmullRomCurve3`. Der reproduzierbare Bundleumfang ist 604.285 Bytes.
Neue Script-Versionen verhindern die Kombination mit einem alten Browsercache.
Beide eigenständigen Arcade-HTMLs enthalten sämtliche neuen Dateien inline.

## Prüfung und Grenzen

Die sieben neuen Modultests prüfen Reproduzierbarkeit, geschlossene und
kreuzungsfreie Konturen, tatsächliche 3D-Seilpunkte, Flächen-/Kollisionsübereinstimmung,
Rechteckkontakte einschließlich Inselspitzen, freie Mittellinie und eine gültige
Runde über sämtliche dunklen Kontrollpunktränder. Alle 82 Standardtests bestehen.
Bestehende Referenzen und der Quelltextschutz des klassischen Spiels bleiben erhalten.

Die Browserprüfungen erweitern die bestehenden Tastatur-Runden um einen real
gefahrenen Abstecher auf den dunklen Rand; anschließend muss die Runde in 2D und
im netzwerkfreien 3D-HTML gültig enden. Die Engstellenvorschau wird auf Desktop
und im Mobilformat mit tatsächlichem WebGL geprüft. Steering-/Rückwärtsprüfungen
laufen unverändert mit. Ergebnisse des Browserlaufs werden im PR dokumentiert.
Die Testuhr wird vor dem Laden der Grafik angehalten: Unter Software-WebGL
konnte die bisherige spätere Pause gelegentlich ein schon vergangenes Datum
erwischen. Diese Korrektur betrifft ausschließlich die Testinstrumentierung.

Browserprüfungen verwenden hier Software-WebGL. Keine neue Aussage zu Hardware-FPS,
Safari oder echten Mobilgeräten; die Grenzen der Phase-2-Abnahme bestehen fort.
