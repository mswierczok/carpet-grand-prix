# Carpet Grand Prix

Browserbasiertes Arcade-Racing-Roguelite in einer illustrierten Spielzeugwelt.
Das [Hauptmenü](play.html) bietet Kampagne, freies Rennen und die eigenständige
POV-Meisterschaft. 13 Teams und 22 Strecken bleiben verfügbar; die Kampagne
verwendet acht Strecken, Redwood als Startteam und drei feste Startfahrer.

Der Legacy-Cleanup beginnt mit unabhängigen historischen Datenquellen für alle
13 Teams, 92 Fahrer und 22 Originalstrecken. Der klassische Simulationsmodus
bleibt während PR 1 unverändert über `index.html?legacy=1` erreichbar.
[Abhängigkeiten, geprüfte Datenidentität und weitere Freigabeschritte](docs/LEGACY_CLEANUP.md).

[Spiel auf GitHub Pages](https://mswierczok.github.io/carpet-grand-prix/)

Zusätzlich gibt es einen [freien 3D-Fahrtest](arcade3d.html) und
ein [Rennen mit 13 Fahrzeugen](race.html) auf allen 22 Strecken, einschließlich
der Brücken in Korea und Russland. Das Rennen nutzt einen eigenen Zustand; bestehende
Meisterschaftsspielstände bleiben erhalten.
Umfang und Prüfung: [vollständiger POV-Kalender](docs/POV_CALENDAR.md).

`index.html` führt normalerweise zum aktuellen Hauptmenü `play.html`.
Das Spiel verwendet `styles/`, `assets/` und `src/`, ohne
Installation oder Build. Node-Werkzeuge dienen ausschließlich Entwicklung und Tests.
Für die bisherige Nutzung als einzelne Offline-Datei stellt die automatische Prüfung
das Download-Artefakt **carpet-grand-prix-offline** bereit: entpacken und die enthaltene
HTML-Datei öffnen. [Dateiaufteilung und Offline-Ausgabe](docs/ASSETS.md)

## Entwicklung durch natürlichsprachliche Aufträge

Gewünschte Änderung auf Deutsch beschreiben. Der Entwickler bereitet sie auf einem
eigenen Zweig vor, prüft sie und erläutert das Ergebnis im Pull Request. Erst nach
ausdrücklicher Freigabe wird nach `main` übernommen. Änderungen an Mechaniken oder
Balancing benötigen eine vorherige Zustimmung.

- [Bestand und Referenz](docs/BASELINE.md)
- [Zielstruktur, Umbauplan und Risiken](docs/ARCHITECTURE.md)
- [Tests](docs/TESTING.md)
- [CSS, Bilder und Offline-Ausgabe](docs/ASSETS.md)
- [Fahrzeuglackierungen und Fotovergleich](docs/CAR_LIVERIES.md)
- [Alle 13 Top-Down-Rennfahrzeuge: Vorschau und Einbindung](docs/TOPDOWN_PREVIEW.md)
- [Dieselben Top-Down-Fahrzeuge in der Werkstatt](docs/WORKSHOP_CARS.md)
- [Größerer Streckenzoom in der Rennansicht](docs/RACE_CAMERA.md)
- [Eigene Fahreranzeigen mit Position, Abständen und Kameraauswahl](docs/TEAM_DRIVER_HUD.md)
- [Fahrer-Verfolgungskamera statt Fahrzeug-Markierung](docs/FOLLOW_CAMERA.md)
- [Spielstandformat](docs/SAVE_FORMAT.md)
- [Kampagne, getrennter Speicher und Ergebnisarchiv](docs/CAMPAIGN.md)
- [Unabhängige historische Datenquellen](src/data/historical/README.md)
- [Arbeitsablauf und Freigabe](docs/WORKFLOW.md)
- [Verbindliche Entwicklerregeln](AGENTS.md)

## Prüfungen

Node.js 24 LTS verwenden.

```sh
npm ci
npm run check:arcade-data
npx playwright install --with-deps chromium
npm test
npm run test:browser
npm run test:extended
```

Der Testserver stellt das Spiel unter
`http://127.0.0.1:4173/carpet-grand-prix/` bereit.

`npm run build:arcade-data` erzeugt die versionierten Browserdaten aus statischem
JSON, ohne die alte Simulation zu laden. GitHub Pages benötigt keinen Build zur
Laufzeit. Run-Map, Items, Teamfähigkeiten, Crew und Belohnungen sind noch offen.
