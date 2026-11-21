# Architektur

Das aktuelle Hauptprodukt ist das selbst spielbare Arcade-Racing-Roguelite.
`play.html` startet freies Rennen / POV-Meisterschaft, `campaign.html` die getrennte
Kampagne; beide verwenden `race.html` mit derselben Renn-Engine. `arcade.html` und
`arcade3d.html` bleiben technische Fahrtests. Klassische Simulation und ihre
Spielstände werden im ersten Cleanup-Schritt noch erhalten.

## Unabhängige Stammdaten

`src/data/historical/{master,tracks}.json` → `scripts/export-arcade-data.js` →
`src/data/{arcade-roster,arcade-tracks}.js` → Menü, Kampagne, Fahrtests und Rennen.
Der Export liest kein HTML und keinen Testadapter. Original-Kalender-Tupel bleiben
zusätzlich in `historical/track-defs.json` erhalten. Alle bisherigen generierten
Browserbytes bleiben identisch. POV-Layoutprofile, Bahrain-Unterbett/Boxengasse,
generierte Seilkonturen und Kampagnenkonfiguration behalten ihre eigenen Grenzen.

Analyse, vollständige Klassifikation, verbleibende Testkopplungen und Freigabefolge:
[LEGACY_CLEANUP.md](LEGACY_CLEANUP.md). Die eigentliche Bereinigung der alten
Simulation ist ein späterer PR; die folgende ursprüngliche Planung dokumentiert
den historischen Umbau und ist keine Aufforderung, die Simulation weiter auszubauen.

## Historischer Umbauplan

Status: Vorbereitung übernommen; erster Umbau trennt CSS und Bilder ab.
Die Spielsysteme bleiben im ursprünglichen JavaScript. Details in [ASSETS.md](ASSETS.md).
Ziel: native JavaScript-Module und statische Dateien ohne verpflichtenden Produktions-
Build; GitHub Pages bleibt die Auslieferungsplattform.

```text
index.html
assets/{cars,tracks,backgrounds}/
styles/{base,layout,launch,workshop,race}.css
src/
  main.js
  data/{teams,drivers,tracks,balance}.js
  core/{state,random}.js
  simulation/{race,qualifying,driver-ai,traffic,collisions,timing}.js
  tracks/{geometry,racing-line,pit-lane}.js
  championship/{weekend,standings,season}.js
  management/{finances,development,maintenance,regulations,drivers,team-ai}.js
  persistence/{storage,validation,migrations,import-export}.js
  rendering/{track,cars}.js
  ui/{launch,navigation}.js
  ui/views/
tests/{unit,integration,browser,extended,fixtures,helpers}/
docs/
.github/workflows/
```

Die Dateizahl richtet sich nach den tatsächlichen Abhängigkeiten; keine leeren
Platzhaltermodule erzeugen.

## Modulgrenzen

Simulation erhält Zustand, Geometrie und Zufallszustand und liefert Folgezustand
und Ereignisse. Kein DOM oder Browserstorage im Rennkern. Management/Meisterschaft
berechnen Aktionen und verbuchen Ergebnisse. Darstellung liest Zustand; UI übersetzt
Bedienung in Aktionen. Ein Anwendungscontroller koordiniert Speichern und Rendern.
Caches bleiben Laufzeitdaten. Das gespeicherte Zustandsformat bleibt zuerst erhalten.

Anfangs kann ein expliziter gemeinsamer Kontext die bestehenden Abhängigkeiten
abbilden. Erst anschließend engere Schnittstellen schaffen. Keine gleichzeitige
Umstellung von Zustandsmodell, Zufall und Dateistruktur. Kreisimporte vermeiden:
Daten/Geometrie unterhalb der Simulation, Oberfläche darüber. Darstellung und
Simulation verwenden dieselbe Strecke.

## Reihenfolge mit jeweils eigenem PR

| Schritt | Änderung | Abnahme |
| --- | --- | --- |
| 0 | Regeln, Referenzen, Tests, CI, Dokumentation | Original unverändert; passende Tests grün |
| 1 | CSS in ursprünglicher Reihenfolge, Bilder verlustfrei auslagern | Bildbytes identisch, relative Pfade, visuelle Desktop-/Mobilvergleiche |
| 2 | Stammdaten, Validierung, Speicherung | IDs/Hash/Format identisch; alle Referenzstände laden/exportieren |
| 3 | Management und Meisterschaft | Ressourcen, Upgrades, Transfers, Titel und Saisonwechsel geprüft |
| 4 | Geometrie und Zeitrechnung | Alle 22 Geometrien identisch; Brückenebenen und Zeittrennung geprüft |
| 5 | Rennkern, Qualifying, Verkehr/KI | Replays/Fortsetzung identisch; Saison und gezielte Verkehrsszenarien bestanden |
| 6 | Ansichten, Eingaben, Rendering, Controller | Bedienwege, Speicherfälle, Mobilansichten und Pages geprüft |

