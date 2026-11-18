# Individuelle Hintergrundfahrer im Qualifying

Basis: veröffentlichtes Solo-Qualifying nach PR #35,
`0344fcc3bd89c2174c50803e110ff1221204065f`.
Der Spieler meldete in der Expertenstufe zwölf Bestzeiten von etwa 25,044 bis
25,046 Sekunden. Seine eigene Runde wird nicht zur Abstimmung herangezogen.

## Ursache

Die Hintergrundfahrten liefen bereits mit tatsächlichen Fahrzeugen, Physik,
KI und Sektorüberfahrten. Auf einer freien Strecke verwendeten jedoch alle
Gegner dieselbe Linien- und Geschwindigkeitsplanung. Die bisherige winzige
Indexvariation verschob hauptsächlich einen Tabellenzugriff und erzeugte
unter identischen Bedingungen beinahe gleiche Runden.

## Neue Fahrweise

`qualifying-drivers.js` erstellt pro Teamfahrzeug ein festes Fahrprofil.
Die vorhandene, unveränderte Team-Basisstärke gibt die Grundtendenz vor.
Ein stabiler Hash der Team-ID ergänzt Fahrstil und Ausführungsphase, sodass
eine andere Startreihenfolge die Eigenschaften nicht neu verteilt. Es werden
keine Fahrer aus dem klassischen Fahrerpool erfunden oder Teams zugeordnet.

- Unterschiedliche Bremsreserven greifen früher auf den kommenden Kurvenplan
  zu. Das Minimum aus aktuellem und vorausliegendem Ziel verhindert ein dadurch
  vorgezogenes Beschleunigen am Kurvenausgang. Die Reserve bleibt unter fünf
  Welteinheiten (1,5 Spielmeter).
- Kurvenvorsicht reduziert das normale Fahrziel in Kurven sowie beim Einordnen
  auf die Linie. Gerade diese gemeinsamen Einordnungsgrenzen hatten individuelle
  Unterschiede zuvor wieder auf denselben Wert zusammengeführt. Das zusätzliche
  Ziel bleibt zwischen 78 und 99,9 % des jeweiligen Kurven-/Einordnungsziels.
- Eine kleine kontinuierliche Ausführungsschwankung hängt von Fahrer und
  Streckenfortschritt ab. Weil sie sich nicht nach genau einer Runde wiederholt,
  können die beiden schnellen Runden unterschiedlich ausfallen.

Alle Effekte erzeugen ausschließlich normale Gas-, Brems- und Lenkbefehle.
Es gibt keinen Aufschlag auf fertige Rundenzeiten und keine Zuweisung von
Geschwindigkeit, Position oder Grip. Auf freien Geraden bleibt das volle
gemeinsame Tempo von 118,8 km/h möglich. Die Fahrzeugphysik und die gewählte
Schwierigkeitsstufe behalten ihre Parameter.

Die Profile sind nur während des Qualifyings aktiv. Der Spieler fährt weiter
allein, die zwölf Gegner laufen unabhängig im Hintergrund, ohne Verkehr,
Windschatten, Aufholhilfe oder Fahrzeugkontakt. Das normale Rennen und sein
bisheriges Tempo bleiben erhalten. Pause, Neustart, Verwerfen, Bestzeitenwertung,
Startlistenübernahme und Speicherkennungen werden nicht geändert.

Identische Bedingungen bleiben reproduzierbar: keine neuen Zufallsaufrufe und
keine Abhängigkeit von Spielerzeit oder echter Uhrzeit. Diese Stufe ergänzt
unterschiedliche Fahrer und Kurvenausführung, noch kein Wetter oder eine
zufällig wechselnde Tagesform zwischen Wochenenden.

## Vergleichsfahrten und Prüfungen

