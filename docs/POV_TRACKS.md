# POV-Streckengrundlage – vier fahrbare Strecken

16. November 2026. Freigegebenes erstes Paket vor der Hauptspiel-Anbindung:
gemeinsame Aufbereitung und Auswahl sowie Luxemburg, Kanada und Frankreich.
Basis: veröffentlichtes `main` `e50dee17a07a315321485328f8625d4d660f18ce`.
Branch: `codex/pov-track-foundation`. Kein automatischer Merge.

## Spielbare Vorschau

Rennen, freies 3D-Fahren und Draufsicht bieten dieselben vier Strecken.
Im Rennen ist die Wahl vor dem Countdown möglich; „Neues Rennen“ gibt sie
wieder frei. Im freien Fahren startet ein Wechsel eine neue, pausierte Fahrt.
Team/Lackierung und Grafikstufe bleiben erhalten. Eingaben, Zeiten und
Fahrzeugzustände werden zurückgesetzt. Beschriftungen und Kamera passen zur
wirklich geladenen Strecke.

Direkte Einstiege verwenden beispielsweise `race.html?track=canada` oder
`arcade3d.html?track=france`. Links zwischen Fahrtest und Rennen übernehmen die
Auswahl. Unbekannte Kennungen starten mit dem sichtbar ausgewählten Bahrain.
Geänderte Laufzeitmodule erhalten neue URLs. Eine Prüfung gegen den letzten
veröffentlichten Stand verhindert gemischte alte/neue Module im Browsercache.
Alle drei Offline-HTML-Dateien enthalten ebenfalls alle vier Strecken ohne
weitere Downloads. CI-Vorschau entpacken und
`carpet-grand-prix-race-offline.html` öffnen.

## Originaldaten und Modulgrenzen

| POV-Kennung | Original-Kalenderindex | Name | Normierte Fahrbahnbreite |
| --- | ---: | --- | ---: |
| bahrain | 0 | Bahrain | 32,842 |
| luxembourg | 1 | Luxemburg | 35,596 |
| canada | 2 | Kanada | 38,394 |
| france | 3 | Frankreich | 29,795 |

`export-arcade-data.js` liest die statischen Originaldaten. Die Originalzeichnungen,
Sektoren, Boxengassen und Reihenfolge bleiben erhalten. Bahrain und Kanada sind
auch im POV-Modus geometrisch exakt unverändert. `TrackCatalog` stellt die
validierten Strecken bereit. Die nachfolgend beschriebenen, ausdrücklich
beauftragten POV-Anpassungen betreffen ausschließlich Frankreich und Luxemburg.

### Mehr Kurvenraum für Frankreich und Luxemburg

Folgepaket auf Basis von `main` `6348eb32e6c8acc403829f3c083c23adcfc45166`,
Branch `codex/pov-france-luxembourg-flow`. Frankreich wird deutlich, Luxemburg
behutsamer entzerrt; Frankreich bekommt zusätzlich mehr Fahrbahnbreite.

| POV-Strecke | Kurvenradien und Abstände der Mittellinie | Fahrbahnbreite | Rundenlänge vorher → nachher |
| --- | ---: | ---: | ---: |
| Frankreich | +40 % | +20 % | 2.731,661 → 3.824,325 |
| Luxemburg | +15 % | unverändert | 4.089,846 → 4.703,323 |

Werte sind interne Weltkoordinaten, keine Meterangaben. Die beiden statischen
POV-Profile trennen `layoutScale` von `roadScale`. `Surface` wendet sie **nach**
der ursprünglichen Einpassung an. Andernfalls würde die Normierung die zusätzliche
Kurvenweite wieder aufheben. Die komplette Mittellinie wird gleichmäßig um den
bisherigen Mittelpunkt vergrößert; alle Kurvenradien und Abstände wachsen im
gleichen Verhältnis. Kurvenfolge und Form bleiben erhalten. Sektorpositionen und
Boxengasse wachsen mit, die Fahrzeugabmessungen und Fahrphysik bleiben gleich.
Dies verlängert die tatsächlichen Fahrwege und damit voraussichtlich die Rundenzeiten.
Die Übersicht passt weiterhin die vollständige Strecke ins Fenster ein; die
Verfolgerkamera behält ihren bisherigen Abstand zum Fahrzeug.

Die Profile werden ausschließlich an die POV-Exporte angehängt. `index.html`,
klassische Geometrien, Kalender, Stammdaten und Spielstände bleiben unverändert.
Tests sichern Bahrain/Kanada samt Seilen gegen den vorher veröffentlichten Stand,
die tatsächliche Vergrößerung aller Kurven sowie Sektor-/Boxenausrichtung und
die vollständige Übersicht auch bei schmalen Fenstern ab.

