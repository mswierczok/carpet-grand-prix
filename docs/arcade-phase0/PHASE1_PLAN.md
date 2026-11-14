# Phase 1 – konkreter Implementierungsplan zur Freigabe

**Noch nicht implementiert.** Umfang: ein direkt gesteuertes Fahrzeug auf der
bestehenden Bahrain-Geometrie, in der Draufsicht, ohne Gegner und ohne Run-System.
Ziel ist ein überzeugender Fahrtest, nicht möglichst viele neue Menüs/Upgrades.
Die klassische Simulation wird nicht umgebaut oder als Spielerphysik ausgegeben.

## Vorgeschlagene Projektstruktur

Deine Ordner werden übernommen. Ergänzt werden ein eigener Einstieg und kleine
Daten-/Zeit-/Sitzungsgrenzen, damit `index.html` keine zweite große Spiel-IIFE bekommt.
Nur tatsächlich benötigte Dateien werden in der jeweiligen Phase angelegt.

```text
carpet-grand-prix/
├── index.html                         # klassischer Modus, weiter funktionsfähig
├── arcade.html                        # neuer isolierter Fahrtest, ab Phase 1
├── src/
│   ├── arcade-main.js                 # nur neuer Modus: Einstieg und Lebenszyklus
│   ├── racing/
│   │   ├── physics.js                 # Phase 1: reine freie Fahrzeugbewegung
│   │   ├── controls.js                # Phase 1: Tastatur → semantischer Input
│   │   ├── session.js                 # Phase 1: eigener Zustand, Pause, Reset
│   │   ├── track-surface.js           # Phase 1: Fahrfläche und lokale Projektion
│   │   ├── timing.js                  # Phase 1: Tore/Checkpoints und echte Zeit
│   │   └── opponents.js               # erst Phase 3: KI → gleicher Input wie Spieler
│   ├── rendering/
│   │   ├── arcade2d.js                # Phase 1: Testansicht ohne klassischen State
│   │   ├── camera3d.js                # erst Phase 2
│   │   ├── vehicles3d.js              # erst Phase 2
│   │   └── tracks3d.js                # erst Phase 2
│   ├── roguelite/
│   │   ├── runs.js                    # erst Phase 4
│   │   ├── items.js                   # erst Phase 4/5
│   │   └── synergies.js               # erst Phase 5
│   └── data/
│       ├── arcade-tracks.js           # geprüfter Export der bestehenden Strecke
│       └── arcade-roster.js           # schreibgeschützte bestehende IDs/Teamdaten
├── assets/{drivers,cars,tracks}/      # vorhandene Originale bleiben bestehen
├── styles/arcade.css                  # ab Phase 1, keine globale Classic-Kaskade
└── tests/{unit,browser}/              # zusätzliche Arcade-Prüfungen
```

Die bestehenden Dateien bleiben zusätzlich bestehen; der Baum ist keine
Anweisung, andere Module zu löschen. In Phase 0 werden keine leeren Platzhalter
für später geplante Dateien erstellt.

## Schnittstellen statt versteckter Verknüpfungen

- `controls` liefert `{ throttle, brake, steer }` mit normierten Werten.
  Tastatur und später Gamepad verwenden dieselbe Schnittstelle.
- `physics.step(state, input, surface, parameters, dt)` liefert den nächsten
  Zustand. Keine DOM-, Speicher-, Render- oder Zufallszugriffe darin.
- Freier Zustand enthält Position, Fahrtrichtung, Längs-/Seitengeschwindigkeit
  und Drehbewegung; Fortschritt ist eine Messgröße, kein Fahrzwang.
- `session` besitzt genau ein Spielerauto. Keine Änderung von `createRace()` auf
  13 Autos und keine Konvertierung des klassischen `s`.
- `arcade2d` liest nur einen Render-Snapshot und interpoliert bei Bedarf.
- `timing` liest tatsächliche Übertritte und aktive Spielzeit; es verwendet nicht
  den klassischen Faktor für offizielle Rundenzeiten.

