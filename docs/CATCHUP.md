# Phase 2.4: dezente KI-Aufholhilfe

Ausgangspunkt ist das veröffentlichte `main` nach PR #29:
`2bc124a11c274c0f52eb516bd9a0f1ea9e0d377f`. Windschatten bleibt eingeschaltet
und wird in A/B-Vergleichen auf beiden Seiten unverändert verwendet.

## Regeln und Parameter

| Renngesamtposition | Grundbudget |
| --- | ---: |
| P1–P3 | 0 % |
| P4–P6 | höchstens 0,2 % |
| P7–P9 | höchstens 0,5 % |
| P10–P13 | höchstens 0,9 % |

Die Hilfe gilt ausschließlich für noch fahrende KI. Spieler und Podiumsplätze
bekommen immer null, auch nach einem Fehler. Bereits fertige Fahrer behalten
ihre Gesamtposition; aus dem vierten Fahrer wird nach dem Zieleinlauf des ersten
nicht fälschlich der erste aktive Fahrer. In Auslaufrunden wirkt keine Hilfe.

Das Budget beginnt erst acht Sekunden nach Grün und erst bei mindestens zwei
Sekunden gemessenem Rückstand zur Spitze. Zwischen zwei und zehn Sekunden steigt
die Gewichtung mit einer glatten Kurve von null auf eins. Ein Zeitabstand wird
nicht durch Wegstrecke geteilt durch momentanes Tempo ersetzt.

Im unmittelbaren Zweikampf verbleiben nur 25 % des sonst möglichen Budgets;
zwischen 0,7 und 1,8 Sekunden Abstand zu Vorder-/Hintermann wächst die Gewichtung
weich wieder an. Eine zusätzliche räumliche Prüfung reduziert die Hilfe auch
gegenüber überrundeten Nachbarn, die in der Gesamtreihenfolge weit entfernt
stehen: gleiche Höhe, dieselbe lokale Route und räumlicher Abstand bis 60
Welteinheiten. Brücken und nahe andere Streckenarme werden so nicht versehentlich
als Zweikampf behandelt. Diese Prüfung kann ausschließlich reduzieren, niemals
ein zusätzliches Budget erzeugen.

Nach mindestens 0,35 Sekunden eigenem Rand-/Seil-/Rückwärtsproblem kann nach
Rückkehr auf die Fahrbahn eine Erholung von bis zu 0,3 Prozentpunkten hinzukommen.
Das Fenster endet spätestens acht Sekunden später; erneute Fehler verlängern es
nicht. Danach gilt eine zusätzliche Sperrzeit von vier Sekunden. Fahrzeugkontakt
unterdrückt die Fehlerwertung bis zur Beendigung der betroffenen Episode sowie
mindestens eine Sekunde nach dem Kontakt. Das verhindert, dass ein von einem
Gegner auf den Rand geschobenes Auto automatisch als neuer eigener Fahrfehler
gewertet wird. Der gesamte Aufholvorteil bleibt bei **höchstens 1,2 %**.

Aufbau und gewöhnlicher Abbau haben Zeitkonstanten von 0,8 bzw. 1,2 Sekunden.
Spieler, P1–P3, Ziel, Rand, Kontakt und Rückwärtsfahrt erhalten sofort kein neues
Budget mehr. Die vorhandene Geschwindigkeit klingt dabei durch Kräfte aus;
ein fallender Begrenzer setzt das Auto nicht auf einen neuen Tempowert zurück.

## Echte laufende Zeitabstände

`race-gaps.js` speichert eine begrenzte Geschichte tatsächlich beobachteter,
bereits durch Sektoren abgesicherter Rennfortschritte und ihrer Rennzeiten.
Die Stützpunkte werden alle 0,05 Sekunden gespeichert, ergänzt um den aktuellen
Endpunkt. Gleiche Positionen werden bei Stillstand mit verschiedenen Zeiten
behalten: Die erste Ankunft misst den Rückstand, die letzte Standprobe grenzt
die anschließende Abfahrt ein. Ein Stillstand wird dadurch nicht über einen
langen Wegabschnitt verteilt. Zwischen den Stützpunkten wird interpoliert;
die Werte haben eine Abtastauflösung, keine behauptete millisekundengenaue
Transpondermessung.

Fortschritt bleibt absolut über mehrere Runden, statt an Start/Ziel auf null
zu springen. Rückwärtsfahrt überschreibt keine früheren Erstpassagen. Die
Geschichte wird auf 90 Sekunden begrenzt und regelmäßig kompaktiert. Unbekannte
oder bereits verworfene Passagen führen zu keiner Hilfe. Fertige Fahrer werden
am tatsächlichen Zielpunkt und mit ihrer Zielzeit eingefroren, nicht auf ihrer
späteren Auslaufrunde weitergemessen. Pause bewegt weder Rennzeit noch Historie.

