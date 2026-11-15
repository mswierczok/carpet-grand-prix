# Phase 1 – erster fahrbarer Prototyp

Historischer Stand der ursprünglichen Fahrprobe. Die spätere, ausdrücklich
gewünschte Anpassung von Lenkung und Rückwärtsgang beschreibt
[ARCADE_DRIVING.md](ARCADE_DRIVING.md).

Fortsetzung nach Freigabe und Merge von PR #15:
[Phase 2 – räumliche Bahrain-Fahrprobe](ARCADE_PHASE2.md).

Stand: 14. November 2026. Separater Branch `codex/arcade-first-drive`, nach
Freigabe des [Phase-1-Plans](arcade-phase0/PHASE1_PLAN.md). Grundlage bleibt
`main` 194f6e491dcd91d43f7d5d417008a3d53d0e962b. Kein Merge erfolgt automatisch.

## Was spielbar ist

Ein frei gelenktes Fahrzeug auf der vorhandenen Bahrain-Strecke. Gas, Bremse,
Lenkung, Untersteuern bei zu viel Tempo, bremsender Teppichrand und eine feste
äußere Begrenzung sind umgesetzt. 32 geordnete Kontrollpunkte sichern die
Rundenmessung; eine verlassene Fahrbahn verhindert eine gültige Bestzeit.
Alle 13 vorhandenen Lackierungen sind wählbar und haben hier dieselbe Physik.

Zum Testen `npm run serve:test` und
`http://127.0.0.1:4173/carpet-grand-prix/arcade.html` öffnen. Nach einem später
freigegebenen Pages-Merge lautet der zusätzliche Einstieg
`https://mswierczok.github.io/carpet-grand-prix/arcade.html`.
Dieser Link ist vor Veröffentlichung des Branches kein öffentlicher Testlink.
Der bisherige Einstieg `index.html` bleibt erhalten.

Ohne Entwicklungsumgebung: `npm run build:arcade-offline` erzeugt
`dist/carpet-grand-prix-arcade-offline.html`. Diese Datei kann direkt im Browser
geöffnet werden. CI stellt sie im Download `carpet-grand-prix-arcade-preview`
bereit, einschließlich des klassischen Offline-Spiels für den Rücksprung.
Beide HTML-Dateien dafür in denselben Ordner entpacken.

| Eingabe | Wirkung |
| --- | --- |
| W / ↑ | Gas |
| S / ↓ | Bremse bis zum Stillstand |
| A/D / ←/→ | Links/rechts lenken, relativ zur Fahrtrichtung |
| P / Leertaste außerhalb von Schaltflächen | Pause/Fortsetzen |
| R / Auto zurücksetzen | Auf die zuletzt sicher erreichte Streckenposition setzen, anhalten, laufende Rundenmessung neu beginnen |
| Fahrtest neu starten | Sitzung und Bestzeit zurücksetzen, pausiert starten |
| Gesamtstrecke | Übersicht statt der nachgeführten Draufsicht |
| Bildschirmtasten | Halten für Gas/Bremse/Lenken, mehrere Zeiger werden getrennt erfasst |

Die Kamera bleibt in dieser Phase eine Draufsicht mit fester Nordausrichtung.
Auf Touchgeräten wird beim Losfahren die Fahransicht ins Fenster gescrollt;
ihre Bildschirmtasten liegen innerhalb des Canvas-Bereichs. Texteingaben und
Auswahllisten fangen keine Fahrbefehle ab. Fokusverlust oder ein verborgener Tab
lösen die Eingaben und pausieren. Rückwärtsfahren ist noch nicht enthalten;
bei festgefahrenem Auto hilft der explizite Reset.

## Technische Trennung

