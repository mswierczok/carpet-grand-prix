# Windschattenkorrektur nach dem Fahrfeedback

Historischer Messstand von PR #32, noch ohne die spätere Startsperre und mit
80/90-km/h-Freigabe. Die aktuellen Regeln stehen in
[../SLIPSTREAM_START.md](../SLIPSTREAM_START.md). Die Messdaten bleiben unverändert.

Basis: veröffentlichtes `main` nach PR #31,
`a158c92f5f3d3cc8342da1bada9e2df5d7868fe5`.
Der Spieler meldete trotz sichtbarem Nahbereich nur 2–3 km/h Zusatztempo.

## Ursache und Korrektur

Die bisherige seitliche Gewichtung fällt schon bei zwei Welteinheiten
Versatz auf die Hälfte. Sie multipliziert die eigentliche Wirkung zusätzlich
mit diesem Faktor. Eine weitere Zeitkonstante von 0,65 Sekunden verzögert den
Aufbau, obwohl sich die Wagen bereits im vollen Entfernungsbereich befinden.

Jetzt erhält der ganze bisherige Eintrittskorridor (weniger als vier
Welteinheiten seitlicher Versatz) volle seitliche Wirkung. Die Eintrittsbreite
wurde nicht vergrößert. Die Zeitkonstante beim Aufbau beträgt 0,15 Sekunden.
Die sanfte zeitliche Ausblendung beim Ausscheren bis maximal sechs seitlichen
Welteinheiten bleibt erhalten, ebenso die harte Entfernungsgrenze ab sechs
Fahrzeuglängen. Eine bis drei Längen erhält volle Entfernungsgewichtung,
danach nimmt sie bis sechs ab.

Motor-/Luftwiderstandsformel, Höchstbonus von fünf km/h, Mindesttempo 80/90,
Brücken-/Nachbararmschutz, Kontakte, Kurvenbremsung, Aufholhilfe und Grafik
bleiben gleich. Geändert sind nur diese zwei Windschattengewichtungen und
die Cache-URL des Windmoduls. Klassisches Spiel, freie Fahrtests, Teams,
Strecken, Checkpoints und Spielstände werden nicht geändert.

## Vergleich mit dem veröffentlichten Code

[close-gain.json](close-gain.json) enthält zehn dynamische Fahrten mit fünf
seitlichen Versätzen und beiden Windmodulen. Beide Autos beginnen mit
118,8 km/h, drei Fahrzeuglängen zwischen den Mittelpunkten und inaktivem
Windschatten. Danach bewegen sie sich vollständig durch 120-Hz-Physikschritte
mit gehaltenem Gas. Ihre Posen oder Geschwindigkeiten werden nicht nachgeführt.
Ohne Aufholhilfe. Der alte Code wird ausschließlich in einer Test-VM geladen.
Altes Windmodul und aktuelle Quellen sind über SHA-256 bezeichnet.

| Seitlicher Versatz | Vorher: Vorteil nach 2 s | Korrigiert: Vorteil nach 2 s |
| --- | ---: | ---: |
| −3,9 / +3,9 | 0,008 km/h | 4,982 km/h |
| −2 / +2 | 2,187 km/h | 4,982 km/h |
| 0 | 4,529 km/h | 4,982 km/h |

Nach 1,5 Sekunden beträgt der korrigierte Vorteil bereits 4,912 km/h.
Der Abstand bleibt beim Zwei-Sekunden-Versuch zwischen einer und drei Längen.
Zusätzliche Regressionen prüfen neun Versätze einschließlich beider Seiten,
die unveränderten Eintritts-/Ausblendgrenzen und das sofortige Abschalten bei
sechs Längen während seitlicher Ausblendung.

Der Bonus ist gegenüber der eigenen unbeeinflussten Fahrt gemeint:
maximal 123,8 statt 118,8 km/h auf der Geraden bei gehaltenem Gas. Wenn auch
das vorausfahrende Auto Windschatten hat, beträgt die relative Differenz zu
diesem Auto entsprechend weniger. Bremsen, Kurven und der Bereich 80–90 km/h
senken weiterhin die Wirkung. Dies ist kein sofortiger Geschwindigkeitssprung.

## Vollständiges Feld und Browser

Die aktuellen A/B-Feldmessungen stehen getrennt in [field-ab.json](field-ab.json).
Je zwei Runden auf Bahrain, Frankreich und Russland, 13 tatsächliche Fahrzeuge,
Normal, Windschatten an/aus, Aufholhilfe auf beiden Seiten aus. Dieselbe
Physik, Kontakte und Zeitmessung wie im Rennen; der Spielertestpilot sendet
normale binäre Fahrbefehle. Die 19 Quellprüfsummen werden vor und nach dem
Versuch verglichen. Beobachtete Kontaktframes sind keine Zahl einzelner Unfälle;
die Messungen sind keine Aussage über menschliche Fahrleistung oder Geräte-FPS.

Messzeit: 2026-11-18T08:29:12.150Z, Messbasis identisch mit obigem main-Commit
zuzüglich der im JSON bezeichneten Arbeitsquellen. Alle 78 Zieleinläufe gelingen,
ohne beobachteten Seilkontakt. Spitzenwerte mit Effekt erreichen nun auch im
Feld praktisch den vorgesehenen Bereich von 123,8 km/h.

| Strecke | Spieler aus/an (s) | Letzter Zieleinlauf aus/an (s) | Spitze mit Effekt (km/h) |
| --- | ---: | ---: | ---: |
| Bahrain | 67,786 / 64,216 | 67,786 / 68,571 | 123,788 |
| Frankreich | 90,551 / 88,285 | 90,551 / 90,854 | 123,649 |
| Russland | 84,378 / 86,693 | 87,411 / 89,493 | 123,798 |

Kontakte, Überholwege und Kurven können den Rundenzeitgewinn aufheben. Die
Korrektur verspricht keinen pauschalen Zeitgewinn in jeder Rennsituation.

Die bestehenden Browserprüfungen decken den echten 3D-Batch, Pause, Neustart,
Streckenwechsel, Offlinefahrt und abgeschalteten Effekt auf Desktop und Mobil ab.
Lokal bestehen alle sechs dieser Browserprüfungen, die 32 gezielten Modul-/
Rennregressionen sowie der Offlinebuild.

```sh
node scripts/measure-close-wake.js
npx vitest run tests/unit/slipstream.test.js tests/unit/catchup.test.js tests/unit/arcade-race.test.js
node scripts/measure-slipstream.js bahrain france russia --output=docs/slipstream-full/field-ab.json
npm run build:arcade-offline
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/browser/slipstream.spec.js
```
