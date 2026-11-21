# Legacy Cleanup – Abschluss und Nachweise

PR #52 und #53 sind gemergt. Der [abschließende gemeinsame PR 3/4](#abschluss-pr-34--gemeinsamer-final-cleanup)
entfernt die verbliebenen belegten Altlasten auf Basis von `921717c`.
Keine weiteren kosmetischen Cleanup-Pakete sind vorgesehen. Alle aktuellen
Spielsysteme und Originaldaten bleiben erhalten. Kein Merge ohne Freigabe.

Die folgenden Abschnitte dokumentieren die bereits abgeschlossene Entfernung
in PR #53; der finale Löschumfang, Schutzumfang und Vergleich folgen unten.

## Historischer Abschluss von PR 2

PR #52 ist gemergt. Seine Datenentkopplung wird nicht wiederholt.
Diese Fortsetzung (Cleanup PR 2) basiert auf
`fc338593c33c8e25063fc5ffd22511f7ded9b3c9`, Branch
`codex/remove-legacy-simulation`. Sie entfernt die klassische Anwendung und
löst die für einen funktionsfähigen PR notwendigen Test-/Build-Abhängigkeiten.
Kein Merge ohne ausdrückliche Freigabe.

Die vollständige erste Analyse bleibt als
[historischer Nachweis](history/LEGACY_CLEANUP_PR1.md) erhalten. Die einzigen
zwischenzeitlich offenen Änderungen betrafen weiterhin den alten PR #13;
es gab keine neuere ungemergte POV-Basis. Der fremde PR wird nicht verändert.

## Archiv vor Entfernung

Der klassische Browser-Smoke-Test hat auf dem unveränderten Stand beide
Modi und alle sechs Ansichten geöffnet. Danach wurde ein annotierter Tag
angelegt und auf GitHub verifiziert:

