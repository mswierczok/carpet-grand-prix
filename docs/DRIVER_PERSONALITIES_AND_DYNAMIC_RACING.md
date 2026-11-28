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
hat die Verkehrssicherung Vorrang. Auf freier Gerade bleiben Vollgas und das
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

## Speicherung und Identität

Native Wochenenden/Sessionkonfigurationen erhalten optional:

```json
{"driving":{"version":1,"seed":4171,"lineup":{"t01":"d001","…":"…"}}}
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
mit erhaltener v1-Implementierung.

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

<!-- MEASUREMENTS -->

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

## Prüfungen und Grenzen

Die Kernprüfungen vergleichen neue native Fortsetzungen mit gespeicherten
Fahrerphasen und wiederholen echte alte PR-56-Renn-/Qualifying-Checkpoints exakt.
Die bisherigen PR-55-Referenzen und Archive bleiben unverändert. Neue PR-56-
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
node scripts/capture-driver-legacy-fixtures.js --source-root=/unveraenderter/PR56-Checkout
npx vitest run tests/unit/driver-personalities.test.js
npx playwright test tests/browser/driver-touch.spec.js
```
