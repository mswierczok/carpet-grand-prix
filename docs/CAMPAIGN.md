# Frühere Kampagne: Wochenenden, Fortschritt und Ergebnisarchiv

Der aktuelle Hauptmenüpunkt startet jetzt die [Run-Kampagne](ROGUELITE_RUN_SYSTEM.md).
Dieser frühere Acht-Strecken-Stand bleibt unter `campaign.html` über den Bereich
„Spielstand“ des Run-Menüs erreichbar. Seine Daten werden nicht automatisch migriert.

Aktueller Ausbau auf Basis von `df1e716` (gemergte Kampagnen-Grundlage).
Die [historische Version 1](CAMPAIGN_FOUNDATION.md) dokumentiert den ersten
Bahrain-Zwischenstand und die weiterhin geltenden 39 Fahrerplätze.

## Ablauf

`play.html` → Kampagne → Redwood GP → einer von drei festen Fahrern → Bahrain.
Jedes neue Wochenende beginnt verbindlich mit einer echten Anfahrt und einer
schnellen Qualifying-Runde. Alte gespeicherte Qualifyings behalten ihre Auslaufrunde
und zwei schnellen Runden. Erst wenn alle 13 echten Hintergrundfahrer ihre
Zeiten beendet haben, übernimmt der Kampagnenadapter die Startaufstellung.
Das Rennen wartet danach **pausiert** auf „RENNEN STARTEN“.

Nach allen 13 Zieleinläufen wird das Ergebnis genau einmal archiviert. Über
„Kampagne fortsetzen“ geht es zur Übersicht und von dort auf eine offene Strecke.
Bahrain ist der feste Einstieg; danach ist die Reihenfolge frei:
Kanada, Russland, Korea, Frankreich, Japan, England und Italien.

Team, Spielerfahrer und die drei Fahrer pro Team bleiben erhalten. Die
bestehende streckenabhängige Auswahl bestimmt jeweils die KI-Startliste.
Eine bereits absolvierte Strecke kann in diesem Testfortschritt nicht erneut
gewählt werden. Nach Ausschöpfung des achtteiligen Pools erscheint lediglich
„Kampagnen-Teststand gespeichert“. Es gibt keine Run-Länge, Siegbedingung,
Meisterschaftspunkte, Belohnungen, Items, Freischaltungen oder Run-Map.

Die Kampagnen-Teamprofile bleiben Redwood 64 / Vespera 72; die historischen
Stammdaten bleiben 72 / 64. Die Teamprofile bestimmen nun die tatsächliche
Fahrzeugleistung neuer Wochenenden. Die Fahrerwahl verändert weiterhin keine
Fahrwerte. [Leistungsmodell und Formatkompatibilität](VEHICLE_PERFORMANCE_AND_QUALIFYING.md).
Die 92 historischen Identitäten und Originalporträts bleiben unangetastet.

## Getrennte Oberfläche

Die Übersicht zeigt Fahrer/Team, das letzte Ergebnis und die nächste Aktion.
Streckenwahl und Fortsetzen stehen beim aktuellen Kampagnenstand. Eine neue
Kampagne wird im Bereich **Spielstand** vorbereitet und ersetzt den vorhandenen
Stand erst nach bestätigter Team-/Fahrerwahl.

Weitere Bereiche: **Rennergebnisse**, **Strecken**, **Teams**, **Spielstand**.
Es stehen keine langen Ergebnistabellen unter der Übersicht.

Jeder absolvierte Grand Prix besitzt eine Archivkarte mit eigener Detailansicht.
Die Reiter Rennergebnis / Qualifying lesen ausschließlich gespeicherte Daten:
13 Fahrer, Team, Position, Zeit/Abstand und gegebenenfalls Startplatz.
Namen und eingesetzte Fahrer werden im jeweiligen Grand Prix eingefroren.
Ein späterer Wechsel der KI-Startliste schreibt historische Ergebnisse nicht um.
Öffnen, Umschalten und Schließen der Ergebnisansicht speichern nichts.
Bei alten Rennen ohne Qualifying erscheint ausdrücklich „nicht gespeichert“.

## Zustände und Version 2

Der Speicherbereich bleibt **`carpet_gp_campaign_v1`**. Der Name wird für
Kompatibilität beibehalten, der Inhalt besitzt jetzt **Formatversion 2**.
Klassik und POV-Meisterschaft verwenden unverändert ihre bisherigen Bereiche.

| Feld | Zweck |
| --- | --- |
| `teamId`, `driverId`, `rosters`, `unlocked` | Erhaltene Identität und feste Teamfahrer |
| `trackId`, `lineup` | Aktuelles Wochenende und dessen konkrete Fahrer |
| `options` | Bestehende Schwierigkeit, Aufholhilfe, Windschattenoption |
| `stage: ready` | Neue Strecke vorbereitet, noch keine Session gespeichert |
| `stage: weekend` | Native Session bzw. übernommenes Qualifying fortsetzbar |
| `stage: interim` | Aktueller Grand Prix beendet und archiviert |
| `weekend` | Unveränderter nativer `RaceWeekend`-Checkpoint |
| `completed` | Eindeutige, vollständige historische Grand-Prix-Datensätze |
| `result` | Aktuelles archiviertes Ergebnis, sofern beendet |
| `legacyWeekend` | Ausschließlich erhaltenes altes Rennen ohne Qualifying |

