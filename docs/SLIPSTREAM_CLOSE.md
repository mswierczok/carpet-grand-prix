# Näherer, spürbarer Windschatten: +5 km/h

Freigegebene Anschlussabstimmung auf Basis des veröffentlichten `main`
`f40de2d3f45fc6697dac04f2e4a3a73e0148e3b9` nach PR #30.
Der Nutzer wünscht die volle Wirkung im sichtbaren Nahbereich und keinen
Windschatten mehr ab sechs Fahrzeuglängen.

Aktualisierung nach dem Fahrfeedback zu PR #31: Der ganze seitliche
Eintrittskorridor erhält jetzt die volle Wirkung; die bisherige zusätzliche
Abschwächung zur Seite entfällt. Der Aufbau wird von 0,65 auf 0,15 Sekunden
Zeitkonstante verkürzt. Reproduktion und Messergebnisse:
[slipstream-full/README.md](slipstream-full/README.md).

Die anschließende Startfreigabe ab 100 km/h und sieben Rennsekunden beschreibt
[SLIPSTREAM_START.md](SLIPSTREAM_START.md).

| Abstand zwischen den Fahrzeugmitten | Neue Wirkung |
| --- | --- |
| Unter einer Fahrzeuglänge | Kein Windschatten; kein Kontakt-/Überlappungsbonus |
| Eine bis drei Fahrzeuglängen | Volles Abstandspotenzial: bis zu +5 km/h |
| Über drei bis unter sechs Fahrzeuglängen | Glatt bis null abnehmende Gewichtung |
| Sechs Fahrzeuglängen und mehr | Kein aktiver Windschatten, auch keine Ausblendverlängerung |

Die bisherige Abstandsmessung zwischen den Mittelpunkten bleibt erhalten.
Eine Fahrzeuglänge sind 10,8 Welteinheiten (3,24 Spielmeter). Sechs Längen sind
64,8 Welteinheiten. Der Grenzvergleich berücksichtigt nur die unvermeidliche
Gleitkomma-Rundung im Nanometerbereich.

Seitlicher Korridor, Fahrtrichtung, Brücken-/Nachbararmprüfung, Kontakt- und
Zieleinlaufregeln bleiben erhalten. Die aktuelle Freigabe benötigt bei beiden
Autos mindestens 100 km/h vorwärts und sieben Sekunden Rennzeit ab Grün.
Countdown und Pause zählen nicht. Unter 100 km/h endet auch ein bereits
aktiver Effekt. Ab der Freigabe gilt die volle Geschwindigkeitsgewichtung;
die bisherige Rampe zwischen 80 und 90 km/h entfällt. Innerhalb von weniger als vier Welteinheiten seitlichem
Versatz gilt die volle seitliche Gewichtung. Der Effekt baut sich mit einer
Zeitkonstante von 0,15 Sekunden auf. Seitliches Ausscheren blendet innerhalb der erlaubten
Entfernung weiter sanft aus. Bei sechs Längen wird der aktive Zustand sofort
null; er lebt nicht mehr wie zuvor bis neun Längen weiter.

Auf freier Gerade und bei gehaltenem Gas ergibt voller Windschatten höchstens
**123,8 statt 118,8 km/h**. Es bleibt ein physischer Vorteil aus reduziertem
Luftwiderstand und dem vorhandenen Motorbegrenzer, keine unmittelbare Zuweisung
eines Zieltempos. In Kurven, beim Bremsen oder außerhalb des seitlichen
Eintrittskorridors ist der Geschwindigkeitsgewinn entsprechend kleiner. Bereits vorhandenes
Zusatztempo klingt nach Verlassen des Bereichs durch normale Kräfte ab;
die Geschwindigkeit springt nicht schlagartig zurück. Dabei sind die
Widerstandsreduktion und die sichtbaren Wirbel schon ausgeschaltet.

Die Heckwirbel beginnen weiterhin am Heckflügel und reichen nun bis ungefähr
drei Fahrzeuglängen hinter die Fahrzeugmitte. Das entspricht dem Bereich mit
voller Abstandsgewichtung. Sichtbarkeit und Stärke kommen weiterhin ausschließlich
aus dem tatsächlich wirksamen Windschattenzustand. Der feste 3D-Batch behält
seine Vertexzahl, höchstens einen zusätzlichen Draw Call und keine neuen Texturen.
Die 2D-Ausweichansicht verwendet dieselben verlängerten Kurven.

