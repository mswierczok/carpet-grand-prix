# Vollbild-Rennoberfläche und Kampagnenfortschritt

Ausgangsbasis: `df1e716` auf main, vor dieser Überarbeitung.
Die [Abnahmegalerie](../previews/racing-hud/index.html) enthält echte Aufnahmen
des alten und neuen Spiels sowie direkte Zugänge zur Kampagne und zum freien
Rennwochenende. Keine der Aufnahmen ist ein Konzeptbild.

## Rennansicht

`race.html` belegt den Browser-Viewport mit `100dvh`, ohne Seitenscrollen.
Das vorhandene Canvas und die unveränderte Verfolgungskamera liegen hinter
HUD und Touchsteuerung. Safe-Area-Abstände berücksichtigen Aussparungen und
den Home-Indikator. Der bestehende Renderer aktualisiert beim Größenwechsel
Zeichenpuffer und Kameraformat anhand des tatsächlichen Canvas-Rechtecks.

Oben links stehen drei relative Fahrer; am Feldanfang bzw. -ende verschiebt
sich das Fenster auf P1–P3 bzw. P11–P13. Der eigene Fahrer ist hervorgehoben.
Oben rechts stehen Zahnrad und Sessionrunde, unten mittig die unveränderte
Geschwindigkeit aus dem vorhandenen Snapshot. Die Touchbuttons bleiben an
den unteren Ecken. Textauswahl, Seitengesten und verlorene Zeigereingaben
werden über die bestehende Eingabeschicht verhindert bzw. zurückgesetzt.

Der zentrale Startknopf gehört ausschließlich zur ungestarteten Session:
Qualifying starten, Startaufstellung übernehmen (nur freie Modi), Rennen
starten. Eine laufende pausierte Session wird ausschließlich über das Menü
fortgesetzt. Die bisherigen großen Tabellen, Reset- und Auswahlfelder liegen
in Dialogen statt unter dem Rennbild.

## Eine gemeinsame Positionsquelle

`race-presentation.js` liest die nativen Renn- bzw. Qualifying-Standings, ohne
eine zweite Sortierung oder Rennsimulation einzuführen. Kompaktes HUD und
vollständiges Klassement erhalten denselben aufbereiteten Datensatz.

Zeitabstände verwenden die vorhandene `RaceGaps`-Passagehistorie: Wann hat das
vorausfahrende Fahrzeug den aktuellen Streckenfortschritt des folgenden
Fahrzeugs passiert? Die Differenz zur aktuellen Rennzeit ergibt den Abstand.
Die native Historie ist begrenzt und funktioniert auch bei ausgeschalteter
Aufholhilfe. Sie wird bei Session-, Team- oder Streckenwechsel zurückgesetzt.
Ohne belastbare Passage steht „—“; es gibt keine Geschwindigkeitsschätzung.
Vollständige Rundendifferenzen werden anhand des nativen unbeschränkten
Streckenfortschritts erkannt. Nach beiden Zieleinläufen gelten die offiziellen
Zielzeiten. Im relativen HUD ist ein vorausfahrender Fahrer positiv, ein
nachfolgender negativ beschriftet. Das vollständige Klassement zeigt Abstände
zum Führenden. Qualifying-Abstände stammen aus den echten Bestzeiten.

Die Kampagne verwendet ihre gespeicherte Fahreraufstellung. Freie Rennen und
die bisherige Meisterschaft besitzen noch keine gewählte Fahreridentität;
hier dient pro Team eine feste historische Identität aus dem bestehenden Pool
als reine Beschriftung. Diese Auswahl verändert weder Teamdaten noch Fahrwerte
oder bestehende Spielstandformate.

`racing-hud.js` hält die DOM-Zeilen stabil und ändert deren Inhalte im bereits
vorhandenen UI-Takt (etwa 80 ms), nicht in jedem Physikschritt.

## Pausenmenü und vollständiges Klassement

Zahnrad oder P öffnet das Menü, pausiert sofort und setzt Steuerungseingaben
zurück. Schließen bedeutet weiterhin Pause. Nur **Fortsetzen** startet eine
bereits laufende Session erneut. Bei einer ungestarteten Aufstellung führt
Fortsetzen zum zentralen Sessionstart, ohne den Start zu automatisieren.

Das Menü enthält:

- Fortsetzen, vollständiges Klassement, Gesamtstrecke/Verfolgungskamera,
  bestätigten Neustart und Auto zurücksetzen.
- Steuerungshilfe, gespeicherte Lenkempfindlichkeit, Grafik, erlaubte
  Schwierigkeit/Aufholhilfe und die vorhandenen optionalen Balance-Diagnosen.
- Freie Rennvorbereitung mit Team/Strecke und erlaubtem Direktstart bzw.
  wiederholtem Qualifying. Diese Optionen sind in der Kampagne gesperrt.
- Speichern, Export, Import, Werkstatt und bisherige Menünavigation.

Das vollständige Klassement enthält alle 13 Fahrer, Team, Position und
Sessiondaten. Im Rennen sind das Abstand, abgeschlossene Runden, Status und
Startposition; im Qualifying Bestzeit und Abstand zur Bestzeit. Nach dem Ziel
werden offizielle Endzeiten verwendet. Auf kleinen Displays stehen zusätzliche
Metadaten unter dem Fahrernamen. Nur der Dialog scrollt.