Testadapter später durch Modulimporte ersetzen, erwartete JSON-Werte beibehalten.
Jeder Merge benötigt die ausdrückliche Nutzerfreigabe für den konkreten PR.

## Risiken

| Risiko | Maßnahme |
| --- | --- |
| Initialisierungsreihenfolge/Importschleifen | Kleine Schritte, expliziter Einstieg, Start-/Ladetests |
| Andere Rennen durch Zufall/Rechenreihenfolge | Feste Testfolgen, Replays, keine beiläufigen Sortierungen |
| Ungültige Spielstände | Schlüssel/IDs/Hash erhalten, vor Ersatz prüfen, Referenzimporte |
| Veränderte Kurven/Brücken | Geometriereferenzen und Ebenenprüfungen |
| Andere Darstellung | CSS-Kaskade bewahren; Bildreferenzen vor visuellem Umbau festlegen |
| Fehlende Pages-Ressourcen | Projektpfad erzwingen; Browser-Ressourcenfehler lassen Tests scheitern |
| Performanceverlust | Dieselben Szenarien vor/nach Umbau messen, Laufzeit/Bildrate vergleichen |
| Bisherige Ein-Datei-Offlinenutzung bricht | Vor Einführung von Modulen eine funktionierende Offline-Ausgabe bereitstellen und testen; bestehende Nutzung nicht still aufgeben |
| Alte Fehler versehentlich mitändern | Separate Befunde und Freigabe für Verhaltensänderungen |

## Vor den empfindlichen Auslagerungen ergänzen

- Gezielte sichere/gesperrte Spurwechsel, Innen-/Außenangriffe, Überrundung,
  dichtes Feld, Brücken, Schäden, Reparatur und Boxenausfahrt.
- Mehrsaisonfälle für Reglementjahre, Transfers, Rücktritte und Poolende.
- Historische Nutzerspielstände, sobald verfügbar.
- Visuelle Referenzen in fest versionierter Browserumgebung und zusätzliche Browser.

## Gezeichneter Pilot und Darstellungszeit

Vier Teams werden über `pilot-vehicles.js` als transparenter Showroom sowie über
dieselbe SVG-Quelle in Rennen/Werkstatt dargestellt. Bahrain nutzt
`pilot-world.js`; alle anderen Umgebungen behalten den bisherigen Renderer.
`render-motion.js` hält ausschließlich sichtbare Posen in einer WeakMap und
interpoliert Auto/Kamera zwischen den unveränderten 1/30-Sekunden-Schritten.
`live-dom.js` erhält Live-Buttons bei Aktualisierung und Sortierung.
Integration, Ausgangsstand und Messungen: [ART_PILOT.md](ART_PILOT.md).
Stilgrundlage und freigabepflichtiger weiterer Rollout: [ART_STYLE.md](ART_STYLE.md).

## Freigegebener Rollout und Fahreridentitäten

Aktueller Ausbau: alle 22 Umgebungen und 13 Renn-/Werkstattfahrzeuge.
Team-Auswahl wieder mit den bisherigen WebPs. 92 feste Illustrationsprofile
in `src/data/driver-identities.js`, SVG-Komposition in `driver-portraits.js`,
lesender Profil-Dialog in `driver-profiles.js`. Kein neues Speicherfeld.
Vollständige Integration und Vorschau: [WORLD_AND_DRIVERS.md](WORLD_AND_DRIVERS.md).

## Getrennter Arcade-Modus

`arcade.html` verbindet `src/racing/{physics,controls,session,track-surface,timing}.js`
mit `arcade2d.js`. `arcade3d.html` verwendet dieselbe Sitzung mit der zusätzlichen
räumlichen Darstellung. `camera3d`, `materials3d`, `vehicles3d`, `tracks3d` und
`arcade3d` lesen die Renderpose; sie schreiben nicht in Physik oder Rundenmessung.
Die vorhandenen `index.html`-Systeme und deren Speicher bleiben getrennt.
Die lokale Three.js-Auswahl wird mit dem geprüften Rolldown-Build erzeugt und
zusätzlich reproduzierbar geprüft. Pages benötigt weiterhin keinen Server.
Details, Modulgrenzen und Abnahme: [ARCADE_PHASE1.md](ARCADE_PHASE1.md),
[ARCADE_PHASE2.md](ARCADE_PHASE2.md).

