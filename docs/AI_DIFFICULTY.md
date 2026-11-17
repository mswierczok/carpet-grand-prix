# Phase 2.2: Fahrkompetenz, Schwierigkeitsgrade und Diagnose

Ausgangsbasis: `49cf167ac25b7d7c75eed38fe45db00adcb8da76`, Merge von PR #27.
Schritt 2.1 ist damit auf `main`; der Nutzer hat am 16. November 2026 die weitere
Arbeit freigegeben. Dieser Schritt bleibt bis zu seiner eigenen Merge-Freigabe auf
`codex/phase2-ai-difficulty`. Windschatten und Aufholbonus sind nicht enthalten.

## Was sich ändert

Vor dem Start eines POV-Rennens gibt es Anfänger, Normal, Schwer und Experte.
Die Auswahl bleibt bei Teamwechsel, Neustart und Streckenwechsel erhalten und wird
für spätere POV-Rennen gespeichert. Ab dem Countdown ist sie gesperrt. Der Spieler
und alle Gegner behalten dieselbe unveränderte Fahrzeugphysik, Fahrzeuggröße,
Höchstgeschwindigkeit, Beschleunigung, Bremse, Rückwärtsfunktion und Gripgrenze.

Es gibt keine Schwierigkeits-Multiplikation der Fahrzeuggeschwindigkeit, keine
positionsabhängige Unterstützung und keine Zuweisung einer Fahrzeugposition oder
Zielgeschwindigkeit. Alle Gegner erzeugen normale Gas-/Brems-/Lenkbefehle; die
gemeinsame Physik integriert sie mit 120 Hz. Entscheidungen fallen mit 30 Hz.
Auch Anfänger können auf einer freien Geraden 118,8 km/h erreichen (Anzeige 119).

Die Stufen unterscheiden sich durch:

- genutzte Linienbreite, Optimierungsaufwand und Scheitelpunktwahl;
- Vorschau, Bremsreserven und die Präzision der Kurvenplanung;
- Lenkziel-Geometrie und vorausschauende Kompensation der vorhandenen Lenkverzögerung;
- kleine reproduzierbare Unterschiede in der Entscheidungspräzision;
- Vorauswahl sicherer Überholspuren und frühzeitige Verteidigung auf höheren Stufen.

`ai-difficulty.js` enthält die ausdrücklich benannten Fahrkompetenzparameter.
`cornerConfidence`/`passingConfidence` sind Reserven des geometrischen Planers,
keine zusätzlichen physikalischen Gripwerte. Der Faktor 1,5 für die Ideallinie
existierte bereits vor diesem Schritt; die gemeinsame Physik begrenzt weiterhin
den tatsächlich fahrbaren Kurvenradius. Höherer planerischer Mut allein war in
den Versuchen häufig langsamer und führte zu Randberührungen.
Auf Korea, Südafrika, Portugal, Schweden und Japan wurden mit 1,3 statt 1,5 im
Experten-Planer unter derselben Physik schnellere und randfreie Runden gemessen.
Diese Reserve gilt deshalb allgemein. `trackReserves` dokumentiert die gemessene
Ausnahme Bahrain: Dort ist die 1,5-Planung mit der bekannten Linie schneller und
bleibt randfrei. Das sind keine versteckten Fahrzeug- oder Tempo-Modifikatoren.
Die tatsächlich verwendeten Kompetenzparameter stehen pro Messlauf im Protokoll.
`trackLines` enthält zusätzlich die gemessene präzisere Expertenlinie für Frankreich
und Brasilien. Dort war die breitere, stärker nach innen verlegte Variante langsamer
als die engere Linie. Die Reserve betrifft ausschließlich Lenkziele auf der bestehenden
Fahrbahn; Straßenbreite, Fahrzeuggröße und physikalischer Grip bleiben gleich.

## Gemessene Ursachen und Korrekturen

Die alte Einordnungsregel begrenzte auf 65 Einheiten/s, sobald ein Auto mehr als
sechs Einheiten von seinem Lenkpfad abwich und der Richtungsfehler über 0,2 lag.
Das traf auch normale Kurvenfahrten. In einem isolierten Bahrain-Vergleich sank
die Rundenzeit allein durch eine gezieltere Einordnungsreserve von 26,088 auf
25,526 Sekunden. Grip und Höchstgeschwindigkeit blieben gleich; kein Rand- oder
Seilkontakt trat auf. Eine pauschale Verschiebung der Bremspunkte nach hinten
war dagegen langsamer. Die neuen Stufen behandeln diese Reserven unterschiedlich.

