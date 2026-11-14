# Vollständiger Zeichenstil und Fahrerporträts

Der Nutzer hat die Stilprobe aus PR #11 für den weiteren Rollout freigegeben.
Neue Vorgabe: Die Team-Auswahl soll die bisherigen Fahrzeuge behalten.
Dieser Entwicklungsstand enthält den Pilot samt flüssiger Darstellung und
ersetzt ihn als vollständiger, gemeinsam überprüfbarer PR. Kein automatischer Merge.

## Spielwelt und Fahrzeuge

- Alle 22 Kalenderstrecken erhalten die vereinbarten Umgebungen aus
  `src/data/world-environments.js`: Teppich, Holz/Schreibtisch, Stoff, Matte,
  Fliesen und Stein mit jeweils passenden, deterministisch platzierten Requisiten.
- Der vorhandene Streckenpfad, Breite, Boxenpfad, Marker und Brückenebenen bleiben
  identisch. Korea und Russland erhalten gezeichnete Holzdecks über ihren
  bisherigen Brückenpfaden. Kalender-Miniaturen verwenden dieselben hellen
  Materialfarben. Originalzeichnungen bleiben abrufbar.
- Alle 13 Teams nutzen die gemeinsamen freigegebenen Fahrzeugkonturen, ihre
  individuellen Lackierungsmuster und die Kontur-/Schattierungsbehandlung des
  Piloten im Rennen und in der Werkstatt. Werkstatt-Hotspots, Logo-Upload und
  Upgrades bleiben erhalten.
- Team-Auswahl und Dashboard-Teamfoto verwenden **wieder die bisherigen WebPs**.
  Die Showroom-Illustrationen des Piloten bleiben lediglich als alte Vorschau
  erhalten. Neue Porträts werden nicht in die ursprüngliche Team-Auswahl eingefügt.
- Die Interpolation aus dem Pilot bleibt erhalten. Keine Simulation, KI,
  Zufallsaufrufe, Attribute, Kalenderdaten, Balancing- oder Speicheränderungen.

## 92 Fahrer, keine erfundenen Stammdaten

Der aktuelle `MASTER.drivers` enthält genau 92 IDs von d001 bis d092.
`src/data/driver-identities.js` ordnet jeder ID ein festes, versioniertes
Illustrationsprofil zu. Diese erste Zuordnung wurde unabhängig von Arrayposition,
Leistung und Nationalität aus der ID abgeleitet und als explizite Daten gespeichert.
Sie wird zur Laufzeit nicht neu ausgewürfelt. Die Originaldatenbank bleibt identisch.

`driver-portraits.js` setzt transparente SVGs aus Kopf-/Kieferformen, Augen,
Brauen, Nase, Mund, zwölf Haarsilhouetten, Bartformen, Accessoires, Details,
Körper-/Armhaltung, Anzug und persönlichem Helm zusammen. Unterschiedliche
Haut-/Haarfarben sind von Nationalität unabhängig. Nationalfarben und Ländercode
erscheinen als reduzierte Aufnäher; Gesichter tragen keine Herkunftsstereotype.
Einige kleine Aufnäher sind vereinfachte nationale Farbabzeichen, keine exakten
Flaggenreproduktionen. Es gibt keine neuen Leistungs- oder Persönlichkeitswerte.

Alter und Name in den Profilen stammen aus dem aktuellen Spielstand. Die
anfänglichen Altersmerkmale berücksichtigen das Masteralter; Gesichtsidentität
bleibt danach stabil. Automatische visuelle Alterung ist nicht implementiert.
Die Anzüge lesen das aktuelle Team; Gesicht und persönlicher Helm lesen nur die
feste Fahreridentität. Vertragsfreie Fahrer erhalten einen neutralen Anzug.
Ein begrenzter SVG-Cache vermeidet wiederholte Illustrationserzeugung.

Die Vektorfiguren sind eine eigenständige Cartooninterpretation der Referenz,
keine kopierten Charaktere und keine fotorealistischen Porträts. Die Beispiele
Marco Rinaldi usw. aus dem Bild werden nicht als neue Spielfahrer angelegt.

## Ansichten und Bedienung

- Kleine anklickbare Köpfe in Fahrerwertung, Ergebnislisten, Karriereübersicht,
  Qualifying-Klassifikation und Meisterschaftsehrung/Archiv.
- Mittlere Oberkörperkarten beim eigenen Fahrerduo im Fahrermarkt.
- Porträts im Podium; die bestehende Weiter-Schaltfläche bleibt erhalten.
- Großes Profil über Klick oder Enter/Leertaste auf dem Porträt. Escape,
  Schließen-Schaltfläche oder Klick auf den Dialoghintergrund schließen es.
- Vertragswahl und Verpflichtungen verwenden weiterhin die vorhandenen Aktionen.
- Die Fahrerporträts ändern die Kameraauswahl im Live-Tower nicht.

`driver-profiles.js` erhält nur eine Lesesicht auf Fahrer und Teams. Es schreibt
keinen Spielstand und hat keinen Einfluss auf Rennabläufe. Große Profile werden
nur bei Bedarf angelegt. Kleine/mittlere/große Ansichten teilen dieselbe SVG-Quelle.

## Überprüfbare Dateien

