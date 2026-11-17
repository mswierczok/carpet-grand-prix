# Phase 2.3: Windschatten im POV-Rennen

Aktuelle Anschlussabstimmung: [SLIPSTREAM_CLOSE.md](SLIPSTREAM_CLOSE.md)
beschreibt +5 km/h bei einer bis drei Längen und den festen Stopp bei sechs.
Die folgende Beschreibung und die ursprünglichen Protokolle dokumentieren
den damaligen 3-km/h-Stand von PR #29.

Ausgangspunkt: `main` nach PR #28, Commit
`1bf76bb90b0b5e99e693cab1b24ba57336a9746e`.
Dieser Schritt ergänzt ausschließlich Windschatten und dessen Heckwirbel.
Aufholboni gehören weiterhin zum späteren Schritt 2.4.

## Gemeinsame Wirkung und Grenzen

`src/racing/slipstream.js` wertet vor jedem 120-Hz-Physikschritt die vorherigen
Posen aller 13 Fahrzeuge gemeinsam aus. Der Fahrzeugstatus enthält keine
positionsabhängigen Vorteile. Spieler und Gegner verwenden dieselbe Funktion,
denselben Luftwiderstand und dieselben Grenzen. Mehrere Quellen werden nicht
addiert: Nur der stärkste gültige vorausfahrende Wagen zählt.

| Parameter | Wert und Bedeutung |
| --- | --- |
| Geschwindigkeitsbeginn | Beide Fahrzeuge mindestens 80 km/h vorwärts; volle Geschwindigkeitsgewichtung bei 90 km/h |
| Abstand | 2–8 Fahrzeuglängen zwischen den Mittelpunkten; volle Abstandsgewichtung bei 3–6 Längen |
| Seitliche Ausrichtung | Kernbereich bis 0,8 Fahrzeugbreiten, zur Seite weich gegen null |
| Ausrichtung | Richtungen höchstens etwa 20° auseinander; Verlauf dazwischen höchstens etwa 26° zum vorausfahrenden Auto |
| Aufbau / Abbau | Exponentielle Zeitkonstanten 0,65 / 0,45 s |
| Ausblendbereich | Nur beim gültigen bisherigen Quellfahrzeug bis 9 Längen / 1,2 Breiten; kein neuer Effekt dort |
| Wirkung | Reduzierter aerodynamischer Widerstand; höchstens etwa +3 km/h stationär auf freier Gerader |
| Unterbrechung | Rand, Seil-/Fahrzeugkontakt, Rückwärtsfahrt, Zieleinlauf oder ungültige Fahrbahnverbindung beenden die Kopplung |

Die bisherige Umrechnung bleibt `Einheiten/s × 0,3 × 3,6`:
110 Einheiten/s = **118,8 km/h**, voller idealer Windschatten höchstens
**121,8 km/h**. Die Fahrzeuglänge ist 10,8 Welteinheiten bzw. 3,24 Spielmeter.
Diese Skalierung ist weiterhin eine Spielskalierung; wir behaupten keine neue
reale Vermessung der gezeichneten Strecken und ändern ihre Geometrie nicht.

Das ursprüngliche Modell begrenzt die Geschwindigkeit hart bei 110. Allein
weniger Luftwiderstand könnte deshalb keine höhere Endgeschwindigkeit erzeugen.
Der ausschließlich im Rennen optionale Adapter erhält diese gemeinsame Grenze
ohne aktiven Effekt exakt. Bei aktivem Effekt gibt er oberhalb 110 nur die
begrenzte Antriebskraft frei, die das Basismodell zum Halten seiner ursprünglichen
Endgeschwindigkeit braucht. Diese Kraft fällt oberhalb der Basisgrenze linear
mit 3 Einheiten/s² pro zusätzlicher Einheit/s. Die maximale Widerstandsreduktion
wird aus dem Gleichgewicht dieser Kräfte für +3 km/h berechnet (bei den damaligen
Parametern ungefähr 48,5 % des **aerodynamischen Anteils**, nicht der gesamten
Fahrzeugwiderstände). Ein fester oberer Sicherheitsbegrenzer bleibt bei 121,8 km/h.

Der Adapter übergibt daraus nur Antriebskraft-/Widerstandsparameter an den
unveränderten gemeinsamen Physikkern. Er weist weder Geschwindigkeit noch Position
direkt zu. Nach Verlassen des Windschattens verzögert der Wagen durch normale
Kräfte sanft zur Basisgeschwindigkeit; eine sinkende Geschwindigkeitskappe setzt
ihn nicht schlagartig auf 118,8 zurück. Bremsen, Rollen, Rückwärtsgang, Grip,
Lenkung, Seile und Fahrzeugkontakte bleiben im bestehenden Kern. Die KI erlaubt
auf einer freien Vollgasgeraden denselben Zusatzbereich; Kurven-/Verkehrslimits
bleiben unverändert. Es gibt keinen besonderen KI-Motor und keine erzwungenen
Überholmanöver.

## Nachbararme und Brücken