Der ursprüngliche Pure-Pursuit-Regler verwendete die Bogenlänge auf dem Zielpfad
als Nenner. Das tatsächliche Lenkziel liegt jedoch auf einer kürzeren Sehne.
Höhere Präzision berücksichtigt diese Entfernung. Die Expertengruppe kompensiert
zusätzlich die Differenz zwischen gewünschtem und tatsächlichem Lenkwinkel.
Der resultierende Befehl bleibt auf −1 bis +1 beschränkt; Reaktionsgeschwindigkeit,
Lenkwinkelgrenze und Grip im Fahrzeugmodell werden nicht verändert.

Beim Zurücklenken wird die bereits schnellere native Rückstellreaktion berücksichtigt.
Der Regler lässt die Lenkung los, statt unnötig in die Gegenrichtung zu drücken.
Schwer/Experte schätzen außerdem kurz den Kurvenausgang aus tatsächlichem Tempo,
Lenkzustand, Reaktionszeit und gemeinsamer Gripgrenze ab. Droht dabei ein Verlassen
des hellen Teppichs, erzeugen sie einen normalen Bremsbefehl. Die analytische
Positionsschätzung wird ausschließlich gelesen; sie ersetzt niemals die reale Pose
und führt keine zusätzlichen Physikschritte oder Geschwindigkeits-Zuweisungen aus.

Schwer/Experte vergleichen bei einem Überholansatz die vorhergesagten Fahrzeiten
der beiden freien Spuren, statt allein die nächstliegende Seite zu wählen. Vor
Kurven können sie einmal früh die innere Linie decken, solange der Angreifer noch
deutlich dahinter liegt. Die gleiche Belegungsprüfung verhindert einen Wechsel
quer durch ein benachbartes Fahrzeug. Beim Rückkehren bleibt die Priorität eines
vorausfahrenden Autos erhalten. Keine erzwungenen Überholmanöver oder Positionswechsel.

Überholspuren laufen in Kehren zusammen, wenn ihr lokaler Innenradius kleiner als
der fahrbare Lenkradius wäre. Die frühere Prüfung ausschließlich auf geringe
Straßenbreite übersah solche Kehren auf breiten Strecken und konnte einen Fahrer
festhalten. Die Zusammenführung gilt jetzt anhand der Krümmung auf jeder Strecke.
Die Verteidigung betrifft ausschließlich noch aktive Fahrer: Ein Fahrzeug auf der
Auslaufrunde verteidigt nicht gegen noch laufende Rennen, und ein bereits fertiger
Verfolger löst keine neue Verteidigung aus.

## Reproduzierbare Messungen

```
npm run measure:ai-balance -- bahrain
npm run measure:ai-balance
npm run measure:ai-balance -- --catalog
```

Das Werkzeug verwendet die reale öffentliche Physik und normale Befehle. Ein
stehendes isoliertes Fahrzeug startet bei −118 auf der Streckenmitte. Die erste
volle Runde wird verworfen, anschließend werden drei fliegende Runden gemittelt.
Rand-/Seilkontakte, Höchsttempo, Gas-/Bremsanteile und Torzeiten werden mitgeschrieben.
Unsaubere Läufe werden gekennzeichnet und nicht versteckt. Die Messung verändert
keine Geschwindigkeiten, Posen, Rundenregeln oder Uhren.

Die veröffentlichte KI und der automatisierte Tastatur-Referenzfahrer werden aus
dem eingefrorenen Stand von Schritt 2.1 geladen. Der Tastaturpilot nutzt binäre
Lenkbefehle mit derselben Umrechnung wie der bestehende Browser-Testpilot. Er ist
eine **vorläufige technische Vergleichsreferenz, keine gemessene menschliche
Leistungsstufe**. Deine frühere Bahrain-Fahrt (28,5/53/77 Sekunden) bleibt zusätzliche
Orientierung. Für eine endgültige menschliche Kalibrierung fehlen neue manuelle
Referenzfahrten auf mehreren Strecken.

Der Standardlauf prüft Bahrain, Frankreich, Portugal, Japan und Russland, jeweils
mit eingefrorener KI, Tastaturreferenz und allen vier neuen Stufen. Der Kalenderlauf
prüft Normal, Schwer und Experte auf allen 22 Strecken. `docs/ai-balance/` enthält die
versionierten Rohwerte und Quellprüfsummen. Die Vorgaben +6–9 %, +2–4 %, vergleichbar
und −2–3 % sind Kalibrierungsziele, keine universellen Garantien für jeden Fahrer,
jede Kurve oder jeden Rennverlauf.

