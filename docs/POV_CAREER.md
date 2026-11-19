# POV-Spielstand, Teammeisterschaft und Werkstatt

Ausgangsbasis: `8b523af826fa4bede411040617ae2b98dcb46af2` (PR #38).
Auftrag: laufende Wochenenden fortsetzen, Meisterschaft anbinden und Werkstatt
integrieren. Die Zuordnung individueller Teamfahrer erfolgt ausdrücklich später.

## Spielablauf

Das Hauptmenü bietet „Fortsetzen“, „Meisterschaft starten“ und das bisherige
einzelne Rennen. Ein neuer Start ersetzt einen vorhandenen POV-Spielstand erst
nach bewusster Bestätigung. „Letzte Auswahl laden“ bleibt eine Auswahlhilfe.
Eine Meisterschaft startet in Bahrain, folgt den 22 bestehenden Kalenderindizes
und behält das gewählte Team. Team und Strecke sind im laufenden Karriere-
Wochenende gesperrt. Einzelrennen behalten ihre bisherige freie Auswahl.

Gespeichert werden Countdown, Qualifying mit Aufwärmrunde und beiden gemessenen
Runden, übernommene Startaufstellung, Rennen und abgeschlossene Ergebnisse.
Laden setzt die vollständige Sitzung **pausiert** fort. Gehaltene Eingaben werden
nicht übernommen. Kamera und Renderer werden neu aufgebaut; die Fahrzeug-/KI-
Zustände, Sektoren und Zeiten bleiben erhalten.

Normale Menüstarts aktivieren die Speicherung. Direkte `race.html`-Aufrufe bleiben
als unabhängige Fahrtests ohne automatische Spielstandänderung möglich. Im
Einstellungsdialog kann eine solche Fahrt bewusst gespeichert werden. Aktive
POV-Spiele sichern alle fünf Sekunden sowie bei Pause, Fokus-/Sichtbarkeitsverlust,
Seitenwechsel und Bedienaktionen. Zieleinlauf und Rennabschluss werden ebenfalls
gesichert. Ein harter Browser-/Geräteabbruch kann seit dem letzten erfolgreichen
Sichern vergangene Sekunden verlieren. Fehlgeschlagene Schreibversuche werden
gedrosselt und verhindern nicht die Fahrt; Export bleibt verfügbar.

## Zustandsformat und Modulgrenzen

`pov-game-store.js` verwendet ausschließlich `carpet_gp_pov_game_v1`. Klassische
Spielstände, Präferenzen und die bisherige POV-Auswahl behalten ihre Kennungen.
Das neue JSON enthält Version, Enginekennung, Modus, Team/Strecke, Einstellungen,
Wochenende, Karriere und Speicherzeit. Es gibt einen POV-Slot. Import/Export ist
im Menü und im Renn-Einstellungsdialog verfügbar. Auch ein beschädigter oder
neuerer lokaler Stand kann im Menü unverändert als Datei gesichert werden.

`pov-checkpoint.js` prüft bekannte Objekte und Pflichtfelder, Zahlenbereiche,
alle 13 eindeutigen Team-IDs, Fahrer-KI-Indizes, Runden-/Sektorstände, Grid,
Qualifying-Ergebnisse, Effekte, Kontakte, Brückenhöhen und begrenzte Historiendaten.
Negative Unendlichkeits-Sentinels der internen Effektzeitgeber erhalten einen
expliziten JSON-Wert und werden nur nach Prüfung wiederhergestellt. Ein Fingerprint
aus Enginekennung, Stammdatenquelle und Streckendefinition verhindert das Laden
in eine andere Geometrie. Bei inkompatiblen Änderungen muss die Enginekennung
bewusst angepasst oder eine Migration ergänzt werden.

`RaceSession`, `QualifyingSession` und `RaceWeekend` besitzen natürliche
`exportState()`-/`restore()`-Schnittstellen. Sie sichern zusätzlich zur sichtbaren
Pose auch vorherige Pose, Zeitrest, festen KI-Takt, Fahrgedächtnis, aktuelle
Kommandos, Kontakte, Windschatten und Aufholzustände. `race-gaps.js` exportiert
die noch wirksame Passagehistorie; verworfene, nicht mehr verwendete Samples
werden nicht mitgespeichert. Rechenfolge, Physik, KI-Regler und Effekte bleiben
bei normaler Fahrt unverändert. Kein Replay mit abweichender Physik, keine
generierten Gegnerzeiten und keine öffentlichen Test-Hooks.

Export liefert getrennte Daten ohne veränderbare Referenz auf die laufende
Simulation. Validierung verändert ihre Eingabe nicht. Bereits eigene, geprüfte
Daten benötigen keine zusätzlichen vollständigen Kopien. Die Speicherung hält
den zuletzt geprüften Rohtext, um unveränderte vorige Daten nicht bei jedem
Autosave erneut einzulesen. Geänderte/fremde Daten werden wieder geprüft.

Ungültige/neue Formate werden beim Lesen nicht überschrieben. Ein misslungener
Import verändert den vorhandenen Slot nicht. Gültige Imports werden geprüft,
bevor die bestehende Sicherung ersetzt wird. Schreiben erfolgt mit einem einzigen
`setItem`; bei Quoten-/Zugriffsfehlern bleibt der bisherige Inhalt erhalten.
Der JSON-Umfang ist auf rund vier Millionen Zeichen begrenzt; tatsächliche Browser-
Quoten können kleiner sein. Ein defekter Fortsetzungsstand führt in einen
sichtbaren Fehlerzustand mit Import-/Menüzugang, ohne eine neue Fahrt darüber
zu speichern. Alte Meisterschaften werden weiterhin über ihren eigenen Zugang
geladen; sie werden nicht automatisch in die POV-Karriere umgewandelt.

## Meisterschaft und Entwicklung

Ein Auto pro Team bedeutet zunächst ausschließlich eine **Teamwertung**. Es
werden keine Fahrer erfunden oder d001–d092 den Cockpits zugeordnet.
„Ergebnis übernehmen“ verbucht nur ein tatsächlich beendetes Rennen. Rundenindex,
Strecke und Ergebnisliste schützen vor doppelter Verbuchung, auch nach Neuladen.
Danach wird die nächste Strecke explizit gestartet. Nach 22 Rennen bleiben
Ergebnisse und Endwertung im Saisonarchiv; die nächste Saison beginnt in Bahrain.

Bestehende Regeln werden übernommen:

| Bereich | Regel |
| --- | --- |
| Punkte | 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 |
| Gleiche Team-Punkte | stabile bisherige Teamreihenfolge |
| Startkonto | 0 Credits, 0 F&E |
| Renneinnahmen | 2 + gerundet(Team-Punkte × 0,08) Credits |
| F&E | bestehende Rangtabelle, halbe Zuteilung nach Rennen 11, volle Saisonprämie nach Rennen 22; Kontolimit 260 |
| Saison-Credits | bestehende Rangtabelle 160 bis 112 |
| Entwicklungskosten | 60 + 27 × bisherige Entwicklungen Credits; 40 + 16 × bisherige Entwicklungen F&E |
| Fahrzeuggewinn | ursprüngliche Funktion `developGain` und vorhandene Konzeptgrenze |
| Limit | vier Entwicklungen pro Saison, maximal zwei pro Hälfte |
| Grundlagenforschung | einmal pro Saison, 115 F&E, +0,85 im schwächsten verfügbaren Bereich |

`pov-workshop.js` und `pov-workshop-ui.js` verbinden die vier Bereiche Aero,
Antrieb, Fahrwerk und Zuverlässigkeit mit Konten, Käufen, Saisonfortschritt und
Speicherung. Die Darstellung verwendet dasselbe Top-Down-SVG wie die bisherigen
Renn-/Werkstattfahrzeuge. Entwickelt wird vor Beginn eines Wochenendes; eine
bereits gefahrene Qualifikation sperrt weitere Käufe bis zum nächsten Wochenende.

**Fahrwirkungen sind noch nicht aktiviert.** Entwicklungen und Ausgaben werden
gespeichert und angezeigt; Höchsttempo, Beschleunigung, Grip und KI bleiben auf
dem abgenommenen Stand. Die Oberfläche erklärt das vor einem Kauf. Abbildung
der Fahrzeugwerte auf POV-Parameter und entsprechende KI-Entwicklung benötigen
die gesonderte Abstimmung. Es werden hier keine neuen Defekte, Fahrerwerte,
Alterungs-, Wartungs- oder Reglementmechaniken eingeführt. Die vollständigen
bisherigen Systeme bleiben im separaten klassischen Spiel erhalten.

## Prüfungen und Performancegrenzen

Modultests prüfen identische Fortsetzung vor und nach echten Renn-/Qualifying-
Schritten, Brückenfelder, beschädigte Daten, Speicherung ohne Altspielstand-
Änderung, eine ganze 22-Rennen-Saison, doppelte Ergebnisse, Saisonwechsel,
Entwicklungskosten/-limits und unveränderte Fahrphysik. Kosten/Gewinne werden
zusätzlich gegen die bisherigen Originalfunktionen geprüft.

Browserfälle fahren echte Runden mit normalen Tastaturbefehlen und prüfen
Fortsetzen über Menü/Neuladen, Qualifying-Zeiten/Grid, einmalige Punktevergabe,
Streckenfortschritt, Werkstatt, JSON-Import und beschädigte lokale Daten. Der
Offlinefall arbeitet bei ausgeschaltetem Netzwerk mit den vollständig erzeugten
HTML-Dateien. Desktop und Mobil haben eigene Karriere-CI-Jobs; bestehende
Menü-/Touch-/Grafikprüfungen laufen weiter. Keine Fixture wurde regeneriert.

`node scripts/measure-pov-save.js` misst Größe und CPU-Arbeit eines realen
100-Sekunden-Feldes mit 12 KI-Fahrzeugen und geparktem Spieler einschließlich
fünfsekündlicher Autosaves. Es prüft außerdem identische Fortsetzung nach Ablauf
der 90-Sekunden-Historie. [Rohprotokoll](pov-save/measurement.json) enthält
Quellprüfsummen und Messwerte. Der Speicheradapter arbeitet im RAM: Das misst
keine realen `localStorage`-Schreibzeiten, WebGL-Bildrate oder Handy-Performance.
Chromium-Mobilformat ersetzt keinen vollständigen Safari-Gerätetest. Bei lokalen
Offline-Dateien gelten die jeweiligen Browser-Storage-Regeln; JSON-Sicherung
bleibt als Ausweg verfügbar.