## Physische Umsetzung

`catchup.js` berechnet zunächst ein kleines Budget anhand von Rang, tatsächlichem
Zeitabstand, Zweikampf und Fehlererholung. Sein Rennadapter erhöht ausschließlich
Beschleunigungs- und Geradentempobudget um diesen Anteil. Grip, Kurvenziele,
Bremsleistung, Lenkung, Kollisionen, Seile, Checkpoints und Stammdaten bleiben
erhalten. Die KI nutzt das zusätzliche Tempobudget nur bei ihrem bereits freien
Vollgasziel; ihre Kurven- und Verkehrsziele werden nicht angehoben.

Die Prozentwerte sind ein maximales zusätzliches Motor-/Geradentempobudget,
keine garantierte prozentuale Rundenzeitverkürzung. Bei den bestehenden Einheiten
entspricht 1,2 % höchstens 1,4256 km/h zusätzlich zur Basis von 118,8 km/h.
Mit vollem Windschatten bleibt der kombinierte obere Bereich bei 123,2256 km/h.
Es gibt keine Positions-, Zeit- oder direkte Geschwindigkeitszuweisung und keine
erzwungenen Überholmanöver.

Der vorhandene Windschattenadapter verwendet weiterhin den ursprünglichen
aerodynamischen Bezug, damit seine wirkende Widerstandsreduktion und sein
sichtbarer Zustand übereinstimmen. Beim Wegfall der neuen Hilfe darf der Motor
das vorhandene Zusatztempo durch normale Kräfte abbauen; die Sicherheitskappe
wird nicht schlagartig unter die momentane Vorwärtsgeschwindigkeit gesetzt.
Ohne Aufhol-Kontext läuft weiterhin exakt der bisherige Windschattenpfad.

## Bedienung, Diagnose und Kompatibilität

- Vor dem Start: **KI-Aufholhilfe – Dezent/Aus**. Ab Countdown gesperrt.
- Die Auswahl bleibt für Team-/Streckenwechsel und Neustart in dieser Fahrt
  erhalten. Sie schreibt keinen Spielstand und ist ausdrücklich keine dauerhaft
  gespeicherte Einstellung. Die bestehende gespeicherte Schwierigkeit bleibt
  unverändert.
- `race.html?catchup=0` startet mit ausgeschalteter Hilfe.
- `race.html?balance=1` zeigt unter `aufholhilfe` das tatsächlich verwendete
  Budget, Zielbudget, dessen Rang, Führungsabstand, Zweikampffaktor und verbleibende
  Fehlererholung. Der Rang bezieht sich auf den Beginn des letzten Physikschritts;
  ein während dieses Schritts erfolgter Positionswechsel kann in der Ergebnis-
  anzeige bereits eine Position weiter sein.
- `RaceSession.create(track, { catchup: false })` deaktiviert das System auch
  für automatisierte Vergleiche. Das deaktivierte Rennen wird exakt gegen den
  veröffentlichten Stand mit Windschatten verglichen.
- Die freien Fahrtests, klassische Meisterschaft, Speicherkennungen, Fahrer,
  Teams, Grafik und Rundenzahlen bleiben erhalten. Keine Migration notwendig.

## Prüfungen

```
npx vitest run tests/unit/catchup.test.js tests/unit/slipstream.test.js
npx playwright test tests/browser/catchup.spec.js
npm run measure:catchup
npm run build:arcade-offline
```

Die Modultests prüfen echte Passagezeiten einschließlich Stillstand/Rückwärtsfahrt,
Rang- und Rückstandsgrenzen, Spieler, Zweikämpfe, Fehler-/Kontaktfälle, Acht-Sekunden-
Grenze, Kraftintegration, kombinierten Windschatten und exaktes deaktiviertes Replay.
Browserprüfungen fahren das tatsächliche 13er-Feld in 3D und offline, prüfen
die A/B-Abschaltung sowie Auswahl und Speicherschutz. Die bestehenden Kalender-
prüfungen verwenden die neue Hilfe zusätzlich auf allen 22 Strecken. Historische
KI-/Brückenreplays schalten beide neuen Hilfen aus, um dieselbe alte Fragestellung
zu behalten; ihre Referenzdateien werden nicht ersetzt.

Die zusätzlichen A/B-Fahrten und ihre Grenzen stehen in
[catchup/README.md](catchup/README.md). Die Mechanik soll kleine Rückstände
abmildern; sie garantiert kein kompaktes Feld und keinen Ausgleich großer Fehler.