| Datei | Verantwortung |
| --- | --- |
| `arcade.html`, `styles/arcade.css` | Eigener Einstieg und eigene Oberflächenregeln |
| `src/arcade-main.js` | Verbindet Eingabe, Sitzung, Anzeigen und Renderer |
| `src/data/arcade-{tracks,roster}.js` | Tief eingefrorene Exporte von Bahrain und den vorhandenen 13 Teams/92 Fahrern |
| `src/racing/track-surface.js` | Identische Streckennormalisierung, lokale Projektion, Fahrbahnränder, Kontrollpunkte |
| `src/racing/physics.js` | Reine Funktion: Zustand + Eingabe + Oberfläche + Parameter + dt → Folgezustand |
| `src/racing/controls.js` | Tastatur und Pointer → normiertes Gas/Bremse/Lenken; Pause/Fokusverlust |
| `src/racing/timing.js` | Vorwärtsübertritte in Reihenfolge und tatsächliche aktive Sekunden |
| `src/racing/session.js` | Besitz des Autos, feste Schritte, Pause/Reset und kopierte Render-Snapshots |
| `src/rendering/arcade2d.js` | Liest den Snapshot, zeichnet denselben Pfad und die bestehenden Rennsprites |
| `scripts/export-arcade-data.js` | Liest die zwei statischen JSON-Deklarationen; wertet keinen klassischen Spielcode aus |
| `scripts/build-arcade-offline.js` | Bettet die expliziten Script- und Stylesheet-Dateien in eine Offline-Seite ein |

Die Module hängen ausdrücklich über `CGPArcade` zusammen; der eigentliche
Sitzungszustand bleibt in der Sitzung gekapselt. Das ist die im Phase-0-Plan
beschriebene Zwischenlösung ohne neue Laufzeitbibliothek. Ein Wechsel zu
ES-Modulen/3D erfolgt später gesondert. Es gibt keine leeren Module für Gegner,
3D, Items oder Synergien und keine Testadapter im ausgelieferten Spiel.

Position, Richtung und Geschwindigkeit werden frei berechnet. Der Fortschritt
entlang der Strecke dient der Messung und lokalen Oberflächenzuordnung, nicht
als Bewegungszwang. Nur der ausdrücklich ausgelöste Reset setzt das Auto auf
die Streckenmitte. Das vermeidet unbeabsichtigtes Springen auf nahe Streckenarme.

Die Physik läuft mit 1/120 s. Nachholen ist auf 0,1 s pro Frame begrenzt; bei
starken Aussetzern wird nicht schlagartig die gesamte verstrichene Zeit
nachgeholt. Der Renderer interpoliert zwischen zwei Physikzuständen, begrenzt
die Pixeldichte auf 2 und zeichnet pausierte Bilder nur bei Änderungen neu.
DOM-Texte werden höchstens etwa alle 80 ms und nur bei geändertem Inhalt ersetzt.
Das sind Maßnahmen für ruhige Darstellung, keine behauptete FPS-Garantie.

## Vorläufiges Fahrmodell

Die folgenden Werte betreffen ausschließlich den neuen Fahrtest. Die freie
Bewegung verwendet die vorhandenen normierten Streckeneinheiten (SE), nicht
die alte Skalierung offizieller Rundenzeiten. Für die Tempoanzeige werden
vorläufig 0,3 m pro SE angenommen; Rundenzeiten benötigen keinen Skalenfaktor.

| Parameter | Entwurf |
| --- | --- |
| Höchsttempo | 110 SE/s, angezeigt höchstens etwa 119 km/h |
| Antrieb / Bremse | 55 / 145 SE/s², zusätzlich Fahrwiderstand |
| Radstand / maximaler Lenkwinkel | 7,8 SE / 0,58 rad |
| Lenkreaktion / Seitendämpfung | 7 / 10 pro Sekunde |
| Maximale Querbeschleunigung | 210 SE/s² |
| Rollwiderstand / quadratischer Luftwiderstand | 1,5 / 0,0015 |
| Schulter | Zusätzlicher Widerstand 1,7 × Tempo; 60 % Grip |
| Fahrzeug-Prüfkörper | Halbe Länge 5,4 SE, halbe Breite 2,5 SE |

Zu viel Tempo begrenzt die mögliche Drehgeschwindigkeit: Voll einlenken
erzwingt keine beliebig enge Kurve. Die Fahrzeug-Ecken werden in jedem kleinen
Schritt gegen die lokale äußere Begrenzung geprüft. Eine überstehende Position
wird abgewiesen, das Fahrzeug stoppt. Der weichere Teppichrand liegt zwischen
Fahrbahnhalbbreite und äußerer Begrenzung bei 0,85 × Fahrbahnbreite.
Der Zeichnungsrand entspricht derselben Begrenzung.

Die erste Startlinienüberfahrt beginnt die Zeit. Danach zählen die Kontrollpunkte
der Reihe nach; Start/Ziel zählt erst nach allen anderen wieder eine Runde.
Pause zählt nicht als Fahrzeit. Nach Verlassen der Fahrbahn bleibt die laufende
Runde ungültig. Reset verwirft deren Messung und verlangt wieder Start/Ziel;
bisherige gültige Bestzeit und Rundenzahl bleiben bis zum Sitzungsneustart erhalten.

