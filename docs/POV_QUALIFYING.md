# POV-Qualifying und Startaufstellung

Ausgangsbasis: veröffentlichtes `main` nach PR #33,
`0cf24b1689eaafbf81ef03b950f26e1018cbc997`.
Dieser Schritt ergänzt ausschließlich Qualifying und Startplätze. Meisterschaft,
Punkte und dauerhafte Wochenend-Spielstände folgen in getrennten Schritten.

## Bedienung und Regeln

Unter `race.html` gibt es vor dem Start zusätzlich **Qualifying starten**.
Der bisherige Direktstart bleibt verfügbar und beginnt weiterhin auf Platz 13.

Alle 13 Fahrzeuge absolvieren mit der vorhandenen Physik und KI eine gemeinsame
Auslaufrunde sowie zwei schnelle Runden. Die erste volle Runde zählt nicht zur
Bestzeit. Die schnellste der beiden folgenden Runden bestimmt den Startplatz;
es zählen echte Sektor- und Ziellinienüberfahrten. Es gibt keine erzeugten
KI-Zeitwerte und keinen zusätzlichen Leistungsfaktor. Im Qualifying sind
Windschatten und Aufholhilfe für alle ausgeschaltet, um die Zeitwertung nicht
mit diesen Rennhilfen zu vermischen. Fahrzeugkontakte und der langsamere
dunkle Rand funktionieren wie bisher; Runden bleiben gemäß Sektorregeln gültig.

Der Tower zeigt die Bestzeiten, noch ohne Zeit erscheint ein Strich. Bei exakt
gleicher Zeit zählt die ursprüngliche Aufstellungsreihenfolge; ohne Zeit folgt
ein Team hinter den Teams mit Zeit. Nach den eigenen schnellen Runden fährt
die KI weiter, bis alle fertig sind. Dann erscheint die komplette Startliste.
**Startaufstellung übernehmen** stellt alle Autos mit null Geschwindigkeit und
frischer Rennzeit auf die ermittelten Plätze. Erst **Rennen starten** beginnt
den Countdown. Die ausgewählte Rennlänge und Schwierigkeit bleiben erhalten.
Windschatten einschließlich 100-km/h-/Sieben-Sekunden-Freigabe sowie die gewählte
Aufholhilfe gelten anschließend wieder normal im Rennen.

**Qualifying verwerfen** kehrt ohne Übernahme zum Direktstart zurück.
Ein Neustart im Qualifying löscht dessen Zeiten. Ein Rennneustart behält die
übernommene Startliste. Eine neue Team-, Schwierigkeits- oder Aufholhilfeauswahl
vor dem Start verwirft das Ergebnis; ein Streckenwechsel beginnt ein neues
Wochenende. Eine laufende Sitzung sperrt die bisherigen Auswahlfelder weiter.

## Modulgrenzen

- `qualifying-session.js` verwendet eine echte Drei-Runden-`RaceSession` und
  sammelt ausschließlich deren zweite und dritte Runden. Es sortiert die Zeiten
  und liefert kopierte Ergebnislisten.
- `race-weekend.js` koordiniert Direktstart, Qualifying, Übernahme und Verwerfen.
  Es besitzt keine eigene Physik, Zeitmessung oder Fahrzeugbewegung.
- `RaceSession` akzeptiert optional `gridOrder`: alle 13 gültigen Team-IDs genau
  einmal. Die Liste wird geprüft und kopiert. Ohne Liste bleibt der bisherige
  Ablauf exakt erhalten. Die KI-Indizes eines Teams bleiben beim Umordnen gleich;
  ein anderer Startplatz verändert dessen Fahrprofil nicht.
- `qualifying-ui.js` ergänzt den vorhandenen Renn-Tower und die Ergebnistabelle.
  Die Darstellungsreihenfolge folgt im Qualifying der Bestzeit. 2D und 3D lesen
  dieselbe Sitzung. Bestehende Kamera, Modelle und Seilkonturen werden verwendet.

Keine Änderungen an Teams, Fahrerdaten, Strecken, Brems-/Lenkparametern,
klassischer Meisterschaft oder Speicherkennungen. Die Sitzung lebt derzeit
im Arbeitsspeicher; Neuladen setzt sie zurück. Der klassische Spielstand und
die bisherigen Schwierigkeitseinstellungen behalten ihre bisherigen Regeln.
Die Offline-Renndatei enthält alle neuen Module. Geänderte Laufzeitdateien
werden mit neuen Cache-URLs geladen.

## Prüfungen und Grenzen

Modulprüfungen sichern ungültige und nachträglich veränderte Startlisten,
kollisionsfreie Aufstellungen auf Bahrain/Korea/Russland, stabile KI-Indizes,
den exakt gleichen Direktstart, die ausgelassene Auslaufrunde, Gleichstände,
fehlende Zeiten, kopierte Ergebnisse und einen tatsächlichen vollständigen
Qualifying-/Rennablauf. Bestehende Renn-/Windschatten-/Aufholhilfereplays bleiben
erhalten. Referenzdateien werden nicht erneuert.

Browserprüfungen fahren nur über Tastatur: tatsächlicher 3D-Start, Pause im
Countdown, Wechsel in die Draufsicht, volle Qualifying-Fahrten, Übernahme,
Rennen mit 13 Zieleinläufen, Neustart und Verwerfen. Desktop und Mobil sowie
die netzwerkfreie Renndatei werden geprüft. Der klassische Speicher bleibt
unverändert. Die vollständigen Kalenderprüfungen laufen weiterhin in CI.
Die längeren Qualifying-/Rennfahrten laufen in zwei eigenen Browserjobs,
damit die bisherigen Regressionen ihre bisherigen Zeitbudgets behalten.
Volle neue Qualifying-Fahrten werden gezielt auf Bahrain geprüft; dies ist
keine neue menschliche Tempo-/Balancing- oder Geräte-FPS-Abnahme.

```sh
npx vitest run tests/unit/qualifying.test.js tests/unit/arcade-race.test.js tests/unit/slipstream.test.js tests/unit/catchup.test.js
npm run build:arcade-offline
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/browser/qualifying.spec.js
```
