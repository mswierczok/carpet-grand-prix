# Kampagnen-Grundlage

Ausgangsstand: `414ce81b057fe52138e7a4ba165677ef190609e6` (freigegebenes
Seilgleiten). Eigener Modus, eigener Speicher; kein Umbau der Rennsimulation.

## Einstieg und Umfang

`play.html` → **KAMPAGNE** → `campaign.html` → Redwood GP → einer von drei
Startfahrern → Startübersicht → `race.html?mode=campaign`.
Einzelrennen, 22-Rennen-Meisterschaft und der klassische Zugang bleiben separat.

Es wird genau das erste Bahrain-Wochenende bereitgestellt. Qualifying bleibt
optional: eine Auslaufrunde und zwei schnelle Runden allein auf der Strecke;
zwölf Gegner fahren ihre Zeiten mit dem bestehenden System im Hintergrund.
Danach starten 13 Fahrzeuge nach dem übernommenen Qualifying-Ergebnis.
Ohne Qualifying beginnt der Spieler wie bisher auf Platz 13.

Nach allen 13 Zieleinläufen wird das tatsächliche Ergebnis ohne Punkte,
Belohnungen oder Fortschrittsentscheidung als **Kampagnen-Zwischenstand**
gesichert. Der Spieler kehrt zur Kampagnenübersicht oder zum Hauptmenü zurück.
Ein neuer Start ersetzt einen bestehenden Kampagnenstand erst nach Bestätigung.

Der zentrale Pool in `src/data/campaign-config.js` enthält, in dieser Reihenfolge:

| Strecke | Schwerpunkt | Auswahlgewicht Tempo / Technik / Präzision |
| --- | --- | --- |
| Bahrain | Allround | 1 / 1 / 1 |
| Kanada | Tempo, Bremszonen | 3 / 1 / 1 |
| Russland | Brücken, fließende Linien | 2 / 1 / 2 |
| Korea | Brücke, technische Kurven | 1 / 3 / 2 |
| Frankreich | Enge Passagen, Präzision | 1 / 2 / 4 |
| Japan | Richtungswechsel | 1 / 3 / 1 |
| England | Kurvendichte | 1 / 3 / 2 |
| Italien | Kurvenkombinationen | 1 / 2 / 4 |

Das sind Auswahlgewichte für Fahreridentitäten, keine Geschwindigkeitswerte.
Die übrigen 14 Strecken, alle IDs, Geometrien und Assets bleiben erhalten.
Der Pool legt ausdrücklich keine Run-Länge fest und bietet noch keinen
Weiter-Button zur nächsten Station.

## Teams und Fahrer

Nur `t13` ist anfangs freigeschaltet. Alle anderen zwölf Fahrzeugkarten bleiben
sichtbar und gesperrt. Teamfähigkeit, Fahrzeugcharakteristik und Freischaltbedingung
sind als leere Erweiterungsfelder vorbereitet. Es gibt keine Freischaltlogik.

Nur die Kampagnenkopien verwenden Redwood **64** und Vespera **72**.
Die historischen Werte **72 / 64** und sämtliche vorhandenen Spielstände werden
nicht geändert. Die Renn-Engine erhält weiterhin ihre bisherigen Teamdaten;
Kampagnenprofile beeinflussen keine Beschleunigung, Höchstgeschwindigkeit oder Haftung.

| Startfahrer | Profil | Vorläufige Ausrichtung |
| --- | --- | --- |
| `d012` S. Colbe, FR, 18 | Hotshot | Lernen und Potenzial; unerfahren, unter Druck unsicher |
| `campaign-veteran-001` Mika Hartmann, DE, 38 | Routinier | Kontrolle und Konstanz; wenig rohes Tempo, begrenztes Potenzial |
| `d035` D. Kluszic, PL, 25 | Hitzkopf | Offensive und Mut; Risiko und geringe Konstanz |

Die drei Kampagnen-Einstiegsstärken 57 / 60 / 59 und Potenziale 88 / 64 / 79 sind
vorläufige Profilmetadaten ohne Simulationswirkung oder angezeigte Leistungsboni.
Die historischen Fahrerwerte werden dabei nicht umgeschrieben.
Der Routinier ist eine neue Identität; kein historischer Fahrer wird älter gemacht.

### Stabile 39er-Zuordnung

