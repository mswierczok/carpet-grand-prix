# Master-Kinderzimmer und Bahrain

Ausgangsbasis: `6c66dfc5226592458b4fa2b4a52828c901452422` (freigegebener PR #41).
Branch: `codex/master-bedroom-bahrain`. Die übrigen Entwicklungszweige wurden
geprüft; nur der ältere Fahrerduo-PR #13 ist offen, ohne neuere POV-Funktionen.
Kein Merge ohne ausdrückliche Freigabe dieses neuen Umbaus.

## Stil und Raummaß

Die tatsächlichen d001–d035-PNGs wurden gemeinsam als Kontaktbogen und d001
zusätzlich in Originalauflösung betrachtet. Kräftige dunkle Außenkonturen,
vereinfachte Materiallinien, warme kompakte Schatten und cremefarbene Lichter
sind die Grundlage. Holz bekommt wenige Maserungsstriche; Stoff bekommt
Farbflächen, Falten und feine kurze Striche. Es gibt keine PBR- oder Fototexturen.
Die Originalporträts und die Fahrzeuglackierungen bleiben unverändert.

Einheit: **5 mm**. Der Rennwagen ist ungefähr 5,5 cm lang. Das Zimmer misst
6,25 × 5,35 m bei 2,75 m Höhe. Das ist ein großes Spiel- und Kinderzimmer.
Einzelbett: etwa 87 × 191 cm; Schreibtischplatte: 74 cm hoch;
Schrank: 190 cm hoch; Regal: 155 cm hoch. Die Unterkante des Bettgestells liegt
etwa 26 cm über dem Boden. Auf dem Schreibtisch bleibt eine zusammenhängende
Oberfläche für spätere Ideen. Diese Flächen sind jetzt **keine Rennflächen**.

Der Grundriss ist fest und wird nicht für jede Strecke neu erzeugt:

| Bereich | Position | Erkennbare Bestandteile |
| --- | --- | --- |
| Westwand | Bett | Rahmen, Füße, offener Unterraum, Matratze, Kissen, gefaltete gestreifte Decke |
| Nordostwand | Schreibtisch unter Fenster | Tischbeine, Schublade, Lampe, Bücher, Lineal, Stifte, Modellauto |
| Nordwand | Fenster | Echte Öffnung, Rahmen, Fensterbank, Vorhangfalten, stilisierte Außenkulisse |
| Ostwand | Schrank | Hohe blaue Fronten, Türen, Griffe, Holzabschluss |
| Südwand | Offenes Regal | Vier Ebenen, Bücher, Modellautos, Bauklotzmodell |
| Südost | Spielzeugecke | Bauklotzkiste, kleines Haus, dekorative Eisenbahn, Bausteine, sitzender Teddy |
| Mitte | Bahrain-Teppich | Begrenzter Teppich mit Saum und Fransen auf stilisiertem Laminat |

Die unveränderte Bahrain-Fahrfläche samt äußerem Korridor passt vollständig
auf den Teppich. Vollständige Möbelgrundflächen und die Tribüne werden gegen
alle Streckenarme geprüft; die großen Möbel überlappen einander nicht.
Die Haupttribüne steht an der Innenseite der Startgeraden. Ihre kompaktere
Tiefe lässt mindestens 6,29 Einheiten Abstand zum äußeren Fahrkorridor.

## Tatsächlich implementierte Bahrain-Objekte

- Die kleine offene Tribüne wurde durch drei zusammenhängende Bausteinmodule
  mit vier Sitzreihen, Spielzeugzuschauern und einem weißen geschwungenen
  Papier-/Stoffdach ersetzt. Die Dachform greift die wiederholten gespannten
  Überdachungen der mitgelieferten Yas-Marina-Fotoreferenz auf. Holzstäbchen
  treffen die tatsächliche Dachhöhe; keine realen Marken oder Fototexturen.
- Die Bauklotzboxen behalten ihre drei Öffnungen und erhalten echte kleine
  Reifenstapel zusätzlich zu den vorhandenen Werkzeugkisten und Beschriftungen.
- Das freigegebene Rundbogentor mit Dreiecksdach bleibt auf der ersten Geraden.
- Ein zusätzlicher rechteckiger Bauklotztunnel sitzt bei 88,2 % der Runde auf
  der Geraden vor der Startaufstellung. Seine Durchfahrt ist 64 Einheiten breit
  und mindestens 26 hoch; die Kamera bleibt auf Höhe 17.
- Garnrollen, Stoffdünen, Plüschkamel, geparkte Spielzeugautos, Flutlicht,
  Papierbanden, Startampel, Startboxen und Ziellinie bleiben erhalten.
- Die Fahrbahn bleibt **Teppich**, wie zuletzt ausdrücklich freigegeben.
  Heller Fahrstreifen, dunklere Randzone und übriger Teppich teilen dieselbe
  Faserstruktur; es gibt keinen Rückbau zur früheren lackierten Fahrbahn.
- Seile behalten ihre physische Dicke und ihre Konturpunkte. Gedrehte
  Textur, illustrative Ränder und Kontaktschatten bleiben rein visuell.

## Architektur des Baukastens

| Datei | Verantwortung |
| --- | --- |
| `src/rendering/environment-scenes.js` | Unveränderlicher Master-Grundriss und Bahrain-Konfiguration: Möbel, Teppichbereich, Farben, Bettwäsche, Licht, Sichtweite, Kamera und Landmarken |
| `src/rendering/environment-assets3d.js` | Wiederverwendbare Möbel, Bauklötze, Figuren, Bücher, Modellautos, Plüschobjekte, Tribünen, Papierdächer, Boxen, Tunnel, Lampen und Beschilderung |
| `src/rendering/master-bedroom3d.js` | Vier Wände, echte Fensteröffnung, Sockelleisten, Decke, Fußboden, Teppichsaum und vollständige Zimmerübersicht |
| `src/rendering/illustrated-materials3d.js` | Gemeinsam erzeugte Teppich-, Holz-, Stoff-, Laminat-, Seil- und Beschriftungskarten; Teppichfarben und Texte konfigurierbar |
| `src/rendering/illustrated-kit3d.js` | Gemeinsame Geometriequellen, örtliche Transformationen, Materialbatches, Konturen, kleine Detailgruppen und gebündelte Kontaktschatten |
| `src/rendering/bahrain-layout.js` | Geprüfte Platzierung der Bahrain-Landmarken und Möbel anhand der tatsächlichen, unveränderten `Surface` |
| `src/rendering/bahrain3d.js` | Zusammenbau von Strecke, Seilen, Markierungen, Zimmer und konfigurierten Modulen; keine Physik oder Speicherung |

`bahrain-materials3d.js` ist nur noch ein kleiner Kompatibilitätsadapter zur
allgemeinen Materialfabrik. Die Bibliothek kann ohne Bahrain-Simulation einzelne
Objekte bauen. Eine Asset-Instanz hat einen Typ, ihre Position und Drehung,
eine geprüfte Grundfläche und optionale Varianten, z.B. die Zahl der Tribünenmodule.

Beispiel für ein zusätzliches rein dekoratives Modul:

```js
const object = kit.object("zweite-tribuene", {x: 0, y: 0, ang: 0});
assets.build("grandstand", object, {bays: 2});
scene.add(object.finish());
```

Die Platzierung muss weiterhin durch die Flächenprüfung laufen. Eine veränderte
Modulzahl oder Skalierung benötigt passende Grundflächenangaben. `withTransform`
setzt lokale Position, Maßstab und Drehung bereits beim Aufbau in statische
Geometriedaten um. Die Szenenkonfiguration wird nicht in Spielstände geschrieben.

`bridgeDeck` und `rampElement` sind baubare, getestete **Darstellungsbauteile**.
Sie werden in Bahrain nicht platziert und besitzen keine Kollisions- oder
Fahrflächendaten. Eine spätere befahrbare Rampe, Schreibtisch-, Bett-, Unterbett-
oder Hamstertunnelstrecke benötigt ein eigenes freigegebenes Arbeitspaket.
Kein neuer Streckentyp oder Höhenwechsel wird hier still eingeführt.

## Kamera, Nebel und Licht

Der frühere Nebel begann nach 240 Einheiten und war bei 680 vollständig; die
Rennkamera schnitt bei 800 ab. Er versteckte einen großen Teil der Umgebung.
Bahrain verwendet jetzt 1.350–2.250 Einheiten sanften warmen Dunst und eine
Far-Plane von 2.100. Vier echte Zimmerwände ersetzen den offenen Horizont.
Alle anderen Strecken behalten ihre bisherigen Werte.

Die erste tatsächliche Spielprüfung zeigte: Die bisherige starke Neigung zum
Boden schnitt selbst nach Entfernung des Nebels die Tribünendächer und Möbel ab.
Deshalb ist **nur für Bahrain** der Kameraabstand von 26 auf 30 Einheiten und
der Blickvorsprung von 14 auf 52 erhöht. Höhe 17, FOV 55°, Kameraglättung,
Bedienoberfläche und Fahrzeugsteuerung bleiben gleich. `Camera3D.create()` ohne
Optionen liefert weiterhin dieselben Werte wie die veröffentlichte Version;
die Kamera der übrigen Strecken ist unverändert. Die Variante ist rein visuell.

Die Gesamtansicht passt das ganze Zimmer ein. Decke, Ost- und Südwand werden
nur in dieser Ansicht für einen üblichen Architektur-Aufklappblick ausgeblendet.
Die normale Rennansicht zeigt das geschlossene Zimmer. Die übliche Nahsicht-
Ausblendung verhindert weiterhin, dass eine frei gedrehte Kamera in einem
Dekorationskörper stecken bleibt; Durchfahrtsöffnungen sind ausgespart.

Goldene Lichtfarbe und die bestehenden gerichteten/Hemisphärenlichter bleiben.
Statische Objekte erhalten Lichtbänder einmalig als Vertexfarben. Es gibt keine
neuen Pointlights, Schattenkarten oder Bloom-Pässe. Lampen leuchten durch helle
Flächen; die Fensterszenerie ist eine stilisierte Papierkulisse.

## Performanceverfahren und Budgets

- Gleiche Grundgeometrien werden über den Kit-Cache wiederverwendet. Identische
  Papierdächer teilen eine vorbereitete Quellgeometrie.
- Statische Holz-, Stoff- und Farbflächen teilen einen Materialpass. Ein
  Dreiecksattribut wählt die vorhandenen Texturen; Licht ist bereits vorbereitet.
  So benötigen Bücher, Bausteine und Möbel keine eigenen Draw Calls pro Teil.
- Große tragende Holzflächen verwenden einfache saubere Kastenflächen;
  Stoff- und Plüschformen bleiben weich. Es werden keine Teppichfasern modelliert.
- Bücher, kleine Schreibtischobjekte und Zuschauer werden jenseits von 380
  Einheiten nicht gezeichnet (Regalinhalte erst ab 480). Möbel, Dächer und andere große Silhouetten bleiben
  sichtbar. Die Übersicht zeigt alle Details. Es gibt keine Auswirkung auf KI
  oder Kollisionen.
- Canvas-Texturen haben Mipmaps und zurückhaltende Detaildichte. Die bereits
  bestehende Sparsam-Pixelratio 0,65 für Bahrain bleibt unverändert.

Die ursprüngliche Grenze von 30.000 Dreiecken für den freien Test bezog sich
auf die kleine Umgebung ohne vollständiges Zimmer. Für den ausdrücklich
beauftragten Ausbau wird sie auf 45.000 gesetzt. Fahrzeug- und Funktionsprüfungen
bleiben erhalten. Das Startfeld hat ein gesondertes geprüftes Budget; die
konkreten Endwerte und vergleichbaren Speicher-/Zeitmessungen stehen in
[master-bedroom/paired-performance.json](master-bedroom/paired-performance.json).
Die bisherigen Grenzen anderer Strecken werden nicht pauschal erhöht.

Die Messung verwendet dieselbe echte pausierte 13-Fahrzeuge-Startaufstellung
und das gleiche Pixelbudget (DPR 0,75), jeweils zehn Aufwärm- und 30 Messbilder.
Beide Versionen werden über identische Testantworten ausgeliefert; die Vorher-
Scripte stammen aus dem genannten Commit. Kein Testadapter gelangt ins Spiel.
Erfasst werden Ladezeit, Weltaufbauzeit, Browser-Heap, eindeutige BufferGeometry-
Attribut-/Indexbytes, Texturzahlen, Draw Calls, CPU-Abgabe und synchronisierte
Renderzeit. Die Kameravariante gehört zur tatsächlich sichtbaren neuen Szene.

Heapwerte sind Chromium-Schätzungen; Geometriebytes sind die referenzierten
Szenenarrays und kein vollständiger GPU-Treiberspeicher. SwiftShader ersetzt
keinen iPhone-Grafikchip. Die Messung belegt keine garantierte Safari-Bildrate.

## Abnahme und Grenzen

Die Bilder entstehen ausschließlich aus regulären Tastaturfahrten im echten
WebGL-Spiel. Die beigefügte ältere Bahrain-Referenz beschreibt den bisherigen
leeren Miniaturraum; zusätzlich wird die zuletzt veröffentlichte Fassung auf
festem Commit an denselben Streckenstellen nachgefahren. Das ist kein Konzeptbild.
Das Dachdesign nimmt das mitgelieferte Tribünenfoto als architektonische
Inspiration, nicht als Textur oder realistische Streckenkopie.

Ein physischer iPhone-/Safari-Performancetest bleibt ausdrücklich offen.
Der vorhandene 2D-Rückfall behält seine bisherige Gestaltung. Die Miniatureisenbahn
und das Spielhaus sind Dekoration. Der Auftrag ergänzt keine Boxenstoppmechanik.
Einzelne hohe Möbelteile verlassen bei sehr naher Vorbeifahrt naturgemäß den
Bildrand; das ist keine Kameradurchdringung. Die Bibliothek erleichtert zukünftige
Szenen, simuliert aber keine befahrbaren Möbelflächen.

[Abnahmegalerie](../previews/bahrain-world/index.html). Nach beiden Offline-Builds
stellt `node scripts/build-bahrain-review.js` Galerie und spielbare Dateien unter
`dist/bahrain-review/` zusammen. Die entsprechende GitHub-Actions-Ausgabe heißt
weiterhin `carpet-grand-prix-bahrain-review`.