Für den kleinen Phase-1-Prototyp sind gekapselte klassische Scripts mit einer
eigenen `CGPArcade`-Schnittstelle eine praktikable, bereits im Projekt erprobte
Variante. Dadurch lassen sich unabhängige Dateien für Pages und ein einzelnes
Offline-HTML ohne neue Laufzeitbibliothek bereitstellen. Abhängigkeiten werden
explizit im Einstieg verbunden; Spielzustand wird nicht als global veränderbare
Variable geteilt. Native ES-Module bleiben das spätere Ziel; deren Umstellung
und gegebenenfalls ein geprüftes Buildtool erfolgen gesondert. Kein selbst
gebauter Regex-Bundler und kein Import des VM-Testadapters ins Spiel.

## Arbeitspakete und Reihenfolge

| Paket | Dateien / Aufgabe | Nachweis |
| --- | --- | --- |
| 1A | Entwicklerexport von Bahrain/Identitäten; `arcade-tracks`, `arcade-roster` | Punkte, Breite, Sektoren, Boxen, IDs und Hash gegen bestehende Quelle identisch; keine Laufzeit-IIFE-Auswertung |
| 1B | `session`, `controls`, eigener Einstieg/Canvas | W/↑ Gas, S/↓ Bremse, A/D bzw. ←/→ Lenkung; Input-Fokus und Pause; keine Classic-Speicherzugriffe |
| 1C | `physics`: einfache Arcade-Fahrbewegung | Frei gewählte Richtung; Beschleunigen, Bremsen, Lenken; keine automatische Ideallinienfahrt |
| 1D | `track-surface`, Streckenrand/Reibung/Reset | Fahrfläche und Offroad anhand desselben Pfads; nachvollziehbare Tempoverluste; expliziter Reset auf letzte gültige Position |
| 1E | `timing`, `arcade2d`, kleine Testanzeige | Geordnete Checkpoints, korrekte Runde, echte Zeit, klare Geschwindigkeit/Pause; Darstellung folgt demselben Physikzeitpunkt |
| 1F | Offline-Ausgabe, Desktop-/Mobilprüfung, Fahrprobe | Projektpfad funktioniert; klassisches Spiel bleibt unverändert; dokumentierte Fahrgefühlbewertung |

### Fahrmodell als überprüfbarer Entwurf

Geeignet ist ein zugängliches kinematisches Fahrzeugmodell mit einem
Lenkwinkel, einer vom Tempo abhängigen Drehgeschwindigkeit und gedämpfter
Seitenbewegung. Eine einfache Fahrradmodell-Beziehung kann als Grundlage dienen.
Zu hohe Querbeschleunigung reduziert den wirksamen Grip nachvollziehbar;
zu schnelles Einlenken schiebt den Wagen nach außen. Die Kurve ist nicht allein
durch ein KI-Zieltempo begrenzt. Bremsen reduziert die Geschwindigkeit aktiv;
ein guter Ausgang erzeugt ohne künstliche Bonuswürfe mehr Tempo auf der Geraden.

Konkrete Höchstgeschwindigkeit, Bremskraft, Gripwerte und Offroad-Verlust werden
als **vorläufige Parameter des neuen Prototyps** eingeführt, sichtbar dokumentiert
und erst mit dem Fahrtest abgestimmt. Keine alten Balancingwerte überschreiben.
Fahrerstärke, Items, Windschatten mit Gegnern und Schaden aus Gegnerkontakten
kommen noch nicht in Phase 1. Wände/Bahnrand dürfen bereits eine einfache,
vorhersehbare Kontaktreaktion bieten; keine zufälligen Kontrollverluste.

Bei Fokusverlust oder verborgenem Tab werden Eingaben gelöst und die Sitzung
pausiert. Rückkehr darf keinen hängenden Gasbefehl oder Zeitsprung erzeugen.
Eine feste Schrittweite und begrenztes Nachholen verhindern Physiksprünge;
die endgültige neue Schrittweite wird erst im Implementierungstest gewählt.
Der klassische 1/30-s-Schritt bleibt unverändert.

## Nachvollziehbare Tests

