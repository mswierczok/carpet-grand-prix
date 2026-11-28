# Fahrerpersönlichkeiten, Rennverkehr und Touchflächen

Ausgangscommit: `d8c4d31cb7daacf594f24bbc08b367c601a4f03a` (gemergter PR #56).
Die historischen Daten, 39 Identitäten/Zuordnungen, Originalporträts,
Fahrzeugparameter v1, Strecken, Rundenzahlen, vier Schwierigkeitsstufen und
Run-Ziele bleiben erhalten. Die Änderung gilt für **neue Kampagnenwochenenden**.

## Daten und Zuständigkeiten

`src/data/driver-attributes.js` enthält 39 ausdrücklich festgeschriebene
Profile der Version 1 auf der Skala 0–100. Die Werte sind keine Prozentwerte
der Fahrzeuggeschwindigkeit. Für die historischen Identitäten dienen deren
Skill, Consistency und Potential als Ausgangspunkte; feste individuelle
Abstufungen trennen Qualifying und Rennen sowie Zweikampfattribute. Die drei
Redwood-Profile sind explizit auf ihre bestehenden Archetypen abgestimmt.
Teamstärke wird bei der Fahrerberechnung nicht gelesen.

| Attribut | Tatsächliche Verwendung |
| --- | --- |
| Qualifying Pace | Ausnutzung von Kurvengeschwindigkeit und Bremspunkten im einzigen Versuch |
| Race Pace | Getrennte Grundausführung in Rennkurven |
| Consistency | Amplitude kontinuierlicher Ausführungsschwankungen |
| Racecraft | Einschätzung, Spurwahl, Manöverbindung und Sicherheitsabstand |
| Aggression | Frühere Angriffsbereitschaft bei kleinerem Geschwindigkeitsvorteil |
| Defensive Skill | Entfernung für eine frühzeitige Innenlinienverteidigung |
| Precision | Bremspunkte und kleiner, begrenzter Lenkzielfehler |
| Adaptability | Vermindert den kleinen Ausführungsverlust bei schwächerer Streckeneignung |
| Potential | Nur Grundlage späterer Entwicklung, ohne aktuellen Bonus |

Fahrzeugprofil = technische Grenzen; Fahrerprofil = normale KI-Eingaben;
Schwierigkeitsgrad = bestehender KI-Grundregler. Fähigkeiten, Items und Crew
bleiben unverändert ohne neue Effekte. Der manuelle Spieler besitzt dieselben
Attributdaten, seine Eingaben werden dadurch **nicht verändert**.

### Alle 39 Profile

| Fahrer | Team | Q | R | Konstanz | Racecraft | Aggression | Defensive | Präzision | Anpassung | Potenzial |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| d001 · Marcello Robin | t01 | 86 | 85 | 92 | 46 | 47 | 51 | 89 | 79 | 96 |
| d002 · V. Romi | t01 | 81 | 88 | 85 | 94 | 43 | 39 | 88 | 77 | 89 |
| d003 · Thi Wu | t01 | 86 | 79 | 82 | 92 | 39 | 88 | 76 | 76 | 93 |
| d004 · Alvaro Savic | t02 | 95 | 88 | 86 | 58 | 68 | 50 | 82 | 87 | 95 |
| d005 · M. Callivaro | t02 | 77 | 94 | 83 | 56 | 64 | 38 | 85 | 85 | 92 |
| d006 · Malik Salvaro | t02 | 89 | 91 | 87 | 53 | 59 | 87 | 80 | 84 | 96 |
| d007 · R. Dénes | t03 | 75 | 63 | 70 | 51 | 55 | 75 | 69 | 82 | 89 |
| d008 · N. O'Conner | t03 | 77 | 83 | 90 | 80 | 84 | 89 | 85 | 68 | 86 |
| d009 · N. Miguel | t03 | 78 | 69 | 67 | 77 | 80 | 77 | 68 | 66 | 84 |
| d010 · Dylon Hutton | t04 | 74 | 80 | 68 | 48 | 57 | 50 | 63 | 75 | 91 |
| d011 · A. Parelli | t04 | 62 | 60 | 79 | 50 | 61 | 62 | 83 | 77 | 72 |
| d012 · S. Colbe | t13 | 66 | 58 | 50 | 52 | 65 | 42 | 55 | 70 | 88 |
| d013 · Dukuzuremyi | t04 | 79 | 66 | 83 | 55 | 69 | 86 | 90 | 80 | 86 |
| d014 · Y. Francais | t05 | 75 | 77 | 85 | 57 | 73 | 37 | 86 | 82 | 85 |
| d015 · F. Aristi | t05 | 59 | 52 | 68 | 59 | 77 | 49 | 62 | 83 | 89 |
| d016 · S. Evans | t05 | 70 | 78 | 75 | 62 | 81 | 61 | 78 | 85 | 90 |
| d017 · L. Anderson | t06 | 73 | 55 | 72 | 64 | 85 | 73 | 69 | 86 | 86 |
| d018 · G. A. Montoya | t06 | 73 | 69 | 83 | 91 | 58 | 37 | 76 | 85 | 84 |
| d019 · Valentino | t06 | 65 | 75 | 71 | 93 | 62 | 49 | 73 | 86 | 82 |
| d020 · Di Luccio | t07 | 74 | 63 | 90 | 79 | 38 | 83 | 89 | 72 | 81 |
| d021 · Li Young | t07 | 81 | 79 | 75 | 77 | 34 | 71 | 80 | 71 | 81 |
| d022 · Bezetti | t07 | 63 | 59 | 87 | 84 | 46 | 46 | 89 | 75 | 79 |
| d023 · Janssen | t08 | 71 | 75 | 84 | 81 | 42 | 95 | 77 | 74 | 84 |
| d024 · H. Mokahashi | t08 | 76 | 61 | 87 | 88 | 54 | 70 | 91 | 78 | 78 |
| d025 · Kuno | t08 | 82 | 92 | 88 | 86 | 50 | 58 | 83 | 77 | 94 |
| d026 · Solim | t09 | 79 | 93 | 84 | 93 | 62 | 94 | 91 | 82 | 87 |
| d027 · Zacharias | t09 | 84 | 83 | 82 | 91 | 58 | 82 | 80 | 80 | 90 |
| d028 · Elfinso | t09 | 94 | 95 | 90 | 48 | 70 | 57 | 84 | 85 | 92 |
| d029 · Sven N. | t10 | 72 | 77 | 86 | 46 | 66 | 45 | 86 | 83 | 84 |
| d030 · E. Pastelli | t10 | 71 | 74 | 82 | 50 | 46 | 76 | 82 | 86 | 85 |
| d031 · Felix N. | t10 | 88 | 89 | 70 | 52 | 50 | 88 | 64 | 87 | 92 |
| d032 · Budi | t11 | 78 | 75 | 83 | 45 | 38 | 52 | 81 | 83 | 86 |
| d033 · Kolwero | t11 | 74 | 86 | 83 | 47 | 42 | 64 | 90 | 84 | 86 |
| d034 · Z. H. Kung | t11 | 70 | 78 | 72 | 90 | 29 | 89 | 67 | 79 | 97 |
| d035 · D. Kluszic | t13 | 61 | 60 | 42 | 72 | 91 | 48 | 50 | 57 | 79 |
| d036 · Levio | t12 | 73 | 75 | 84 | 86 | 87 | 65 | 77 | 76 | 86 |
| d037 · Josuah | t12 | 70 | 63 | 72 | 88 | 25 | 77 | 73 | 78 | 91 |
| d038 · P. d. Grosso | t12 | 85 | 81 | 67 | 81 | 79 | 41 | 72 | 73 | 91 |
| campaign-veteran-001 · Mika Hartmann | t13 | 56 | 61 | 90 | 80 | 30 | 86 | 86 | 80 | 64 |


## Ausführung innerhalb der Fahrzeugphysik

`DriverPersonalities.decision` ist eine reine Funktion von Identität, gespeichertem
Seed, Sessionart, Strecke und ununterbrochenem Streckenfortschritt `u` in Runden.
Die Phase `φ` stammt aus einem FNV-Hash der Fahrer-ID und des Seeds.

```
w = 0,65 sin(2π · 1,37u + φ) + 0,35 sin(2π · 0,61u + 1,7φ)
V = (1 − Consistency/100) · (Qualifying: 0,025; Rennen: 0,065)
fit = gewichtete bestehende Fahreraffinität / 3
adaptation = (1 − fit) · (1 − Adaptability/100) · 0,012
P = Qualifying Pace oder Race Pace, abhängig von der Session
loss = clamp(0,002 + (100 − P) · 0,0007 + adaptation + V · (0,5 + 0,5w), 0,002, 0,105)
cornerScale = 1 − loss
brakeLead = (100 − Precision) · 0,045 + (100 − P) · 0,018 + w · V · 12
lineOffset = sin(2π · 4,17u + φ) · (1 − Precision/100) · 1,1
```

Die vorhandene 5-Einheiten-Vorschautabelle und ihre fahrzeugeigenen Brems- und
Gripgrenzen bleiben maßgeblich. `brakeLead` verschiebt nur den Blick in diese
Tabelle. `cornerScale` verändert den regulären Kurven-Sollwert nach den bestehenden
Sicherheitsreglern, nicht die physikalischen Parameter. Bei blockierter Fahrbahn
hat die Verkehrssicherung Vorrang. Modell v2 erfasst zusätzlich schnelle Kurven, wenn sich der Routenwinkel über 32 Einheiten mit einer Krümmung über 0,0035 ändert; dadurch bleiben Pace-Unterschiede nicht auf die bereits langsamen Kurven begrenzt. Auf freier Gerade bleiben Vollgas und das
eigene technische Limit erhalten. Der kleine seitliche Fehler betrifft nur das
Lenkziel und ist bei Verkehr innerhalb von 30 Streckeneinheiten abgeschaltet.
Kein Geschwindigkeits-, Positions- oder Zeitwert wird zugewiesen oder korrigiert.

## Überholen und Verteidigen

Der bestehende Regler nutzt weiterhin seine geometrisch geprüften Überholrouten,
deren Kurvenradien und die individuelle Brems-/Gripplanung. Neue Fahrerprofile:

- variieren die Angriffsentfernung um den bisherigen Schwierigkeitswert:
  `D · (0,75 + (55 + 0,26 Racecraft + 0,18 Aggression)/240)`;
- benötigen je nach Aggression `3,5 − 0,025 Aggression` Einheiten freien
  Geschwindigkeitsvorteil; ein sehr naher Vordermann bleibt ebenfalls relevant;
- halten ein gewähltes Manöver `2,3 − 0,009 Racecraft` Sekunden;
- nutzen die bestehende vorausschauende Zeitkostenwahl nur mit ausreichender
  Racecraft und einem passenden Schwierigkeitsregler;
- passen den Reaktionspuffer auf `2 + 0,012(100 − Racecraft)` und den rückwärtigen
  Freiraum auf `16 + 0,08(100 − Racecraft)` Einheiten an.

Die seitliche Sicherheitsbreite wird für aggressive Fahrer nicht reduziert.
Zusätzlich zur Zielspur wird der seitlich überstrichene Korridor auf benachbarte
Fahrzeuge geprüft. Wird eine gewählte Überholspur neu blockiert, kann das Auto
über einen freien Korridor abbrechen; sonst bremst der gemeinsame Blocker-Regler.

Verteidigung verwendet die bisherige Entfernungsgrenze multipliziert mit
`0,65 + 0,0065 Defensive Skill`. Ohne Verteidigungskompetenz des gewählten
Schwierigkeitsreglers entsteht daraus keine zusätzliche Fähigkeit. Der Fahrer
wählt früh die Innenlinie. Eine gespeicherte `defenseLock` verhindert wiederholte
Sperrbewegungen gegen denselben Angreifer, bis dieser vorbeigefahren oder deutlich
zurückgefallen ist. Neben einem Fahrzeug bleibt dessen Platz geschützt.
Auch nach einem Manöver muss die normale Ideallinie frei sein, bevor die KI zurückkehrt.

### Stehende Fahrzeuge und enge Kurven

Eine zusätzliche Belastungsprobe mit absichtlich stehendem Spieler auf Startplatz P9
zeigte eine Blockade: Die neue Sicherung gegen seitliches Kreuzen konnte zusammen
mit zusammenlaufenden Überholrouten Fahrzeuge dauerhaft festhalten. Modell v3
behebt dies über normale Fahrbefehle. Nach 0,6 Sekunden anhaltender Behinderung
bei weniger als 10 Geschwindigkeitseinheiten sucht der Regler einen freien
Korridor neben dem stehenden Auto. Er prüft Fahrzeugbreite, Verkehr und die echte
Begrenzung an zwei Vorausschaupunkten. Der Ausweichregler fährt höchstens 25
Einheiten pro Sekunde und beendet das Manöver nach vollständigem Vorbeifahren.
Das vorhandene sichere Rückwärtsrangieren greift bei enger Blockade ebenfalls.
Es gibt keine Positions-, Geschwindigkeits- oder Kollisionskorrektur.

Der native Regressionstest lässt den Spieler stehen, stellt während des aktiven
Ausweich- beziehungsweise Rangiermanövers den gespeicherten Zustand exakt wieder her und prüft den regulären
Zieleinlauf aller zwölf Gegner. v1 und v2 behalten ihre unveränderten Fortsetzungen.

## Speicherung und Identität

Native Wochenenden/Sessionkonfigurationen erhalten optional:

```json
{"driving":{"version":3,"seed":4171,"lineup":{"t01":"d001","…":"…"}}}
```

Die echte Liste enthält genau 13 eindeutige Fahrer aus ihren festen Teampools.
Jeder KI-Speicher enthält die zugehörige Identität, denselben Seed und
`mode: qualifying | race`. Validierung prüft die Übereinstimmung mit Session,
Wochenende und Kampagnenstartliste. Die tatsächlichen Namen im HUD und Archiv
stammen unverändert aus dieser Startliste. Unbekannte Modellversionen,
widersprüchliche Fahrer oder falsch zugeordnete Teams werden abgelehnt.

Neue Run-Wochenenden leiten ihre Phasen aus dem bereits gespeicherten Run-Seed
und der Strecke ab. Im früheren Kampagnenmodus wird beim Erstellen des Wochenendes
ein deterministischer Seed aus Fahrer/Team/Strecke und gespeichertem Zeitpunkt
gebildet und im nativen Checkpoint festgeschrieben. Reload und Neustart des noch
nicht gewerteten Wochenendes erhalten ihn. Die gewertete Run-Neustartsperre bleibt.

**Fehlendes `driving` bedeutet das bisherige KI-Modell**, auch wenn schon das
Fahrzeugmodell v1 und Ein-Runden-Qualifying vorhanden sind. Laufende PR-56-
Wochenenden und noch ältere Stände werden nicht umgestellt. Freies Rennen,
POV-Meisterschaft und technische Fahrtests behalten ihre bestehende KI ohne
neue leistungsrelevante Fahrerzuordnung. Historische Archive werden nicht neu
berechnet. Ein späteres Attribut-/Formelbalancing benötigt eine neue Modellversion
mit erhaltener Implementierung bisheriger Versionen. Auch die Entwicklungsfassungen v1 und v2 bleiben separat fortsetzbar.

## Reproduzierbare Entwicklungsdiagnose

`scripts/lib/racing-diagnostics.js` liest native Snapshots. Kein Diagnose-HUD
wurde ergänzt. Das Messwerkzeug fährt vollständiges Pflichtqualifying und
Standardrennen mit allen 13 Teilnehmern auf allen acht Kampagnenstrecken.
Spieler und Gegner verwenden normale Steuereingaben. Der Spielerreferenzregler
liest ebenfalls alle Verkehrsfahrzeuge; bei neuen Profilen verwendet er den
gewählten Fahrer, ohne die manuellen Spielereingaben im Produkt anzutasten.

Zwei Bedingungen je Strecke: Experte, Aufholhilfe aus/Seed 4171 und
Aufholhilfe an/Seed 9011. Fahrzeug v1, Windschatten und Rundenzahlen sind identisch.
Die Vorherdaten stammen aus einem separaten unveränderten PR-56-Checkout;
Quellhashes werden geprüft. Die Nachherdaten enthalten ihre tatsächlichen Hashes.

- Positionswechsel verwenden dieselben nativen Fortschritte wie das Klassement.
- Überholvorgänge benötigen nach mindestens acht Rennsekunden einen Wechsel der
  Führungsreihenfolge eines Paars mit vollständiger Fahrzeuglänge plus drei
  Einheiten Abstand. Zieleinläufe und Überrundungen zählen nicht als Überholen.
  Das ist eine konservative Beobachtungsdefinition, keine KI-Siegquote.
- Kontakte werden im unveränderten nativen 120-Hz-Kontaktlöser beobachtet. Ein
  Kontakt zählt beim Beginn einer Paarberührung; nach Trennung kann ein neuer
  Kontakt entstehen. Der Beobachter reicht das Originalergebnis unverändert durch.
- Abstände verwenden die echte gemeinsame Passagehistorie; fehlende Zeitdaten
  bleiben `null`. Zeitreihen und räumliche Nachbarabstände sind erhalten.
- „Allein“ bedeutet: kein aktiver Gegner innerhalb von 30 Metern entlang der
  Strecke auf derselben Ebene. Überrundete Fahrzeuge zählen als Kontakt zum Feld.
  Zusätzlich wird der Anteil ab absolvierter Runde 3, also Runde 4, erfasst.
- Rundenzeiten und deren Streuung im Verkehr enthalten Verkehrseinflüsse; die
  getrennten Solomessungen aller 39 Fahrer im selben Fahrzeug isolieren die
  fahrerabhängige Ausführung. Deren Qualifying fährt einen Versuch, der Rennregler
  vier komplette Runden ohne Verkehr, Windschatten oder Aufholhilfe.
- Neue Angriffs-/Verteidigungsabsichten sind Diagnosezustände, keine nachgewiesenen
  Erfolge. Der PR-56-Stand hat diese Absichtszähler nicht: dort sind sie nicht
  verfügbar und werden nicht als gemessene Null interpretiert.

<!-- BEGIN MEASUREMENTS -->
## Gemessene Vorher-/Nachher-Wirkung

Je 16 vollständige Wochenenden mit Standardrundenzahlen und 13 Zieleinläufen; alle acht Strecken jeweils in beiden Bedingungen. Die Werte stammen aus nativen Bewegungen und Zeiten. Es gibt keine Garantie höherer Überholzahlen für jede Strecke.

| Strecke | Hilfe | Überholen vorher / nachher | Kontaktanfänge vorher / nachher | Rangkorrelation Q/R vorher / nachher | Alleinanteil Feld vorher / nachher |
| --- | --- | ---: | ---: | ---: | ---: |
| Bahrain | aus | 11 / 20 | 176 / 224 | 0.956 / 0.945 | 69.0 % / 67.0 % |
| Bahrain | an | 6 / 11 | 160 / 174 | 0.967 / 0.945 | 65.5 % / 70.6 % |
| Kanada | aus | 8 / 8 | 211 / 189 | 0.989 / 0.973 | 39.4 % / 59.5 % |
| Kanada | an | 5 / 11 | 131 / 140 | 0.973 / 0.978 | 34.9 % / 57.4 % |
| Korea | aus | 4 / 15 | 94 / 215 | 0.929 / 0.978 | 52.9 % / 59.0 % |
| Korea | an | 6 / 16 | 120 / 153 | 0.940 / 0.962 | 57.2 % / 68.6 % |
| Frankreich | aus | 2 / 8 | 55 / 96 | 0.989 / 0.951 | 67.6 % / 59.5 % |
| Frankreich | an | 2 / 12 | 76 / 85 | 0.989 / 0.973 | 68.5 % / 61.8 % |
| England | aus | 1 / 14 | 80 / 207 | 0.989 / 0.962 | 67.7 % / 64.0 % |
| England | an | 0 / 5 | 57 / 149 | 0.995 / 0.967 | 62.6 % / 68.7 % |
| Russland | aus | 12 / 21 | 67 / 95 | 0.945 / 0.951 | 28.4 % / 51.7 % |
| Russland | an | 13 / 12 | 53 / 86 | 0.984 / 0.984 | 26.4 % / 57.2 % |
| Italien | aus | 6 / 7 | 120 / 158 | 0.978 / 0.967 | 26.7 % / 60.2 % |
| Italien | an | 5 / 14 | 106 / 121 | 0.984 / 0.995 | 46.2 % / 57.1 % |
| Japan | aus | 2 / 8 | 87 / 158 | 0.973 / 0.989 | 58.3 % / 66.5 % |
| Japan | an | 3 / 7 | 113 / 188 | 0.967 / 0.973 | 57.7 % / 64.0 % |

Über alle Bedingungen: **86 → 189** beobachtete vollständig abgeschlossene Paarüberholungen, **1706 → 2438** native Kontaktanfänge. Rangkorrelation 1 bedeutet identische Qualifying-/Rennreihenfolge. Die Kennzahlen sind Beobachtungen, keine Sollwerte.

Kontakte sind keine Unfallzählung: Nach einer Trennung kann dasselbe Paar erneut kurz berühren. Zusätzlich stehen Kontaktphasen mit einer Sekunde Trennabstand und Überholungen ohne registrierten Paarkontakt im Zeitfenster ±2 Sekunden in [summary.json](driver-racing/summary.json). Daraus lässt sich keine Kollisionsschwere ableiten. Alle 13 Fahrzeuge erreichen in allen Läufen regulär das Ziel. Die 30-Hz-Beobachtung zählt außerdem 0 → 0 Seil-/Randtrefferframes und 5 → 48 Offroad-Frames über alle Fahrzeuge. Diese Werte bleiben sichtbar; null Kontakte oder auf jeder Strecke weniger Kontakte werden nicht behauptet.

### Redwood und längere Alleinfahrten

| Strecke | Hilfe | Qualifying → Rennen vorher / nachher | Allein ab Runde 4 vorher / nachher | Median Nachbarabstand vorher / nachher |
| --- | --- | --- | ---: | ---: |
| Bahrain | aus | P13 → P12 / P13 → P10 | 91.8 % / 79.0 % | 1.330 / 1.373 s |
| Bahrain | an | P13 → P13 / P13 → P11 | 99.0 % / 91.0 % | 1.279 / 1.531 s |
| Kanada | aus | P13 → P13 / P13 → P13 | 0.9 % / 100.0 % | 1.022 / 1.199 s |
| Kanada | an | P13 → P12 / P13 → P12 | 20.5 % / 93.8 % | 1.008 / 1.223 s |
| Korea | aus | P13 → P12 / P13 → P13 | 94.9 % / 69.5 % | 1.066 / 1.292 s |
| Korea | an | P13 → P13 / P13 → P13 | 100.0 % / 100.0 % | 1.087 / 1.248 s |
| Frankreich | aus | P13 → P13 / P13 → P13 | 100.0 % / 100.0 % | 1.354 / 1.217 s |
| Frankreich | an | P13 → P13 / P13 → P13 | 100.0 % / 100.0 % | 1.413 / 1.329 s |
| England | aus | P13 → P12 / P13 → P13 | 85.6 % / 93.9 % | 1.335 / 1.363 s |
| England | an | P13 → P12 / P13 → P13 | 84.8 % / 100.0 % | 1.262 / 1.380 s |
| Russland | aus | P13 → P11 / P13 → P12 | 15.3 % / 12.7 % | 0.901 / 1.093 s |
| Russland | an | P13 → P13 / P13 → P13 | 53.3 % / 91.6 % | 0.833 / 1.120 s |
| Italien | aus | P13 → P13 / P13 → P13 | 31.7 % / 99.5 % | 0.900 / 1.201 s |
| Italien | an | P13 → P13 / P13 → P13 | 100.0 % / 70.0 % | 1.074 / 1.274 s |
| Japan | aus | P13 → P13 / P13 → P12 | 85.5 % / 99.2 % | 1.284 / 1.332 s |
| Japan | an | P13 → P12 / P13 → P12 | 81.2 % / 99.5 % | 1.235 / 1.288 s |

Der Nachbarwert ist der Median verfügbarer tatsächlicher Passageabstände bei noch vollständigem aktivem Feld. Die automatisierte Redwood-Referenz nutzt das schwache Hotshot-Profil; sie ist keine Prognose einer menschlichen P8-Fahrt. Die technischen Unterschiede aus PR #56 bleiben ein wesentlicher Grund für sich öffnende Lücken: Im dortigen identischen Solovergleich lagen schnellstes Fahrzeug und Redwood in Bahrain rund drei Sekunden pro Runde auseinander. Das summiert sich über acht Runden. Fahrerabhängige Kurvenausführung und Duelle machen daraus keine künstliche Feldzusammenführung. Lange Abschnitte ohne nahen Gegner bleiben möglich; die Tabelle weist auch Verschlechterungen aus.

### Fahrer im identischen Fahrzeug

Die erste Modelliteration v1 wirkte nur dort, wo der bisherige Regler bereits einen Sollwert unter Topspeed plante. Die Solomessung zeigte dadurch zu geringe Tempoeffekte. v2 berücksichtigt zusätzlich die Krümmung der gewählten Route über 32 Einheiten; oberhalb von 0,0035 wird die fahrerabhängige Kurvenausführung auch in schnellen Vollgas-Kurven berücksichtigt. Auf gerader Route bleibt der technische Topspeed bestehen. Die Fortsetzungen von v1 und v2 bleiben erhalten und separat gegen ihre unveränderten Commits geprüft. Die finale Version v3 ergänzt die oben beschriebene langsame Hindernisumfahrung und Rangierfreigabe. Die Fahrzeugphysik wurde nicht verändert.

| Fahrer | Q eine Runde | Rennen Mittel 4 Runden | Rennstreuung |
| --- | ---: | ---: | ---: |
| Marcello Robin · d001 | 34.867 s | 34.929 s | 0.016 s |
| V. Romi · d002 | 34.943 s | 34.920 s | 0.034 s |
| Thi Wu · d003 | 34.963 s | 35.057 s | 0.017 s |
| Alvaro Savic · d004 | 34.723 s | 34.916 s | 0.030 s |
| M. Callivaro · d005 | 35.007 s | 34.872 s | 0.031 s |
| Malik Salvaro · d006 | 34.866 s | 34.895 s | 0.009 s |
| R. Dénes · d007 | 35.075 s | 35.283 s | 0.041 s |
| N. O'Conner · d008 | 34.992 s | 34.945 s | 0.021 s |
| N. Miguel · d009 | 35.043 s | 35.206 s | 0.032 s |
| Dylon Hutton · d010 | 35.022 s | 35.069 s | 0.028 s |
| A. Parelli · d011 | 35.126 s | 35.248 s | 0.025 s |
| S. Colbe · d012 | 35.121 s | 35.503 s | 0.114 s |
| Dukuzuremyi · d013 | 34.945 s | 35.165 s | 0.019 s |
| Y. Francais · d014 | 34.986 s | 35.033 s | 0.003 s |
| F. Aristi · d015 | 35.149 s | 35.433 s | 0.083 s |
| S. Evans · d016 | 35.103 s | 35.041 s | 0.032 s |
| L. Anderson · d017 | 35.079 s | 35.323 s | 0.051 s |
| G. A. Montoya · d018 | 35.012 s | 35.116 s | 0.032 s |
| Valentino · d019 | 35.158 s | 35.136 s | 0.016 s |
| Di Luccio · d020 | 35.016 s | 35.161 s | 0.012 s |
| Li Young · d021 | 34.989 s | 35.077 s | 0.012 s |
| Bezetti · d022 | 35.152 s | 35.225 s | 0.013 s |
| Janssen · d023 | 35.082 s | 35.081 s | 0.017 s |
| H. Mokahashi · d024 | 34.976 s | 35.199 s | 0.011 s |
| Kuno · d025 | 34.918 s | 34.900 s | 0.027 s |
| Solim · d026 | 34.959 s | 34.888 s | 0.017 s |
| Zacharias · d027 | 34.934 s | 34.973 s | 0.024 s |
| Elfinso · d028 | 34.714 s | 34.791 s | 0.052 s |
| Sven N. · d029 | 35.065 s | 35.045 s | 0.017 s |
| E. Pastelli · d030 | 35.077 s | 35.105 s | 0.023 s |
| Felix N. · d031 | 34.859 s | 34.983 s | 0.032 s |
| Budi · d032 | 34.973 s | 35.059 s | 0.005 s |
| Kolwero · d033 | 35.062 s | 34.967 s | 0.015 s |
| Z. H. Kung · d034 | 35.100 s | 35.070 s | 0.006 s |
| D. Kluszic · d035 | 35.189 s | 35.584 s | 0.106 s |
| Levio · d036 | 35.045 s | 35.071 s | 0.015 s |
| Josuah · d037 | 35.091 s | 35.252 s | 0.012 s |
| P. d. Grosso · d038 | 34.961 s | 35.091 s | 0.025 s |
| Mika Hartmann · campaign-veteran-001 | 35.196 s | 35.174 s | 0.040 s |

Alle 39 fahren dasselbe unveränderte Redwood-Fahrzeug. Alvaro Savic fährt im Qualifying 34.723 s gegenüber Callivaros 35.007 s. Im Rennmittel liegt dagegen Callivaro mit 34.872 s vor Savic mit 34.916 s. Die Streuung enthält die kontinuierlichen Abschnittsphasen, keine nachträglichen Zeitstrafen. Die Daten zeigen getrennte Qualifying-/Rennstärken; sie versprechen keine starre Reihenfolge pro Attributwert. Prototyp und finale Werte: [prototype-solo.json](driver-racing/prototype-solo.json), [solo.json](driver-racing/solo.json).

Vollständige unveränderte native Zeitreihen, alle 13 Fahrer pro Wochenende und Quellhashes liegen platzsparend als [before.json.gz](driver-racing/before.json.gz) und [after.json.gz](driver-racing/after.json.gz) bei (Gzip-komprimiertes JSON). Die Komprimierung verändert keine Zahlen.

<!-- END MEASUREMENTS -->

## Mobile Bedienung

Die vier Touchflächen sind bei 375/390/430 Pixel Breite ungefähr
82/86/88 Pixel breit und 86 Pixel hoch. Bei 320 Pixel Breite sind es 68 × 86 Pixel.
Im Querformat erhalten sie ebenfalls bis zu 88 × 86 Pixel. Safe Areas gehen in
die verfügbare Breite ein. Der vorhandene Stil und das Layout bleiben bestehen.
Die Geschwindigkeitsanzeige sitzt bei engem Platz oberhalb der Buttons, im breiten
Querformat in der freien Mitte. Lenkpfeile und gedrückte Zustände sind deutlicher.

Die eigentliche `Controls`-Implementierung, Tastatur, Empfindlichkeitsregelung,
Pointer Capture und Freigaben bei Pause/Fokusverlust bleiben unverändert.
Browserprüfungen verwenden echte Chromium-CDP-Touchereignisse, einschließlich
eines einzelnen gelösten Lenkfingers bei gehaltenem Gas und anschließendem
Gegenlenken. Alle vier Pedal-/Lenkkombinationen, langes Halten, schnelles Tippen,
gleichzeitiges Loslassen und Abbruch werden geprüft.

![390 Pixel, echte Spielansicht](driver-racing/screenshots/touch-390x844.png)
![Querformat, echte Spielansicht](driver-racing/screenshots/touch-844x390.png)

## Browsernachweis der Fahrerzuordnung

Diese echten Ergebnisbilder stammen aus den Browserprüfungen der finalen
KI-Version v3: Pflichtqualifying, gespeicherte Startaufstellung, Reload, Rennen
und eingefrorene Fahreridentitäten im Archiv. Für diese Funktionsprüfung wird
nur im Test über die vorhandene Sessionoption eine Runde gefahren; die
Vergleichsrennen oben verwenden sämtliche unveränderten Standardrundenzahlen.

![Desktop: natives Ergebnis nach Qualifying und Reload](driver-racing/screenshots/desktop-campaign-result.png)
![Chromium-Mobilprofil: natives Ergebnis](driver-racing/screenshots/mobile-campaign-result.png)

## Prüfungen und Grenzen

Die Kernprüfungen vergleichen neue native Fortsetzungen mit gespeicherten
Fahrerphasen und wiederholen echte alte PR-56-Renn-/Qualifying-Checkpoints exakt.
Die bisherigen PR-55-Referenzen und Archive bleiben unverändert. Zusätzliche echte Checkpoints aus den unveränderten Implementierungscommits `9a092d69c24b47df7376575aab942b6740b4ff39` (v1), `2d070efab5d3d75154ef78d453dc53eb9ab8f4e7` (v2) und `81809a2b0912a0bbfd65c8d11dff1d29f710466d` (v3) schützen deren exakte Fortsetzung. Neue PR-56-
Referenzen tragen Quellhashes; ihr Generator schreibt ausschließlich nach `dist/`.
Geometrische Eingabe-Szenarien prüfen Ausscheren, geschützte benachbarte Autos
und einmalige Verteidigung, ohne daraus gefahrene Rennergebnisse zu behaupten.

Die finalen Gesamtläufe, CI, Offline-Builds und zusätzlichen Browsernachweise
werden im Pull Request dokumentiert. Mobile Prüfungen sind Chromium-Emulation;
ein physisches iPhone-/Safari-Gerät steht hier nicht zur Verfügung. Menschliche
Fahrbarkeit und finales Roguelite-Balancing benötigen anschließend Testfahrten.

```sh
node scripts/measure-driver-racing.js --stage=before --root=/unveraenderter/PR56-Checkout
node scripts/measure-driver-racing.js --stage=after
node scripts/measure-driver-solo.js
node scripts/summarize-driver-racing.js --before=docs/driver-racing/before.json --after=docs/driver-racing/after.json
node scripts/capture-driver-legacy-fixtures.js --source-root=/unveraenderter/PR56-Checkout
node scripts/capture-driver-profile-reference.js --source-root=/unveraenderter/81809a2-Checkout --source-commit=81809a2b0912a0bbfd65c8d11dff1d29f710466d
npx vitest run tests/unit/driver-personalities.test.js
npx playwright test tests/browser/driver-touch.spec.js
```
