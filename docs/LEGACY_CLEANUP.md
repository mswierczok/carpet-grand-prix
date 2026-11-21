# Legacy Cleanup – Stand nach Datenentkopplung und Anwendungsentfernung

## Status und Freigabegrenze

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

## Bewusst verbleibend: separat freizugebende PR 3/4

Die restliche Bereinigung wird erst auf Basis des freigegebenen PR 2 fortgesetzt.
Nicht als erledigt behauptet werden:

- Unbenutzte klassische Darstellungsreste wie `pilot-world`, `race-camera`,
  `render-motion`, `driver-profiles`, `live-dom`, `team-driver-hud` und
  `world-environments`: keine aktuellen HTML-Verbraucher, erneute Prüfung von
  Stilgalerien/Referenzen vor Entfernung im nächsten Paket.
- Zehn alte Stylesheets und das historische Assetmanifest: aus der aktuellen
  Auslieferung entkoppelt, verbleibende Metadaten-/Preview-Verbraucher vor Löschen prüfen.
- Weitere obsolete statische Preview- und Dokumentationsreste. Die weiterhin
  brauchbaren gemeinsamen Fahrzeugquellen, SVG-Generatoren und Stilreferenzen
  werden ausdrücklich erhalten.
- Abschließende Paket-/Assetbereinigung und vollständige Dokumentationskonsolidierung.

Alle acht bestehenden Entwicklungsabhängigkeiten haben in diesem Stand noch
konkrete Verbraucher. `pngjs`/`pixelmatch` prüfen die echten Vorher-/Nachher-Bilder,
Three/Rolldown den lokalen Renderer, Clipper/Polygon-Clipping die Seilkonturen,
Playwright/Vitest die aktuelle Anwendung. Keine Laufzeitabhängigkeit kam hinzu.
Keine zukünftigen Roguelite-Features wurden implementiert.