38 historische Identitäten plus der neue Routinier; alle ursprünglichen 92 Fahrer
bleiben im historischen Pool erhalten. Pro Team drei unterschiedliche Fahrer,
keine Doppelzuordnung oder Transfers. Die konkrete Zuordnung wird mitgespeichert.
Eine spätere Änderung dieses Konfigurationsschemas benötigt eine ausdrückliche
Migration und Versionsentscheidung.

| Team | Fester Pool |
| --- | --- |
| Vauclair Motorsport (`t01`) | `d001` Marcello Robin · `d002` V. Romi · `d003` Thi Wu |
| Alderwick Racing (`t02`) | `d004` Alvaro Savic · `d005` M. Callivaro · `d006` Malik Salvaro |
| Falkenheim GP (`t03`) | `d007` R. Dénes · `d008` N. O'Conner · `d009` N. Miguel |
| Scuderia Bellarossa (`t04`) | `d010` Dylon Hutton · `d011` A. Parelli · `d013` Dukuzuremyi |
| Eisenbach Motorsport (`t05`) | `d014` Y. Francais · `d015` F. Aristi · `d016` S. Evans |
| Orange (`t06`) | `d017` L. Anderson · `d018` G. A. Montoya · `d019` Valentino |
| Ragos Racing (`t07`) | `d020` Di Luccio · `d021` Li Young · `d022` Bezetti |
| Mugan (`t08`) | `d023` Janssen · `d024` H. Mokahashi · `d025` Kuno |
| Lincoln (`t09`) | `d026` Solim · `d027` Zacharias · `d028` Elfinso |
| Panther Racing (`t10`) | `d029` Sven N. · `d030` E. Pastelli · `d031` Felix N. |
| Rivage Racing (`t11`) | `d032` Budi · `d033` Kolwero · `d034` Z. H. Kung |
| Scuderia Vespera (`t12`) | `d036` Levio · `d037` Josuah · `d038` P. d. Grosso |
| Redwood GP (`t13`) | `d012` S. Colbe · `campaign-veteran-001` Mika Hartmann · `d035` D. Kluszic |

Die drei Poolplätze haben Tempo-, Technik- und Präzisionsaffinitäten
`[3,1,2]`, `[1,3,2]`, `[2,1,3]`. Redwood ordnet diese den Charakteren sinnvoll zu.
Die KI wählt das größte Skalarprodukt mit dem Streckenprofil. Bei Gleichstand
entscheidet die feste Poolreihenfolge, ohne Zufallsaufruf. Der Spieler behält
seine gewählte Identität. Startliste/Tower, Qualifying und Ergebnis zeigen die
Auswahl über einen optionalen Darstellungs-Callback der bestehenden Rennoberfläche.
Checkpoint-Teams und KI-Regler bleiben unverändert.

### Porträts und offene Illustrationen

Die Original-PNGs `assets/drivers/portraits/d001.png` bis `d035.png` bleiben
unverändert. Die Oberfläche verwendet ihre bereits vorhandenen WebP-Ableitungen;
jede Illustration bleibt genau ihrer Identität zugeordnet.

Eigene Illustrationen fehlen für:

| ID | Person | Benötigte Gestaltung |
| --- | --- | --- |
| `campaign-veteran-001` | Mika Hartmann, DE, 38 | Erfahrener, ruhiger Routinier; eigenständiges neues Porträt |
| `d036` | Levio, IT, 23 | Eigenständiges Porträt im Stil der Originale |
| `d037` | Josuah, NG, 23 | Eigenständiges Porträt im Stil der Originale |
| `d038` | P. d. Grosso, IT, 24 | Eigenständiges Porträt im Stil der Originale |

Diese Identitäten haben `portrait: null`. Der gemeinsame Bildbaustein zeigt
Initialen und **„Illustration folgt“**; keine geliehene Fahrerillustration und
kein als endgültig ausgegebenes SVG. Im aktuellen Einstieg ist der Platzhalter
des Routiniers sichtbar; die drei übrigen betreffen den vorbereiteten KI-Pool.

## Architektur und Speicherung