`scripts/measure-qualifying-drivers.js` vergleicht die veröffentlichten und
aktuellen drei Simulationsmodule mit derselben Physik und denselben Strecken.
Der Spieler steht und wird aus den Messwerten ausgeschlossen. Je Lauf werden
zwölf Gegner mit einer Auslaufrunde und zwei echten schnellen Runden gemessen.
Die Runde zählt ausschließlich durch die bestehenden Sektor- und Ziellinien.
Protokolle mit Quellprüfsummen: [qualifying-drivers/field.json](qualifying-drivers/field.json).

Messstand: 2026-11-18T15:11:03.276Z. Alle acht Läufe mit insgesamt 96
Gegner-Zieleinläufen wurden beendet, ohne beobachteten Rand- oder Seilframe.
Alle Läufe erreichen weiterhin 118,8 km/h Vorwärtsspitze. Die 17 aktuellen
Quellprüfsummen wurden vor und nach der Messung verglichen; die drei alten
Simulationsmodule sind zusätzlich mit ihren eigenen Prüfsummen bezeichnet.

| Strecke / Stufe | Bisherige Bestzeiten | Neue Bestzeiten | Streuung vorher → nachher |
| --- | ---: | ---: | ---: |
| Bahrain / Normal | 25,976–26,129 s | 26,061–26,855 s | 0,153 → 0,794 s |
| Bahrain / Experte | 25,044–25,046 s | 25,040–25,499 s | 0,002 → 0,460 s |
| Frankreich / Experte | 35,570–35,633 s | 35,729–37,452 s | 0,063 → 1,723 s |
| Russland / Experte | 37,497–37,497 s | 37,501–37,599 s | 0,000 → 0,099 s |

Auf Bahrain und Frankreich entstehen jeweils zwölf unterschiedliche angezeigte
Millisekundenzeiten. Auf Russland liegen die Werte weiterhin dichter zusammen:
zehn unterschiedliche Millisekundenwerte statt zuvor einem. Unterschiede hängen
vom Anteil der Kurven und der verwendeten Schwierigkeitsstufe ab. Gleiche Zeiten
dürfen weiterhin tatsächlich vorkommen; sie werden nicht künstlich auseinandergezogen.

Verglichen werden Bahrain auf Normal und Experte sowie Frankreich und Russland
auf Experte. Erfasst werden beide Runden, Bestzeit, Streuung, unterschiedliche
Millisekundenwerte, tatsächlich beobachtete Fahrbefehle, Rand-/Seilframes und
maximales Vorwärtstempo. Die eigenen Spielerrunden fließen nirgends ein.
Die Historienprotokolle früherer Abstimmungen werden nicht überschrieben.

Modultests sichern feste Eigenschaften trotz umgedrehter Teamreihenfolge,
unveränderte Stammdaten, begrenzte Ausführungsschwankungen, unterschiedliche
reale Bremsbefehle und ein volles Experten-Qualifying mit unterschiedlichen
Zeiten. Die vorhandenen Prüfungen der unabhängigen Hintergrundfahrten,
Startlisten, abgeschalteten Replays, Kontakte und Rennen bleiben erhalten.
Browserprüfungen beobachten die tatsächliche Bestzeitentabelle auf Desktop,
Mobil und offline und fahren anschließend mit der Startliste ins Rennen.

Dies ist eine technische Prüfung auf drei unterschiedlichen Strecken, keine
Kalibrierung anhand der gezeigten fehlerhaften Spielerrunde und keine Aussage
über menschliche Fahrleistung oder Geräte-FPS. Exakte Zeiten und Rangfolgen
sind Messergebnisse dieser Bedingungen und keine garantierten Platzierungen.

```sh
node scripts/measure-qualifying-drivers.js
npx vitest run tests/unit/qualifying-drivers.test.js tests/unit/qualifying.test.js tests/unit/arcade-race.test.js tests/unit/slipstream.test.js tests/unit/catchup.test.js
npm run build:arcade-offline
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/browser/qualifying.spec.js
```
