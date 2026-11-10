# Visuelle Grundlage – Vorschlag zur Pilotabnahme

## Gemeinsame Regeln

- Kontrollierte Cartoonzeichnung: dunkle, saubere Kontur; flächige Farben;
  eine gezielte Schattenfläche und kleine helle Kanten. Kein Fotorealismus.
- Rennwelt und Werkstattauto exakt von oben, ohne Perspektivverzerrung.
  Showroom mit einer einheitlichen räumlichen Projektion aller vier Pilotautos.
- Kontur Fahrzeuge `#26323b`, warme Umgebungskontur `#443f37`.
  Bahrain: Teppich `#c7b28f`, saubere Fasern `#d4c09c`, Garn `#f3e5bf`,
  Papier `#fff3d2`, gedämpftes Rot `#ad5147`, Blau `#526e86`, Grün `#788c66`.
- Konturstriche in der Fahrzeugquelle 2,2 Einheiten, Aufhängungen 3;
  geometrische Rad-/Karosserieformen bleiben für alle Teams gleich.
  Schattenfläche 15–24 %, kleine Lichtkanten höchstens 65 % Deckkraft.
- Teamfarben und individuelle Muster stammen aus den freigegebenen
  Team-Auswahlbildern und Rennsprites; keine bloße generische Umfärbung.
  Vauclair: Türkis/Gelb mit dunklen V-Flächen; Bellarossa: rote Flächen,
  weiße Rundungen; Panther: grün/helle Felder und rote Dreiermarkierung;
  Eisenbach: Blau/Elfenbein mit eigenständigem S-Motiv.
- Keine realen Logos. Im Showroom vier Fantasiebezeichnungen:
  VOLTIER, ORVIA, VERDAN, SYRO. Auf kleinen Rennsprites nur Flächenzeichen.
- Materialien bleiben subtil: feine Teppichfasern, weiche Kontaktschatten,
  saubere helle Fahrspuren direkt im Material statt dunklem Asphalt.
- Requisiten sparsam, außerhalb von Strecke, Boxengasse und Fahrerkorridoren.
  Kamera und Interaktion werden nicht durch Spielzeug überlagert.
- Wiederverwendung: SVG-Fahrzeuge, reine Layoutdaten, Canvas-Pfad-/Bitmapcache;
  keine zufälligen Weltänderungen oder Bilderzeugung zur Laufzeit.

## Rollout nach Stilabnahme

Die folgenden Umgebungen sind der vom Nutzer vorgeschlagene Plan, **keine
Kalenderänderung**. Nur Bahrain ist in diesem PR neu gezeichnet.

| Strecke | Material und Dekoridee | Stand |
| --- | --- | --- |
| Bahrain | Beiger Teppich, Garn, Stifte, Stoffbär, Papier/Blöcke | Pilot implementiert |
| Luxemburg | Helles Holzparkett | Geplant |
| Kanada | Großer Kinderschreibtisch | Geplant |
| Frankreich | Kariertes Bettlaken | Geplant |
| Schweiz | Grauer Teppich, Spielzeugberge | Geplant |
| Portugal | Sonnige Gartenterrasse | Geplant |
| Indien | Bunte Spielmatte | Geplant |
| Brasilien | Wohnzimmerteppich, Pflanzen | Geplant |
| Südafrika | Terrassensteinplatten | Geplant |
| Korea | Schreibtisch, Bauklotzbrücken | Geplant |
| USA | Dunkler Teppich | Geplant |
| Belgien | Holz neben Spielzeugkiste | Geplant |
| Schweden | Helle Dielen | Geplant |
| Deutschland | Technikschreibtisch, Lineale | Geplant |
| Japan | Spielmatte, Miniaturgebäude | Geplant |
| China | Gemusterte Decke | Geplant |
| Russland | Holz, große Spielzeugbrücke | Geplant |
| Australien | Warme Terrassenplatten | Geplant |
| England | Gemusterter Teppich | Geplant |
| Italien | Heller Stein/Fliesen | Geplant |
| Ungarn | Farbige Bettdecke | Geplant |
| Abu Dhabi | Sandteppich, Spielzeugarchitektur | Geplant |

Nach Freigabe zuerst drei Materialfamilien (Holz, Stoff, Stein) mit je einer
weiteren überprüfbaren Strecke ausarbeiten; anschließend die übrigen Varianten.
Bei jeder Strecke ursprüngliche Wege, Ebenen, Boxengasse, Start-/Sektorpositionen
gegen die Geometriereferenz prüfen. Neun weitere Teamillustrationen in kleinen
Gruppen mit derselben Quelle für Rennen und Werkstatt, separater Showroom-
Projektion und Vergleich zur jeweiligen freigegebenen Fotolackierung.

Pro Schritt Desktop/Mobil, Kamera, Logos/Upgrades, Offline/Pages-Projektpfad und
Replays prüfen; anschließend Vorschau und separater PR zur Freigabe.
