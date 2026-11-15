# Bahrain-Rennen mit vollem Feld

Dieser Bericht beschreibt die ursprüngliche Lieferung von PR #20. Die später
gewünschte Sektor-Rundenzählung und das höhere KI-Tempo stehen in
[ARCADE_SECTORS.md](ARCADE_SECTORS.md).

15. November 2026. Nutzerauftrag: direkt ein Rennen mit vollem Feld statt des
zuvor vorgeschlagenen kleinen Felds. Ausgangsbasis: veröffentlichtes `main`
`80cd477a617e052ed09bf7ed1e973bc25529ab36`. Entwicklungsbranch:
`codex/arcade-full-grid-race`. Der klassische Modus und die freien Fahrtests
bleiben erhalten. Kein Merge ohne ausdrückliche Nutzerfreigabe.

## Spielen

`race.html` startet die neue 3D-Rennansicht. Der freie Fahrtest verlinkt sie.
Ein Spieler fährt gegen zwölf KI-Autos: genau ein Fahrzeug für jedes der
13 vorhandenen Teams. Das eigene Team wird vor dem Start gewählt; der Spieler
startet auf Platz 13. Alle Fahrzeuge verwenden unverändert dieselben
Physikparameter wie der bisherige Fahrtest. Teamstärken, Fahrerwerte und die
klassische Meisterschaft werden nicht umgedeutet.

Nach „Rennen starten“ hält ein dreisekündiger Countdown alle Fahrzeuge fest.
Bei Grün beginnt die Rennzeit. Gefahren werden drei vollständige Bahrain-Runden
mit den vorhandenen geordneten Kontrollpunkten. Dunkler Teppich bremst weiterhin,
entwertet aber keine Runde. Beide zusätzlichen Trennseile bleiben wirksam.

Position und Runde stehen auch direkt im Fahrbild. Die Tabelle zeigt das ganze
Feld. Pause/Fokusverlust hält alle 13 Autos an, einschließlich eines laufenden
Countdowns. R setzt nur das eigene Auto auf einen freien vorangegangenen Platz;
die Tore und die bereits gefahrenen Runden bleiben erhalten. Ein neues Rennen
setzt das gesamte Feld zurück. Die Teamauswahl ist während des Rennens gesperrt.

Nach dem eigenen Ziel wird die echte Zeit festgehalten. Die KI übernimmt das
eigene Auto für die Ausfahrt, damit es den Nachfolgenden nicht im Weg steht.
Die Ergebnisliste erscheint bereits und kennzeichnet noch fahrende Teams.
Sobald alle 13 im Ziel sind, steht das Ergebnis fest und das Rennen pausiert.
Es werden keine Zielzeiten geschätzt und keine noch fahrenden Autos als
angekommen ausgegeben. Sortiert wird zuerst nach tatsächlicher Zielzeit, sonst
nach dem durch Kontrollpunkte begrenzten Fortschritt; Rückwärtsfahrt erzeugt
keinen künstlichen Fortschrittssprung.

Ohne WebGL 2 oder beim manuellen Wechsel bleibt dasselbe Rennen mit denselben
13 Autos in 2D bedienbar. Kontextverlust pausiert das ganze Feld. Die
eigenständige Datei heißt `carpet-grand-prix-race-offline.html`. Wie der freie
Fahrtest speichert diese erste Rennversion keine Arcade-Sitzung: Neuladen
beginnt ein neues Rennen. Klassische Spielstände bleiben unangetastet.

## Module

| Datei | Verantwortung |
| --- | --- |
| `racing/race-session.js` | Startfeld, Countdown, fester 1/120-s-Schritt, 13 Zustände, Zieleinlauf und Rangfolge |
| `racing/opponents.js` | Vorschau auf Kurven, freie Überholseite, Abstand, Gas/Bremse/Lenken bei 30 Entscheidungen/s |
| `racing/vehicle-contacts.js` | Gedrehte Fahrzeugrechtecke, gleichberechtigte Kontaktauflösung und Seilprüfung |
| `rendering/fleet3d.js` | Gebündelte Gegner aus derselben tatsächlichen Fahrzeuggeometrie und denselben Lackierungen |
| `ui/arcade-race-ui.js` | Stabile Ranglisten-Zeilen, Countdown, Runde/Position und Ergebnisse |
| `race.html`, `styles/arcade-race.css` | Eigenständige Rennansicht mit gemeinsamer Steuerung und Renderer |

Der KI-Fahrer erzeugt ausschließlich normale normierte Fahrbefehle. Position und
Richtung kommen aus `Physics.step`; es gibt keine Fahrt entlang eines Zwangspfads,
kein Versetzen zur Ideallinie und keinen Aufholbonus. Unterschiedliche
vorausschauende Zieltempi von 92–100 % des KI-Grundtempos sind vorläufige
Fahrstile dieser neuen Rennprobe, keine Änderung der bestehenden Teamdaten.
Die KI beginnt ein Überholmanöver früh und behält Abstand, bis die andere Seite
frei ist. Dauerhaftes Bremsen darf nicht versehentlich den Rückwärtsgang wählen.

Kontakte berücksichtigen vier Trennachsen der beiden gedrehten Rechtecke.
Gleich schwere Fahrzeuge werden symmetrisch getrennt, mit kleiner Rückfederung
und ohne zufällige Kontrollverluste. Die Prüfung gegen die Seile begrenzt die
Ausweichbewegung. Falls auf einer Seite kein Platz ist, wird die andere Seite
verwendet; andernfalls bleiben die vorherigen sicheren Posen erhalten. Es gibt
keine globale Gruppenverschiebung. Die Verarbeitung beginnt abwechselnd bei
verschiedenen Teilnehmern, damit nicht dauerhaft derselbe Listeneintrag bevorzugt
wird. Spieler und KI verwenden dieselben Kontaktregeln.