Korea und Russland stehen noch nicht im POV-Katalog. Datenexport und Katalog
lehnen Brückenstrecken bis zur Umsetzung von Höhenebenen, Übergängen,
Kontakten und Kamera ab. Es werden keine flachen Kreuzungen vorweg freigeschaltet.

## Gemeinsame Seilaufbereitung

`boundaryData(track)` erzeugt dieselben geschlossenen Konturen für Darstellung
und Physik. Neue Kapselkoordinaten werden vor der Polygonvereinigung auf
0,000001 Streckeneinheiten gerundet, damit dichte Vorlagen keine numerisch
offenen Ringe bilden. Bahrains Polygone und beide Trennseile bleiben exakt erhalten.

`scripts/lib/pov-dividers.js` schließt die Übergänge zwischen benachbarten
Streckenarmen ausschließlich im Build. Es ordnet Hintergrundtaschen der Innen-
oder Außenseite der ursprünglichen Mittellinie zu, sucht sichere Wege im
dunklen Zwischenraum und schneidet sie an den tatsächlichen Randkonturen.
Mehrere Querungen ergeben einzeln verankerte Seilstücke. Ein minimales Netz
verbindet nur Bereiche derselben Streckenseite. Die helle Fahrbahn bleibt samt
Seilradius und Reserve frei. Nicht sicher schließbare Öffnungen lassen den
Build scheitern.

Nach der Entzerrung benötigt Luxemburg zwei zusätzliche Trennseile und Kanada
weiterhin eines. In Frankreich trennen die geschlossenen Randkonturen die
Streckenarme bereits vollständig; dort sind keine zusätzlichen Trennseile nötig.
Spieler erhalten nur die Koordinaten. Raster, Pfadsuche
und Polygonbibliothek laufen nicht im Spiel. Sichtbares Seil und Fahrzeugkontakt
verwenden dieselben Daten.

## Fahrzeugraum und KI

Auf der schmaleren französischen Strecke bleiben Überholspuren innerhalb von
Fahrbahnhalbbreite minus Fahrzeughalbbreite und Reserve. Bei Platzmangel laufen
die Ziele in engen Kurven unter Berücksichtigung des Lenkradius zusammen;
der vorhandene Verkehrsregler lässt die Autos folgen. Auf Bahrain ergeben
sich dieselben Ziele und exakt dieselben Fahrbefehle wie im abgenommenen Stand.
Das prüft eine Fahrt gegen den veröffentlichten Gegnercode.

Tempo-, Haftungs-, Brems-, Beschleunigungs- und Stilfaktoren bleiben gleich.
Die 3D-Modelle bleiben unverändert. Die Draufsicht verwendet eine feste
Fahrzeuggröße statt einer von der Straßenbreite abhängigen Größe. Das verkleinert
die bisherige Bahrain-Spritegröße geringfügig um rund 2,6 %; der gemeinsame
physische Prüfkörper wird nicht verändert.

## Streckenwechsel und Prüfungen

Ein Wechsel erstellt Sitzung und Kamera neu. Alte Geometrien, Texturen,
Materialien, Renderer und WebGL-Kontexte werden freigegeben. Eingabe und
Größenbeobachtung beziehen sich anschließend auf das neue Canvas. Eine gewählte
Draufsicht bleibt auch auf der nächsten Strecke aktiv. Nach Rennstart sind
Auswahl und programmatisch ausgelöste Änderungsereignisse gesperrt.

Neue Tests prüfen Originaldaten/IDs, Bahrain-Seile und Fahrregeln, tatsächliche
Seilquerungen vor/nach dem Schließen in beiden Richtungen und rückwärts, volle
Sektorbreite, 13 freie Startplätze, endliche 3D-Geometrie und Deckung mit der
physischen Fläche. Jede neue Strecke wird über drei echte Runden mit vollem
Feld gefahren. Browserprüfungen auf Desktop und Mobil testen 3D-Wechsel,
Kontextfreigabe, Team-/Grafikerhalt, Eingabelösung, Offline-Auswahl und vollständige
Tastaturrennen mit 13 Zieleinläufen. Das CI-Zeitlimit steigt für diese erweiterte
Matrix auf 35 Minuten. Bisherige Original-/Speicher-/Rennprüfungen bleiben erhalten.

## Weitere Integration

Dieses Paket verbindet noch keine Meisterschaftswerte, Qualifying,
Werkstatt-Upgrades oder 26 Fahrer mit dem POV-Rennen. Dafür folgen ein eigener
Adapter und eine weitere Vorschau. Klassisches Spiel und Spielstände bleiben
unverändert. Boxengassen werden als Originaldaten übernommen; zusätzliche
Boxenstoppmechaniken werden nicht vorweg implementiert. Individuelle Schauplatz-
Dekoration sowie echte Geräte-/Safari-/FPS-Abnahme bleiben eigene Schritte.
Virtuelle Testfahrten sind kein Nachweis einer bestimmten Hardware-Bildrate.
