# Carpet Grand Prix

Browser-Rennspiel mit Teammanagement, 13 Rennställen, 92 Fahrern und 22 Originalstrecken.

[Spiel auf GitHub Pages](https://mswierczok.github.io/carpet-grand-prix/)

Das Spiel startet aus `index.html` ohne Installation oder Build. Node-Werkzeuge
dienen ausschließlich der Entwicklung und den Tests.

## Entwicklung durch natürlichsprachliche Aufträge

Gewünschte Änderung auf Deutsch beschreiben. Der Entwickler bereitet sie auf einem
eigenen Zweig vor, prüft sie und erläutert das Ergebnis im Pull Request. Erst nach
ausdrücklicher Freigabe wird nach `main` übernommen. Änderungen an Mechaniken oder
Balancing benötigen eine vorherige Zustimmung.

- [Bestand und Referenz](docs/BASELINE.md)
- [Zielstruktur, Umbauplan und Risiken](docs/ARCHITECTURE.md)
- [Tests](docs/TESTING.md)
- [Spielstandformat](docs/SAVE_FORMAT.md)
- [Arbeitsablauf und Freigabe](docs/WORKFLOW.md)
- [Verbindliche Entwicklerregeln](AGENTS.md)

## Prüfungen

Node.js 24 LTS verwenden.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm run test:browser
npm run test:extended
```

Der Testserver stellt das Spiel unter
`http://127.0.0.1:4173/carpet-grand-prix/` bereit.
