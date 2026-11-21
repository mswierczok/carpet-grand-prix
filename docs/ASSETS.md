# Aktive Assets und reproduzierbare Quellen

Das aktuelle Arcade-Spiel lädt ausschließlich lokale Ressourcen aus seinen
HTML-Einstiegspunkten. GitHub Pages benötigt dafür keinen Build. Die geordnete
Scriptfolge und die fünf aktiven Stylesheets bleiben unverändert:
`arcade.css`, `arcade-race.css`, `campaign.css`, `pov-launch.css`, `racing-hud.css`.
Die frühere zehnteilige klassische CSS-Kaskade ist entfernt.

## Erhaltene Quellen

| Quelle | Verbraucher / Zweck |
| --- | --- |
| `assets/cars/team-t01.webp` bis `team-t13.webp` | Aktuelle Teamkarten, Kampagne, Offline-Einbettung |
| `assets/cars/liveries.json`, Referenzbilder und weiße Fahrzeugvorlage | Autorenschaft, Lackierungszuordnung und unabhängige Hash-Prüfung aller Teamidentitäten |
| `src/rendering/race-sprites.js`, `pilot-vehicles.js` | Gemeinsame Fahrzeuggeometrie, 13 Top-down- und illustrierte SVG-Exporte; bewusst erhaltene Grafikgrundlage |
| `assets/cars/topdown/`, `assets/cars/illustrated/` | Reproduzierbare Fahrzeugillustrationen; keine Teile der alten Simulation |
| `assets/drivers/portraits/d001.png` bis `d035.png`, zugehörige WebPs und Manifest | Unveränderte Originalillustrationen, optimierte aktuelle Darstellung und Hash-Schutz |
| `src/data/driver-identities.js`, `uploaded-portraits.js`, `src/rendering/driver-portraits.js`, 92 Fahrer-SVGs | Historische Identitäten, Portraitzuordnung und reproduzierbare Vektorfallbacks |
| `assets/tracks/` (22 Bilder) | Bewusst erhaltene Originalzeichnungen aller Strecken, unabhängig vom Acht-Strecken-Kampagnenpool |
| `assets/world/arcade-materials.png` | Tatsächlich geladener Materialatlas der Miniaturwelt |
| `src/rendering/*3d*`, Raum-/Kalenderkonfigurationen und Environment-Module | Aktuelle Fahrzeuge, Zimmer, Möbel, Spielzeug, Bahrain und alle Kalenderumgebungen |

`assets/manifest.json` Version 2 ist ein **Integritätskatalog**, keine Preload-
oder Offline-Packliste. Er bewahrt die bisherigen 35 Einträge für 13 Team- und
22 Streckenbilder samt unveränderten Hashes. Der Provenienzblock nennt die
ursprüngliche HTML-Quelle und den Archiv-Tag. Alte CSS-Reihenfolge, `styleTail`
und das ausschließlich klassische Studio-Hintergrundbild gehören nicht mehr dazu.
Die Fahrzeug- und Porträtmanifeste behalten ihre getrennten Aufgaben.

## Generatoren und Prüfbefehle

- `npm run build:race-preview`: erzeugt alle 13 Basis-SVGs und eine portable
  Fahrzeuggalerie aus `previews/topdown/index.html`.
- `npm run build:pilot-art`: erzeugt die 26 illustrierten Renn-/Showroom-SVGs aus
  gemeinsamen Fahrzeugquellen. Der historische Name bezeichnet keinen Simulator.
- `npm run build:driver-art` / `check:driver-art`: 92 Vektoridentitäten.
- `npm run build:uploaded-portraits`: PNG/WebP-Packaging mit ImageMagick;
  Original-PNGs werden nicht überschrieben.
- `scripts/optimize-car-image.js`: begrenztes Authoring-Werkzeug für ausdrücklich
  beauftragte Lackierungen t02–t13; keine automatische Umgestaltung im Spiel.
- `npm run build:offline` (Alias `build:arcade-offline`): liest die aktiven
  HTML-Seiten, bettet deren Scripts, CSS, Materialatlas, Teamfahrzeuge und
  Kampagnenporträts ein. Alle sieben Ausgaben einschließlich Archivinformation
  bleiben erhalten. Die Kampagnendatei enthält Menü und Rennansicht zusammen.

Die aktuellen Bahrain-/Kalender-/HUD-Reviews, Messskripte und Fahrtests bleiben
als Entwicklungs- und Debugzugänge erhalten. Historische Vorher-Aufnahmen in
`docs/` und `previews/` belegen genehmigte Grafik-/Streckenänderungen und sind
keine Laufzeitressourcen. Die zwei obsoleten klassischen Galerien `art-pilot`
und `world-and-drivers` einschließlich Pilot-Galeriegenerator sind ausschließlich
über das [Git-Archiv](LEGACY_CLEANUP.md) wiederherstellbar.

## Abhängigkeiten und Schutz

Die acht gepinnten Entwicklungsabhängigkeiten bleiben erforderlich:
Playwright/Vitest für Browser-/Modultests, Three/Rolldown für den lokalen
Renderer, Clipper/Polygon-Clipping für reproduzierbare Seilbegrenzungen und
PNGJS/Pixelmatch für echte Bildvergleiche. Es gibt keine neue Abhängigkeit,
kein CDN und keine zusätzliche Runtime-Paketinstallation für Spieler.

`assets.test.js` vergleicht den bereinigten Katalog mit dem gemergten Stand vor
diesem Cleanup. `legacy-removal.test.js` schützt alle übrigen Assets und aktuell
geladenen Quellen byteweise. Ergänzend prüfen Fahrzeug-, Livery-, Fahrer- und
Porträttests Originalbytes und Reproduzierbarkeit; Browserprüfungen dekodieren
Team- und Kampagnenbilder online wie offline. Referenzen werden nicht automatisch
zum Beseitigen von Testfehlern neu erzeugt.