| Bereich | Geplante Prüfung |
| --- | --- |
| Physik | Identischer Input bei identischem dt ergibt gleiche Folge; Werte bleiben endlich; Gas beschleunigt; Bremse stoppt; Lenkung ändert freie Richtung; fahrfreie Null-Eingabe bleibt stabil |
| Kurven | Gleiche Kurve sauber/langsam vs. zu schnell: nachvollziehbar größerer Außenversatz bei zu viel Tempo; Tempoverlust nach schlechter Linie; keine zufälligen Eingriffe |
| Oberfläche | Gerade/Kurve/Streckenrand; Abkommen und Rückkehr; eng benachbarte Streckenarme werden nicht verwechselt |
| Rundenzeit | Richtiger Start, nur vorwärts zählen, Checkpoints in Reihenfolge, keine Abkürzungsrunde, Zeitstopp in Pause, korrekter Neustart nach Reset |
| Input | Tastendruck/-loslassen, gleichzeitige Gas-/Lenkeingabe, Fokusverlust, keine abgefangenen Eingaben in Textfeldern; Vorbereitung auf analoge Werte |
| Sitzungsgrenze | Start/Reset des Prototyps verändert keinen der klassischen LocalStorage-Schlüssel oder Karriereobjekte |
| Kompatibilität | Bestehende Spielstand-/Replay-/Geometrieprüfungen weiterhin grün; keine neuen Referenzwerte für geänderte Classic-Ergebnisse |
| Browser/Offline | Tatsächliche Tastaturfahrt im Canvas, Größe/Fokus auf Desktop und Mobilformat, direkte Pages-Pfade, Offline-HTML ohne weitere Requests |

Keine Tests, die lediglich neue Konstanten mit sich selbst vergleichen. Erwartet
werden beobachtbare Fälle und unabhängig vorgegebene Geometrie-/Rundenszenarien.
Neue Physikparameter werden nicht aus alten Renn-Replaywerten erraten.

## Abnahmekriterien für Phase 1

1. Ein Auto lässt sich mindestens drei vollständige Bahrain-Runden manuell fahren.
2. Gas, Bremse und Lenkung reagieren nachvollziehbar; der Spieler kann stehen
   bleiben, bewusst eine schlechte Linie wählen und ohne KI-Zwang davon abkommen.
3. Frühes Bremsen/sauberer Ausgang und zu spätes Bremsen ergeben verständlich
   unterschiedliche Kurvenverläufe und Zeiten. Keine endgültige Balancezusage.
4. Kein Durchfahren von Begrenzungen bei normalem Fahrtempo und keine Rundentricks
   durch Rückwärtsfahrt, Abkürzen oder Wechsel auf einen benachbarten Streckenarm.
5. Pause, Fokusverlust und Reset verursachen weder hängende Tasten noch Sprünge.
6. Der klassische Modus lädt vorhandene Spielstände und arbeitet unverändert.
7. Eine spielbare Vorschau, passende Tests und ein konkretes Fahrprotokoll liegen
   zur Abnahme vor. Der Nutzer beurteilt den Spaß selbst, bevor Phase 2 beginnt.

Ein positiver Techniktest allein belegt keinen Fahrspaß. Das Protokoll soll
mindestens Anfahren/Stoppen, langsame und schnelle Kurven, eine absichtlich
misslungene Runde und mehrere Wiederholungsrunden enthalten.

## Danach – ausdrücklich spätere Phasen

Phase 2: echte räumliche Kamera, Fahrzeuge/Materialien und Höhenprofile.
Phase 3: zunächst wenige Gegner, dann zwölf KI-Autos mit derselben Physikschnittstelle,
Überholen/Kontakte und faire Wertung. Phase 4: kleiner Run mit Rennen, Belohnung,
Scheitern/Neustart und getrenntem Speicher. Phase 5: Fahrer/Crew, Teile, Items,
Synergien und Freischaltungen. Phase 6: Strecken-/Assetausbau, Effekte, Klang,
Balancing und Performance. Diese Systeme werden in Phase 0 nicht vorweggebaut.
