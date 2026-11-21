# Tests und Builds

Node.js 24 LTS und die Lockdatei verwenden. `npm ci`, anschließend
`npx playwright install --with-deps chromium`. Optional lokal:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
Ein mobiles Chromium-Profil ersetzt keinen echten iPhone-/Safari-Test.

## Standardbefehle

| Befehl | Prüfung |
| --- | --- |
| `npm test` | Alle aktuellen Unit-/Integrationstests einschließlich des vollständigen Kalenders |
| `npm run test:browser` | Tatsächliche Browserbedienung auf Desktop und mobilem Touchprofil |
| `npm run test:reference` | Statische Herkunfts-/Geometrie-/Identitätsreferenzen, keine passive Simulation |
| `npm run check:arcade-data` | Byteidentische Datenexporte aus unabhängigem JSON |
| `npm run check:arcade-boundaries` | Reproduzierbare Seil- und Brückenkonturen |
| `npm run check:race-formats` | Bestehende Rundentabelle aus dokumentierten Referenzfahrten |
| `npm run check:arcade3d-engine` | Reproduzierbarer lokaler Three.js-Build |
| `npm run check:driver-art` | Alle 92 bestehenden Vektorillustrationen reproduzierbar |
| `npm run build:offline` | Aktuelles portables Hauptmenü und Archivinformation |
| `npm run build:arcade-offline` | Fahrtests, Rennen, Kampagne, Menü und Archivinformation |
| `npm run serve:test` | Statische Website nur unter `/carpet-grand-prix/` auf Port 4173 |

`build:pilot-art` und `build:race-preview` erhalten die gemeinsamen
Fahrzeug-SVGs und die dazugehörige Assetvorschau. Der PNG-/WebP-Encoder
`build:uploaded-portraits` benötigt zusätzlich ImageMagick; CI/Spiel verwenden
bereits versionierte WebPs. Der obsolete klassische Pilot-Galeriegenerator ist
entfernt. Historische Voransichten sind über den Archiv-Tag wiederherstellbar.

## CI-Aufteilung

`.github/workflows/tests.yml` verwendet die vollständige aktuelle Suite.
Der zentrale Job führt `npm test -- --exclude tests/unit/pov-calendar.test.js`
aus. Die ausgeschlossene Kalenderdatei wird vollständig in vier eigenen Jobs
mit `CGP_POV_TEST_GROUP=0`, `1`, `2`, `3` ausgeführt. Deren Browserfälle laufen
auf beiden Profilen. Das ist eine Aufteilung, keine Kürzung der Abdeckung.

Allgemeine Browserprüfungen sind pro Geräteprofil in zwei Shards aufgeteilt.
Qualifying, POV-Meisterschaft, Kampagne, Bahrain und die übrigen Umgebungen
haben eigene Jobs. Keine Testzeitgrenzen oder Fahrbudgets wurden im Cleanup
angehoben. Der reine klassische Mehrsaison-Workflow ist mit seiner entfernten
Simulation im Git-Tag archiviert; aktuelle Kampagnen-/POV-Fortsetzung bleibt geprüft.

Die Builds erzeugen spielbare Offline-/Review-Artefakte für HUD/Kampagne,
Bahrain und alle Kalenderumgebungen. Die Prüfworkflows veröffentlichen keine
Website. GitHub Pages veröffentlicht weiterhin den freigegebenen `main`-Stand.

## Geschützte Aussagen

- Physik, KI, vier Schwierigkeitsstufen, Windschatten und Aufholhilfe:
  echte feste Simulationsschritte und historische Vergleichsfahrten.
- Kontakte, Seile, Brücken und Boxengasse: tatsächliche Fahrzeuggeometrie,
  Ebenen und Fahrten, inklusive Korea, Russland und Bahrain-Unterbett.
- Qualifying/Rennen: Auslaufrunde, zwei schnelle Runden, echte Hintergrundfahrer,
  Startaufstellung, Startampel und 13 Zieleinläufe.
