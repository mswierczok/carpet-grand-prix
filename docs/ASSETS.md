# CSS, Bilder und Offline-Ausgabe

Erster Umbau auf Basis von `c418ed576ba9f640b295905539f3675b8513a67c`
(übernommener Vorbereitungs-PR #1). Spielregeln, Datenmodell und Formeln bleiben erhalten.

## Bearbeitbare Dateien

Die Online-Startdatei enthält weiterhin das ursprüngliche JavaScript. Sie ist nach
der Auslagerung 784.095 statt 5.215.314 Bytes groß (rund 85 % kleiner). Die Website
benötigt die Ordner `styles/` und `assets/`. Keine Installation und kein Build für
GitHub Pages nötig.

CSS wird in dieser verbindlichen Reihenfolge geladen:

1. `styles/base.css`: Grundlagen und ursprüngliche gemeinsame Komponenten.
2. `styles/race.css`: Live-Timing und Qualifying.
3. `styles/launch.css`: Startmenü, Podium und erste Teamauswahlregeln.
4. `styles/studio.css`: einheitliche Studio-Oberfläche.
5. `styles/live-layout.css`: spätere Anpassungen der Live-Ansicht.
6. `styles/team-select.css`: spätere Teamauswahl-Anpassungen.
7. `styles/workshop.css`: Werkstatt und Fahrzeugdarstellung.

Die ursprüngliche Kaskade ist absichtlich erhalten. Historische Überschreibungen
nicht als vermeintlich doppelte Regeln entfernen oder umsortieren. Das wäre ein
separater, visuell zu prüfender Schritt.

36 Laufzeit-WebP-Dateien liegen unter `assets/cars/` (13), `assets/tracks/` (22) und
`assets/backgrounds/` (1). Die erste Auslagerung hat sie verlustfrei aus Base64
dekodiert. Zwölf Teamfahrzeuge erhalten nun ausdrücklich beauftragte neue
[Lackierungen nach Referenzfotos](CAR_LIVERIES.md); Vauclair bleibt erhalten.
`assets/manifest.json` dokumentiert Reihenfolge, Herkunft, Größe und SHA-256 jeder
Datei sowie die Reihenfolge der Stylesheets. HTML-Pfade sind projektbezogen,
CSS-Pfade relativ zum Stylesheet. Eigene Logos bleiben im Browserspeicher.

## Offline ohne Programmieren

Die automatische Prüfung stellt das Download-Artefakt **carpet-grand-prix-offline**
bereit. ZIP entpacken und `carpet-grand-prix-offline.html` im Browser öffnen.
Die Datei enthält alle Bilder, Styles und das gesamte Spiel; daneben sind keine
weiteren Dateien erforderlich. Browser unterstützen lokale Speicherung bei lokalen
Dateien unterschiedlich; wichtige Spielstände wie bisher zusätzlich als JSON sichern.

Alternativ den vollständigen Projektordner mit allen Unterordnern herunterladen.
Die Einzeldatei aus dem Artefakt ist der einfachste Weg, wenn nur eine Datei
weitergegeben werden soll. Artefakte bleiben 30 Tage erhalten.

Für Entwickler erzeugt `npm run build:offline` die Einzeldatei unter `dist/`.
Sie wird nicht von Hand bearbeitet und nicht als zweite Quelldatei eingecheckt.
Die Webversion funktioniert unabhängig von diesem optionalen Entwicklerbefehl.

## Nachweise und Grenzen

- Vauclair, Strecken und Hintergrund bleiben bytegenau mit den eingebetteten
  Originalen identisch. Die zwölf beauftragten neuen Fahrzeugbilder besitzen eigene
  dokumentierte Prüfsummen und Referenzzuordnungen.
- Bei der ursprünglichen Auslagerung war die Offline-Ausgabe bytegenau identisch mit
  `ea88f1d`. Für die neuen Lackierungen werden im Rückvergleich ausschließlich die
  zwölf Fahrzeug-Bilddaten durch die Originaldaten ersetzt. CSS, Spielcode und Daten
  müssen weiterhin bytegenau übereinstimmen.
- Browserprüfungen vergleichen Original und neue Website im selben Browser mit
  denselben Spielständen/Zufallsfolgen: Start, Teamauswahl, sechs Ansichten,
  pausiertes Rennen und Qualifying auf Desktop und im Mobilformat.
- Die vom Browser gelesenen CSS-Regeln werden ebenfalls verglichen. Bildvergleiche
  verwenden Pixelmatch mit Farb-Abstandsschwelle 0,05 und ignorieren Kantenglättung;
  außerhalb dieser engen Toleranz ist kein abweichender Bildpunkt erlaubt. Das
  vermeidet Fehlalarme an mobilen, abgerundeten Canvas-Kanten. Bildbytes und der
  vollständige Quelltext-Rückvergleich bleiben ohne Toleranz abgesichert.
- Die Originalseite stammt aus dem unveränderten Git-Commit mit geprüfter SHA-256.
  Referenzbilder werden daraus je Lauf erzeugt. Unterschiede liefern beide
  Screenshots als Fehleranhänge, keine Erwartungen aus der umgebauten Seite.
- Offline-Tests laden die Einzeldatei über den lokalen Testserver, schalten das
  Netzwerk ab und prüfen Ansichten, Qualifying, Rennen und Speicherung ohne weitere
  HTTP-Ressourcen. Das ersetzt keine Prüfung aller Browser beim Öffnen lokaler Dateien.
  Die bytegleiche Einzeldatei erhält das bisherige Verhalten.

Der vollständige Rückvergleich sichert diese reine Auslagerung ab. Bei später
genehmigten UI-/Spieländerungen muss er ausdrücklich an den neuen Prüfumfang
angepasst werden; nicht beiläufig entfernen, um einen roten Test zu umgehen.