`boundary-field.js` verwendet die generierten Konturen aus `arcade-boundaries.js`
gemeinsam für Fahrzeugkontakte und beide Arcade-Darstellungen. Polygonvereinigung
findet nur im Entwicklungsbuild statt; Laufzeit und Offline-Dateien benötigen
lediglich die Konturdaten. Details: [ARCADE_BOUNDARIES.md](ARCADE_BOUNDARIES.md).

`race.html` verwendet dieselbe Steuerung und Darstellung mit `RaceSession` für
13 Fahrzeuge. `opponents.js` erzeugt normale Fahrbefehle, `vehicle-contacts.js`
löst reale Rechteckkontakte auf. `fleet3d.js` bündelt die tatsächlichen Modelle
und Lackierungen; `arcade-race-ui.js` zeigt Start, Reihenfolge und Ergebnisse.
Die freie `Session` bleibt erhalten. Details: [ARCADE_FULL_GRID.md](ARCADE_FULL_GRID.md).

`opponent-line.js` berechnet ausschließlich vorbereitete KI-Lenkziele mit
eigener Bogenlänge. Echte Posen, Fortschritt und Sektorzeiten bleiben bei
Physics/RaceSession. Abstimmung und Vergleich: [OPPONENT_PACE.md](OPPONENT_PACE.md).

`track-catalog.js` stellt 22 validierte POV-Strecken mit Original-Kalenderindizes
bereit. `arcade-main.js` erneuert Sitzung, Renderer und Kamera beim Wechsel.
Die gemeinsame Build-Aufbereitung erzeugt Ränder und sichere Trennseile;
Laufzeitdaten bleiben statisch. `bridge-surface` und `bridge-physics` ergänzen
getrennte Fahrbahnkorridore und Höhen um den unveränderten Physikkern.
Umfang und nächste Integration: [POV_CALENDAR.md](POV_CALENDAR.md).

Im POV-Rennen berechnet `slipstream.js` eine gemeinsame aerodynamische Wirkung
vor den festen Physikschritten. Sein optionaler Adapter übergibt ausschließlich
Kraft-/Widerstandsparameter an den unveränderten Physikkern. `RaceSession` liefert
kopierte Effektzustände; `wake-visuals.js` und `wake3d.js` stellen genau diese
dar. Die freien Fahrtests und das klassische Spiel bleiben getrennt.
Parameter, Topologieschutz, A/B-Abschaltung und Prüfungen: [SLIPSTREAM.md](SLIPSTREAM.md).
Die aktuelle nähere +5-km/h-Abstimmung dokumentiert
[SLIPSTREAM_CLOSE.md](SLIPSTREAM_CLOSE.md).
Die anschließende Korrektur der seitlichen Gewichtung und des zu langsamen
Aufbaus mit echten Vorher-/Nachher-Fahrten steht in
[slipstream-full/README.md](slipstream-full/README.md).
`RaceSession` sperrt den gemeinsamen Effektzustand für die ersten sieben
Rennsekunden ab Grün; Countdown und Pause zählen nicht. Das Windmodul lässt
danach nur Paare mit mindestens 100 km/h vorwärts zu. Grenzen und Prüfungen:
[SLIPSTREAM_START.md](SLIPSTREAM_START.md).

`qualifying-session.js` wertet die zwei schnellen Runden nach einer vollständigen
Auslaufrunde einer echten `RaceSession` aus. `race-weekend.js` koordiniert die
optionale Qualifikation und übergibt die geprüfte `gridOrder` an das Rennen.
`qualifying-ui.js` stellt Bestzeiten und Übernahme der Startaufstellung dar.
Direktstart, Kräfte und klassische Spielstände bleiben erhalten. Regeln,
Zurücksetzen und Prüfungen: [POV_QUALIFYING.md](POV_QUALIFYING.md).
Im Solo-Qualifying laufen alle 13 Fahrzeuge im festen Takt unabhängig voneinander:
kein geteilter Verkehr oder Fahrzeugkontakt, aber dieselbe Einzelwagenphysik.
`visibleEntries` begrenzt ausschließlich die Fahrzeugdarstellung auf den Spieler;
Zeitwertung und Bestzeitentabelle enthalten weiterhin die realen Hintergrundfahrten.
`qualifying-drivers.js` ergänzt feste Team-Fahrprofile sowie eine kontinuierliche
Kurvenausführung nur für die Qualifying-KI. Der gemeinsame Regler erzeugt daraus
normale Fahrbefehle; Physik, Geradeaus-Höchsttempo und Rennen bleiben unverändert.
Ursache, Grenzen und echte Vergleichsläufe: [QUALIFYING_DRIVERS.md](QUALIFYING_DRIVERS.md).