- Kampagne: acht Strecken, 39 eindeutige Fahrerplätze, Redwood, drei Startfahrer,
  Bahrain/Kanada, Migration, Archiv, Neuladen, Importfehler und Speichertrennung.
- HUD/Menü: echte 3D-Viewportgrößen, Pause, alle 13 Fahrer, Rücknavigation,
  Einstellungen, Neustart/Reset, native Fingertipps, Mehrfingersteuerung und 3–2–1.
- Assets: 13 Fahrzeugbilder, Original-PNGs/WebPs d001–d035, 92 Vektoridentitäten,
  Prüfsummen, Reproduzierbarkeit sowie Online-/Offline-Dekodierung.
- Einstieg/Archiv: Root, `?legacy=1`, Reload, unveränderte alte Downloads,
  fehlender/gesperrter Storage und keine Schreibzugriffe auf klassische Slots.

Die langen Kampagnenprüfungen verkürzen wie bisher nur die Rennlänge über die
öffentliche Ein-Runden-Option; Qualifying, Fahrbefehle, Zeiten und alle 13
Zieleinläufe bleiben echt. Separate Bahrain-Tests prüfen das Standardrennen.

## Referenzen ohne alte Engine

`tests/helpers/project.js` ersetzt die frühere Kopplung von Pfad-/JSON-Helfern
an den klassischen Spieladapter. `loadArcade` lädt ausschließlich aktuelle
Module in eine isolierte Test-VM. Historische Regressionen dürfen unveränderte
Quelldateien aus Git als Vergleich lesen; sie starten keine Managementsimulation.

`tests/fixtures/historical-invariants.json` wurde **vor** der Entfernung aus
`fc338593c33c8e25063fc5ffd22511f7ded9b3c9` erfasst. Es hält exakte Hashes aller
22 ursprünglichen Punkt-, Bogenlängen- und Boxengeometrien sowie Breiten,
Sektoren und bestehende Werkstattwerte. Die Herkunft wird gegen die originale
HTML-Prüfsumme geprüft. Bestehende klassische JSON-Fixtures bleiben unverändert,
unter anderem als Speicher-Sentinel und historische Referenz. Keinen Generator
und keine Referenz automatisch zum Beheben roter Tests überschreiben.

`legacy-removal.test.js` schützt sämtliche tatsächlich geladenen Spielmodule,
Daten, Modelle, Originalbilder und ursprünglichen Fixtures byteweise gegen den
Stand vor der Entfernung. Einzige Asset-Ausnahmen sind das entfernte Studio-Bild
und der bereinigte Katalog: `assets.test.js` vergleicht dessen 35 verbleibende
Bildeinträge einschließlich Hashes unverändert mit dem gemergten PR-53-Stand. Alle 22 Zeichnungen, acht Kampagnenstrecken und IDs werden
zusätzlich unabhängig geprüft. Keine Produktions-Testhooks oder Sonderphysik.

## Vorher-/Nachher-Messung

`scripts/measure-cleanup.js` misst zwei getrennte Checkouts mit derselben
Chromium-Installation, Software-WebGL, drei kalten Kontexten pro Ansicht und
Desktop/Hoch-/Querformat. Es prüft Browser-/Ressourcenfehler, erfasst tatsächliche
CDP-Übertragungsbytes und erstellt echte Screenshots. Vergleich der statischen
Rennaufnahmen mit `pngjs`/`pixelmatch`, ohne veränderte Spielparameter.

```sh
npm run measure:cleanup -- --root /pfad/zum/checkout --url http://127.0.0.1:4173/carpet-grand-prix/ --output dist/cleanup/measurements.json --single-offline-build
```

Mit `--compare /pfad/zu/vorherbildern` werden die drei Rennbilder verglichen.
Das Werkzeug benötigt den laufenden Testserver. Messbedingungen, Rohwerte,
getrennte Quell-/Repositorygrößen und Ergebnisse: [LEGACY_CLEANUP.md](LEGACY_CLEANUP.md).
Die erste Datenentkopplung und frühere Testbeschreibung stehen unter
[history/](history/TESTING_PRE_CLEANUP.md).
