# Tests und Builds

Node.js 24 LTS und die Lockdatei verwenden. `npm ci`, anschließend
`npx playwright install --with-deps chromium`. Optional lokal:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
Ein mobiles Chromium-Profil ersetzt keinen echten iPhone-/Safari-Test.

Fahrerprofile/Touch: `npx vitest run tests/unit/driver-personalities.test.js` und
`npx playwright test tests/browser/driver-touch.spec.js`. Neue native PR-56-
Referenzen schützen die bisherigen KI-Entscheidungen. Getrennte native Referenzen prüfen Fahrer-Modell v1/v2/v3; die Stillstandsprobe prüft Vorbeifahren und exaktes Wiederherstellen beim Rangieren. Messungen, alle 39 Profile,
vollständige Vorher-/Nachher-Wochenenden und Solofahrten stehen unter
[DRIVER_PERSONALITIES_AND_DYNAMIC_RACING.md](DRIVER_PERSONALITIES_AND_DYNAMIC_RACING.md).

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
haben eigene Jobs. Die Run-Kampagne besitzt zwei zusätzliche Roguelite-Jobs;
ihre Fälle werden aus den allgemeinen Browser-Shards ausgenommen und dort vollständig gefahren. Keine Testzeitgrenzen oder Fahrbudgets wurden im Cleanup
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
- Qualifying/Rennen: echte Anfahrt, ein gewerteter Versuch, erhaltene alte
  Auslaufrunde/zwei schnelle Runden, echte Hintergrundfahrer,
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

## Roguelite Phase 1

```sh
npx vitest run tests/unit/roguelite-run.test.js
npx playwright test tests/browser/roguelite-run.spec.js
```

Sechs gültige Routen und exakte Platzierungsgrenzen werden mit ausdrücklich
markierten Ergebnis-/Speicher-DTOs geprüft. Die Browser fahren getrennt davon
vier tatsächliche Wochenenden und einen echten P13-Ausscheidungsfall mit der
nativen Engine und normalen Eingaben. Pflichtqualifying und alle 13 Zieleinläufe
bleiben vollständig; nur die vorhandene Ein-Runden-Option verkürzt lange Testfälle.
Kein Test setzt Fahrzeugpositionen, Geschwindigkeiten oder Zielzeiten im Spiel.
Abnahme und tatsächliche Screenshots: [ROGUELITE_RUN_SYSTEM.md](ROGUELITE_RUN_SYSTEM.md).

## Fahrzeugleistung und Ein-Runden-Qualifying

```sh
npx vitest run tests/unit/vehicle-performance.test.js tests/unit/one-lap-qualifying.test.js tests/unit/performance-legacy-compatibility.test.js
npx playwright test tests/browser/qualifying.spec.js
node scripts/measure-vehicle-performance.js --stage=vehicles
node scripts/measure-vehicle-performance.js --stage=qualifying
node scripts/measure-vehicle-performance.js --stage=approach --tracks=all
node scripts/measure-vehicle-performance.js --stage=traffic
```

Die Vorhermessung verlangt einen separaten unveränderten PR-55-Checkout per
`--stage=baseline --baseline-root=/pfad/zum/checkout`. Sie darf keine veränderten
Dateien als Baseline messen. Neue Referenz-Checkpoints stammen nachweislich aus
`b4a797c7b9b390243db6b72213e99fffb081e876`; bestehende Fixtures bleiben erhalten.
Die früheren Byte-Freeze-Prüfungen begrenzen Ausnahmen auf die ausdrücklich
beauftragten Fahrzeug-/Qualifying-Module. Der übrige Physikkern, Daten, Geometrien
und Assets werden weiterhin exakt verglichen; native alte Checkpoints werden
mit identischen Folgezuständen wiederholt.

Die Browserprüfungen fahren auf beiden Profilen alle acht Qualifyings mit
normalen Eingaben und Autoübernahme, einschließlich Speichern/Neuladen während
der schnellen Runde. Native Messungen erfassen zusätzlich alle 22 Anfahrten
und volle Standardrennen mit/ohne Aufholhilfe. Messverfahren, Rohdaten und
tatsächliche Spielansichten: [VEHICLE_PERFORMANCE_AND_QUALIFYING.md](VEHICLE_PERFORMANCE_AND_QUALIFYING.md).

Der aktuelle Run-Browserfall bewertet im Finale die tatsächliche Platzierung
mit dem neuen Fahrzeugmodell. Der Erfolgsbildschirm wird zusätzlich mit einem
nativ gewonnenen PR-55-Run geprüft; damit bleibt ein alter Sieg ohne neue
Zeit-/Positionszuweisung lesbar. Reproduktion der neuen Kompatibilitätsreferenzen:
`node scripts/capture-performance-legacy-fixtures.js --source-root=/pfad/zum/PR55-Checkout`.
Der Generator schreibt nach `dist/` und ersetzt keine bestehenden Test-Fixtures.

## Fahrzeugbalance V2

`npx vitest run tests/unit/vehicle-balance-v2.test.js` prüft neue Standardmodelle,
V1-Erhalt, tatsächliche V2-Physik-/KI-Parameter, Hilfelimits, deterministische
Fortsetzung und die vollständige Messmatrix. `tests/browser/vehicle-balance.spec.js`
lädt zusätzlich ein echtes älteres V1-Qualifying auf Desktop und Mobilprofil.
Die vorhandene Fahrer-/Touch-Wochenendprüfung kontrolliert nun explizit V2 vor
und nach Reload, einschließlich vollständigem Rennen/Archiv.

Die älteren `measure-vehicle-performance.js`-Ausgaben und PR-57-Berichte bleiben
V1-Belege; sie werden nicht überschrieben. Aktuelle Messung und Reproduktion:
[VEHICLE_BALANCE_V2.md](VEHICLE_BALANCE_V2.md). Diagramme werden optional mit
`scripts/plot-vehicle-balance.py` und Matplotlib erzeugt; Spiel/Build benötigen
keine neue Python- oder JavaScript-Abhängigkeit.

Für große Balance-Messungen unterstützt der Testloader optional einen eigenen
Node-Prozess mit identischer Scriptliste (`--realm=process` im Messwerkzeug).
`balance-measurement-loader.test.js` prüft zehn native Referenzfortsetzungen
mit exakt gleichen Werten. Die normalen Tests behalten die isolierte VM.
Die Quelle eines separaten unveränderten Checkouts wird über `sourceRoot`
geladen; die Balance-Messung validiert zusätzlich die Runtime-Quellhashes.
