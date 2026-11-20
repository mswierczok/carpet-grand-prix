# 21 weitere illustrierte Rennumgebungen

Ausgangspunkt: der freigegebene Bahrain-Stand `d5a9e933d648dc72e51ad3e029befecac92494db`.
Bahrains Aufbau, Materialien, Landmarken und Streckenverlauf bleiben erhalten.
Dieser Ausbau betrifft die übrigen 21 POV-Strecken. Der Roguelite-Ablauf wird
entsprechend der Nutzerentscheidung nicht erweitert.

## Umgesetzte Zuordnung

| Strecke | Bereich | Landmarken |
|---|---|---|
| Luxemburg | Helles Holzparkett | Holzklotzbrücke als Durchfahrt, Holzspielzeughäuser |
| Kanada | Schreibtisch | Bücherstapel, aufgestelltes Buch, Lineale und Stifte |
| Frankreich | Gesteppte Bettdecke | Papiertribüne mit Figuren, Kissen |
| Schweiz | Grauer Teppich | Berge aus dreieckigen Holzbauklötzen, Spielzeughäuser |
| Portugal | Balkon/Terrasse | Modellhäuser mit Stoffmarkisen, Topfpflanzen |
| Indien | Bedruckte Spielmatte | Offene Kunststoffröhre zum Durchfahren, Bauklotzstadt |
| Brasilien | Wohnzimmer | Pflanzen, Plüschbären, Sofa im Hintergrund |
| Südafrika | Terrassenplatten | Spielzeuggiraffe, Safari-Auto und Pflanzen |
| Korea | Schreibtisch | Lok und Wagen auf drei Holzbrückenspannen, Schreibzeug |
| USA | Dunkler Teppich | Spielzeug-Hochhäuser mit hellen Fenstern und fiktiven Schildern |
| Belgien | Unterbett-Bereich | Fahrbarer Abschnitt unter einem Bett, Spielzeugkisten |
| Schweden | Helle Dielen | Holzspielzeugstadt, Holzklotzberge |
| Deutschland | Technikschreibtisch | Bücher, Lineale und kleine Bauklotz-Boxen |
| Japan | Spielmatte | Modellstadt und befahrbarer Zukunftstunnel |
| China | Gemusterte Bettdecke | Große Spielzeugbrücke zum Unterfahren, Kissen |
| Russland | Holzfläche | Gestapelte Modellüberführungen, Holzstützen an den vorhandenen Rennbrücken |
| Australien | Terrasse | Spielzeuglandschaft mit Modellrampen und Safari-Spielzeug |
| England | Großer Zimmerteppich | Überdachte Bauklotz-Haupttribüne mit Figuren |
| Italien | Fliesenfläche | Durchfahrt durch ein Puppenhaus, kleine Markisenhäuser |
| Ungarn | Farbige Bettdecke | Befahrbarer Kissentunnel und weitere Kissen |
| Abu Dhabi | Sandfarbener Teppich | Gestufte Tribüne mit weißem Segeldach, Garnrollen |

Die Modellbahn in Korea ist ein eigenes Ensemble neben der Rennstrecke. Ein
breiter Querungsaufbau mit mehreren Stützen hätte dort andere Streckenarme
beeinträchtigt. Die schon vorhandene befahrbare Rennbrücke bleibt erhalten.
Der Spielzeugzug ist statisch. Australiens Modellrampen stehen außerhalb der
Rennfahrbahn; sie führen keine neue Sprung- oder Höhenphysik ein.

## Gestaltungsgrundlage

Die tatsächlichen Original-PNGs d001–d035 wurden als gemeinsame Kontaktübersicht
visuell geprüft. Ihre klaren dunklen Konturen, cremigen Weißtöne, kontrollierten
Akzentfarben und abgegrenzten Schattenflächen werden mit dem bereits in Bahrain
verwendeten illustrierten Modellbaukasten übertragen. Die Originalbilder und die
bestehenden Fahrzeuggeometrien/-lackierungen werden nicht verändert.

Alle neuen Objekte bestehen aus lokal erzeugter Geometrie und stilisierten
Materialkarten. Es gibt keine externen Modell-Downloads, realen Sponsorenlogos,
PBR-Materialien oder zusätzlichen Laufzeitbibliotheken. Holzmaserung, Stoffnähte,
Spielmatten und Plattenfugen bleiben vereinfacht und verwenden Mipmaps.

