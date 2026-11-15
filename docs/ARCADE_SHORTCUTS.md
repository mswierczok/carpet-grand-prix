# Abkürzungen zwischen benachbarten Streckenarmen schließen

15. November 2026. Ausgangsbasis: veröffentlichtes `main`
`29db32f2124c23a8c6ea8c043f7fab3316989b4b` nach PR #18. Nutzerauftrag:
Den im Screenshot gezeigten Durchgang physisch schließen, dann den Fahrtest
abschließen und die nächsten Entwicklungsschritte benennen. Entwicklungsbranch:
`codex/prevent-track-shortcuts`. Kein automatischer Merge.

## Korrektur

Die geschlossene Außenkontur verhindert das Verlassen der gesamten Fahrfläche.
Wo die dunklen Ränder zweier naher Streckenarme zusammenwachsen, verhindert sie
jedoch keinen Wechsel zwischen diesen Armen. Die geordneten Kontrollpunkte
zählen dabei keine abgekürzte vollständige Runde; der befahrbare Durchgang ist
trotzdem unerwünscht. Das betrifft den mittleren Rücklauf und den Bereich zwischen
Spitzkehre und oberer Geraden.

Zwei gezielte Trennseile schließen diese Durchgänge. Sie liegen zwischen den
hellen Fahrbahnen im dunklen Rand. Die Enden werden beim Datenexport exakt an die
bisherigen Seilkonturen zugeschnitten; es bleiben weder offene Anschlusslücken
noch unsichtbare Rückverbindungen. Die vorhandenen vier Konturen und deren
Fahrflächenpolygone bleiben unverändert. Die dunkel befahrbare Fläche wird nur
an den sichtbaren Seilen getrennt.

`scripts/build-arcade-boundaries.js` enthält die beiden für Bahrain geprüften
Führungslinien. Der Export ergänzt `dividers` in den versionierten Konturdaten.
Der Generator prüft entlang der gesamten Linien den Abstand zur hellen Fahrbahn
und bricht bei einer späteren unpassenden Geometrieänderung ab. Diese konkreten
Führungslinien sind kein allgemeiner Streckengenerator für die übrigen 21 Strecken.

`BoundaryField` nimmt die offenen Seilsegmente in dasselbe räumliche Kontaktraster
wie die bisherigen Seile auf. Sie beeinflussen keine Polygon-Innen-/Außenprüfung.
2D und 3D zeichnen dieselben Punkte mit demselben Radius von 0,8. Die 3D-Kurve
unterstützt dafür ausdrücklich offene Linien, ohne die Enden miteinander zu
verbinden. Neue Script-Versionen vermeiden alte Cache-Kombinationen; der
Offline-Export bettet die aktualisierten Dateien vollständig ein.

Unverändert bleiben Mittellinie, helle Breite, Fahrzeugmaße, sämtliche
Physikparameter, Rundenmessung und Randverlangsamung. Es werden keine ungültigen
Runden eingeführt. Die klassischen Spielsysteme, Teams, Fahrer, Originalbilder
und Spielstände sind nicht Bestandteil der Änderung. Keine neue Abhängigkeit.

## Nachweis

Vier zusätzliche Modultests prüfen offene Kontakte ohne künstliche Schließkante,
lückenlose Anschlüsse, freien Abstand zur hellen Fahrbahn und die tatsächliche
offene 3D-Geometrie. Der Fahrversuch fährt beide Durchgänge aus beiden Richtungen
vorwärts und rückwärts an: Ohne Trennseile sind sie tatsächlich passierbar; mit
Trennseilen stoppt das ganze Fahrzeug vor dem Seil. Die bestehenden drei
regulären Runden müssen weiterhin ohne Kontakt enden.

Zusätzliche Browserprüfungen fahren die gemeldete Stelle im tatsächlichen 2D-
und 3D-Spiel ausschließlich über Tastaturereignisse an. Die Probe muss vor dem
Wechsel auf den Rücklauf durch einen Kontakt stoppen. Desktop und Mobilformat,
die bisherigen regulären Runden und die Offline-Ausgaben werden mit geprüft.
Ergebnisse und Vorher-/Nachher-Aufnahmen stehen im PR.

| Stelle | Vorher | Nachher |
| --- | --- | --- |
| Mittlerer Rücklauf | [Aufnahme](../previews/track-shortcuts/before-central.png) | [Aufnahme](../previews/track-shortcuts/after-central.png) |
| Spitzkehre/Gerade | [Aufnahme](../previews/track-shortcuts/before-straight.png) | [Aufnahme](../previews/track-shortcuts/after-straight.png) |

[Gesamtübersicht](../previews/track-shortcuts/overview.png). Gleiche Posen und
Kameras im echten Spielrenderer; die Vorher-Aufnahmen verwenden die Konturdaten,
Kontaktgeometrie und Streckendarstellung des genannten Ausgangscommits per
Test-Routenabfang. Herkunft und Bildgröße: `previews/track-shortcuts/capture.json`.
Die interaktive Engstellenansicht bleibt `previews/track-boundaries/index.html`.

Der nächste Ausbau ist als Vorschlag in [ARCADE_NEXT_STEPS.md](ARCADE_NEXT_STEPS.md)
beschrieben. Die Korrektur führt noch keine Gegner, Rennen oder Runs ein.