128 gemeinsame räumliche Abschnitte pro Strecke machen Kurvenanfahrt, Scheitelpunkt
und Ausgang zwischen Fahrern vergleichbar. Erfasst werden mittleres/minimales Tempo,
Brems- und Gasanteile. Kurvenklassifikation verwendet für alle Piloten dieselbe
Mittellinien-Krümmung (>0,004), nicht den eigenen Zickzack-Lenkwinkel. Gas-/Bremsanteile
und Kurvenmittel beziehen sich auf die drei fliegenden Runden; Kontaktzähler und
Höchsttempo auf den gesamten Lauf. Damit bleiben Messbedingungen nachvollziehbar.

## Sichtbare Fahrdaten

`race.html?balance=1` aktiviert eine aufklappbare KI-Diagnose. Sie zeigt für das
gewählte Fahrzeug tatsächliches Tempo, Plan-/Zieltempo, Linien- und Richtungsfehler,
Zielspur, Gegnerabstand und reale Steuerbefehle. Die Entscheidungsmeldung unterscheidet
Kurvenvorschau, Einordnen, Verkehr, Richtungs- und Rückwärtsbefreiung.
Diese Werte stammen aus demselben Reglerzustand wie die Fahrbefehle. Normale Rennen
erzeugen und zeigen keine zusätzlichen Telemetrieobjekte. Es gibt keine Steuerung
der Simulation durch die Diagnose und keinen Produktions-Testadapter.

## Speicherkompatibilität

Die bewusste Auswahl wird ausschließlich unter `carpet_gp_pov_preferences_v1`
als `{ version: 1, difficulty: ... }` gespeichert. Bekannte zusätzliche Felder in
diesem eigenen Einstellungsobjekt bleiben erhalten. Laden schreibt nichts.
Klassische Spielstände, Meisterschaften und andere Browser-Einstellungen werden
weder gelesen noch überschrieben. Bei beschädigten Daten wird Normal verwendet,
ohne die Daten beim Laden zurückzuschreiben. Neuere Formate werden nicht ersetzt.
Bei verweigertem Schreiben bleibt die Auswahl für das aktuelle Rennen aktiv und
ein verständlicher Hinweis zeigt, dass sie nicht gespeichert werden konnte.

POV-Rennen besaßen bislang keinen dauerhaften Rennstand. Dieses Paket führt keine
neue Rennstand-Migration ein. Der gewählte Grad ist sowohl in den Einstellungen als
auch im öffentlichen Renn-Snapshot enthalten; ein späterer Run kann ihn übernehmen.

## Schutz und Testgrenzen

Originalspiel, Rohstrecken, Seile, Team-/Fahrerdaten, Fahrzeugphysik, Rundenregeln und
Grafik bleiben bytegleich. Die historischen Rennlängen-Messungen aus 2.1 behalten
ihre unveränderte Provenienz; ihre Quellprüfsummen werden gegen den eingefrorenen
Original-Commit geprüft, statt nach einer erlaubten KI-Änderung neue Werte als alte
Referenz auszugeben. Die Prüfung des früheren Brückenadapters benutzt ausdrücklich
auf beiden Seiten denselben eingefrorenen Regler; echte neue KI-Rennen werden
zusätzlich auf allen 22 Strecken geprüft.

Die Auswahl-/Speicherprüfungen decken Neustart, Team-/Streckenwechsel, Neuladen,
fremde/neuere Einstellungen, beschädigte Daten und verweigerten Speicher ab.
Zusätzliche Browserläufe fahren Anfänger, Schwer und Experte über normale Tastatur
bis zum Ergebnis, einschließlich der tatsächlichen Diagnoseanzeige. Die bestehende
Normal-Matrix mit ganzen Rennen und allen 22 Strecken bleibt erhalten.

Software-WebGL und beschleunigte Browseruhren sind keine Messung realer Geräte-FPS.
Auf Normal entstehen keine neuen rollierenden Physik-Voraussimulationen: Linien und
Spurpläne werden vor dem Start erzeugt und wiederverwendet. Die Entscheidung über
zwei Überholspuren fällt nur beim Manöveransatz, nicht für jeden Physikschritt.
