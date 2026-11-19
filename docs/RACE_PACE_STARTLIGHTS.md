# Boxengasse, Startampel und höheres KI-Tempo

Ausgangspunkt: `1d94d8f8c8433e891b4f38686d046ae6af2a80e5` (PR #43).
Die drei Verhaltensänderungen wurden ausdrücklich vom Nutzer beauftragt.

## Boxengasse

Die geöffnete Bahrain-Boxengasse wurde bislang vom gemeinsamen Physikkern als
Randfläche mit starker Verzögerung behandelt. Der neue Adapter `racing/pitlane.js`
erkennt ausschließlich explizit geöffnete Boxenkorridore (`pitRadius`). Dort gelten
normaler Grip und normaler Rollwiderstand mit einem Limit von **80 km/h**.
Windschatten und Aufholhilfe übersteuern dieses Limit nicht. Eine zu schnelle
Einfahrt wird über die normale Bremse auf 80 abgebremst, ohne Geschwindigkeiten
oder Positionen direkt zu überschreiben. Bei 119 km/h dauert das ungefähr 0,25 s.
Engere Ein-/Ausfahrten müssen weiterhin angemessen angebremst werden.

Der überlappende Bereich der Hauptstrecke behält sein ursprüngliches Verhalten.
Außerhalb der Boxengasse bleibt der dunkle Teppichrand langsamer. Kollisionen,
Streckendaten, Ziel- und Sektorlinien wurden nicht geändert. Ein räumlicher
Vorfilter vermeidet zusätzliche Streckenprojektionen weit abseits der Boxen.
Das Einfahrtschild nennt jetzt 80 km/h. Der Adapter funktioniert auch im freien
Fahrtest und in den statischen Offline-Ausgaben.

## Große Startampel

Fünf große Lampen ersetzen die zentrale Zahlenanzeige. Die erste Lampe leuchtet
beim Start rot, vier weitere folgen alle 0,6 s. Nach insgesamt unveränderten
3 Sekunden wechseln alle auf Grün; nach 2 Sekunden verschwindet die Anzeige.
Bis Grün bewegt sich kein Fahrzeug. Die kleine Bahrain-Streckenampel verwendet
denselben Zustand. Qualifying nutzt dieselbe Darstellung.

`race.startLights` ist ausschließlich abgeleitete Snapshot-Darstellung. Das
Spielstandformat sowie die intern bereits gespeicherte Countdown-Restzeit bleiben
unverändert. Pausen und Laden setzen dieselbe Leuchtphase fort. Die Anzeige fängt
keine Touch-/Mauseingaben ab und passt ins mobile Rennfenster.

## KI-Abstimmung

Alle vier Profile bremsen etwas später bzw. lenken präziser. Die Profile bleiben
unterschiedlich. Es gibt keine zusätzlichen Gegner-PS, Gripwerte oder höheren
Fahrzeuglimits. Überholen, Windschatten und Aufholhilfe bleiben unverändert.

Bahrain erhält eine gemessene Linienabstimmung für das neue Unterbett-Layout.
Die alte breite Experten-Linie verursachte unnötige Korrekturen und war sogar
langsamer als Schwer. Die geglättete neue Linie nutzt Scheitelpunkte gezielter.
Ein kleiner optionaler `pathBias` innerhalb des bestehenden Linienoptimierers
verkürzt die Strecke innerhalb des unveränderten Fahrbahnrandes. Die KI fährt
weiterhin mit normalen Steuerbefehlen durch dieselbe Physik.

| Bahrain, Mittel aus drei fliegenden Runden | Vorher | Jetzt |
|---|---:|---:|
| Anfänger | 34,267 s | 33,607 s |
| Normal | 33,225 s | 33,053 s |
| Schwer | 32,471 s | 32,200 s |
| Experte | 32,766 s | 31,833 s |

Im tatsächlichen Experten-Qualifying lagen zwölf Gegner vorher bei 32,728–33,135 s,
jetzt bei **31,845–32,376 s**. Alle fuhren eine Auslaufrunde und zwei schnelle Runden;
die Zeiten stammen aus echten Sektordurchfahrten. Es werden keine Zielzeiten
zugewiesen. Die berichtete Spielerzeit beträgt 31,576 s. Das ist ein Anhaltspunkt,
keine garantierte Schwierigkeit für jede Fahrweise oder jede Strecke.

Messwerte: [pace-summary.json](race-pace-startlights/pace-summary.json).
Reproduktion: `node scripts/measure-race-pace.js`; weitere Strecken über
`npm run measure:ai-balance -- --catalog`.

## Prüfung und Grenzen

- Vier komplette Experten-Runden auf allen 22 Strecken: jeweils ohne Seilkontakt
  und ohne dunklen Rand; gemeinsames Fahrzeuglimit 118,8 km/h.
- Vorher-/Nachher-Messung aller vier Bahrain-Stufen bei identischer Geometrie.
- Echte Experten-Qualifyings mit zwölf unabhängig simulierten Gegnern.
- Automatisierte Prüfung des Boxenlimits, normaler Streckenphysik, Rückwärtsgang,
  Bremsregelung bei Einfahrt sowie Startampel mit Pause und Wiederherstellung.
- Screenshots der tatsächlich laufenden Desktop-/Mobilansicht liegen im Ordner
  `docs/race-pace-startlights/`.

Die historischen Balancing-Referenzen bleiben erhalten und werden mit der
historischen KI ausgeführt. Neue Tests vergleichen die aktuelle Abstimmung mit
dem Ausgangsstand. Historische Physik-Replays ignorieren ausschließlich das neue
Startampel-Darstellungsfeld; ihre übrigen Zustände werden weiter vollständig
verglichen. Alte reine Grafik-Byteprüfungen erlauben jetzt die ausdrücklich
beauftragten Änderungen an KI-Profil und Linienplaner.

Die Mobilprüfung erfolgt in Chromium-Emulation; eine echte iPhone-/Safari-Fahrt
bleibt der letzte Praxistest. Der Entwicklungsbranch wird erst nach ausdrücklicher
Freigabe gemergt. Die öffentliche GitHub-Pages-Version bleibt bis dahin unverändert.
