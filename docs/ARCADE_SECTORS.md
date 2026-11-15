# Sektor-Rundenzählung und konkurrenzfähigere KI

15. November 2026. Nutzerauftrag: Randberührung darf keine gefahrene Runde
verschlucken; unsichtbare Prüfungen an den Sektorlinien und anschließend
Start/Ziel sollen die Runde zählen. Gegner schneller machen, das Spielerauto
nicht verlangsamen. Basis: veröffentlichtes `main`
`d6cd3a05bacfe2e0c401f0101a4bfc6fa2ce643a`, Entwicklungsbranch
`codex/sector-laps-and-faster-ai`. Kein automatischer Merge.

## Runden zählen

Die bisherige Prüfung verlangte 32 Zwischenübertritte. Nun startet Start/Ziel
die erste Runde; danach gelten ausschließlich **S1 → S2 → Start/Ziel**.
Nach beiden Sektoren zählt der nächste vorwärts gefahrene Zielübertritt genau
eine Runde. Die beiden Sektorpositionen stammen unverändert aus den vorhandenen
Bahrain-Streckendaten. S1 liegt bei 25,7924 %, S2 bei 53,3640 % der Runde.

Jede Prüfung reicht bis zu den tatsächlich geschnittenen Seilkonturen auf beiden
Seiten der jeweiligen Linie. Dazu wird die Querlinie mit den vorhandenen
Konturen und Trennseilen geschnitten. Ein pauschal abgeschnittener Prüfstreifen
entscheidet nicht über Randfahrer. Die dunkle Fläche bleibt langsamer befahrbar,
macht Runden aber weder ungültig noch setzt sie die schon passierten Sektoren
zurück. Rundenzeiten werden weiter zwischen den tatsächlichen Zielübertritten
interpoliert. Rückwärtsfahren, ausgelassene/vertauschte Sektoren und mehrfaches
Überfahren von Start/Ziel ohne erneute Sektoren zählen keine zusätzliche Runde.

`Surface.checkpoints` enthält die drei unveränderlichen Linien samt seitlichen
Grenzen. `Timing` und die Fortschrittsbegrenzung der Rennreihenfolge verwenden
sie. Die bisherigen 32 `gates` bleiben ausschließlich Geometriepositionen für
die vorhandenen Richtungsschilder; sie validieren keine Runde mehr.

Die Checkpoints werden in keiner Ansicht gezeichnet. Insbesondere entfällt die
orange gestrichelte Vorschau auf das nächste Tor in 2D. Normale vorhandene
Sektorbeschriftungen und Start/Ziel bleiben bestehen. Die Oberfläche zeigt
keinen technischen 32-Tore-Zähler mehr. Freier 2D-/3D-Fahrtest und volles Rennen
verwenden dieselbe neue Rundenprüfung. Countdown, aktive Zeit, Zieleinlauf und
das bereits bestehende sichere Zurücksetzen bleiben erhalten.

## Schnellere Gegner ohne Spieler-Nerf

`physics.js` bleibt bytegenau gleich. Spieler und KI behalten dieselbe
Höchstgeschwindigkeit, Beschleunigung, Bremse, Lenkung und Haftung. Die KI war
bislang durch ihre freiwillige Geradeausvorgabe von 86 Streckeneinheiten/s,
92–100-%-Fahrstile und frühzeitiges Abbremsen auf die langsamste Kurve der
nächsten 80 Einheiten deutlich langsamer als ein direkt gesteuerter Spieler.

Nun plant die KI mit der gemeinsamen Fahrzeuggrenze von 110 Einheiten/s und
98–100-%-Zieltempi. Die Bremsvorschau berücksichtigt die tatsächliche Entfernung
zur kommenden Kurve, Bremskraft und Reaktionsreserve. Sie fährt Geraden dadurch
länger aus und bremst vor der Kurve passend ab. Die vorsichtige Kurvenvorgabe
nutzt 70 statt 50 % der gemeinsamen Querbeschleunigung. Im Verkehr hängt der
Abstand zusätzlich von der Annäherungsgeschwindigkeit ab: Bei gleichem Tempo
wird nicht mehr unnötig eine große Lücke aufgerissen; auf einen langsamen
Vordermann reagiert die weiter reichende Verkehrsprüfung frühzeitig.

Es gibt keinen Aufholbonus, keine höhere Motorleistung für Gegner und keine
geänderten Team-/Fahrerwerte. Der KI-Fahrer erzeugt weiterhin normale
Gas-, Brems- und Lenkbefehle und kollidiert mit denselben Seilen und Autos.

Die [kontrollierte Vergleichsfahrt](../previews/sector-timing/pace-comparison.json)
verwendet denselben unveränderten Fahrkern und dieselbe Strecke, jeweils ein
isoliertes KI-Auto von s = −22 bis hinter Start/Ziel nach einer Runde:
47,167 s vorher, 32,933 s danach; keine Randkontakte. Beobachtete Spitze:
80,09 bzw. 108,50 Einheiten/s. Das sind rund 30 % weniger Fahrzeit in dieser
konkreten freien Probe, keine FPS-Messung oder Zusage über jedes Verkehrsszenario.

## Prüfung

Zusätzliche Modultests prüfen volle dunkle Randbreite an allen drei Linien,
zwei aufeinanderfolgende Runden, Reihenfolge, Rückwärtsfahrt, doppelte
Zielübertritte, entfallene Zwischenprüfungen und das tatsächlich höhere Tempo
gegen den veröffentlichten Gegnercode. Die unveränderte Spielerphysik wird
zusätzlich bytegenau gegen den genannten Ausgangscommit geprüft.

Eine echte Browserfahrt lenkt das Auto über Tastaturbefehle auf den dunklen Rand
an S1, S2 und beim Ziel. Die Runde muss ohne Seilkontakt gezählt werden. Ein
Bildvergleich bei identischer Pose, aber verschiedenen erwarteten Sektoren,
verlangt identische Canvas-Bilder: Die Checkpoints dürfen nicht sichtbar sein.
Die vollständigen 13-Auto-Rennen, der stehende Spieler sowie die bisherigen
Speicher-/Geometrie-/Offlineprüfungen laufen weiter mit. Geänderte direkte
Tor-Einheitstests spiegeln die ausdrücklich gewünschte neue Regel wider;
`tests/fixtures/` wird nicht verändert. Ergebnisse stehen im PR.

Neue Script-Versionen verhindern gemischte alte/neue Timingmodule im Browsercache.
Beide freien Offline-Dateien und die Renn-Offline-Datei enthalten den neuen Stand.
Keine neue Abhängigkeit, keine Änderung an Originalassets oder klassischen
Meisterschaftsspielständen. Die Hardware-/Safari-/FPS-Grenzen des ersten
vollen Rennfelds bleiben unverändert; hierfür wird keine neue Grafikabnahme behauptet.
