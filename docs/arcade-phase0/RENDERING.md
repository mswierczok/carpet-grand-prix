# Kamera- und Renderingentscheidung

## Was die aktuelle Kamera wirklich macht

`src/rendering/race-camera.js` zentriert eine Pose mit `ctx.translate` und
`ctx.scale`. Das Auto bleibt von oben sichtbar. Es gibt keine perspektivische
Verkleinerung, keinen Tiefentest, keine räumliche Fahrzeugrotation und keinen
Kamerablick über eine Kurve. Die jetzige Kamera ist ein nützlicher Phase-1-
Testblick, aber kein Ausgangspunkt, den man bloß weiter „herunterkippen“ müsste.

## Optionen für Phase 2

| Verfahren | Fahrbahn/Haarnadeln/Brücken | Illustrativer Stil | Aufwand und Risiken | Urteil |
| --- | --- | --- | --- | --- |
| Aktuelles Canvas-Top-Down | Bestehende 22 Bahnen bereits abgedeckt | Gut für 2D, keine Heckperspektive | Kleinster Eingriff, keine zusätzliche Bibliothek | Phase 1: Fahrgefühl testen |
| 2.5D-Pseudo-3D mit projizierten Straßenstreifen/Sprites | Einfach bei vorwärtslaufenden Strecken; problematisch bei enger Selbstüberlagerung, freiem Blick und Brücken | Gezeichnete Texturen passen gut | Eigene Sortierung/Clipping; Autos aus mehreren Blickwinkeln; Sonderfälle bei Drehen/Abkommen | Für diese kurvigen Originalstrecken nicht bevorzugt |
| Eigenes WebGL ohne Engine | Echte Tiefe und beliebige Blickrichtung | Toon-Shader möglich | Matrizen, Meshes, Shader, Ressourcenverwaltung, Kontextverlust und Tests selbst pflegen | Technisch möglich, für dieses Projekt hoher Pflegeaufwand |
| Leichtes 3D mit Three.js als Renderbibliothek | Tiefenpuffer, räumliche Fahrbahn und getrennte Brückenflächen | Gezeichnete Texturen, Cel-Shading, Konturen und billige Kontaktschatten möglich | Neue geprüfte Abhängigkeit; Asset-/GPU-Budgets nötig; garantiert noch keinen guten Stil | Bevorzugter Kandidat für Phase 2 |
| Größere Komplettengine, z. B. Babylon.js | Umfassende 3D-Funktionen | Toon-Stil herstellbar | Mehr Systeme als für den ersten Prototyp nötig; größerer Integrations-/Buildumfang | Vorerst nicht erforderlich |

**Empfehlung:** Phase 1 bleibt ein kleiner Canvas-Fahrtest. Für Phase 2 bereiten
wir die Schnittstellen für eine echte perspektivische 3D-Darstellung vor;
Three.js ist der bevorzugte Kandidat, nicht bereits installiert oder verbindlich
freigegeben. Ein Modell allein erzeugt noch nicht den gewünschten Stil.

### Abhängigkeitsprüfung vor Einführung

Three.js ist eine Renderingbibliothek, keine Fahrphysik. Nutzen wären Kamera,
Geometrie, Materialien, Tiefentest und Ressourcenverwaltung. Vorgesehen ist eine
lokal gebündelte, fest versionierte Ausgabe, kein CDN zur Laufzeit. Die
[MIT-Lizenz](https://github.com/mrdoob/three.js/blob/dev/LICENSE) und die gewählte
konkrete Version einschließlich weiterer Laufzeit-/Buildabhängigkeiten müssen
vor Installation geprüft und dokumentiert werden. In Phase 0 wurde keine neue
Abhängigkeit hinzugefügt. Aktuelle Paketgrößen und Browserunterstützung einer
konkreten Version wurden hier nicht gemessen.

Die spätere Entscheidung erfordert eine kleine technische Probe mit dem echten
Bahrain-Pfad. Eine flache Demo auf gerader Strecke reicht nicht. Prüfen: enge
Kurven, Blick gegen die Fahrtrichtung, Bahn verlassen/wiederfinden, Kreuzung,
Korea/Russland mit Ebenen, WebGL-Kontextverlust, langsame Geräte und Offline-Build.
Sollten Last-/Stilziele nicht erreicht werden, bleibt die technische Wahl offen.

## Geplante Schnittstellen

- `physics.js` liefert eine Darstellungspose; es importiert keinen Renderer.
- `camera3d.js` berechnet Kamera und Vorblick aus Spielerpose, Geschwindigkeit
  und optionalem Strecken-Vorblick. Es schreibt nicht in den Fahrzustand.
- `vehicles3d.js` stellt gemeinsame Wagengeometrie, Teamlackierung und Räder dar.
- `tracks3d.js` baut Fahrfläche, Begrenzung und spätere Höhenprofile aus dem
  freigegebenen Streckenmodell, nicht aus einer frei erfundenen neuen Route.
- Die Darstellungszeit interpoliert zwei Physikzustände; Eingaben bleiben an die
  festen Simulationsschritte gebunden. Kamera und Auto lesen denselben Zeitpunkt.

Die Kamera fährt leicht erhöht hinter dem Auto. Auf Geraden soll genügend
Bremsweg sichtbar sein; in Kurven darf ein gefilterter Vorblick helfen. Wechsel
von +π nach −π werden winkelrichtig geglättet. Rückwärtsbewegung, Stillstand
und bewusster Reset brauchen eigene Regeln, damit die Kamera nicht flippt.
Kein starkes Head-Bobbing, keine aggressiven Zoomsprünge und kein dauerndes
Bildwackeln als Ersatz für Geschwindigkeitsgefühl.

## Vorgeschlagene Leistungsziele – noch keine Messwerte

- Ziel 60 dargestellte Bilder/s auf einem benannten Desktop-Referenzgerät;
  mindestens eine begründete 30-FPS-Qualitätsstufe auf dem gewählten Mobilgerät.
- Physikbudget und p95-Frametime separat erfassen; Ziel im 60-FPS-Profil unter
  16,7 ms Gesamtbildzeit, nicht nur eine gemessene JavaScript-Callbackdauer.
- Begrenzte Pixeldichte, Texturatlas, wiederverwendete Meshes, wenige Material-
  und Draw-Call-Wechsel. Einfache Schatten statt vieler Echtzeitlichter.
- Requisiten zusammenfassen und außerhalb des Sichtfelds ausblenden; Fahrbahn
  und Gegner müssen bis zum relevanten Brems-/Überholbereich lesbar bleiben.
- Keine großen PNGs pro Bild laden/erzeugen; Originalporträts archivieren,
  passende komprimierte Spielassets vorab exportieren.

Diese Zahlen sind Abnahmevorschläge für die technische Probe, keine Zusage über
bestehende oder kommende 3D-Performance. Die alten 2D-Benchmarkwerte dürfen nicht
als 3D-Nachweis verwendet werden.
