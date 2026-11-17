# Aufholhilfe: A/B-Messprotokoll

Ausgangsstand `2bc124a11c274c0f52eb516bd9a0f1ea9e0d377f` (PR #29), ergänzt
um die durch 19 SHA-256-Prüfsummen bezeichneten Arbeitsquellen in
[field-ab.json](field-ab.json). Messzeit: 2026-11-17T14:21:43.759Z.
Prüfsummen werden vor der ersten Fahrt erfasst und vor der Ausgabe erneut geprüft.

Zwölf tatsächliche RaceSession-Fahrten: sechs Strecken × Aufholhilfe an/aus,
13 Autos, Normal, zwei Runden. Windschatten bleibt auf beiden Seiten aktiv.
Physik: 120 Hz; normale binäre Spieler-Steuerbefehle und Beobachtungen: 30 Hz.
Der Spieler-Ersatz verwendet dieselbe Politik wie die Browsertests. Das ist
keine menschliche Leistungsreferenz. Die zusätzlichen kurzen A/B-Fahrten ersetzen
nicht die vollständigen Standardrennen und den 22-Strecken-Kalender in der CI.

Alle zwölf Felder beenden das Rennen: **156 Zieleinläufe**, keine beobachteten
Seilkontakte und keine Unterstützung für Spieler oder P1–P3. Der beobachtete
Spitzenwert liegt bei **0,8653 %**; die sichere Obergrenze von 1,2 % samt
Fehlererholung wird zusätzlich durch kontrollierte Regel- und Physiktests geprüft.
In diesen normalen Läufen wurde kein Fehlererholungsfenster genutzt. Es werden
keine künstlichen Fahrfehler ins veröffentlichte Spiel injiziert.

| Strecke | KI-Median aus, s | KI-Median an, s | Letzte KI aus, s | Letzte KI an, s | Höchstes genutztes Budget |
| --- | ---: | ---: | ---: | ---: | ---: |
| bahrain | 63,451 | 62,190 | 70,017 | 69,525 | 0.3191 % |
| france | 82,429 | 82,682 | 89,659 | 89,621 | 0.6015 % |
| portugal | 58,727 | 58,427 | 65,146 | 64,419 | 0.3203 % |
| japan | 88,718 | 88,842 | 96,973 | 95,914 | 0.5729 % |
| korea | 78,110 | 79,003 | 85,034 | 87,844 | 0.8653 % |
| russia | 81,540 | 81,616 | 87,878 | 86,597 | 0.3215 % |

In fünf der sechs Szenarien beendet die letzte KI ihr Rennen früher; in Korea
kommt sie etwa 2,81 Sekunden später an. Der KI-Median wird nicht überall besser.
Auf Korea ändern sich auch die Kontaktbeobachtungen von 234 auf 280 Fahrzeug-
Frames. Schon kleine reale Tempounterschiede verändern Verkehr und Spurwahl;
diese Fahrten belegen keinen konstanten Zeitgewinn oder eine statistisch gesicherte
Feldverdichtung. Wir erhöhen die Hilfe deshalb nicht über die freigegebenen Grenzen
und erzwingen keine Überholmanöver. Die vollständigen Spielerzeiten und sämtliche
KI-Runden stehen in den Rohdaten. Der Spieler erhält bewusst kein Gegenbudget;
eine bessere KI-Zielzeit muss deshalb keine bessere Spielerzeit ergeben.

| Strecke | Kontaktbeobachtungen aus / an | Seilbeobachtungen aus / an | Randbeobachtungen aus / an |
| --- | ---: | ---: | ---: |
| bahrain | 320 / 380 | 0 / 0 | 0 / 0 |
| france | 304 / 276 | 0 / 0 | 0 / 0 |
| portugal | 255 / 137 | 0 / 0 | 0 / 0 |
| japan | 368 / 308 | 0 / 0 | 0 / 0 |
| korea | 234 / 280 | 0 / 0 | 0 / 0 |
| russia | 160 / 148 | 0 / 0 | 0 / 0 |

Diese Zähler sind Fahrzeug-Frames, keine Anzahl unabhängiger Unfälle. Auslaufende
Autos bleiben in Kontakt-/Tempospitzenbeobachtungen enthalten, erhalten aber
keine Aufholhilfe. Rang und Zeitabstand einer Hilfswirkung beziehen sich auf den
Beginn ihres Physikschritts. Ein anschließender Überholvorgang kann die sichtbare
Reihenfolge bereits ändern. Das Messwerkzeug prüft den tatsächlich verwendeten
Rang und weist jede Spieler-/Podiumsunterstützung oder Überschreitung von 1,2 %
zurück. Nichtendliche Messzahlen verhindern ebenfalls die Ausgabe.

## Was zusätzlich geprüft wird

- Passagehistorie bei Tempoänderung, Stillstand, Rückwärtsfahrt und über mehrere
  Runden; abgelaufene Historie erzeugt keine erfundenen Zeitabstände.
- Sofort null für Spieler, Podium und Ziel; Gesamtplätze fertiger Fahrer bleiben
  reserviert. Rampen-/Nachbararmnähe kann keine größere Hilfe erzeugen.
- Eigenes Rand-/Seilproblem, Kontaktunterdrückung, Erholung maximal acht Sekunden
  sowie kleine Grundbudgets und reduzierte Zweikampfunterstützung.
- Tatsächliche Kraftintegration: maximal 120,2256 km/h ohne Windschatten bzw.
  123,2256 km/h bei zugleich vollem Windschatten und maximaler Hilfe. Wegfall
  der Hilfe verursacht keinen abrupten Geschwindigkeitsverlust.
- Deaktiviertes Replay exakt gegen den veröffentlichten Windschattenstand.
- Echte Browserfahrten in 3D, offline und mit abgeschalteter Hilfe; unveränderte
  Speicher, Menüwahl, Countdown-Sperre, Neustart und Streckenwechsel.

Die Prozentwerte sind kleine Motor-/Geradentempobudgets. Grip und Kurvenziele
bleiben gleich. Weder die automatisierte Spielerpolitik noch Software-WebGL
ersetzen eine neue menschliche Balance- oder Geräte-FPS-Abnahme.

## Reproduzieren

```
npm run measure:catchup
npx vitest run tests/unit/catchup.test.js tests/unit/slipstream.test.js
npx playwright test tests/browser/catchup.spec.js
```

Die Hilfe ist vor dem Start über **KI-Aufholhilfe: Dezent/Aus** auswählbar.
Alternativ startet `race.html?catchup=0&balance=1` ohne Hilfe mit Diagnose.
Parameter und Umsetzung: [CATCHUP.md](../CATCHUP.md).