`race-gaps.js` hält eine begrenzte Passagehistorie für laufende Zeitabstände.
`catchup.js` berechnet daraus das kleine KI-Motorbudget und übergibt es an den
gemeinsamen Physikpfad. Spieler, Podiumsplätze und Auslaufrunden bleiben ohne
Aufholhilfe. Regeln, A/B-Abschaltung und Prüfungen: [CATCHUP.md](CATCHUP.md).

`race-settings.js` bündelt die vorhandenen POV-Renneinstellungen in einem nativen
Dialog. `arcade-main.js` pausiert beim Öffnen und leert die Eingaben. Die gemeinsame
Steuerung schützt die Fahrfläche vor Auswahl/Gesten und verwaltet mehrere Pointer
mit expliziter Freigabe. Oberfläche, Speicherregeln und Geräte-Testgrenzen:
[POV_SETTINGS_TOUCH.md](POV_SETTINGS_TOUCH.md).

`main-entry.js` ersetzt den normalen Simulationseinstieg durch `play.html`.
`pov-launch.js` führt über die bisherige Teamfahrzeugkunst und den Kalender zum
POV-Rennwochenende. `pov-selection.js` speichert Team/Strecke getrennt von alten
Spielständen; die erweiterten POV-Präferenzen gelten in Menü und Rennen gemeinsam.
Der frühere Einstieg bleibt ausschließlich als Altspielstand-Zugang erhalten.
Umfang, Datenkompatibilität, Offline-Navigation und nächste Schritte:
[POV_MAIN_MENU.md](POV_MAIN_MENU.md).

`pov-checkpoint.js` prüft die natürlichen Export-/Restore-Schnittstellen von
Rennen, Qualifying und Wochenende einschließlich KI-/Effekthistorie.
`pov-game-store.js` speichert einen getrennten POV-Slot. `pov-career.js` verbucht
Teamresultate und Saisonfortschritt; `pov-workshop.js` verwaltet Fahrzeugentwicklung
mit vorhandenen Kosten und Grenzen. `pov-game-ui.js` verbindet diese Module mit
Menü, Autosave und der bestehenden Rennansicht. Fahrerzuordnung und Fahrwirkung
der Entwicklungen bleiben offen. Format, Abnahme und Grenzen: [POV_CAREER.md](POV_CAREER.md).

`Tracks3D` verwendet für Bahrain die isolierte Gestaltung aus `bahrain3d.js`.
`bahrain-layout.js` prüft Requisitenflächen anhand derselben unveränderten
`Surface`; `bahrain-materials3d.js` zeichnet die Materialkarten. Das gemeinsame
`illustrated-kit3d.js` bündelt statische Modellteile und Kontaktschatten.
Die Darstellung besitzt keine Kollisions- oder Spielstanddaten. Alle anderen
Strecken behalten ihren bisherigen Renderer-Zweig. Echte Spielaufnahmen,
Abnahmegalerie und technische Grenzen: [BAHRAIN_VISUAL.md](BAHRAIN_VISUAL.md).

## Konfigurierbares Master-Kinderzimmer

`environment-scenes.js` trennt den festen Zimmergrundriss von den Bahrain-
Farben, Materialien, Kamerawerten und Landmarken. `environment-assets3d.js`
bietet 26 tatsächlich baubare Möbel-, Spielzeug- und Motorsportmodule.
`MasterBedroom3D.create` erzeugt das ganze Zimmer mit Möbeln und Teppich
unabhängig vom Bahrain-Assembler. `illustrated-materials3d.js` und der gemeinsame
Kit bündeln Texturen, statisch beleuchtete Farbflächen und Geometriequellen.
Die Szene schreibt nicht in Physik, KI oder Spielstände. Nur Bahrain verwendet
diesen Ausbau; die anderen Strecken bleiben im vorhandenen Renderer-Zweig.
Maßstab, Platzierung, Kamera, Tests und tatsächliche Aufnahmen:
[MASTER_BEDROOM.md](MASTER_BEDROOM.md).