| Modul | Zuständigkeit |
| --- | --- |
| `data/campaign-config.js` | Pool, Teamkopien, 39 Identitäten, feste Zuordnung, Auswahlregel |
| `championship/campaign.js` | Neuer Stand, strikte Validierung, nativer Wochenend-Checkpoint, Ergebnisableitung |
| `persistence/campaign-store.js` | Eigener atomarer Speicher, Formatprüfung, Schutz vor fremden Tab-Schreibvorgängen |
| `ui/campaign-launch.js` | Team-/Fahrerwahl, Übersicht, bestätigter Neustart, JSON-Sicherung |
| `ui/campaign-view.js` | Fahrzeug-/Porträtbausteine, Fahrerbeschriftung, Zwischenstand |
| `ui/campaign-race-ui.js` | Kampagnen-Autosave und Ergebnisdarstellung in der gemeinsamen Rennseite |

Speicherkennung: **`carpet_gp_campaign_v1`**, Format-/Konfigurationsversion 1.
Gespeichert werden Team/Fahrer, Freischaltliste, alle festen Pools, Startliste,
Optionen, Phase, nativer `RaceWeekend`-Checkpoint und gegebenenfalls Ergebnis.
Keine neue Simulation, kein neuer Zufallsgenerator, keine Save-Migration.

Aktive Rennen speichern alle fünf Sekunden sowie beim Pausieren, bei
Phasenwechseln, beim Ausblenden/Verlassen und per Speichern-Button. Fortsetzen
restauriert den vorhandenen Checkpoint immer pausiert. Betriebssystem-/Browser-
Abbrüche ohne Ereignis können die letzten fünf Sekunden verlieren.

Ungültige, beschädigte oder neuere Formate werden erhalten und blockieren einen
neuen automatischen Start. Die Kampagnenübersicht erlaubt den Export des rohen
gespeicherten Inhalts zur Sicherung. Ein ausdrücklich bestätigter gültiger
Dateiimport kann ihn ersetzen. Fehlgeschlagene Prüfung, Quota-Fehler und inzwischen
veränderte Speicherwerte überschreiben nichts. Änderungen durch einen anderen
Tab verhindern den nächsten Autosave; die Oberfläche nennt Datei-Export als Ausweg.
Ein neuer Start verlangt funktionierenden Browserspeicher.

Die alte POV-Speicherkennung `carpet_gp_pov_game_v1` und der klassische Speicher
werden von diesen Modulen weder gelesen noch geschrieben. Gemeinsame Grafik-,
Schwierigkeits- und Lenkeinstellungen bleiben wie bisher geräteweit.

## Offline und Abnahme

`npm run build:arcade-offline` ergänzt
`dist/carpet-grand-prix-campaign-offline.html`. Die Datei enthält Auswahl **und**
Rennseite samt Bildern, Styles und Skripten. Der Queryparameter wählt die Ansicht;
der Dateipfad bleibt gleich, um unterschiedliche Storage-Bereiche lokaler
HTML-Dateien zu vermeiden. Die Offline-Menüdatei verlinkt diesen Zugang.
Bestehende Renndateien und der klassische Ein-Datei-Build bleiben nutzbar.

Die Browserprüfung schaltet das Netzwerk aus und liefert exakt die erzeugten
HTML-Inhalte. Eine echte `file://`-Navigation ist in der Arbeitsumgebung gesperrt;
deren Browserregeln und Safari auf einem physischen iPhone bleiben Geräteprüfungen.

Echte Spielaufnahmen liegen in [campaign/](campaign/): Hauptmenü, Teamwahl,
Fahrerwahl, tatsächlicher 3D-Start und Zwischenstand, jeweils Desktop/Mobil.
Die lange Integrationsfahrt verwendet unveränderte Qualifying-Runden und ein
über die öffentliche Engine-Option auf **eine Runde** verkürztes Rennen.
Alle 13 Fahrzeuge müssen selbst ins Ziel fahren. Der ausgelieferte Modus behält
die reguläre Bahrain-Rennlänge; der 3D-Start prüft diese normalen Einstellungen.

## Ausdrücklich offen

Run-Länge, Stationen/Map, Weiterreise, Sieg-/Niederlagenbedingungen,
Freischaltbedingungen, endgültiges Fahrer-/Teambalancing, Training, Teamfähigkeiten,
Items, Mitarbeiter, Synergien und Belohnungen sind weder festgelegt noch implementiert.
Vier neue Originalillustrationen sowie die echte iPhone/Safari-Abnahme stehen aus.
