# Phase 2: Rennlänge und anschließende Rennbalance

## Bestandsaufnahme am 16. November 2026

Ausgangsbasis ist `main` auf
`c2e90fa61c18506d6832f1c22b6aadacc4d16b0f` (PR #26). Alle 22 POV-Strecken,
Frankreich-/Luxemburg-Anpassungen, Brücken und die südlichen Verlängerungen von
England/Portugal sind enthalten. Alle Remote-Entwicklungszweige wurden mit diesem
Stand verglichen. Einziger nicht übernommener Zweig: `codex/driver-duo-bust-crop`,
PR #13; betrifft ausschließlich Porträts, nicht den Fahrmodus.

| System | Tatsächlicher Stand | Konsequenz |
| --- | --- | --- |
| Fahrzeugphysik | Gemeinsame Beschleunigung, Bremse, Lenkung, Rückwärtsgang, Grip, Luftwiderstand; 120 Hz | Identische Grenzen für Spieler und Gegner erhalten |
| Runden | Unsichtbare Sektortore plus Ziel; Randkontakt macht Runden nicht ungültig | Zeitmessung bleibt unverändert |
| Rennen | 13 Teams, Spieler P13, Ampel, Kontakte, Ergebnis, Wiederholung; bislang pauschal drei Runden | Nur Standard-Rundenzahl und Anzeigen in 2.1 ändern |
| KI | Optimierte Fahrlinie, Kurvenvorschau, normale Pedal-/Lenkbefehle, Verkehr, Spurwechsel, Rückwärtsbefreiung | Bereits verbesserte KI messen; alte 31–32-s-Bahrain-Werte sind überholt |
| Schwierigkeit | Keine auswählbaren vier POV-Stufen; kleine bestehende Fahrerabweichungen sind keine Schwierigkeitsauswahl | Eigenes Paket 2.2 mit getrennter Speicherung |
| Windschatten | Im klassischen Spiel vorhanden; kein physischer Windschatten mit gemeinsamem Effektzustand im POV-Rennen | Eigenes Paket 2.3, Brücken-/Topologieprüfung nötig |
| Aufholbonus | Kein solches System im POV-Rennen | Erst nach kalibrierter KI in 2.4 |
| Speicherung | Klassischer Spielstand getrennt; POV-Rennen derzeit flüchtig | Keine Migration oder Speicherzugriffe für Rundenzahlen erforderlich |

### Warum die KI in Kurven Zeit verlieren kann

`opponents.js` plant Kurventempo unterschiedlich für Ideallinie und Ausweichspur:
`maxLateralAcceleration * 1.5 / curvature` gegenüber `* 0.85 / curvature`.
Bei identischer Krümmung ergibt das auf der Ausweichspur theoretisch etwa 75 % des
Zieltempos der Ideallinie; tatsächliche Linien haben unterschiedliche Krümmungen.
Der Faktor verändert das **Planungsziel**, nicht den gemeinsamen physikalischen Grip.
Die Vorschau zieht zwölf Einheiten Reaktionsraum ab und rechnet mit 80 % der
Bremsleistung. Beim Einordnen weit weg von der gewählten Linie greift zudem eine
Begrenzung auf 65 Einheiten/s; bei großem Richtungsfehler auf 40 Einheiten/s.
Zusammen mit Verkehrsabständen und Spur-Haltezeiten sind das konkrete Kandidaten
für zu frühes Bremsen und langsame Kurvenausgänge.

Das sind begründete Verdachtsstellen, keine nachgewiesenen Zeitanteile. Ein freies
Referenzauto und ein Auto im Verkehr dürfen nicht direkt als gleicher Testfall
verglichen werden. In 2.2 werden Bremsbeginn, Scheiteltempo, Ausgangsbeschleunigung,
Spur und Verkehr pro Kurve gemeinsam aufgezeichnet. Randberührungen des heutigen
automatischen Piloten werden jetzt schon sichtbar protokolliert.

Die Anzeige verwendet `Einheiten/s × 0,3 × 3,6`. Das gemeinsame Limit 110 entspricht
118,8 km/h. Diese Umrechnung ist in sich konsistent; die Weltgröße ist noch eine
Spielskalierung. In 2.1 wird weder diese Skalierung noch das Limit verändert.

## Vier getrennte Änderungen

| Schritt | Umsetzung | Abnahme |
| --- | --- | --- |
| **2.1, dieser Branch** | Saubere Referenzen aller 22 Strecken, Bahrain acht Runden, feste Rundentabelle mit Ziel 210 s, dynamische Anzeigen | Messprotokoll, echte volle Rennen, Browser/Offline/Desktop/Mobil, unveränderte Kerne |
| **2.2, nach Freigabe** | Kurven-Telemetrie, Linien/Bremspunkte/Einordnen/Überholen verbessern; Anfänger/Normal/Schwer/Experte nach Fahrkompetenz | Vergleichbare Fahrzeuge und freie Runden; Ziele +6–9 %, +2–4 %, etwa gleich, −2–3 % gegenüber guter Spielerreferenz; Einstellungen separat speichern |
| **2.3, nach Freigabe** | Physischer Windschatten für beide Seiten und sparsame gezeichnete Heckwirbel aus demselben Zustand | Etwa ab 80 km/h, 2–8 Fahrzeuglängen, etwa +3 km/h maximal, sanfte Übergänge; keine falsche Kopplung auf Nachbararmen/Brücken |
| **2.4, nach Freigabe** | Sehr dezente Unterstützung anhand von Position **und** Zeitabstand, abschaltbar | P1–3 null, danach höchstens 0,2/0,5/0,9 %; Fehlererholung höchstens acht Sekunden, insgesamt höchstens 1,2 %, weniger im Zweikampf; A/B-Vergleich |

Die Schritte 2.2–2.4 sind in diesem Branch **nicht implementiert**. Der aktuelle
Nutzerauftrag verlangt ausdrücklich die Prüfung von 2.1 vor dem nächsten Schritt.

## Wie die Rennlängen entstehen

`scripts/measure-race-duration.js` fährt alle Strecken isoliert mit derselben
unveränderten Fahrzeugphysik. Ein unabhängiger vorsichtiger Testpilot folgt der
Streckenmitte mit normalen Tastaturbefehlen. Er nutzt 100 Einheiten Bremsvorschau
und einen einheitlichen Planungsabstand zum Griplimit (0,85); das sind allein
Parameter des Entwicklungswerkzeugs. Sie verändern weder die Spiel-KI noch das Auto.
Physik läuft mit 120 Hz, Befehle mit 30 Hz. Start: stehend bei −118 Einheiten,
entsprechend dem Längsabstand des hintersten Startplatzes, aber isoliert in der Mitte.

Die erste volle Runde wird als Einfahrphase verworfen. Die Referenz ist der Mittelwert
der ersten drei folgenden vollständigen Runden **ohne einen einzigen Seil- oder
Randkontakt-Physikschritt**. Ausgeschlossene Runden bleiben im JSON sichtbar.
Der unveränderte allein fahrende KI-Pilot wird zusätzlich vermessen; seine drei
Folgerunden werden auch bei Randberührungen dokumentiert und dann ausdrücklich als
unrein markiert. Diese KI-Vergleichszeiten bestimmen **nicht** die Rundenzahl.

`docs/race-duration/clean-reference.json` enthält Zeiten, Provenienz, Quellprüfsummen,
Startanfahrt, ausgeschlossene Runden und Betriebsdaten. Brems-/Gasanteile, Spitzen-
geschwindigkeit und Kontaktzähler beziehen sich auf den gesamten Messlauf, nicht nur
auf die drei ausgewählten Runden. Das ist eine reproduzierbare automatisierte
Referenz, **keine gemessene menschliche Leistungsstufe**. Deine frühere Bahrain-
Messung (28,5 s erste Runde, 53 s nach zwei, 77 s nach drei) bleibt zusätzliche
Orientierung; sie ersetzt keine neue menschliche Kalibrierung aller Strecken.

`scripts/build-race-formats.js` erzeugt daraus `src/data/race-formats.js`:

```
Runden = runden((210 − Startanfahrt) / Referenzrunde), begrenzt auf 4 bis 12
Bahrain = 8 Runden als ausdrücklich beauftragte erste Kalibrierung
Prognose = Startanfahrt + Runden × Referenzrunde
```

4–12 sind Schutzgrenzen gegen Ausreißer und zu kurze/lange Formate, keine
Geschwindigkeitsboni. Rundung verursacht höchstens ungefähr eine halbe Referenzrunde
Abweichung von der Zielzeit. Die Tabelle ist versioniert und eingefroren; ein Neustart,
Teamwechsel, Verkehr, Randkontakt oder bisheriger Spielstand ändert sie nicht.
Es gibt keine Zufallsentscheidung und keine Anpassung während eines Rennens.
Zielzeit, Grenzen und bewusste Strecken-Ausnahmen stehen am Anfang von
`build-race-formats.js` (`overrides`, derzeit nur Bahrain). Änderungen dort und
anschließendes Erzeugen der Tabelle sind im Git-Diff nachvollziehbar.

Bei späteren KI-/Physik-/Geometrieänderungen erneut messen, Prognosen und echte
Feldzeiten vergleichen und die Tabelle bewusst neu erzeugen. Laufzeitabhängiges
automatisches Umkalibrieren findet nicht statt. Für gezielte Entwicklungsszenarien
bleibt `RaceSession.create(track, { laps: ... })` verfügbar.

## Reproduzieren und Grenzen

```
npm run measure:race-duration
npm run build:race-formats
npm run check:race-formats
npm run measure:race-field
```

Die volle Feldmessung benutzt den bisherigen Browser-Testpiloten, normale binäre
Lenk-/Pedalbefehle und die echte RaceSession mit 13 Autos. Verkehr und Kontakte gehören
zu dieser Validierung und werden nicht in die saubere Referenz übernommen. Zeiten
beginnen bei Grün; der dreisekündige Countdown kommt zur Wartezeit hinzu.

Einzelne Fahrfehler oder sehr langsame/schnelle Menschen können außerhalb von
3–4 Minuten liegen; das Format garantiert keine persönliche Zielzeit. Nach der
KI-Abstimmung müssen auch die Feldzeiten erneut bewertet werden. Eine beschleunigte
Browseruhr oder Software-WebGL liefern keine belastbare Aussage über reale Geräte-FPS.

Historische Drei-Runden-Prüfungen bleiben bewusst Drei-Runden-Prüfungen und übergeben
nun die vorhandene öffentliche `laps`-Option. Im Browser passiert das ausschließlich
in einer temporären Testantwort. Zusätzliche Tests prüfen die echten Standardformate
ohne diesen Adapter, einschließlich vollständigem Acht-Runden-Bahrain-Rennen.
Der Rennkern wird zusätzlich bytegenau mit `main` verglichen, wobei ausschließlich
der ausdrücklich beauftragte Standard-Rundenzahl-Ausdruck normalisiert wird.