## Modulaufteilung

- `track-environments.js`: 21 feste Themen, Palette, Bodenart, Möbelzonen,
  Licht und Landmarkentypen. Raumabmessungen werden aus den tatsächlichen
  Streckengrenzen abgeleitet. Die bewährte Bahrain-Kameravoreinstellung wird
  auch hier verwendet; die allgemeinen Kameraregeln bleiben unverändert.
- `environment-layout.js`: deterministische Platzierung und Prüfung der
  vollständigen Requisitenflächen gegen alle Streckenarme, vorhandene Möbel
  und Raumgrenzen. Zusätzliche Abstände berücksichtigen die Abtastauflösung.
  Für Durchfahrten werden passende flache Abschnitte und freie Stützen gesucht.
- `calendar-assets3d.js`: neue Spielzeug-, Landschafts- und Durchfahrtmodule.
  Die vorhandenen Möbel, Figuren, Bauklötze und Tribünenteile werden wiederverwendet.
- `calendar-world3d.js`: Boden, unveränderte Straßen-/Seilgeometrie, Zimmer bzw.
  Terrasse, Höhenkulissen, Landmarken und Freigabe der Renderressourcen.
- `MasterBedroom3D`: wiederverwendeter Zimmeraufbau mit den bekannten relativen
  Möbelzonen. Optional fehlende Betten und angepasste Posterpositionen sind
  möglich; der bestehende Bahrain-Aufruf liefert dieselbe Darstellung.

Schreibtisch und Bettdecke sind erhöhte **Darstellungsplattformen**. Boden und
Zimmer liegen dort entsprechend tiefer. Fahrzeuge, Rundenzählung und Kamera
verwenden weiterhin dieselben Physikkoordinaten; bestehende Brückenhöhen in Korea
und Russland werden unverändert dargestellt. Die Zimmergrößen passen sich den
Streckenmaßen an. Es wird keine exakte reale Wohnungsgeometrie behauptet.

Statische Teile werden weiterhin je Material zusammengefasst. Pro Frame werden
nur Kamera und Sichtbarkeit aktualisiert. Geometrien, Materialien, Texturen und
WebGL-Kontexte werden beim Streckenwechsel freigegeben. Für erhöhte Unterlagen
werden die Zimmerschatten getrennt auf dem tatsächlichen Zimmerboden gesammelt.

## Durchfahrten und Kameraschutz

Sieben Themen besitzen neu gebaute Durchfahrten: Luxemburg, Indien, Belgien,
Japan, China, Italien und Ungarn. Die Stützen liegen außerhalb sämtlicher
Fahrkorridore. Die Dächer liegen über der Verfolgungskamera; die nominelle freie
Höhe beträgt mindestens 42 Einheiten. Tatsächliche Dachflächen werden zusätzlich
mit Sichtstrahlen geprüft. Im Hohlraum bleibt das Bauwerk sichtbar. Nur echte
massive Seiten- bzw. Dachbereiche fließen in den visuellen Kameraschutz ein.

Die Straßen- und Kollisionsdaten werden weder neu erzeugt noch verändert.
Dekorationen führen keine neuen Kollisionen ein. Der dunklere Rand behält seine
bisherige Wirkung. Die Anzeige nennt ihn außerhalb Bahrains passend zu den
verschiedenen Unterlagen jetzt allgemein „Randbereich“.

## Prüfung und Abnahme

[Galerie mit tatsächlichen Spielaufnahmen](../previews/calendar-environments/index.html)
zeigt je Strecke Startansicht, Übersicht und eine ausdrücklich als Detailkamera
gekennzeichnete Aufnahme der realen Spielszene. Die Detailkamera ist eine reine
Test-/Abnahmekamera, kein neuer Spielmodus und kein Konzeptbild.

Neue automatisierte Prüfungen:

- Alle 21 Szenen bauen mit endlichen Geometrien und identischen Fahrbahndreiecken.
- Requisitenflächen und tatsächliche niedrig liegende Modellpunkte bleiben frei
  von den Rennkorridoren; Durchfahrtsstützen und Dachhöhe werden separat geprüft.
- Rennkern, KI, Timing, Streckendaten und der abgenommene Bahrain-Assembler werden
  gegen den Ausgangscommit bytegenau geschützt.
