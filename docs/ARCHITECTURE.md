# Zielstruktur und Umbauplan

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