## Aufwand begrenzen

Die Streckenprojektion hat einen räumlichen Index. Er nimmt nur sicher entfernte
Segmente aus der Suche; bei entfernten Punkten wird vollständig gesucht. Ein
Rückvergleich mit dem veröffentlichten Code prüft dieselben Koordinaten,
Fortschritte, Winkel und Segmentnummern für 1.200 Punkte mit/ohne lokale Hinweise.
Die Mittellinie, Seilkonturen, Fahrparameter und Rundenmessung bleiben erhalten.

Die Gegner werden aus dem vorhandenen vollständigen Spielermodell samt
individueller SVG-Lackierung erzeugt. Farben, UVs, Konturen, Schatten und räumliche
Transformationen werden erhalten und nach kompatiblen Materialien gebündelt.
Jeder Gegner benötigt höchstens acht statt eines vollständigen Baums aus
Einzelteilen. Geometrien und Texturen werden je Team einmal vorbereitet und
wiederverwendet. Der Cache ist auf die 13 tatsächlichen Teams begrenzt.
Beim Spieler bleiben sichtbarer Lenkeinschlag und Raddrehung erhalten; bei den
KI-Autos sind die Räder statisch in den Modellgruppen enthalten. Kamerafremde Meshes werden wie bisher
vom Renderer ausgeblendet. Keine neue Browserbibliothek, kein neues Bildasset,
kein zusätzlicher Three-Build und keine Änderung der Grafikbibliotheksversion.

Der gemeinsame Offline-Build erzeugt zusätzlich die Renndatei und schreibt die
Navigation auf lokale Offline-Dateien um. CI liefert sie im bestehenden
`carpet-grand-prix-arcade-preview`-Artefakt mit. Der CI-Zeitrahmen steigt von
15 auf 25 Minuten, weil zusätzliche echte Rennen in Desktop- und Mobilformat
vollständig gefahren werden. Einzelne Fahrten bleiben zeitlich begrenzt.

## Prüfung und Grenzen

Neue Modultests prüfen 13 eindeutige, freie Startplätze, rote Ampel/Pause,
Teamwechsel und Neustart, deterministische Frame-Aufteilung, unveränderte
Projektion, symmetrische Kontakte ohne Seildurchfahrt, Überholen eines stehenden
Autos, freie Rücksetzung sowie vollständige Rennen mit 13 tatsächlichen
Zielzeiten. Ein stehenbleibender Spieler darf die zwölf KI-Autos nicht am Ziel
hindern. Bestehende Speicher-/Referenzprüfungen bleiben unverändert.

Die Browserprüfung beobachtet tatsächliche Teamtexturen und Modellgruppen,
den begrenzten Cache, Teamwahl, Countdown, alle 13 bewegten Autos, Pause,
2D-Wechsel und netzwerkfreies 3D. Eine weitere Fahrt steuert das Spielerauto
ausschließlich über Tastaturereignisse bis zu allen 13 Ergebnissen. Deren
Feedback-Fahrer liest Render-Snapshots, verändert aber weder Physikparameter
noch Posen oder Kontrollpunkte. Ergebnisse werden im PR dokumentiert.

Tatsächliche Aufnahmen: [Startaufstellung](../previews/arcade-race/grid.png),
[3D-Rennstart](../previews/arcade-race/race-view.png),
[Ergebnisliste](../previews/arcade-race/results.png). Die Ergebnisaufnahme wurde
über denselben kompletten Tastaturablauf in der 2D-Ausweichansicht erreicht.
Alle Zeiten stammen aus der gefahrenen Sitzung. Herkunft und Werte stehen in
`previews/arcade-race/capture.json`. Wiederholen bei laufendem Testserver:
`node scripts/capture-arcade-race.js`. Keine dieser Aufnahmen ist ein FPS-Nachweis.

Die Echtzeitmessung kann bei laufendem Testserver ohne parallele Browserprüfungen
mit `npm run measure:arcade3d -- --race --software-webgl` wiederholt werden.
Sie zählt nur tatsächliche Rennbilder nach dem Countdown, keine virtuelle
Playwright-Zeit. Software-WebGL ist kein Nachweis für Hardware-FPS. Echte
GPU-/Safari-/Mobilgeräte und die subjektive Abnahme von Fahrzeugkontakten und
Überholverhalten bleiben offen. Bahrain ist weiterhin die einzige Arcade-Strecke.
Noch keine Qualifikation, Meisterschaft, Run-Belohnungen, Items oder Schäden.

Die [Softwaremessung](../previews/arcade-race/software-benchmark.json) bei
1.000 × 800, 13 Fahrzeugen und sparsamer Stufe lieferte 20 ausgewertete Rennbilder
über rund 2,4 Sekunden: Median der Bildabstände 116,7 ms, p95 183,3 ms,
p95 der CPU-Abgabe 5,9 ms; zuletzt 132 Zeichenaufrufe und 52.083 Dreiecke.
**Die Software-GPU erreicht damit die 30-FPS-Zielstufe nicht.** Die CPU-Abgabe
ist ausdrücklich kein Hardware-FPS-Nachweis. Der kurze Test belegt weder eine
vollständige Hardwareabnahme noch dauerhaftes 60-/30-FPS-Spiel auf echten Geräten.
