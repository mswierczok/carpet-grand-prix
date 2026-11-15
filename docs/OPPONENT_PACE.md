# Konkurrenzfähigeres Arcade-Rennfeld

15. November 2026. Auftrag: Bei rund 119 km/h Spielerspitze sind Sieg und
Überholen zu leicht. Gemeldete Zielübertritte: 28,5 s, 53 s und 77 s;
fliegende Runden etwa 24–25 s. Basis ist das veröffentlichte `main`
`3cba63b997218d2d2e55988bcd76048d5c40cf75`, Entwicklungsbranch
`codex/competitive-race-pace`. Kein automatischer Merge.

## Spitze und Linienführung

Die bisherigen freien KI-Runden lagen bei etwa 31–32 s. Einige Profile
erreichten schon die gemeinsame Spitze, andere begrenzten ihr gesamtes Tempo
auf 98/99 %. Am Limiter wurde außerdem regelmäßig einen Eingabetakt lang Gas
weggenommen. Nun fahren alle Profile die gemeinsamen 110 Einheiten/s aus:
`110 × 0,3 × 3,6 = 118,8 km/h`, in der Anzeige **119 km/h**. Das Gas bleibt auf
freier Gerade gedrückt. Profilunterschiede betreffen die Kurvenvorgabe; die
gemeinsame Höchstgeschwindigkeit begrenzt immer das Ergebnis.

`opponent-line.js` erzeugt nur Lenkziele aus Kopien der vorhandenen Mittellinie.
Ein deterministischer Krümmungsausgleich verteilt Kurven auf Anfahrt, Scheitel
und Ausfahrt innerhalb eines durch die Straßenbreite begrenzten Streifens.
Jede Spur hat ihre eigene tatsächliche Bogenlänge für Brems- und Lenkvorschau.
Das verhindert die späte Anfahrt und unnötige Langsamfahrt an der Spitzkehre.
Die Projektion bleibt in der Umgebung des originalen Streckenfortschritts,
damit benachbarte Streckenabschnitte nicht verwechselt werden.

Die approximative Kurven-Zielplanung verwendet Faktor 1,5 auf der geglätteten
Nominalspur und 0,85 auf Überholspuren. Die tatsächlich gefahrene Kurve bleibt
durch dieselbe unveränderte Physics begrenzt, einschließlich Haftung,
Untersteuern, dunklem Rand und Seilkontakt. Die Lenkvorausschau wächst bis 35
Einheiten. Eine WeakMap erhält die Linienplanung pro Surface; alle fünf
Fahr-/Überholprofile werden vor dem Countdown berechnet. Im Rennschritt findet
keine iterative Linienoptimierung statt.

`car.s`, Sektoren, Rangfolge und Zielzeit kommen weiterhin aus der echten
Physics/RaceSession. Eine Spurprojektion wird nie auf die Fahrzeugpose oder
deren Fortschritt geschrieben. Keine Positionskorrektur auf die Ideallinie.

## Verkehr

Die Rückkehr zur Nominalspur prüft deren tatsächliche Lage und gibt dem
vorausfahrenden Fahrzeug Vorrang. Benachbarte, anders fahrende Fahrzeuge
blockieren nicht pauschal die Rückkehr. Bei größerem Abstand zur neuen Spur
nimmt die KI vorübergehend Tempo heraus, bis sie sauber liegt.

Der Folgeabstand berücksichtigt Fahrzeuglänge, Reserve, Reaktionszeit und den
Bremsweg der Annäherungsgeschwindigkeit. Bei gleichem Tempo öffnet die KI keine
unnötig große Lücke; beim starken Auflaufen wächst die Reserve.
Bleibt sie mit stehender Nase am Seil hängen, benutzt sie kurz den normalen
Rückwärtsgang samt gemeinsamer Verzögerung. Ein nahes Auto hinter ihr verhindert
blindes Zurückfahren. Kontakte löst derselbe unveränderte Kontaktkern auf.

## Reproduzierbarer Vergleich

`node scripts/measure-opponent-pace.js` erstellt die
[Messdatei](../previews/opponent-pace/field-comparison.json) mit Code-Prüfsummen,
Runden, Zielzeiten und Spitzen je Gegner. Drei echte Runden, zwölf Gegner,
derselbe veröffentlichte Feedback-Fahrer auf Spielerstartplatz 13 in beiden
Läufen; Physik 120 Hz, Eingaben 30 Hz. Keine Pose-/Zeit-/Kontaktänderungen.

| Feld | Vorher | Danach |
| --- | ---: | ---: |
| Erste KI im Ziel | 95,573 s | 80,552 s |
| Mittlere Zielzeit | 106,526 s | 88,962 s |
| Letzte KI im Ziel | 113,920 s | 97,253 s |
| Abstand Erste–Letzte | 18,347 s | 16,702 s |

Alle zwölf Gegner erreichen gerundet mindestens 119 km/h; in diesem Lauf wurden
bei keinem Gegner Seilkontakt-Frames beobachtet. Kurze kontaktbedingte Spitzen
über dem Motorlimit sind Effekte der unveränderten gemeinsamen Kontaktphysik.
Der Vergleich ist kein FPS-Benchmark und keine Nachbildung menschlicher
Fahrkunst. Die gemeldeten 77 s bleiben schneller als die gemessene KI-Spitze;
der Nutzer prüft die konkrete Schwierigkeit in der Vorschau.

Zusätzliche Tests fahren alle zwölf Profile auf freier Gerade bei vollem
Spielertempo, vergleichen ganze Felder und befreien ein zum Seil stehendes
Auto nur über echte Eingaben. Der Browser-Tastaturtest verlangt zwölf Gegner
mit gerundeten 119 km/h und 13 vollständige Zieleinläufe. Alle bisherigen
Kontur-, Kontakt-, Sektor- und Rundentests bleiben erhalten.

Der bestehende Tempogrenztest erhält nur `1e-9` numerische Toleranz: Am jetzt
erreichten Limiter liefert `Math.hypot` gelegentlich `110.00000000000003` statt
`110`. Keine höhere Fahrzeuggrenze. Referenz-Fixtures, Originalspiel, Assets,
Team-/Fahrerdaten, Spielerphysik, Steuerung, Sektorregel und Spielstände bleiben
unverändert. Pages und die eigenständige Renn-HTML erhalten denselben Code.
