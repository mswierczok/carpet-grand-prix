# POV-Qualifying und Startaufstellung

Aktuelle Anschlussänderung: Solo-Qualifying auf Basis des veröffentlichten `main`
nach PR #34, `dbc552058f317d1376869c0a0a47a9cae9d773e9`.
Dieser Schritt ergänzt ausschließlich Qualifying und Startplätze. Meisterschaft,
Punkte und dauerhafte Wochenend-Spielstände folgen in getrennten Schritten.

## Bedienung und Regeln

Unter `race.html` gibt es vor dem Start zusätzlich **Qualifying starten**.
Der bisherige Direktstart bleibt verfügbar und beginnt weiterhin auf Platz 13.

Du fährst allein eine Auslaufrunde sowie zwei schnelle Runden. Die zwölf Gegner
fahren gleichzeitig im Hintergrund mit der vorhandenen Physik und KI, jeder
auf einer unabhängigen freien Strecke. Die erste volle Runde zählt nicht zur
Bestzeit. Die schnellste der beiden folgenden Runden bestimmt den Startplatz;
es zählen echte Sektor- und Ziellinienüberfahrten. Es gibt keine erzeugten
KI-Zeitwerte. Individuelle Bremspunkte und Kurvenausführung sorgen für
unterschiedliche Fahrten bei gleichen Fahrzeugparametern; die vollständige
Begründung und Messungen stehen in [QUALIFYING_DRIVERS.md](QUALIFYING_DRIVERS.md).
Im Qualifying sind
Windschatten und Aufholhilfe für alle ausgeschaltet, um die Zeitwertung nicht
mit diesen Rennhilfen zu vermischen. Es gibt keinen Fahrzeugverkehr und keine
Fahrzeugkontakte im Qualifying, auch nicht zwischen Hintergrundgegnern. Seile,
Kurven, Bremsen und der langsamere dunkle Rand funktionieren wie bisher;
Runden bleiben gemäß Sektorregeln gültig. Die Bestzeiten aller 13 Teams bleiben
in der Tabelle sichtbar. Pause und Neustart betreffen alle Fahrten gemeinsam.

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
  und liefert kopierte Ergebnislisten. Der Modus `isolated` gibt jedem Fahrer
  einen unabhängigen Streckenlauf mit gleichem Startpunkt auf der Mitte der
  Fahrbahn. Die KI erhält nur ihr eigenes Fahrzeug als Verkehr; Fahrzeugkontakte,
  Windschatten und Aufholhilfe werden für diesen Modus ausgeschlossen. Die
  unveränderte Einzelwagenphysik prüft weiterhin Seile und Fahrbahnränder.
- `visibleEntries` enthält im Qualifying ausschließlich den Spieler. Beide
  Renderer verwenden diese Liste für die sichtbaren Fahrzeuge und blenden
  gegebenenfalls schon zwischengespeicherte Gegner aus. `entries` enthält für
  Zeitwertung und Hintergrunddaten weiterhin alle 13 tatsächlich simulierten
  Fahrzeuge. Im Rennen gibt es diese Einschränkung nicht; alle 13 Autos werden
  wieder dargestellt und beeinflussen einander mit den bisherigen Regeln.
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

Die Solo-Regressionsprüfung vergleicht identische Gegnerfahrten bei stehendem
Spieler gegenüber Gas/Lenken/Seilkontakt und Rücksetzen. Gegnerposen und Zeiten
müssen identisch bleiben; keine Fahrzeugkontaktauflösung darf aufgerufen werden
und alle KI-Befehle erhalten nur ihr eigenes Auto. Seilkontakte bleiben aktiv.

Browserprüfungen fahren nur über Tastatur: tatsächlicher 3D-Start, Pause im
Countdown, Wechsel in die Draufsicht, volle Qualifying-Fahrten, Übernahme,
Rennen mit 13 Zieleinläufen, Neustart und Verwerfen. Desktop und Mobil sowie
die netzwerkfreie Renndatei werden geprüft. Der klassische Speicher bleibt
unverändert. Die vollständigen Kalenderprüfungen laufen weiterhin in CI.
Zusätzlich werden die tatsächlich sichtbaren 3D-Gegnermodelle gezählt (null),
die tatsächlich gezeichneten 2D-Sprites (nur der Spieler) und nach Übernahme
der Startliste wieder das vollständige sichtbare Feld. Eine echte 3D-Aufnahme
steht unter [solo-qualifying/preview.png](solo-qualifying/preview.png).
Die längeren Qualifying-/Rennfahrten laufen in zwei eigenen Browserjobs,
damit die bisherigen Regressionen ihre bisherigen Zeitbudgets behalten.
Volle neue Qualifying-Fahrten werden gezielt auf Bahrain geprüft; dies ist
keine neue menschliche Tempo-/Balancing- oder Geräte-FPS-Abnahme.

```sh
npx vitest run tests/unit/qualifying.test.js tests/unit/arcade-race.test.js tests/unit/slipstream.test.js tests/unit/catchup.test.js
npm run build:arcade-offline
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/browser/qualifying.spec.js
```