Jeder Archiveintrag enthält `id`, `trackId`, `recordedAt`, `qualifying` und
`order`. Die 13 Rennzeilen speichern Team-/Fahrer-ID, damaligen Fahrer-/Teamnamen,
Position, Zielzeit und Startplatz. Qualifying-Zeilen enthalten die entsprechende
Identität, Position und echte Bestzeit. Der unveränderte native Checkpoint hält
während des aktuellen Wochenendes zusätzlich die echten schnellen Runden.

Die Kennung ist innerhalb des aktuellen Testfortschritts `gp-<trackId>`.
Neue Archiveinträge erhalten den Zeitpunkt der ersten Ergebnisübernahme.
Bei v1-Daten dient das vorhandene `savedAt` als gespeicherter Datumsbezug;
fehlt er, bleibt die stabile Rennkennung verfügbar.

## Validierte Migration

`persistence/campaign-v1.js` hält den bisherigen strikten Validator fest.
Erst nach dessen erfolgreicher Prüfung wird ein v1-Stand in Version 2 überführt.
Die Migration erzeugt keine neuen Rundenzeiten und keine erfundenen Qualifyings.

| Alter Zustand | Verhalten |
| --- | --- |
| ready / ungestartete Aufstellung ohne Qualifying | Das neue Pflichtqualifying gilt |
| laufendes oder beendetes Qualifying | Exakter Checkpoint bleibt; fertiges Qualifying wird einmalig übernommen |
| übernommenes Qualifying / pausierte Rennaufstellung | Startplätze und Zeiten bleiben erhalten |
| bereits gestartetes Rennen ohne Qualifying | Darf als markierter Altbestand zu Ende gefahren werden |
| Bahrain-Zwischenstand | Echtes Ergebnis wird zum ersten Archiveintrag; nächste Strecke wählbar |

Die Ausnahme für ein schon gestartetes altes Rennen vermeidet den Verlust einer
laufenden Fahrt. Neustart und jedes folgende Wochenende verlangen wieder Qualifying.
Ein neuer Direktstart ist in der Kampagne weder sichtbar noch ausführbar.

Lesen/Migration verändert zunächst keine Rohdaten. Erst eine ausdrückliche Aktion
oder der bestehende Autosave schreibt den validierten neuen Stand atomar.
Defekte, unbekannte oder neuere Formate bleiben erhalten. Optimistische Prüfung
gegen den gelesenen Rohwert verhindert Überschreiben durch konkurrierende Tabs.
Fehlgeschlagene Speicherung weist auf Export hin. Ein nicht gesichertes Ergebnis
wird vor Verlassen ausdrücklich gemeldet.

Die Validierung schützt eindeutige Strecken, alle 13 Identitäten pro Ergebnis,
korrekte Teamzuordnung, Reihenfolge/Zeiten und die Übereinstimmung des aktuellen
Ergebnisses mit dem nativen Checkpoint. Wiederholtes Erfassen eines Endzustands
ändert das Archiv nicht; ein abweichendes Ergebnis derselben Strecke wird abgelehnt.

## Architektur

- `campaign.js`: Formatprüfung, Migration, Ergebnisaufnahme, nächste offene Strecke.
- `campaign-weekend.js`: dünner Ablaufadapter um genau eine native Rennsession.
  Keine eigene Physik, KI, Zeitmessung oder veränderten Rundenzahlen.
- `campaign-store.js`: eigener Speicher mit bestehender Schreibabsicherung.
- `campaign-launch.js`: kompakte Bereiche, Vorbereitung und Archivnavigation.
- `result-details.js`: gemeinsame Tabellenformatierung und lesender Archivdialog.
- `campaign-race-ui.js`: Kampagnen-Autosave und Verknüpfung zur Übersicht.

Qualifying-Abschluss und Startaufstellung werden sofort gespeichert. Der normale
Fünf-Sekunden-Autosave sowie Pause/Verlassen bleiben erhalten. Fortsetzen ist immer
pausiert. Bei einem harten Browserabbruch ohne Ereignis können die letzten fünf
Sekunden seit dem Autosave fehlen. Ohne Browserspeicher startet keine scheinbar
fortsetzbare Kampagne.

Ein Neustart betrifft ausschließlich das aktuelle noch offene Wochenende und
benötigt Bestätigung. Archivierte Ergebnisse bleiben gesperrt.

## Prüfung und Abnahme

[HUD, Menü, Abstände, Testmatrix und echte Aufnahmen](RACING_HUD.md).
Die durchgefahrene Browserprüfung absolviert Bahrain und Kanada mit jeweils
vollständigem Qualifying, allen 13 Zieleinläufen, Neuladen der übernommenen
Startaufstellung und Migration eines echten Bahrain-Ergebnisses in v1-Form.
Beide Archive bleiben nach erneutem Laden erreichbar und werden beim Ansehen
nicht verändert. Die Testfahrten verkürzen nur die Rennen über die öffentliche
Engine-Option auf eine Runde; die ausgelieferten Rundenzahlen bleiben erhalten.

Vier Illustrationen bleiben als ausdrücklich markierte Platzhalter offen:
Mika Hartmann sowie d036–d038. Ein echter iPhone-/Safari-Gerätetest steht aus.