Spieler und KI verwenden dieselbe neue Abstimmung. Die KI liest den erweiterten
Geradenspielraum bereits aus der gemeinsamen Einstellung; ihre Kurvenziele
werden nicht angehoben. Die kürzlich eingeführte Aufholhilfe bleibt bei ihren
bisherigen Positions-/Zeitregeln und maximal 1,2 %. Ihr kombinierter oberer
Bereich mit vollem Windschatten beträgt nun höchstens 125,2256 km/h.

Klassisches Spiel, freie Fahrtests, Streckengeometrie, Checkpoints, Runden,
Teams, Fahrer und Speicherformate bleiben erhalten. Die geänderten Laufzeit-
dateien werden unter neuen URLs geladen, damit ein Browser keine alten
Windschattenparameter mit der neuen Wirbelgeometrie mischt.

Die stärkere Wirkung machte außerdem einen bestehenden engen Rückstau-Fall
sichtbar: Eine KI konnte zu nah hinter einem stehenden Fahrzeug bremsen und
hatte dann keinen Platz mehr, auf ihre freie Ausweichlinie einzulenken.
Nach 1,2 Sekunden tatsächlichem Stillstand in dieser engen Situation nutzt sie
jetzt die vorhandene kurze Rückwärtsbefreiung, weiterhin mit normalen Pedal-/
Lenkbefehlen und Prüfung des dahinter belegten Raums. Freie Runden, KI-Profile
und Brems-/Kurvenziele werden dadurch nicht schneller gestellt. Der unveränderte
Regressionstest mit stehendem Spieler beendet wieder alle zwölf KI-Rennen;
zusätzlich wird freies gegenüber belegtem Heck gezielt geprüft.

## Prüfungen und Messungen

Modulprüfungen sichern die volle Wirkung bei 1 / 1,5 / 2 / 2,5 / 3 Längen,
die abnehmende Wirkung bis 5,999 Längen und den harten Stopp ab genau sechs
einschließlich bereits aktiver Quellen. Ein tatsächlicher Verfolger fährt
mit normalen Physikschritten aus vier Längen heran und erreicht vor dem
Kontaktbereich mehr als 4,9 km/h Vorteil. Weitere Kraftprüfungen sichern
den oberen Wert und den sanften Geschwindigkeitsabbau, auch gemeinsam mit
maximaler Aufholhilfe. Die Brücken-/Nachbararmprüfungen aller 22 Strecken
und die bisherigen abgeschalteten Replays bleiben erhalten.
Zusätzliche dynamische Versuche beginnen ohne aktiven Effekt bei drei Längen
Abstand, jeweils mit neun Versätzen zwischen −3,9 und +3,9 Welteinheiten.
Sie erreichen mehr als 4,9 km/h nach 1,5 Sekunden und mehr als 4,98 km/h
nach zwei Sekunden, ohne Kontaktbereich oder Geschwindigkeitszuweisung.

Die Browserprüfung beobachtet die tatsächlich gezeichneten Quellen und prüft
zusätzlich, dass kein aktiver Zustand außerhalb von einer bis unter sechs
Längen auftaucht. Pause, Neustart, Offlinefahrt und Aufholhilfe werden weiterhin
im echten Browser geprüft. Funktionstests mit beschleunigter Browseruhr sind
keine Geräte-FPS-Abnahme.

Die aktuelle Korrektur dokumentiert [slipstream-full/README.md](slipstream-full/README.md).
Die vorherige, noch seitlich abgeschwächte Abstimmung steht unverändert in
[slipstream-close/README.md](slipstream-close/README.md). Die ursprünglichen
3-km/h-Messprotokolle in `slipstream/` und `catchup/` bleiben als historische
Referenzen mit ihren ursprünglichen Quellprüfsummen erhalten.

```
npx vitest run tests/unit/slipstream.test.js tests/unit/catchup.test.js
npx playwright test tests/browser/slipstream.spec.js
npm run measure:slipstream -- bahrain france russia --output=docs/slipstream-close/field-ab.json
```