- Alle Themen werden in echtem WebGL auf Desktop und Mobilformat geladen, mit
  13 Fahrzeugen. Der Grenzwert bleibt unter 90.000 Dreiecken, 190 Draw Calls und
  höchstens 160 Geometrien je geprüftem Startbild.
- Je Strecke wird eine tatsächliche Runde mit dem kompletten Feld gefahren.
  Alle 13 müssen mit gültigen Zeiten ankommen. Durchfahrten werden aus der
  echten Verfolgungskamera fotografiert. Die Testlänge von einer Runde wird nur
  über die öffentliche Sitzungsoption gesetzt; reguläre Rennlängen bleiben gleich.

Gemessene Maximalwerte der 21 Startaufstellungen: Desktop **68.262 Dreiecke,
152 Draw Calls, 130 Geometrien**; Mobilformat **67.134 Dreiecke,
145 Draw Calls, 123 Geometrien**. Die vollständigen Messungen und Quellprüfsummen
stehen unter [calendar-environments/](calendar-environments/qa-summary.json).
Diese Werte sind Geometrie-/Renderbudgets, keine Behauptung einer bestimmten
Bildrate auf einem echten iPhone.

Die neuen Browsertests laufen in eigenen, dreifach aufgeteilten CI-Gruppen je
Desktop-/Mobilprojekt. So verlängern sie nicht den bisherigen allgemeinen
Browserjob. Lokale gleichzeitige Playwright-Läufe benötigen getrennte
`--output`-Verzeichnisse; andernfalls löschen sie sich gegenseitig Trace-Dateien.

Die Mobilprüfung ist Chromium-Emulation. Eine echte iPhone-/Safari-Fahrt bleibt
Teil der persönlichen Abnahme. Die 3D-Gestaltung ersetzt nicht den weiterhin
funktionsfähigen 2D-Fallback. Die zusätzliche Schatten-/Möbelkomplexität und die
Themen-Lesbarkeit sollten bei der Abnahme besonders geprüft werden.

Reproduktion:

```
npx vitest run tests/unit/calendar-environments.test.js
CGP_ENV_TEST_GROUP=0 npx playwright test tests/browser/calendar-environments.spec.js
npm run build:offline
npm run build:arcade-offline
npm run build:calendar-review
```

Die letzte Ausgabe enthält eine eigenständig öffnungsfähige Galerie und alle
benötigten Offline-Spielseiten unter `dist/calendar-review/`. Der CI-Hauptjob
stellt sie als `carpet-grand-prix-calendar-environments` bereit. GitHub Pages
wird erst nach gesonderter Merge-Freigabe aktualisiert.

Der verwaltete Arbeitsbrowser sperrt `file://`-Aufrufe. Die Offline-Prüfung
liefert deshalb die unveränderten erzeugten HTML-Dateien aus dem Speicher am
erlaubten lokalen Testursprung aus, bei deaktiviertem Netzwerk. Galerie,
Bildwechsel, Spielstart, Streckenwechsel und Hauptmenü sind so auf Desktop und
Mobil geprüft. Eine direkte Dateiöffnung auf dem Endgerät ist damit nicht
behauptet; sie bleibt Teil der Nutzerabnahme.

## Boxendurchfahrt und vollständige Reparatur

Der Nutzer legt fest: **Bei einer Boxengassen-Durchfahrt soll das Fahrzeug
vollständig repariert werden, ohne Halt, Werkstattwahl oder Kosten.**

Der aktuelle POV-Modus besitzt jedoch noch keinen dauerhaften Schadenswert,
keine beschädigten Bauteile und keinen Reparaturzustand. Fahrzeugkontakte ändern
die unmittelbare Bewegung, nicht dauerhaft die Fahrzeugleistung. Deshalb wäre
eine Reparatur derzeit ohne Wirkung. Es wird kein neues Schadensmodell erfunden
und keine wirkungslose Reparaturanimation als Mechanik ausgegeben. Die Fahrzeuge
bleiben vollständig einsatzfähig. Diese Vorgabe gilt für einen später ausdrücklich
beauftragten Schadensausbau; der Roguelite-Ablauf bleibt bis nach der
Streckenabnahme zurückgestellt.

Die bisherige fahrbare Bahrain-Boxengasse mit 80-km/h-Limit bleibt unverändert.
Neue Boxengebäude in den anderen Umgebungen sind Dekoration; dieser visuelle
Ausbau öffnet dort keine neuen Servicefahrbahnen oder Abkürzungen.
