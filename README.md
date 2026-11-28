# Carpet Grand Prix

Ein selbst spielbares Arcade-Rennspiel in einer illustrierten Miniaturwelt.
Die Roguelite-Kampagne besitzt eine feste verzweigte Run-Map mit verbindlichen Platzierungszielen.

[Spiel öffnen](https://mswierczok.github.io/carpet-grand-prix/)

Im [Hauptmenü](play.html) stehen Kampagne, freies Rennen, die POV-Meisterschaft
und Einstellungen bereit. Die Kampagne startet mit Redwood GP und einem von
drei festen Fahrern. Phase 1 führt über vier Rennen und drei Events durch einen
Pool von acht Strecken. Bahrain ist der Einstieg; im Finale zählt nur P1.
Fähigkeiten und Events sind klar markierte Platzhalter ohne Gameplay-Effekte.
Alle 22 Originalstrecken,
13 Teams und 92 historischen Fahreridentitäten bleiben technisch erhalten.
Frühere Kampagnenspielstände und Ergebnisse bleiben über einen getrennten
Kompatibilitätszugang lesbar und fortsetzbar; sie werden nicht in Runs umgerechnet.

`race.html` nutzt eine gemeinsame Engine für Qualifying und Rennen mit
13 Fahrzeugen, manueller Steuerung, Verfolgungskamera und Touchbedienung.
Neue Wochenenden nutzen teamabhängige Fahrzeugwerte und eine echte Anfahrt
mit genau einer schnellen Qualifying-Runde. Laufende ältere Wochenenden behalten
ihr Leistungs- und Qualifying-Format.
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
# build:arcade-offline ist ein kompatibler Alias für dasselbe vollständige Paket.
```

Die Ausgaben in `dist/` enthalten das aktuelle Hauptmenü, Kampagne, Rennen,
freie Fahrtests und eine portable Archivinformationsseite. Die CI stellt
spielbare Offline-/Review-Pakete bereit. Alle benötigten Assets sind eingebettet.

## Orientierung

- [Architektur und aktive Einstiegspunkte](docs/ARCHITECTURE.md)
- [Fahrzeugleistung, Ein-Runden-Qualifying und Messdaten](docs/VEHICLE_PERFORMANCE_AND_QUALIFYING.md)
- [Tests und reproduzierbare Builds](docs/TESTING.md)
- [Run-System, feste Karte und Ergebnisarchiv](docs/ROGUELITE_RUN_SYSTEM.md)
- [Frühere Kampagne und ihr Ergebnisarchiv](docs/CAMPAIGN.md)
- [Speicherbereiche](docs/SAVE_FORMAT.md)
- [Vollbild-HUD und Pause](docs/RACING_HUD.md)
- [Modulare Welt aller 22 Strecken](docs/CALENDAR_ENVIRONMENTS.md)
- [Aktive Assets, Generatoren und Prüfsummen](docs/ASSETS.md)
- [Unabhängige Stammdaten](src/data/historical/README.md)
- [Cleanup, Archivierung und Messungen](docs/LEGACY_CLEANUP.md)
- [Entwicklerregeln](AGENTS.md)

## Klassische Simulation

Die frühere passive Managementsimulation ist unter dem Git-Tag
[`classic-simulation-archive-2026-11-21`](https://github.com/mswierczok/carpet-grand-prix/tree/classic-simulation-archive-2026-11-21)
archiviert. [Archivzugang und Export alter Browserstände](archive.html).
Es gibt keine automatische Migration in die Kampagne und keine Löschung alter
Speicherbereiche. Wiederherstellung: [Cleanup-Dokumentation](docs/LEGACY_CLEANUP.md).

Der Legacy-Cleanup ist abgeschlossen. Gemeinsame Fahrzeug-/Porträtquellen und
historische Stammdaten bleiben bewusst erhalten; die alte Anwendung ist nur im
Git-Archiv wiederherstellbar. Weitere Run-Phasen, echte Fähigkeiten, Items, Crew,
Freischaltbedingungen und die endgültige mehrphasige Run-Länge benötigen eigene Entwicklungsaufträge.