## Bahrain-Unterbett und Boxeninfrastruktur

Ein optionales, beim Export erzeugtes POV-Profil begrenzt die beauftragte
Layoutänderung auf einen Bahrain-Abschnitt. Haupt- und Nebenfahrfläche teilen
weiterhin dieselben erzeugten Seilkonturen; der Ziel-Checkpoint schließt den
parallelen Boxenweg ein. Bett und Kamera behalten ihre Zimmeranker und Höhe.
Paddock und Support-Transporter sind zusätzliche wiederverwendbare Asset-Typen.
Umfang, historische Prüfungen und Grenzen: [BAHRAIN_ITERATION2.md](BAHRAIN_ITERATION2.md).

## Weitere POV-Spielwelten

`track-environments`, `environment-layout`, `calendar-assets3d` und
`calendar-world3d` erweitern den vorhandenen illustrierten Baukasten auf die
übrigen 21 Strecken. Datengetriebene Themen definieren Boden, Zimmerbereich und
Landmarken; die Platzierung schützt sämtliche Rennkorridore. Bahrain bleibt im
bisherigen Assembler. Rennsystem, Kalenderdaten und Spielstandformat bleiben
unverändert. Zuordnung, Durchfahrten, Darstellungsplattformen, Abnahmegalerie und
die ausdrücklich einfache künftige Boxen-Reparaturregel:
[CALENDAR_ENVIRONMENTS.md](CALENDAR_ENVIRONMENTS.md).

## Seilkontakt als begrenzter Physikadapter

`rope-contact.js` liegt zwischen dem unveränderten `Physics`-Kern und dem
Brückenadapter. Nur bei Seilkontakt erhält es tangentiale Bewegung und eine
langsame Kontaktdrehung; die tatsächlichen Rechteck- und Ebenenprüfungen bleiben
verbindlich. Kontaktfreie Zustände bleiben exakt gleich. Konturen, KI-Regler
und Spielstandfelder werden nicht angepasst. Verhalten, Freiraumkorrektur und
Prüfungen: [ROPE_CONTACT.md](ROPE_CONTACT.md).

## Eigenständige Kampagnen-Grundlage

`campaign-config`, `campaign`, `campaign-store` und die Kampagnenoberflächen
bilden einen getrennten Einstieg mit acht vorbereiteten Strecken, 39 festen
Fahrerplätzen und eigenem Speicher. `race.html?mode=campaign` verwendet denselben
`RaceWeekend` samt Checkpoint, Physik, KI und Kamera. Eine optionale Beschriftung
verbindet die Team-IDs mit Kampagnenfahrern, ohne die nativen Renndaten umzubauen.
Die 22-Rennen-Meisterschaft und der klassische Modus bleiben unabhängig.
Umfang, Zuordnungen, Speicherregeln und offene Roguelite-Entscheidungen:
[CAMPAIGN.md](CAMPAIGN.md).

`resume-countdown.js` ergänzt einen UI-seitigen Drei-Sekunden-
Timer beim Verlassen des Rennmenüs. Er läuft im bestehenden Animationszyklus,
während die native Session pausiert bleibt. Menüöffnung, Fokusverlust und
Sessionwechsel verwerfen den Timer; er gehört nicht zum Spielstandformat.

## Vollbild-HUD und fortsetzbare Kampagnenwochenenden

`race-presentation` bereitet die nativen Standings für das relative HUD und
das vollständige 13er-Klassement gemeinsam auf. Abstände verwenden `RaceGaps`
und offizielle Zielzeiten; es gibt keine zweite Positionsberechnung.
`racing-hud`, `race-settings` und `result-details` trennen stabile HUD-Zeilen,
pausierte Menüansichten und nur lesende historische Ergebnisse.

`CampaignWeekend` umschließt genau eine native Session und erzwingt den
Qualifying-/Startaufstellungsablauf. Kampagnenformat 2 erweitert den eigenen
Speicher um eindeutige historische Grand Prix und die nächste offene Strecke.
Der festgehaltene v1-Validator prüft alte Daten vor der Migration. Klassische
Speicher und POV-Meisterschaft bleiben getrennt. Ablauf, Pauseregeln,
Vorher-/Nachher-Aufnahmen und Grenzen: [RACING_HUD.md](RACING_HUD.md) und
[CAMPAIGN.md](CAMPAIGN.md).
