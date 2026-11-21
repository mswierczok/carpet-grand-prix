# Carpet Grand Prix

Ein selbst spielbares Arcade-Rennspiel in einer illustrierten Miniaturwelt.
Die eigenständige Kampagne ist die Grundlage des künftigen Motorsport-Roguelites.

[Spiel öffnen](https://mswierczok.github.io/carpet-grand-prix/)

Im [Hauptmenü](play.html) stehen Kampagne, freies Rennen, die POV-Meisterschaft
und Einstellungen bereit. Die Kampagne startet mit Redwood GP und einem von
drei festen Fahrern. Sie verwendet acht Strecken; alle 22 Originalstrecken,
13 Teams und 92 historischen Fahreridentitäten bleiben technisch erhalten.

`race.html` nutzt eine gemeinsame Engine für Qualifying und Rennen mit
13 Fahrzeugen, manueller Steuerung, Verfolgungskamera und Touchbedienung.
`arcade.html` und `arcade3d.html` sind zusätzliche technische Fahrtests.
Das Spiel läuft statisch auf GitHub Pages; Spieler benötigen keine Installation.

## Entwicklung

Node.js 24 LTS verwenden:

```sh
npm ci
npx playwright install --with-deps chromium
npm run check:arcade-data
npm run check:driver-art
npm test
npm run test:browser
```

Der Testserver (`npm run serve:test`) stellt ausschließlich
`http://127.0.0.1:4173/carpet-grand-prix/` bereit. Die CI verteilt längere
Kalender-/Browserfahrten auf eigene Gruppen, ohne deren Inhalt zu verkürzen.

```sh
npm run build:offline
npm run build:arcade-offline
```

Die Ausgaben in `dist/` enthalten das aktuelle Hauptmenü, Kampagne, Rennen,
freie Fahrtests und eine portable Archivinformationsseite. Die CI stellt
spielbare Offline-/Review-Pakete bereit. Alle benötigten Assets sind eingebettet.

## Orientierung

- [Architektur und aktive Einstiegspunkte](docs/ARCHITECTURE.md)
- [Tests und reproduzierbare Builds](docs/TESTING.md)
- [Kampagne und Ergebnisarchiv](docs/CAMPAIGN.md)
- [Speicherbereiche](docs/SAVE_FORMAT.md)
- [Vollbild-HUD und Pause](docs/RACING_HUD.md)
- [Modulare Welt aller 22 Strecken](docs/CALENDAR_ENVIRONMENTS.md)
- [Unabhängige Stammdaten](src/data/historical/README.md)
- [Cleanup, Archivierung und Messungen](docs/LEGACY_CLEANUP.md)
- [Entwicklerregeln](AGENTS.md)

## Klassische Simulation

Die frühere passive Managementsimulation ist unter dem Git-Tag
[`classic-simulation-archive-2026-11-21`](https://github.com/mswierczok/carpet-grand-prix/tree/classic-simulation-archive-2026-11-21)
archiviert. [Archivzugang und Export alter Browserstände](archive.html).
Es gibt keine automatische Migration in die Kampagne und keine Löschung alter
Speicherbereiche. Wiederherstellung: [Cleanup-Dokumentation](docs/LEGACY_CLEANUP.md).

Run-Map, Items, Crew, Teamfähigkeiten, Freischaltbedingungen und endgültige
Run-Längen sind noch nicht implementiert. Sie werden nach dem Cleanup separat entwickelt.