Ein Kandidat muss zugleich in Weltkoordinaten hinter dem vorausfahrenden Wagen
liegen und auf derselben lokalen Route einen passenden **positiven** Abstand
haben. Rundenübergreifende Abstände funktionieren über die bestehende zyklische
Streckenlänge, auch bei einer Überrundung. Die Verbindung wird etwa alle halbe
Fahrzeuglänge gegen Fahrbahnprojektion, gemeinsame Richtung und gültigen Korridor
geprüft. Das verhindert Luftschatten quer durch eine Kehre oder über Trennseile.

Auf Brücken werden die tatsächlichen Höhen und der Verlauf dazwischen zusätzlich
verglichen. Verschiedene Ebenen koppeln nicht; auch eine räumliche Annäherung auf
verschiedenen Rampenteilen genügt nicht. Eine ungültige Topologie wird sofort
abgeschnitten statt einen restlichen Vorteil auf den anderen Streckenarm zu tragen.
Das gewöhnliche Ausscheren auf derselben Fahrbahn blendet dagegen weich aus.

## Darstellung und Diagnose

`RaceSession` gibt pro Eintrag eine kopierte `slipstream`-Struktur aus:
Stärke, Quell-ID, Abstand in Fahrzeuglängen, Seitenversatz und Widerstandsreduktion.
Genau diese Stärke berechnet im Adapter die physische Wirkung. Es gibt keine
zweite distanzabhängige Aktivierung in der Grafik.

`wake-visuals.js` erzeugt aus diesem Zustand je zwei sparsame, auslaufende
Stiftkurven pro Heckflügelspitze. Bewegung hängt nur von der Simulationszeit ab;
Pause verändert sie nicht. Keine Partikel, Zufallszahlen oder neuen Bildtexturen.
`wake3d.js` fasst das ganze Feld in einem festen dynamischen Mesh zusammen:
höchstens **ein zusätzlicher Draw Call, 2.496 Dreiecke, eine Geometrie und ein
Material**, keine zusätzlichen Texturen und keine neuen GPU-Objekte pro Frame.
Tiefentest bleibt aktiv, Tiefenschreiben aus, damit die blassen Striche die Sicht
nicht verdecken und nicht durch Brückendecks scheinen. Ressourcen werden beim
Streckenwechsel zusammen mit dem Renderer freigegeben. Auch die 2D-Ausweichansicht
liest dieselben Kurven und berücksichtigt überdeckte Brückenabschnitte.

- `race.html?balance=1`: bestehende Diagnose um `windschatten` ergänzt; auch für
  das ausgewählte Spielerfahrzeug lesbar.
- Der kleine Hinweis „Windschatten“ in der Fahransicht erscheint nur bei
  wirksamem Spieler-Windschatten. Die Strichdeckkraft wächst mit der Quadratwurzel
  der Stärke, damit auch schwache Effekte auf dem hellen Teppich lesbar bleiben.
- `race.html?balance=1&slipstream=0`: reproduzierbare A/B-Fahrt ohne Mechanik und
  ohne Wirbel. Die Option wird nicht gespeichert und gilt nach Strecken-/Team-
  wechsel und Neustart innerhalb derselben URL weiter.
- Die freien Fahrtests und das klassische Spiel erhalten keinen Windschatten.
  Bestehende Speicher, Schwierigkeit und Rundentabelle bleiben erhalten.

## Prüfungen und Reproduktion

```
npx vitest run tests/unit/slipstream.test.js
npx playwright test tests/browser/slipstream.spec.js
npm run measure:slipstream
npm run build:arcade-offline
```

Die Modultests prüfen tatsächliche Kraftintegration bis zur Endgeschwindigkeit,
sanften Abbau, gleiche Regeln, Abstände, Tempo, Kontakte, Ausscheren und reale
Nachbararme aller 22 Strecken einschließlich beider Brückenstrecken. Ein Replay
vergleicht das deaktivierte System exakt mit dem veröffentlichten 13er-Feld.
Die bisherigen bytegenauen Schutztests des Physikkerns und der Streckendaten
bleiben erhalten; der historische Brückenvergleich deaktiviert ausdrücklich die
neue Mechanik, um weiter genau die ursprüngliche Fragestellung zu prüfen.

Echte Browserprüfungen beobachten das gezeichnete 3D-Mesh zusammen mit dem
zugehörigen Physikzustand, Pause, Neustart, Streckenwechsel, Offlinefahrt und
A/B-Abschaltung mit vollständigen Zieleinläufen. Die Browseruhr darf diese
Funktionsprüfungen beschleunigen; daraus werden keine FPS-Aussagen abgeleitet.

Die zusätzlichen Feldmessungen stehen in [slipstream/README.md](slipstream/README.md).
Sie vergleichen Bahrain, Frankreich, Portugal, Japan, Korea und Russland mit und
ohne Effekt, normalen Fahrbefehlen, identischer Schwierigkeit und zwei Runden.
Verkehr/Kontakte gehören zu diesen Läufen und sind keine isolierte saubere
Fahrerreferenz. Zwei-Runden-Vergleiche ersetzen nicht die bestehenden vollständigen
Standardrennen. Rundenzeiten und Abstände dürfen wegen tatsächlicher früherer
Überhol-/Kontaktentscheidungen auch anders als der reine +3-km/h-Effekt ausfallen.
