# Phase 2 – räumliche Bahrain-Fahrprobe

Stand: 14. November 2026. Phase 1 wurde nach ausdrücklicher Nutzerfreigabe über
PR #15 nach `main` übernommen: `1b878b518bc537a4732d752725df5877830ac526`.
Die [Pages-Veröffentlichung](https://github.com/mswierczok/carpet-grand-prix/actions/runs/43643040775)
und die anschließenden Spieltests waren erfolgreich. Der veröffentlichte
Phase-1-Einstieg ist `https://mswierczok.github.io/carpet-grand-prix/arcade.html`.

Diese Fortsetzung liegt getrennt auf `codex/arcade-chase-world`. Sie erweitert
den Fahrtest um eine echte perspektivische Rennwelt und benötigt eine eigene
Merge-Freigabe. Die Grundlage bleibt die freigegebene
[Art Direction](arcade-phase0/ART_DIRECTION.md).

## Die spielbare Vorschau

`arcade3d.html` zeigt Bahrain aus einer leicht erhöhten Kamera hinter dem Auto.
Fahrbahn, Garnbegrenzungen, Holzrequisiten, Rennwagen, Reifen und Helm sind
räumliche Geometrie mit Tiefenpuffer. Das Fahrzeug fährt weiterhin frei über
dieselbe Bahrain-Geometrie. Kein Straßenstreifen-Effekt und keine mitgekippte
2D-Ansicht. Die Richtungstasten lenken relativ zum Fahrzeug.

- Alle 13 vorhandenen Lackierungen sind in derselben räumlichen Fahrzeugfamilie
  wählbar. Ihre unterschiedlichen Flächen und Muster werden übernommen.
- Die Kamera folgt der interpolierten Pose, glättet zeitbezogen und blickt bei
  höherem Tempo weiter voraus. Winkelgrenzen erzeugen keinen Flip. Reset und
  Übersicht setzen den Blick bewusst neu auf.
- Eine räumliche Gesamtübersicht zeigt die komplette Fahrbahn auch in schmalen
  Fenstern. Rückkehr zur Verfolgung erfolgt über dieselbe Schaltfläche.
- Tempo und Rundenzeit stehen zusätzlich direkt in der Fahransicht. Die
  Bildschirmtasten bleiben darin erreichbar, auch nach dem mobilen Scrollen.
- Die vorherige 2D-Fahrprobe bleibt unter `arcade.html` vorhanden. Beide
  Einstiege verlinken einander. Das klassische Spiel bleibt unter `index.html`.
- Bei fehlendem WebGL 2 startet die Fahrprobe in 2D. Bei Kontextverlust pausiert
  sie und löst Eingaben. Nach Wiederherstellung kann bewusst fortgesetzt werden;
  „Zur Draufsicht“ erhält die laufende Sitzung beim Darstellungswechsel.

Entwicklervorschau bei laufendem `npm run serve:test`:
`http://127.0.0.1:4173/carpet-grand-prix/arcade3d.html`.
Ein öffentlicher Pages-Link auf diese Datei funktioniert erst nach einem
gesondert freigegebenen Merge. Die Vorschau wird vorher als Download geliefert.

`npm run build:arcade-offline` erstellt beide Fahrtests. Im CI-Download
`carpet-grand-prix-arcade-preview` liegen drei HTML-Dateien. ZIP vollständig
entpacken und **`carpet-grand-prix-arcade3d-offline.html`** öffnen. Die beiden
anderen Dateien ermöglichen den Rücksprung in 2D und ins klassische Spiel.
Die 3D-Datei enthält Bibliothek, Materialien und Scripts; kein CDN ist erforderlich.

## Module und unveränderte Fahrregeln

| Datei | Aufgabe |
| --- | --- |
| `src/rendering/camera3d.js` | Reine Kameraberechnung aus Pose, Zeit und Ansichtsgröße |
| `src/rendering/materials3d.js` | Materialien, Texturen und begrenzte Lichtstufen |
| `src/rendering/vehicles3d.js` | Gemeinsame räumliche Form, individuelle Lackierungen, Reifen und Fahrerhelm |
| `src/rendering/tracks3d.js` | Fahrfläche aus derselben Polylinie, Garn, Startlinie und Requisiten |
| `src/rendering/arcade3d.js` | WebGL, Szene, Licht, Größen-/Qualitätswahl und Ressourcenfreigabe |
| `src/rendering/three-entry.js` | Ausschließlich Build-Einstieg für die geprüfte Bibliotheksauswahl |
| `src/vendor/three.js` | Reproduzierbar gebündelte lokale Three.js-Ausgabe mit MIT-Lizenz |
| `src/arcade-main.js` | Gemeinsame Sitzung; verbindet den gewählten Renderer mit derselben Steuerung |

`src/racing/` und die exportierten Strecken-/Fahrerdaten bleiben bytegenau auf
dem Stand von Phase 1. Es ändern sich weder Antrieb, Bremsen, Grip, Untersteuern,
Kontakte und Kontrollpunkte noch die Zeitmessung. Die 3D-Pose wird nur gelesen.
Es gibt keinen zusätzlichen Fahrerbonus, keine Fahrhilfe und keine versteckte
Ideallinienführung. Die Testfahrer existieren ausschließlich unter `tests/`.

Die Fahrfläche entsteht aus Segmentstreifen und äußeren Rundverbindungen.
Das bildet dieselbe Entfernung-zur-Polylinie-Regel ab, die die Physik nutzt.
Vollständige überlappende Kreisscheiben an jedem der 470 Punkte wurden durch
kleine Verbindungsfächer ersetzt. Das vermeidet unnötigen Overdraw. Fahrbahn-
breite und äußere Grenze stammen aus derselben Oberfläche. Dekorative
Gegenstände werden nur außerhalb des Fahrkorridors aufgestellt.

Die Wagenform verwendet die vorhandenen gemeinsamen Konturen als Baugrundlage,
extrudiert sie mit Fasen und ergänzt echte Reifen, Felgen, Achsen, Sitz, Helm
und Flügel. Jede Teamlackierung liefert ihre eigenen Flächen und Markierungen
für die Oberseiten sowie abgestimmte Seitenfarben. Darauf liegen Lichtstufen,
dunkle Konturen und neue gemalte Materialflächen. Es wird kein beliebiges
3D-Modell aus einer Fremdbibliothek eingesetzt.

## Stil und Herkunft

Die 35 Originalporträts bleiben unverändert. Der neue Materialatlas unter
`assets/world/arcade-materials.png` wurde mit dem Bildwerkzeug anhand von
d001 und der freigegebenen Phase-0-Stilprobe erzeugt: Wolle, gebrochenes Weiß,
Holz und Papier. Referenzen und Prüfsumme stehen in
[material-source.json](arcade-phase2/material-source.json).

Im Renderer werden Ausschnitte des Atlas als Materialtexturen verwendet und
für ruhigere Spielbarkeit mit Grundfarben abgemildert. Die Originaldatei bleibt
erhalten. Der Fahrgrund bekommt eine feinere, zurückhaltende Struktur, damit
kommende Kurven mehr Aufmerksamkeit erhalten als einzelne Teppichschlingen.
Neue Logos oder reale Sponsoren werden nicht eingeführt.

Diese erste 3D-Fahrprobe setzt die Materialrichtung technisch um. Sie ist noch
keine endgültige Freigabe der Grafikqualität aller Fahrzeuge oder Schauplätze.
Detailausbau, individuelle Figurenanimation und Werkstatt gehören zu späteren
Arbeitspaketen. Die Konzeptkunst wird nicht als laufender Screenshot ausgegeben.

Tatsächliche Browseraufnahmen:
[Fahransicht](../previews/arcade-phase2/race-view.png),
[Desktop](../previews/arcade-phase2/desktop-drive.png),
[Mobilformat](../previews/arcade-phase2/mobile-drive.png).

## Darstellung und Performance

- Keine Echtzeitschattenkarten oder aufwendige Nachbearbeitung. Ein leichter
  Kontaktschatten erdet den Wagen. Begrenzte Lichtstufen und Konturen bleiben
  unabhängig von Reflexions-/PBR-Systemen.
- In der dokumentierten Geradeausprobe 48 Zeichenaufrufe und 17.066 Dreiecke;
  die erste unnötig überlappende Fassung hatte 69.062 Dreiecke. Die Anzahl der
  sichtbaren Requisiten und damit Zeichenaufrufe variiert mit dem Blick.
- „Automatisch“ begrenzt Pixeldichte auf 1,5 und den Zeichenpuffer auf etwa eine
  Million Pixel. Bei länger großen Frame-Abständen wechselt die Darstellung in
  die sparsame Stufe. Manuelle Wahl ist ebenfalls möglich.
- „Sparsam“ begrenzt die Pixeldichte auf 0,75 und zielt auf 30 gezeichnete
  Bilder/s. Physik und Rundenzeit werden weiter bei jedem Animationscallback
  mit den unveränderten festen 1/120-s-Schritten fortgeschrieben. Der Renderer
  bekommt die Zeit seit dem letzten tatsächlich gezeichneten Bild für seine
  Kameraglättung. Das ist kein versprochenes Mindest-FPS auf beliebigen Geräten.
- In Pause wird nur nach sichtbaren Änderungen neu gezeichnet. Texturen und
  Geometrien werden wiederverwendet und beim Wechsel nach 2D freigegeben.

Die [reproduzierbare Softwaremessung](arcade-phase2/software-benchmark.json)
verwendet Headless-Chromium 155 / ANGLE SwiftShader, 1000 × 800 und „Sparsam“.
Ohne parallel laufende Browserprüfungen: 61 gemessene Frames, Median der echten
Bildabstände etwa 66,7 ms, p95 etwa 99,9 ms; p95 der CPU-Abgabe etwa 2,7 ms.
**Die verfügbare Software-GPU erreicht damit die geplante 30-FPS-Stufe nicht.**
Eine kurze CPU-Abgabe ist kein GPU-FPS-Nachweis. Reale Hardware-FPS und die
60-/30-FPS-Abnahme bleiben offen; die Softwarewerte werden nicht als bestandener
Leistungstest für Spielergeräte dargestellt. Anleitung zur Wiederholung und
Bibliotheksprüfung: [ARCADE_3D_DEPENDENCIES.md](ARCADE_3D_DEPENDENCIES.md).

## Tests und Grenzen der Abnahme

Abschließender lokaler Lauf: **67 Modul-/Integrationstests und 86 Browserprüfungen
bestanden**. Reproduzierbarer Bibliotheksvergleich sowie alle bisherigen und
neuen Offline-/Vorschau-Builds erfolgreich.

Die Standardtests umfassen 67 Fälle: die bisherigen 61 und sechs neue Prüfungen
für räumliche Kamera, Winkelgrenze, zeitabhängige Glättung, Reset, Übersicht und
die Deckung von gezeichneter Fahrfläche mit der Physik. Die Browserprüfung
ergänzt acht Fälle auf Desktop und im Pixel-7-Format:

1. Echte 3D-Geometrie, direkte Steuerung, 13 unterschiedliche Lackierungen,
   unveränderte klassische Browserdaten und begrenzte Szenenkomplexität.
2. Echter Kontextverlust über WebGL-Erweiterung, Pause, Wiederherstellung und
   bedienbarer Wechsel nach 2D.
3. Fahrbarer Einstieg bei absichtlich deaktiviertem WebGL 2.
4. Eine vollständige gültige Offline-Runde ausschließlich über Tastaturereignisse,
   ohne Randkontakt bis ins Ziel. Der beobachtete tatsächliche Kamerablick hält
   das Auto über die Runde im sichtbaren Bereich. Direkt im Ziel pausiert der Test.

Die lange Desktop-Runde wird bei 600 × 750 getestet, damit der Software-Renderer
die komplette Strecke innerhalb eines festen Testzeitlimits prüfen kann. Die
übrigen Desktopprüfungen behalten die normale Fenstergröße. Die Mobilfälle
verwenden das Pixel-7-Format. Virtuelle Testzeit prüft Fahrabläufe; sie ist kein
Performancebenchmark. Die separate Messung verwendet ausdrücklich echte Zeit.

Der bisherige klassische Modus, alle Original-PNGs und die Phase-1-Physik werden
zusätzlich auf unveränderten Quellstand geprüft. Keine Referenzwerte wurden
ersetzt. Es gibt weiterhin keinen neuen Speicherzugriff oder neues Speicherformat.
Das direkte `file://`-Öffnen bleibt durch die Richtlinie des verwalteten Browsers
gesperrt; der eingebettete Offline-Inhalt wird mit gesperrtem Netzwerk geprüft.

Zur Nutzerabnahme offen: Lesbarkeit beim Fahren, Blick durch enge Kurven,
grafische Nähe zu den Originalporträts und echte Geräteperformance. Bahrain ist
die einzige neue 3D-Strecke. Höhenprofile und Brücken in Korea/Russland sind
nicht umgesetzt; das ist keine Freigabe für einen Rollout auf alle 22 Strecken.
Gegner, Überholen, Runs, Items und neue Spielstände bleiben spätere Phasen.