Zurück, X und Escape führen aus dem Klassement zum Pausenmenü, ohne Fortsetzen.
Die Ergebnisansicht nach Sessionabschluss ist ebenfalls ein eigener Dialog;
ihr Schließen führt zurück ins Pausenmenü. Fokus und native Dialognavigation
bleiben erhalten.

## Kampagne und historische Daten

Der dünne `CampaignWeekend`-Adapter verlangt das native vollständige Qualifying
und übernimmt die Startaufstellung genau einmal. Er besitzt keine eigene
Simulation. Nach dem Ergebnis führt die Kampagnenübersicht zur nächsten offenen
Strecke. Acht verfügbare Strecken sind weiterhin ein Testpool, keine erfundene
Run-Länge oder Siegbedingung.

Die kompakte Übersicht trennt Übersicht, Ergebnisse, Strecken, Teams und
Spielstand. Die nächste Streckenwahl steht unmittelbar beim aktuellen Fahrer
und letzten Ergebnis. Archivkarten öffnen eine nur lesende Detailansicht mit
Rennergebnis-/Qualifying-Reitern und allen damaligen Fahreridentitäten.

Formatversion 2, Schutz vorhandener Daten, v1-Migration einschließlich
Bahrain-Zwischenständen und die eng begrenzte Ausnahme für bereits gestartete
alte Rennen: [CAMPAIGN.md](CAMPAIGN.md).

## Verifikation

Die neuen Unit-Prüfungen und die angepasste Kampagnen-Prüfung bestehen mit
26 Fällen. Sie sichern insbesondere P1/P6/P13, fehlende Passagehistorie,
Rundendifferenzen, Zielzeitabstände, Qualifying, Pflichtablauf, Restart,
Migration, acht eindeutige Strecken, eingefrorene Ergebnisse und Speicherfehler.
Der vollständige Unit-/Integrationslauf besteht mit 241 Prüfungen in 38 Dateien;
die aufwendigeren POV-Kalenderprüfungen laufen weiterhin in separaten CI-Gruppen.

Echte Browserprüfungen mit Chromium und mobilem Touch-Kontext prüfen:

- 1440 × 810, 390 × 844, 844 × 390 und 320 × 568: kein Seitenscrollen,
  passende Canvas-/Projektionsgröße, HUD und Dialoge.
- Pause, 13er-Klassement, Rücknavigation, Neustart-Bestätigung,
  gespeicherte Einstellungen und echte CDP-Mehrfingereingaben.
- Zwei durchgefahrene Grand Prix (Bahrain und Kanada), jeweils Auslaufrunde,
  zwei schnelle Runden und alle 13 Zieleinläufe. Die übernommene Aufstellung
  wird vor dem Rennstart neu geladen; ein echtes Bahrain-Ergebnis wird in
  v1-Darstellung migriert. Beide Ergebnisse bleiben nach erneutem Laden lesbar.
- Defekte/neuere Daten, abgesagter Neustart, Import, getrennte alte Slots und
  Rohdatenvergleich vor/nach Archivnavigation.
- Eingebettete Offline-Datei bei deaktiviertem Netzwerk, Fortsetzen und
  verpflichtendes Qualifying.

Die langen Browserfahrten verkürzen ausschließlich die Rennlänge über die
öffentliche Engine-Option auf eine Runde. Qualifying, Tastatureingaben,
Physikschritte, Zeitmessung und 13 Zieleinläufe bleiben echt. Die Testadapter
werden nur vom Browserlauf injiziert, nicht mit dem Spiel ausgeliefert.
Die regulären Produktionsrundenzahlen und Referenz-Fixtures bleiben unverändert.
Bestehende Browserprüfungen bedienen nun dieselben Funktionen durch die
veröffentlichte Menüoberfläche; `tests/helpers/racing-menu.js` enthält diese
Navigation, keine zweite Simulation.

### Reproduktion und Screenshots

```sh
npm test -- tests/unit/racing-hud.test.js tests/unit/campaign-progress.test.js tests/unit/campaign.test.js
npm run build:offline
npm run build:arcade-offline
npx playwright test tests/browser/racing-hud.spec.js tests/browser/campaign.spec.js
node scripts/build-hud-review.js
```

Die Kampagnenfahrt exportiert die tatsächlich gespeicherten Ergebnisse nach
`dist/hud-<project>-actual-results.json`. `scripts/capture-hud-review.js` kann
diesen realen Stand für Übersichts-/Archivaufnahmen erneut laden und prüft,
dass die Ansicht den Rohspielstand nicht verändert. Die Vorher-Aufnahmen
entstanden vor der Überarbeitung. Bilder: `docs/racing-hud/`.

`dist/hud-review/index.html` bündelt die Galerie und spielbare eigenständige
Offline-Dateien. CI stellt sie als Artefakt
`carpet-grand-prix-hud-campaign-review` bereit. Die normalen GitHub-Pages-Pfade
und bisherigen Offline-Ausgaben bleiben erhalten.

### Grenzen

iPhone-Abmessungen, Touch und Hoch-/Querformat sind mit Chromium emuliert.
Ein physisches iPhone mit Safari, dessen dynamische Browserleisten und lokale
file://-Navigation konnten hier nicht auf einem echten Gerät geprüft werden.
Die Offline-Prüfung führt die erzeugten eingebetteten Dateien ohne Netzwerk
im Browser aus. Browser-Leistungstests ersetzen keinen physischen Gerätetest.
Vier bereits bekannte Fahrerporträts bleiben ausdrücklich Platzhalter.
Die öffentlichen Pages werden vor Freigabe/Merge nicht verändert.