## Nachweise und Fahrprotokoll

- 61 Modul-/Integrationstests: 52 bestehende Prüfungen plus neun Fahrtest-Fälle.
  Dazu zählen unveränderte Geometrie/Identitäten, Gas/Bremse/freie Lenkung,
  deterministische Bewegung, Untersteuern, Schulter, Begrenzung, Pause/Reset,
  lokale Projektion und Kontrollpunkt-/Zeitregeln.
- Drei gültige Runden im Fahrkern ausschließlich mit binären Gas-/Brems-/
  Lenkbefehlen: ungefähr 35,58 / 35,43 / 35,47 aktive Sekunden, ohne Randkontakt.
  Ein **nur im Test vorhandener** Rückkopplungsfahrer erzeugt diese Befehle;
  er schreibt weder Autoposition noch Kontrollpunkte oder Zeiten.
- Zusätzliche Browserfahrt über drei gültige Runden im wirklichen Canvas:
  Der Test beobachtet die gezeichnete Pose und sendet ausschließlich
  Tastaturereignisse. Kein eingebauter Autopilot und keine Gegner-KI.
- Anfahren, Gas plus Lenkung, aktives Bremsen bis null, Pause, Fokusverlust,
  Neustart und unveränderte klassische Browserdaten sind im Browser geprüft.
- Die gleiche volle Lenkung führt bei hohem Tempo zu weniger Richtungsänderung
  und mehr zurückgelegter Strecke als beim langsameren Einlenken. Bewusstes
  Fahren zum äußeren Rand stoppt das Auto; eine Offroad-Runde ersetzt die gültige
  Bestzeit nicht. Diese Fälle sind technische Prüfungen, keine manuelle Spaßbewertung.
- Desktop und Pixel-7-Browserformat: Layout, echte Zeigerbedienung und Offline-
  Einstieg ohne weitere Ressourcen. Die Screenshots zeigen den laufenden
  Prototyp: [Desktop](../previews/arcade-phase1/desktop.png),
  [Mobil](../previews/arcade-phase1/mobile.png).
  Die Offline-Prüfung lädt das eingebettete HTML und sperrt anschließend das
  Netzwerk. Das direkte Öffnen einer `file://`-Adresse wird im verwalteten
  Testbrowser durch dessen Richtlinie blockiert; dieser zusätzliche Test ist offen.
- Bestehende Vergleichsbilder, Replays, Speicher-/Management- und Rennprüfungen
  laufen weiter. Keine Referenzdatei wurde erneuert, um Fehler zu verdecken.

## Kompatibilität und offene Abnahme

`index.html`, klassische Produktionsmodule, Assets und alle 35 Original-PNGs
bleiben unverändert. Der neue Modus liest oder schreibt kein `localStorage`,
führt keine klassische Spielstandmigration durch und exportiert noch keinen
eigenen Spielstand. Reload beginnt daher einen neuen Fahrtest. Der Datenexport
verändert keine IDs, Teams oder Fahrer und ist nicht vom klassischen Spielstand
abhängig. Ein Browser-Rücksprung öffnet das bisherige Spiel getrennt.

Noch offen sind deine Bewertung des Fahrgefühls und Tests auf echten Geräten,
insbesondere Safari/iPhone sowie schwachen Mobilgeräten. Die bestehenden
Rennsprites und die einfache Streckenzeichnung dienen ausdrücklich nur dem
Phase-1-Fahrtest. Die [verbindliche Art Direction](arcade-phase0/ART_DIRECTION.md)
und die Konzeptkunst bleiben Ziel der späteren räumlichen Darstellung.

Bitte bei der Abnahme mehrere Runden fahren: zuerst ruhig bremsen, dann später
einlenken, bewusst zu schnell in eine Kurve fahren, stehen bleiben und Reset
ausprobieren. Entscheidende Rückmeldung: Sind die Tasten gut dosierbar, das
Untersteuern verständlich und mehrere Wiederholungsrunden auch ohne Belohnung
interessant? Erst danach folgen Phase 2, neue Kamera und Rennwelt. Keine Gegner,
Runs, Fahrerboni oder neuen Speicherformate sind vorweg implementiert.