- **Tag:** `classic-simulation-archive-2026-11-21`
- **Commit:** `fc338593c33c8e25063fc5ffd22511f7ded9b3c9`
- **Tagobjekt:** `4540b0d3cfd60afb6dbc44bb5c404726e42dfe6a`
- [Archiv auf GitHub](https://github.com/mswierczok/carpet-grand-prix/tree/classic-simulation-archive-2026-11-21)

Die Git-Historie wurde nicht umgeschrieben. Wiederherstellung:

```sh
git fetch origin tag classic-simulation-archive-2026-11-21
git worktree add --detach ../carpet-grand-prix-classic classic-simulation-archive-2026-11-21
cd ../carpet-grand-prix-classic
npm ci
npm run build:offline
```

Die dortige `dist/carpet-grand-prix-offline.html` enthält noch die ursprüngliche
Simulation und deren JSON-Import. Alternativ das archivierte Projekt lokal
bereitstellen und `index.html?legacy=1` öffnen. Der Archivstand ist ein anderes
Produkt als die heutigen Offline-Dateien.

Alte Browserstände werden im heutigen `archive.html` **nur auf Exportklick**
als unveränderter Rohtext heruntergeladen. Auch beschädigte Daten bleiben
unverändert. Keine klassischen LocalStorage-Schlüssel werden gelöscht,
umgewidmet oder in eine Kampagne migriert. Ein anderer Browser/Port oder
file://-Pfad kann einen anderen Speicherbereich besitzen; deshalb den Export
zuerst im ursprünglichen Browser und Origin sichern.

## Tatsächlich umgesetzt

| Änderung | Nachweis / Schutz |
| --- | --- |
| Große Inline-Simulation aus `index.html` entfernt | Ersetzt durch 528-Byte-Einstieg; kein MASTER, kein Rennkern, keine alten Styles/Scripts |
| Normaler Root-Einstieg ins aktuelle Menü | Relativer `location.replace` nach `play.html`; No-JS-Fallback und direkte Links |
| Alte `?legacy=1`-Links | Freundliche Archivinformation, Root/Reload und Export im Browser geprüft |
| Aktueller Menülink | Führt zur Archivinformation statt zur entfernten Anwendung |
| VM-Spieladapter und klassische Saison-/UI-Tests entfernt | Im Tag erhalten; aktuelle Tests importieren unabhängige Pfad-/Datenhelfer |
| Benötigte Geometrie-/Werkstattreferenzen übernommen | Vor Entfernung aus dem unveränderten Archivstand erfasst; 22 exakte Geometrien und ursprüngliche Werte ohne Simulationsausführung geprüft |
| Grafik- und Identitätsschutz übernommen | 92 reproduzierbare Vektorquellen, 35 Original-PNG-/WebP-Hashes, 13 Teamfahrzeuge, Dekodierung online/offline |
| `build-world-review` ersetzt | Unabhängiger `build-driver-art` prüft/erzeugt dieselben 92 SVG-Dateien; keine Originalillustration verändert |
| Reine klassische Messwerkzeuge entfernt | `benchmark-rendering` nennt ausdrücklich 26 Fahrzeuge und bedient alte data-launch-/CGPRaceCamera-APIs; aktuelle `measure-arcade3d`- und Review-Werkzeuge bleiben |
| Alte Offline-Simulation aus aktuellem Build entfernt | Beide Offline-Befehle erzeugen das vollständige aktuelle Paket mit funktionsfähiger Navigation und Archivinformation |
| CI aktualisiert | Keine klassische Mehrsaisonprüfung, keine alten Simulationsgalerien als Produktartefakte; Daten-/Artchecks und vollständige aktuelle Regression bleiben |
| Aktuelle Dokumentation neu ausgerichtet | README, AGENTS, Architektur, Tests und Speicherübersicht beschreiben das Arcade-Spiel; frühere Beschreibungen unter `docs/history/` |

Die reine Funktion der entfernten klassischen Tests existiert nicht mehr:
Teamchef-Verträge, Finanzen, passive 26er-Rennen, Q1/Q2/Q3, Saisonautomatik,
klassische 2D-Kamera und deren UI. Sie werden nicht bloß zum Erreichen grüner
Tests ausgeblendet. Alle weiterhin relevanten Daten-/Geometrie-/Bild-/Speicher-
Aussagen sind vorher übernommen und geprüft; aktuelle POV-, Kampagnen-, KI-,
Physik-, Qualifying-, HUD-, Kontakt- und Speicherfälle bleiben bestehen.

## Unverändertes aktuelles Spiel

`legacy-removal.test.js` prüft die tatsächlich in den fünf aktuellen
Spielseiten geladenen Scripts/Styles, die vier Renn-/Fahrtest-HTMLs, sämtliche
Assets, unabhängige JSON-Quellen, Geometrie-Buildhelfer und vorhandene Fixtures
byteweise gegen den Ausgangscommit. Der Spielkern wird dabei nicht normalisiert.
Nur Root-Einstieg und Archivlink des Hauptmenüs sind absichtlich geändert.

Damit bleiben insbesondere erhalten:

- 13 Teams, 92 historische Fahrer, 39 Kampagnenfahrerplätze und Originalporträts.
- Alle 22 Streckendatensätze, Zeichnungen und Brücken; acht Kampagnenstrecken.
- Redwood, drei Startfahrer, KI-Fahrerauswahl, Pflichtqualifying und Ergebnisarchiv.
- Physik, KI-Parameter, Windschatten, Aufholbonus, Kollisionen, Boxen und Rennlängen.
- Kinderzimmer, sämtliche 3D-Umgebungen, Fahrzeuge, Materialien und Lackierungen.
- Neue POV-Meisterschaft und POV-Werkstatt, bestehende Speicherformate/Migrationen.
- Vollbild-HUD, Touch, Klassement, Einstellungen und Fortsetzungs-Countdown.

Die Referenz `historical-invariants.json` hält SHA-256-Werte der exakten
Punkt-/Bogenlängen-/Boxenarrays, Breiten, Längen und Sektoren aller 22 ursprünglichen
Geometrien. Ihr Ausgangs-HTML wird ausschließlich als Git-Herkunftstext geprüft.
Kein Test startet daraus die alte Simulation. Bestehende historische Fixtures
wurden weder überschrieben noch neu erzeugt.

## Prüfung und visuelle Nachweise

Vorher: eingefrorener separater Checkout desselben Ausgangscommits. Lediglich
Testserver/Playwright-Port wurden auf 4184 geändert; die Anwendung blieb gleich.
Die vergleichbare Gruppe besteht aus `campaign.spec`, `pov-menu.spec`,
`racing-hud.spec` und `resume-countdown.spec` auf beiden Geräteprofilen.
Vorher: **43 bestanden, ein mobiler Fall auf Desktop planmäßig ausgelassen**.
Nachher: ebenfalls **43 bestanden / ein identischer Desktop-Skip**.
Zusätzlich bestanden lokal 213 Unit-/Integrationsprüfungen in 37 Dateien
und die zuletzt ergänzten Schutz-/Offline-/Werkstattfälle separat. Die
abschließende CI prüft alle aktuellen Dateien einschließlich Kalendergruppen.

Die Kampagnenfahrt umfasst Bahrain und Kanada mit Auslaufrunde und zwei
schnellen Qualifying-Runden, übernommener/neu geladener Aufstellung, je 13
Zieleinläufen, archivierten Ergebnissen und erneutem Öffnen beider Reiter.
Wie bisher sind nur die Rennen dieser langen Testfahrt über die öffentliche
Option auf eine Runde verkürzt. Separate Bahrain-Fälle prüfen das Standardrennen.

Zusätzliche Archiv-Browserfälle: **zehn bestanden**, einschließlich unveränderter
Downloads, defekter/fehlender/gesperrter Daten und aller 48 benötigten Team-/
Porträtbilder online/offline. Neue statische Daten-/Art-/Geometrie- und
Offlineprüfungen wurden vor dem Entfernen klassischer Adapter erfolgreich ausgeführt.

Echte Aufnahmen und Rohmessungen: [vorher](cleanup/before/measurements.json),
[nachher](cleanup/after/measurements.json).
Der Bildvergleich der tatsächlichen POV-Startaufstellung zeigt auf Desktop,
Smartphone hoch und quer jeweils **0 abweichende Pixel** (Pixelmatch 0,05).
Keine Konzeptbilder und keine veränderten Fahrzeug-/Kameraparameter.

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Desktop-Rennen | [Bild](cleanup/before/desktop-race.png) | [Bild](cleanup/after/desktop-race.png) |
| Smartphone hoch | [Bild](cleanup/before/portrait-race.png) | [Bild](cleanup/after/portrait-race.png) |
| Smartphone quer | [Bild](cleanup/before/landscape-race.png) | [Bild](cleanup/after/landscape-race.png) |

Ein physischer iPhone-/Safari-Test ist nicht verfügbar. Die mobilen Prüfungen
verwenden echte Touchereignisse in Chromium-Emulation. Aus dem Cleanup wird
keine höhere Bildrate abgeleitet.

## Messbarer Umfang

<!-- CLEANUP_METRICS -->
| Kennzahl | Vorher | Nachher |
| --- | ---: | ---: |
| Projektdateien ohne Git/Pakete/Builds | 987 | 987 |
| Projektbestand in Bytes (einschließlich Dokumentation/Bilder) | 220.152.109 | 222.850.161 |
| Quellbestand `src/`, `styles/`, Root-HTML in Bytes | 3.557.575 | 2.770.357 |
| `index.html` in Bytes | 790.794 | 528 |
| Von Einstiegspunkten referenzierte JS-Dateien | 87 | 78 |
| Von Einstiegspunkten referenzierte CSS-Dateien | 15 | 5 |
| Alle JS-Dateien unter `src/` (inkl. späterer Reste) | 88 | 89 |
| Alle CSS-Dateien (inkl. späterer Reste) | 15 | 15 |
| Entwicklungsabhängigkeiten | 8 | 8 |

26 klassische Dateien wurden entfernt; die Inline-Anwendung wurde zusätzlich
durch den schlanken Einstieg ersetzt. Neue Archiv-/Test-/Referenz-/Nachweisdateien
erklären, warum die Gesamtdateizahl nicht sinkt. Der Quellbestand schrumpft um
787.218 Bytes.

| Kontrollierte Desktop-Messung, Median aus drei kalten Browserkontexten | Vorher | Nachher |
| --- | ---: | ---: |
| Hauptmenü: übertragene Bytes einschließlich Root-Weiterleitung | 1.559.000 | 713.627 |
| Hauptmenü: bereit nach Millisekunden | 594 | 588 |
| Rennansicht: übertragene Bytes einschließlich Root-Weiterleitung | 4.642.712 | 4.642.712 |
| Rennansicht: bereit nach Millisekunden | 4407 | 4584 |

Vollständiger Offline-Build: vorher zwei notwendige Befehle zusammen 4.77 s;
nachher ein konsolidierter Befehl 2.34 s. Der zweite
CI-Build ist entfallen; beide heutigen Befehle erzeugen dasselbe vollständige Paket.

Der abschließende Ressourcen-/Bildvergleich lief nacheinander ohne parallele
Regressionen, mit derselben Chromium-Installation und Software-WebGL. Kleine
Zeitunterschiede bei nur drei Stichproben sind kein belastbarer Beleg für eine
schnellere Rennansicht. Die Nachher-Messung erfolgte im Arbeitszweig vor dessen
Commit: `checkoutCommit` nennt die gemeinsame Ausgangsbasis, `indexSHA256`
kennzeichnet die tatsächlich gemessene Einstiegsversion.

Die vergleichbare Browser-Testgruppe lief vorher 10,9 Minuten, nachher 12,9
Minuten, jeweils 43 bestanden / ein identischer Desktop-Skip. Während dieser
Testläufe liefen weitere Prüfungen; daraus wird keine Testbeschleunigung
abgeleitet. Die tatsächliche Testabdeckung bleibt erhalten.

Alle drei Rennformate laden unverändert 74 JS-/vier CSS-Requests und 4.642.712
Bytes. Alte Root-Script-/CSS-Requests wurden teilweise durch Weiterleitung
abgebrochen und schwanken; im Hauptmenü sind nachher stabil 15 Script- und
drei CSS-Requests nötig. Der Bildvergleich ist in allen drei Formaten exakt gleich.

Die lokale Arbeitskopie enthält separat rund 122 MiB installierte Pakete und
406 MiB erzeugte Builds/Review-Pakete. Die gemeinsame Git-Datenbank liegt bei
rund 221 MiB; sie wird nicht als verkleinerte aktive Anwendung gezählt.
<!-- /CLEANUP_METRICS -->

`project.bytes` zählt die Projektdateien ohne `.git`, `node_modules`, `dist`,
Testberichte und Coverage. Neue echte Screenshots/Referenzen vergrößern diesen
Bestand, obwohl der Anwendungscode kleiner wird. Die gesamte Arbeitskopie
enthält zusätzlich installierte Pakete und erzeugte Builds. Die historische
Git-Objektdatenbank ist davon getrennt und wird durch Löschen aktiver Dateien
nicht kleiner. Es gibt kein History-Rewrite und keine GC als vermeintliches Cleanup.

## Abschluss PR 3/4 – gemeinsamer Final-Cleanup

Ausgangsbasis: gemergtes PR #53, Commit
`921717c3827948c24af1c26465bb33695b68b4be`. Eigener Branch
`codex/final-legacy-cleanup`. PR #52/#53, Datenextraktion, Archiv-Tag und
Anwendungseinstieg werden nicht erneut implementiert. Kein automatischer Merge.

### Abhängigkeitsprüfung und Entfernung

Die Prüfung umfasst alle aktiven HTML-Seiten, Script-/CSS-Reihenfolgen,
Quellmodule, globale Namespaces, Tests, Offline-/Review-Builder, npm-Scripts,
Workflows, Preview-Seiten und Assetpfade. Die sieben klassischen Module besitzen
keinen aktuellen HTML-, Modul- oder Testadapter-Verbraucher. Ihr letzter globaler
Preview-Verbraucher war die eigenständig eingebettete klassische Weltgalerie.
Nach der Entfernung sind 78 der 82 verbleibenden JS-Dateien direkt in aktiven
HTML-Seiten referenziert. Die vier übrigen sind `three-entry.js` (lokaler
Rendererbuild), `driver-identities.js`, `uploaded-portraits.js` und
`driver-portraits.js` (Porträtgeneratoren, Identitäts-/Originalbildtests).
Es verbleibt kein ungeklärtes klassisches JS-Modul.

Keines der zehn klassischen Stylesheets wird noch von einem aktuellen
Einstiegspunkt oder Builder gelesen. Das Studio-Bild war ausschließlich per
CSS aus `studio.css` referenziert.

Der Pilot-Galeriegenerator verweist ausdrücklich auf Teamchef, das alte
Qualifying und die klassische Werkstatt; seine vier Team-Vergleichskarten und
drei Screenshots dokumentieren eine abgelöste UI. Die Welt-/Fahrergalerie bettet
den alten 2D-Weltrenderer ein, nicht die aktuelle modulare Zimmerwelt. Beide
Galerien und der obsolete Generator werden entfernt; aktuelle Review-Builder,
Fahrzeugquellen und Originalporträts bleiben erhalten. Historische Dokumente
kennzeichnen diese alten Anleitungen und verlinken die Galerien im Archiv-Tag.

Vollständige Liste der entfernten Dateien (27 Dateien):

- `assets/backgrounds/studio-event.webp`
- `previews/art-pilot/bahrain.png`
- `previews/art-pilot/follow.png`
- `previews/art-pilot/index.html`
- `previews/art-pilot/workshop.png`
- `previews/world-and-drivers/drivers.png`
- `previews/world-and-drivers/index.html`
- `previews/world-and-drivers/profile.png`
- `previews/world-and-drivers/worlds.png`
- `scripts/build-pilot-preview.js`
- `src/data/world-environments.js`
- `src/rendering/pilot-world.js`
- `src/rendering/race-camera.js`
- `src/rendering/render-motion.js`
- `src/ui/driver-profiles.js`
- `src/ui/live-dom.js`
- `src/ui/team-driver-hud.js`
- `styles/art-pilot.css`
- `styles/base.css`
- `styles/driver-portraits.css`
- `styles/launch.css`
- `styles/live-layout.css`
- `styles/race.css`
- `styles/studio.css`
- `styles/team-driver-hud.css`
- `styles/team-select.css`
- `styles/workshop.css`

Das Assetmanifest bleibt als schmaler Integritätskatalog Version 2 bestehen:
13 Team- und 22 Streckenbilder mit exakt denselben Daten und Hashes. Entfernt
sind nur die alte CSS-Ladereihenfolge, der leere Style-Nachspann und der
Studio-Bildeintrag. Der Herkunftscommit und die Original-HTML-Prüfsumme bleiben
im Provenienzblock. Kein aktueller Builder benutzt diesen Katalog als Packliste.
Der zugehörige Test vergleicht alle 35 Einträge gegen den unveränderten
PR-53-Katalog; dadurch kann das Entfernen des Studio-Eintrags keine geänderten
Fahrzeug- oder Streckenbilder verdecken.

### Bewusst erhalten – keine weiteren Cleanup-Pakete

| Bestand | Nachgewiesener Nutzen |
| --- | --- |
| `race-sprites.js`, `pilot-vehicles.js`, SVG-Exporte und `build-race-preview.js` / `build-pilot-art.js` | Gemeinsame Fahrzeuggeometrie, Lackierungen und reproduzierbare Assetgalerie; kein passiver Simulator |
| Fahreridentitäten, Vektor-Porträtrenderer, 92 SVGs und Original-PNG/WebP-Manifeste | Eindeutige historische Zuordnung, Kampagnenporträts, passende Fallbacks und unabhängige Assetprüfung |
| `assets/references/`, weiße Fahrzeugvorlage, `liveries.json`, Bildoptimierer | Konkrete Quellen der freigegebenen Fahrzeuglackierungen mit Hash- und Zuordnungsprüfung |
| Alle 22 Streckenbilder/-daten, Geometriequellen, Brücken-/Boxenmodule | Aktuelle Fahrtests und acht Kampagnenstrecken; die übrigen 14 sind weiterhin gültiger Inhalt |
| POV-Werkstatt/-Meisterschaft, Kampagne und sämtliche Persistence-Module | Aktive Spielmodi, getrennte Spielstände, validierte Migration, Fortsetzung und Ergebnisarchiv |
| Aktuelle 2D-/3D-Fahrtests, Fahrzeuggalerie, Mess-/Review-Skripte und dazugehörige Previews | Reproduzierbare Gameplay-, Grafik-, Geometrie- und Performanceprüfung; kein klassisches Management |
| Historische JSON-Fixtures und Herkunftsdokumente/-Screenshots | Unveränderte Daten-, Speicher- und Geometriesentinels sowie nachvollziehbare Art Direction; deutlich als historisch gekennzeichnet |
| `archive.html`, `classic-archive.js`, Offline-Archivinformation und bestehender Git-Tag | Lesender Export alter Browserstände und Wiederherstellungsanleitung, ohne alte Simulation zu laden |

Alle acht Entwicklungsabhängigkeiten besitzen weiter konkrete Verbraucher:
`@playwright/test` (Browserfahrten), `vitest` (Unit-/Integrationstests),
`three` + `rolldown` (lokaler Rendererbuild), `clipper-lib` + `polygon-clipping`
(Seilkonturen), `pngjs` + `pixelmatch` (Vorher-/Nachher-Nachweise).
Nur der obsolete npm-Befehl `build:pilot-preview` entfällt. Lockdatei, CI-Jobs und
Testgruppen bleiben unverändert: sie prüfen bereits ausschließlich aktuelle
Funktionen. Keine verbleibende Softwareabhängigkeit wird künstlich entfernt.

Die vorhandene Verzeichnisstruktur entspricht bereits den fachlichen Grenzen.
Keine reine Umbenennung oder Verschiebung verbessert hier die Wartbarkeit.
`AGENTS.md`, `README.md`, Architektur, Asset- und Testanleitung beschreiben jetzt
den abgeschlossenen Cleanup und den aktuellen Arcade-/Kampagnenkern. Alte
Dokumente sind als historische Referenz gekennzeichnet; entfernte Galerielinks
zeigen auf das Git-Archiv. Damit sind die offenen Punkte aus „Bewusst verbleibend“
abgearbeitet. Das Roguelite-Run-System ist ausdrücklich nicht implementiert.

### Abschließende Prüfungen und Vergleich

<!-- FINAL_CLEANUP_RESULTS -->
Die lokalen Schutzprüfungen für Assetkatalog, historische Daten, Originalporträts,
SVG-Exporte und unveränderte aktive Quellen bestehen (13 Tests). Alle Daten-,
Engine-, Kontur-, Rundenformat-, Fahrzeug- und Offline-/Review-Builds bestehen.
Alle sieben Offline-Ausgaben sind SHA-256-/bytegleich zur PR-53-Basis;
[Prüfsummen](cleanup/final/offline-integrity.json).

Die lokale Browsergruppe deckt 54 Fälle auf beiden Profilen ab: 52 bestanden,
ein reiner Desktop-Touchfall war wie vorgesehen übersprungen. Ein Menüfall
zeigte einen Navigation-/Testuhr-Wettlauf: Die 64 ms Testzeit wurden vor
Abschluss der Navigation verbraucht. Nach Umordnung (Renderer abwarten, dann
dieselben 64 ms) besteht dieser Fall auf beiden Profilen separat. Damit sind
alle 53 ausführbaren Fälle bestätigt, einschließlich vollständiger Bahrain- und
Kanada-Wochenenden, Fortsetzung, Archiv, Migration, gesperrtem/defektem Storage,
Originalbild-Dekodierung, Touch, Pause und 3–2–1. Kein Spielcode und kein Testbudget
wurden dafür verändert. Testbilder bestehender Nachweise werden nicht überschrieben.

Der lokale zentrale Unit-Lauf wurde durch eine Umgebungsunterbrechung beendet
und wird ausdrücklich nicht als bestanden gewertet. Die vollständige unveränderte
23-Job-PR-Pipeline prüft die zentrale Unit-/Integrationsgruppe, alle vier
Kalendergruppen, sämtliche Browser-Shards, Qualifying, POV-Meisterschaft,
Kampagne, Bahrain und alle 22 Umgebungen. Abschlussstatus und konkrete
CI-Testlaufzeiten werden im Freigabe-PR verlinkt. Vorhervergleich: PR-53-Lauf
[44932044288](https://github.com/mswierczok/carpet-grand-prix/actions/runs/44932044288),
23 erfolgreiche Jobs; zentraler Unit-Schritt 891 Sekunden. Es wurden keine
Testfälle oder CI-Gruppen entfernt und keine Zeitgrenzen erhöht.

Desktop, 390×844, 844×390 und kleines Smartphone werden über echte Chromium-
Browserinteraktionen geprüft. Das mobile Touchprofil und die iPhone-Viewportgrößen
sind Emulation, kein Test auf einem physischen iPhone/Safari.

<!-- FINAL_CLEANUP_METRICS -->
| Messgröße | PR-53-Basis | Finaler Cleanup |
| --- | --- | --- |
| Versionierte Projektdateien (inkl. neuer Nachweise) | 988 | 970 |
| Entfernte Dateien / deren Originalgröße | — | 27 / 5.039.795 Bytes |
| Quellcode (src, styles, Root-HTML) | 2770357 | 2684240 |
| index.html | 528 | 528 |
| JS-Dateien in src | 89 | 82 |
| CSS-Dateien in styles | 15 | 5 |
| Tatsächlich referenzierte JS-/CSS-Dateien | 78 / 5 | 78 / 5 |
| Referenzierte JS-/CSS-Bytes | 2005594 | 2005594 |
| Entwicklungsabhängigkeiten | 8 | 8 |
| Hauptmenü: Übertragungsbytes / JS-/CSS-Requests | 713.627 / 15 / 3 | 713.627 / 15 / 3 |
| Rennen: Übertragungsbytes / JS-/CSS-Requests | 4.642.712 / 74 / 4 | 4.642.712 / 74 / 4 |
| Vollständiger Offline-Build | 3.499 s | 2.726 s |
| desktop, menu: bereit (Median) | 512 ms | 507 ms |
| desktop, race: bereit (Median) | 4402 ms | 4713 ms |
| portrait, menu: bereit (Median) | 516 ms | 496 ms |
| portrait, race: bereit (Median) | 3569 ms | 3639 ms |
| landscape, menu: bereit (Median) | 429 ms | 465 ms |
| landscape, race: bereit (Median) | 4247 ms | 3584 ms |

86.117 Bytes weniger Anwendungscode (3,1 %). Ohne die neun neuen
Nachweisdateien verbleiben 961 Dateien, einschließlich der Nachweise sind
es 970 versionierte Dateien. Die gesamten Projektbytes einschließlich
Dokumentation/Bildern sind separat in den Rohdaten erfasst (rund 212,5 → 209,7 MiB).
Dieser Bestand ist weder das ausgelieferte Spiel noch die Git-Datenbank.
<!-- /FINAL_CLEANUP_METRICS -->

Die Messungen verwenden denselben lokalen statischen Servertyp, Node 24.22.1,
dasselbe installierte Chromium und Software-WebGL. Vorher und nachher werden
nacheinander ohne konkurrierende Testläufe mit jeweils drei kalten Kontexten
pro Menü-/Rennansicht erfasst. Zeiten sind Mediane aus drei Stichproben, keine
belastbare Beschleunigungs- oder FPS-Aussage. Die geladenen Quellen und sieben
portablen Ausgaben sind unverändert; der Nutzen liegt in weniger ungenutztem
Code und eindeutigen Abhängigkeiten. Es wird keine höhere Bildrate behauptet.

Die Rohdaten nennen den jeweiligen gemessenen Quellcommit. Projektinventare
enthalten separate Nachweise/Dokumentation, nicht `node_modules`, `dist`,
Testberichte oder `.git`. Die Arbeitskopie enthält zusätzlich rund 116 MiB
installierte Pakete und 405 MiB erzeugte Builds. Die Git-Objektdatenbank bleibt
separat erhalten; sie wird nicht durch Löschen aktueller Dateien verkleinert.
Kein History-Rewrite, keine GC und keine Löschung alter Browserspielstände.

Vorher-/Nachher-Aufnahmen aus dem tatsächlichen Spiel, jeweils 0 abweichende
Pixel (Pixelmatch-Schwelle 0,05):

| Format | Vorher | Nachher |
| --- | --- | --- |
| Desktop | [Startaufstellung](cleanup/final/before/desktop-race.png) | [Startaufstellung](cleanup/final/after/desktop-race.png) |
| Hochformat | [Startaufstellung](cleanup/final/before/portrait-race.png) | [Startaufstellung](cleanup/final/after/portrait-race.png) |
| Querformat | [Startaufstellung](cleanup/final/before/landscape-race.png) | [Startaufstellung](cleanup/final/after/landscape-race.png) |

[Vorher-Rohdaten](cleanup/final/before/measurements.json) ·
[Nachher-Rohdaten](cleanup/final/after/measurements.json).

<!-- /FINAL_CLEANUP_RESULTS -->
