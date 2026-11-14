# Carpet Grand Prix 2.0 – Phase 0

Stand: 14. November 2026. Ausgangsbasis ist das veröffentlichte `main`
`194f6e491dcd91d43f7d5d417008a3d53d0e962b`.
Die ursprüngliche Phase-0-Lieferung enthält ausschließlich Untersuchung, Entwurf und eine statische
Stilprobe. Er enthält noch keine manuelle Fahrsteuerung, neue Rennkamera,
Gegner oder Roguelite-Funktionen. Der klassische Spielcode und alle Originalbilder
bleiben bytegenau erhalten. Der getrennte PR #13 für Brustporträts ist nicht
Bestandteil dieser Untersuchung.

Fortsetzung nach Nutzerfreigabe: [Phase 1 – der getrennte Fahrtest](../ARCADE_PHASE1.md).
Die folgenden Untersuchungen beschreiben weiterhin den Stand vor dieser Implementierung.

## Ergebnis in verständlichem Deutsch

Deine vorgeschlagene Struktur passt für den **neuen Modus neben dem klassischen
Spiel**. Wir können Strecken, Teams und Fahrer weiterverwenden. Der entscheidende
Umbau betrifft die Bewegung: Bisher fährt ein Auto entlang einer vorgegebenen
Linie mit seitlichem Versatz. Ein selbst gelenktes Auto braucht eine eigene
Position, Fahrtrichtung und Geschwindigkeit. Deshalb ergänzen wir einen kleinen
Arcade-Fahrkern, statt den klassischen Rennkern mit Tastatureingaben zu verbiegen.

Für den ersten Fahrtest empfehle ich Bahrain, ein Fahrzeug und die bekannte
Ansicht von oben. Damit beurteilen wir Gas, Bremse, Lenkung und Kurvengefühl.
Die Kamera hinter dem Auto folgt erst danach. Dafür ist echtes, einfaches 3D
mit gezeichneten Materialien die bevorzugte Richtung; die bestehende Kamera
vergrößert nur die Draufsicht und bietet noch keine räumliche Perspektive.

Die 35 Original-PNGs sind ab jetzt die primäre visuelle Referenz für den neuen
Modus. Die bisherigen automatischen SVG-Figuren und Autos sind keine gleichwertige
Qualitätsvorlage. Die neue Stilprobe zeigt einen möglichen Transfer der
Illustrationssprache auf Auto, Teppichumgebung und Crew. Sie ist Konzeptkunst,
kein Screenshot eines bereits fahrbaren oder gemessenen 3D-Spiels.

## Unterlagen

1. [Bestandsaufnahme und Wiederverwendung](TECHNIK.md)
2. [Kamera-/Renderingvergleich](RENDERING.md)
3. [Verbindliche Art Direction aus den 35 Originalen](ART_DIRECTION.md)
4. [Konkreter Plan für Phase 1, Struktur und Abnahmekriterien](PHASE1_PLAN.md)
5. [Überprüfbare Stilprobe und Originalreferenzen](../../previews/arcade-phase0/index.html)
6. [Prüfsummen und tatsächliche Inventarzahlen](audit.json)

## Was feststeht und was noch offen ist

| Status | Ergebnis |
| --- | --- |
| Im Code geprüft | 13 Teams, 92 Fahrer, 22 Strecken, 26 klassische Rennwagen; fester Schritt 1/30 s |
| Visuell geprüft | Alle 35 Original-PNGs; Details zusätzlich an d001/d004/d021/d026 |
| Bestehende Funktion | Klassische 2D-Kamera, Renderer, Physik/KI und Spielstände |
| Entwurf | Getrennter Arcade-Fahrkern, Eingabe-Schnittstelle, Datenadapter, neue Speicherbereiche |
| Empfehlung | Phase 1 mit Canvas-Draufsicht; Phase 2 bevorzugt räumliches WebGL-Rendering |
| Konzeptbild | Auto, Teppichumgebung und neue Crew-Figur im Stil der Originale |
| Noch nicht geprüft | Neues Fahrgefühl, 3D-FPS, reale Mobilgeräte, 13 Arcade-Fahrzeuge, Synergien |

Keine ausgedachten Leistungswerte, Speicherfelder oder Fahrer werden ins Spiel
übernommen. Die gezeichnete Crew-Person ist ausschließlich eine Assetstudie,
kein neuer Eintrag in den 92 Fahrern.

## Entscheidung vor Phase 1

Zur Freigabe stehen die technische Trennung, der vorgeschlagene erste Fahrtest
und die visuelle Richtung. Phase 1 beginnt erst nach deiner ausdrücklichen
Freigabe. Spätere Phasen und ein Merge dieses Branches sind damit nicht
automatisch freigegeben.

## Prüfung dieses Entwicklungsstands

52 bestehende Modul-/Integrationstests bestanden; Vergleichsseite auf Desktop-
und Mobilformat samt 35 Originalbildern, Links und Vergrößerung geprüft.
Der Spielcode und die Original-PNGs sind unverändert gegenüber `main`.
Befehle und Grenzen: [VALIDATION.md](VALIDATION.md).