[Gesamtvorschau](../previews/world-and-drivers/index.html): alle 22 Umgebungen,
92 Fahrer mit echten Namen/Altersangaben und ein Knopf zum Wechseln der Anzüge.
Die Wechselvorschau verändert keine Spielstände. Alle transparenten Fahrer-SVGs
liegen reproduzierbar unter `assets/drivers/dXXX.svg`.

`npm run build:world-review` exportiert die SVGs und eine eigenständige Galerie
nach `dist/carpet-grand-prix-world-and-drivers.html`. Zusammen mit
`dist/carpet-grand-prix-offline.html` liefert CI das Artefakt
`carpet-grand-prix-world-and-drivers`. ZIP entpacken und die HTML-Datei im Browser
öffnen. Die Vorschauteams der Galerie dienen nur der Illustration.

## Prüfungen und Grenzen

Die bisherigen Replay-, Speicher-, Management- und Geometrieprüfungen bleiben
aktiv. Der vollständige Originalvergleich normalisiert zusätzlich ausschließlich
Porträt-Styles/-Brücken, genau benannte Namensdarstellungen sowie rein visuelle
Brücken-/Miniaturaufrufe. Referenzdaten wurden nicht regeneriert.

Neue Tests sichern exakte Abdeckung aller 92 Master-IDs, reproduzierbare SVGs,
Identität/Helm bei Teamwechsel, neutrale Anzüge, Datenunveränderlichkeit,
Umgebungszuordnung aller 22 Strecken und Requisitenabstände. Browsertests prüfen
alle Vorschaubilder, Anzugwechsel, Tastaturprofil, unveränderten Speicher,
Vertragsauswahl und Offlineprofile zusätzlich zu den bestehenden 13-Team-Tests.

Nicht auf realen iPhones/Safari geprüft. Grafische Feinheiten der neuen
Porträtbausteine bleiben im PR sichtbar und korrigierbar. Es wurde keine neue
Langzeit-Performancegarantie abgeleitet; die Messdaten des Piloten beschreiben
nur dessen damalige Stichprobe.

## Lokaler Prüfstand

49 Modul-/Integrationstests bestanden. 66 Desktop-/Mobil-Browserfälle geprüft:
64 im vollständigen Lauf, zwei nach Anpassung der alten Vier-Autos-Erwartung
auf alle 13 Fahrzeuge erfolgreich nachgeprüft. Abschließender Originalvergleich
und Identitätsprüfungen zusätzlich erneut bestanden. Alle vier Vorschau-/
Offline-Builds erfolgreich. Keine Original-Referenzwerte geändert.

## Hochgeladene Originalporträts d001–d035

Nach dem Upload wurden alle 35 Original-PNGs über ihre Dateinamen fest den
Fahrer-IDs zugeordnet. Namen und Kürzel stammen aus der vorhandenen Datenbank
bzw. derselben Nachnamenregel wie im Timing-Tower (d001 = Marcello Robin = ROB).
Die PNG-Dateien in `assets/drivers/portraits/` bleiben unverändert erhalten.

`npm run build:uploaded-portraits` erzeugt lediglich kleinere WebP-Spielversionen
(maximal 640 × 800, Qualität 90) und Prüfsummen im Porträtmanifest. Es verändert
keine Motive oder Originale. Dieser Entwicklerbefehl benötigt ImageMagick;
Spieler und CI nutzen die bereits exportierten Dateien ohne diese Abhängigkeit.
Die 35 WebPs benötigen zusammen 2.870.382 Bytes. PNGs werden im Spiel nicht
zusätzlich heruntergeladen. Quellen und Exporte sind über SHA-256 geprüft.

`src/data/uploaded-portraits.js` enthält die feste Bild-/Kürzelzuordnung.
`CGPDriverPortraits.svg` zeigt für diese IDs das hochgeladene Motiv; kleine
Ansichten verwenden einen Kopf-Bildausschnitt, mittlere/große Ansichten den
Oberkörper. Die Motive werden bei Transfers nicht übermalt. Stattdessen zeigen
Rahmen und Beschriftung das aktuelle Team, vertragsfreie Fahrer einen neutralen
Rahmen. Die übrigen 57 Fahrer behalten ihre Vektorfiguren samt persönlichen
Helmen und Teamanzügen. `vectorSVG` und die 92 archivierten SVGs bleiben erhalten.

Alle vorhandenen Porträt-Einbindungsstellen verwenden automatisch dieselbe
Zuordnung. Große Profile zeigen zusätzlich das bereits etablierte Fahrerkürzel.
Offline-Spiel und eigenständige Galerie betten die WebPs ein. Der normale
Pages-Aufruf verwendet relative, statische Bildpfade. Team-Auswahl bleibt bei
den bisherigen Fahrzeugbildern; Rennmechanik, Save-Schema und Werte sind unverändert.

Zusätzliche Modul- und Desktop-/Mobiltests prüfen alle 35 IDs, Originalhashes,
Bildgröße/Dateibudget, unveränderte Bildquelle bei Teamwechsel/Alterung,
Kürzel ROB, aktuellen Teamrahmen, alle 57 Rückfälle und vollständiges Dekodieren
ohne Netzwerk. Echte Spielaufnahmen: [Profil](../previews/world-and-drivers/profile.png)
und [erste fünf Fahrer](../previews/world-and-drivers/drivers.png).
