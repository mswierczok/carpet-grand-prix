# Racing Balance V3 – KI-Fahrermodell V4 auf Fahrzeugmodell V2

Ausgangscommit: `1760fc07d0ce5d4e480fbdbe662aaf92e3063d45` (PR #58).
Fahrzeug-V2, Stammdaten, alle 39 Attributprofile, Strecken, Rundenzahlen,
Windschatten, Aufholhilfe, manuelle Eingaben und Run-Regeln bleiben unverändert.

## Menschliche Referenz und Annahmen

Die gemeldeten 32,635 s im Bahrain-Qualifying und 260,773 s im Acht-Runden-Rennen
sind menschliche Referenzen. Sie werden ausschließlich nach abgeschlossenen
Messfahrten mit deren echten KI-Zeiten verglichen; kein Spielmodul liest diese
Werte oder passt Zeiten/Platzierungen daran an.

Die Einstellung des aktuellen menschlichen Tests ist nicht durch einen
exportierten Spielstand belegt. Frühere Angaben nennen Experte; das beweist
nicht die Einstellung dieses Tests. Vorläufige Kalibrierung: Experte, mit und
ohne vorhandene Aufholhilfe. Normal und Schwer werden separat verglichen.
Die hypothetische Rennplatzierung ersetzt keinen menschlichen Nachtest:
Startplatz, Verkehr, Duelle und Fahrt unterscheiden sich.

## Analyse

- Die bisherigen Fahrerabschläge reduzieren vorwiegend Kurvenziele. Konstanz
  wirkt dabei auch als dauerhafter vorsichtigerer Anteil.
- Kleine Bremspunktunterschiede verschwinden häufig im 5-Einheiten-Raster;
  die Auswahl des kleineren alten/neuen Tabellenwerts erlaubt kaum eine
  echte positive Ausführungsphase.
- Überholrouten folgen bisher dem Streckenmittelpunkt statt der Rennlinie.
  Zudem werden in engen Kurven Innen- und Außenroute gemeinsam zusammengeführt,
  obwohl nur die innere Route ihren Lenkradius verliert.
- Feste seitliche Abstände berücksichtigen gedrehte Fahrzeugkörper schlecht.
- Ein/Aus-Pedale bremsen kleine Überschreitungen des Kurvenziels mit voller
  Bremskraft ab. Eine feste 40er-Korrektur kann zusätzliche Zeit verschenken.

## V4-Ausführung

Die bisherigen neun Attribute und ihre 39 Werte bleiben bytegleich.
Qualifying und Rennen lesen weiterhin unterschiedliche Pace-Werte.
Neue Entscheidungen tragen `driving.version: 4`; die alten Implementierungen
V1/V2/V3 bleiben erhalten.

Ein FNV-Hash mit anschließendem 32-Bit-Avalanche-Mischer erzeugt feste
Stützwerte aus Fahrer, Seed, Sessionart, Strecke und Zellenindex. Kubische
Interpolation verbindet sie glatt. Die Rennphase kombiniert 60 % Runden-
und 40 % Abschnittsfeld; elf Abschnitte pro Runde wiederholen sich nicht
zwischen den Runden. Kein Laufzeit-`Math.random`, keine neuen technischen Grenzen.

Für Konstanz `C`, Pace `P`, Phase `w` und den vorhandenen Affinitätsabschlag `a`:

```
Amplitude Qualifying = (1 − C/100)^1,5 × 0,025
Amplitude Rennen = 0,006 × (1 − C/100) + 0,20 × (max(0, 85 − C)/85)^0,65
Basis Qualifying = 1 − (100 − P) × 0,00016
Basis Rennen = 1 + (P − 65) × 0,00065
cornerScale = clamp(Basis − a + w × Amplitude − 0,055 × Fehlerpuls, 0,90, 1,055)
brakeLead = clamp((100 − Precision) × 0,012 + (100 − P) × 0,004
                  − w × Amplitude × 120 + Fehlerpuls × 4, −8, 8)
```

Die Chance eines kleinen Ausführungspulses pro Abschnitt ist
`0,18 × (1 − C/100)²`, ausschließlich im Rennen. Sein glatter Sinus-Quadrat-Puls
ist auf 0–1 begrenzt und schwächt nur die normale Kurvenplanung bzw. verschiebt
den Bremspunkt. Auf einer freien Vollgasgeraden bleibt der Sollwert am eigenen
Fahrzeuglimit. Positive Phasen können physikalische Grenzen nicht überschreiten.
Es gibt keinen pauschalen Zeitabzug und keine garantierte Zeitstrafe pro Puls.

V4 interpoliert die fahrzeugeigene Bremstabelle kontinuierlich und erlaubt
beide Richtungen der Bremspunktverschiebung. Ausführung wird vor Verkehrs-,
Rand-, Einordnungs- und Bergungsgrenzen angewendet, damit sie diese nicht aufhebt.
Dosierte Pedale gleichen Zielabweichung und normale Widerstände über den
30-Hz-Eingabeschritt aus. Nur ein normales physikalisches Gas-/Bremssignal
wird erzeugt. Bei Topspeed bleibt der normale Vollgasregler einschließlich
bestehendem Windschatten und Hilfe erhalten.

Für mäßige Richtungsfehler auf der nahen Linie begrenzt V4 die Korrektur auf
`clamp(sqrt(eigener Grip × Zielentfernung × 0,85 / (2 × |sin(Winkelfehler)|)), 40, 65)`.
Große Richtungsfehler, größere Linienabstände und vorherige Sicherheitsgrenzen
bleiben vorsichtig. Bahrain-Experte verwendet genauer vorberechnete Linien
(2400 statt 1200 Iterationen) und Lenkvorwegnahme 3; Schwer dort 1,2.
Andere alte Profile werden nicht geändert.

## Verkehr

V4 verwendet Überholwege relativ zur Rennlinie innerhalb der vorhandenen
Fahrbahnränder. Nur die innere Route wird dort zurückgeführt, wo der Lenkradius
dies erfordert. Eine Außenroute bleibt bestehen, sofern Platz vorhanden ist.
Kosten vergleichen dieselben 120 Einheiten Streckenfortschritt statt dieselbe
Weglänge auf unterschiedlichen Radien. Racecraft und der Schwierigkeitsgrad
bestimmen, ob diese vorausschauende Wahl verwendet wird.

Angriffe berücksichtigen tatsächliche Annäherung und Aggression. Die
Sicherheitsprüfung verwendet das reale seitliche Ziel der Route sowie die
auf die Straße projizierten Ausmaße beider gedrehten Fahrzeugkörper.
Seitliches Kreuzen, Hindernisumfahrung und die einmalige Verteidigung bleiben
abgesichert. Der Reaktionsanteil beträgt in V4 0,055 statt 0,035 Sekunden.
Es werden keine Positionen vertauscht, Fahrzeuge zurückgesetzt oder Abstände korrigiert.

## Speichervertrag

- Ein wirklich neues Kampagnen-/Run-Wochenende erhält Fahrer-V4 und Fahrzeug-V2.
- Vorhandene Wochenenden behalten ihre Fahrer-V1/V2/V3 und Fahrzeug-V0/V1/V2,
  auch nach Reload, Import, Pause, Fortsetzung und Neustart.
- Fehlendes `driving` bleibt die bisherige KI, insbesondere in freien Rennen,
  POV-Meisterschaft und technischen Fahrtests. Keine neue Fahrerzuordnung dort.
- Erst der nächste neue Grand Prix eines älteren Runs erhält V4. Route, Events,
  Auswahl, Platzierungsziele und historische Ergebniszeiten werden nicht migriert.
- Kein neuer Root-Speicherschlüssel. Unbekannte Versionen oder widersprüchliche
  Modell-/Fahrerkennungen werden abgelehnt. V4-Diagnosewerte sind optional,
  werden streng validiert und erscheinen nicht als zusätzliche HUD-Elemente.
- Die Routen-/Plan-Caches unterscheiden V4 von alten Profilen. Der begrenzte
  V4-Ausführungscache ist rein abgeleitet; sein kalter Zustand nach Reload
  verändert keine Entscheidung und gehört nicht in den Spielstand.

## Messungen

Die abschließenden Tabellen werden aus den nativen Messdateien erzeugt.
Baseline ist der unveränderte PR-58-Stand; dessen veröffentlichte 32 Wochenenden
werden durch eine erneut gefahrene identische Kontrolle und Quellhashes geprüft.
Neue Messungen verwenden dieselben 13 Fahrer, Seeds, acht Strecken, Standardrennen
und beide Hilfebedingungen. Alle Ergebnisse stammen aus echten 120-Hz-Bewegungen
mit normalen 30-Hz-Eingaben. Der Spielerreferenzregler ist eine KI-gefahrene
D.-Kluszic-Referenz, keine nachgespielte menschliche Fahrt.

<!-- BEGIN MEASUREMENTS -->
<!-- END MEASUREMENTS -->

## Grenzen und Abnahme

Die menschliche Rennreferenz muss getrennt vom Qualifying bewertet werden.
Mehr Dichte bedeutet nicht automatisch mehr erfolgreich abgeschlossene Überholungen.
Diese Befunde, schlechtere Einzelmessungen und noch verfehlte Ziele werden in
den abschließenden Tabellen ausgewiesen. Ein physischer iPhone-/Safari-Test ist
hier nicht verfügbar; Browserprüfungen verwenden Chromium-Emulation.
