# Windschatten erst ab 100 km/h und sieben Sekunden nach dem Start

Basis: veröffentlichtes `main` nach PR #32,
`91ba8e5aeef5360504da156b93f46dbd76464c0b`.
Der Nutzer wünscht Windschatten erst bei 100 km/h und keine Aktivierung
in den ersten etwa sechs bis sieben Sekunden nach dem Start.

## Freigabe

- Beide Autos müssen mindestens **100 km/h vorwärts** fahren. Der langsamere
  Wagen entscheidet; 99,999 km/h reicht nicht. Eine Toleranz von 10⁻⁹ km/h
  fängt ausschließlich Gleitkomma-Rundung am exakten Grenzwert ab. Unter der Grenze wird auch ein
  bestehender Effekt beendet. Es gibt keine Restwirkung beim Ausblenden.
- `RaceSession` liefert für die ersten **sieben Rennsekunden ab Grün** leere
  Windschattenzustände für alle 13 Autos. Die Freigabe beginnt mit dem nächsten
  Physikschritt bei erreichten sieben Sekunden; sie wartet nicht auf eine Runde.
- Der dreisekündige Countdown, Pause und die Dauer zwischen Renderframes
  schalten den Effekt nicht vorzeitig frei. Es zählt ausschließlich die
  bestehende feste Simulationszeit. Ein Neustart setzt die Sperre zurück.
- Physik und 2D-/3D-Windwirbel lesen denselben Zustand und bleiben gemeinsam aus.
  Spieler und KI verwenden dieselben Grenzen, auch in der Offline-Version.

Nach der Freigabe bleibt der volle Nahbereichsbonus von bis zu **+5 km/h**
erhalten. Die Geschwindigkeitsrampe zwischen 80 und 90 km/h entfällt; ab 100
gilt die volle Geschwindigkeitsgewichtung. Distanzgewichtung (voll bei 1–3,
abnehmend bis unter 6 Längen), seitlicher Korridor, Aufbau/Abbau, Kontakt-/
Brückenschutz, Kurvenbremsung, Aufholhilfe und Kräfte bleiben unverändert.
Vorhandenes Zusatztempo klingt beim Abschalten durch normale Kräfte ab;
die Geschwindigkeit wird nicht schlagartig auf einen Wert gesetzt.

Keine Änderungen an klassischem Spiel, freien Fahrtests, Teams, Strecken,
Checkpoints, Rundenzahlen oder Speicherformaten. Beide geänderten Laufzeit-
Skripte erhalten neue Cache-URLs. Frühere Feldmessungen werden nicht überschrieben.

## Prüfungen

Die Modulprüfungen testen beide Rollen unter und genau an der 100-km/h-Grenze,
das sofortige Beenden eines aktiven Effekts sowie sieben echte Rennsekunden
einschließlich Countdown, Pause und erneuter Sperre nach Neustart. Die bestehende
dynamische +5-km/h-Prüfung, Seiten-/Abstandsgrenzen und vollen Rennen bleiben erhalten.

Der historische Aufholhilfe-Replay erhält in seiner temporären Test-VM dieselbe
neue Startsperre. Damit vergleicht er weiterhin beide Rennkerne mit identischem
aktiviertem Windschatten und isoliert die Aufholhilfe; er wird nicht abgeschaltet.
Keine Referenzdateien werden geändert.

Die Browserprüfung fährt den tatsächlichen 3D-Start zunächst drei Sekunden
Countdown und sechs Sekunden Rennen ohne Windwirbel. Danach prüft sie den
weiteren aktiven Effekt sowie Pause, Neustart, Streckenwechsel und Offlinefahrt
auf Desktop und Mobil. Die vollständige CI deckt auch den übrigen Kalender ab.

```sh
npx vitest run tests/unit/slipstream.test.js tests/unit/catchup.test.js tests/unit/arcade-race.test.js
npm run build:arcade-offline
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/browser/slipstream.spec.js
```
