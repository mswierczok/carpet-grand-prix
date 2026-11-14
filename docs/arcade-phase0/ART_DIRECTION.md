# Verbindliche visuelle Richtung für den neuen Modus

## Primäre Referenz und Untersuchung

Maßgeblich sind ausschließlich die **35 Original-PNGs d001–d035** unter
`assets/drivers/portraits/`, nicht deren verkleinerte WebPs. Alle 35 wurden als
Originale in einer gemeinsamen Übersicht visuell gesichtet; d001, d004, d021
und d026 zusätzlich in großer Darstellung. Dateizuordnung, Größen und SHA-256
stehen in [audit.json](audit.json). Die Originale wurden nicht geändert.

Die Dateien umfassen neun unterschiedliche Bildmaß-Paare von 1024 × 1536 bis
1301 × 1209 bzw. 1254 × 1254 und zusammen 50.540.222 Bytes. Sie enthalten
Transparenz; der schwarze Hintergrund im Bildbetrachter ist nicht als neuer
Hintergrund in die Grafiken einzubacken. Es handelt sich überwiegend um
inszenierte Halbfiguren und keine fertig animierten Spielskelett-Assets.

Die bisherigen automatischen SVG-Porträts d036–d092 und Top-Down-Fahrzeuge sind
technische Bestandsassets. Sie definieren weder Linienqualität noch Detailgrad
für neue Figuren oder 3D-Fahrzeuge. Die bisherigen Regeln aus `ART_STYLE.md`
gelten für den klassischen Modus weiter; für den neuen Modus gilt dieses
Dokument mit den Original-PNGs als höherer visueller Referenz.

## Beobachtungen an den Originalen

| Merkmal | Tatsächlich sichtbar | Konsequenz für neue Assets |
| --- | --- | --- |
| Konturen | Fast schwarze, kräftige Außenlinien mit spitzen/gerundeten Übergängen; innen dünnere Falten- und Detailstriche | Außenform lesbar halten; Strichgewicht abstufen, nicht alle Linien gleich dick |
| Formen | Große charaktervolle Köpfe, variierende Kiefer/Nasen/Brauen; überzeichnete Frisuren, erkennbare Handgesten | Silhouette und Ausdruck zuerst; keine Serie desselben Grundgesichts mit anderer Haarfarbe |
| Farbe | Warmes Haut-/Haarlicht, gebrochene weiße Anzüge, dunkle Konturen; gesättigte Farben gezielt in Accessoires und Abzeichen | Kleine, harmonische Palette je Asset; kräftige Akzente auf ruhigen Grundflächen |
| Licht | Helle Kanten und Inseln, klare Schatten unter Haaren/Kinn/Armen; meist Licht von oben/vorn, häufig links | Eine vereinbarte Hauptlichtrichtung; zwei bis drei lesbare Tonwerte statt beliebiger Glanzverläufe |
| Material | Stoff durch Faltenflächen, Haare durch große Strähnen mit feineren Highlights, Metall/Brille mit schmalen Reflexen | Material über Form und gesetzte Akzente vermitteln, nicht über fotorealistische Rauigkeit |
| Details | Bartstoppeln, Sommersprossen, Nähte, Schmuck, Handschuhe und Requisiten; selektive feine Textur | Nahansicht reichhaltig, Fernansicht auf wenige Konturen/Motive reduzieren |
| Charakter | Selbstbewusste, ruhige, strenge, verlegene oder freundliche Mimik; verschiedene Körperformen | Visuelle Persönlichkeit darf nicht automatisch einen Leistungswert oder Herkunftstyp festlegen |

Die Originale sind nicht durchgehend mathematisch flache Zweifarbenbilder:
Es gibt weiche Farbübergänge und malerische Mikrostruktur innerhalb klarer
Flächen. „Cel-Shading“ bedeutet hier eine lesbare Licht-/Schattenhierarchie,
nicht den Verzicht auf sorgfältig gemalte Akzente.

## Produktionsregeln

1. **Silhouette vor Oberfläche.** Neue Figur, Auto oder Item muss bei kleiner
   Ansicht als Form funktionieren. Fahrer und Helm sind nicht durch Text zu ersetzen.
2. **Konturhierarchie.** Als Startwert bei Darstellung in 270 px Breite etwa
   2,5–4 px Außenkontur, 1–2 px innere Linien. Dies sind Produktionsrichtwerte,
   keine vermessenen Strichbreiten sämtlicher Original-PNGs. Im 3D-Bild sichtbare
   Konturstärke begrenzen, damit entfernte Gegner nicht zu schwarzen Blöcken werden.
3. **Licht.** Warme helle Oberseiten, kühler/neutraler Formschatten, kleine
   kontrollierte Reflexe. Keine spiegelnden Chromautos oder Plastik-PBR-Optik.
4. **Palette.** Neue Assets verwenden dunkles Anthrazit, gebrochenes Elfenbein,
   gedämpfte Mitteltöne und klare Team-/Funktionsakzente. Ausgangsvorschläge:
   Kontur `#151A20`, Papier/Anzug `#EEE5D7`, Stoffschatten `#A89F99`,
   Tiefblau `#35495D`, Türkis `#249F9E`, Koralle `#E86947`, warmes Gold `#E7B459`.
   Diese Entwurfspalette ersetzt keine verbindlichen klassischen Teamfarben.
5. **Details gezielt.** Gesichter und Fahrzeug-Silhouetten erhalten Priorität.
   Spielbare Fahrfläche und kommende Kurven haben weniger kontrastreiche Textur
   als Figuren/Autos. Keine überladene Strecke aus gleich starken Details.
6. **Eigenständigkeit.** Keine kopierten Tape-to-Tape-Figuren, Uniformen oder Logos.
   Neue Sponsoren/Teamzeichen sind eigenständig. Herkunft kann als korrektes
   Abzeichen erscheinen; keine Herkunft als automatische Haut-/Charakterzuordnung.
7. **Originalschutz.** d001–d035 bleiben unverändert. Neue Perspektiven, Anzüge
   oder Animationen sind neue Assets mit eigener Freigabe, keine stillen Retuschen.

## Übertragung auf die Spielwelt

| Bereich | Neue Richtung / Abnahmekriterium |
| --- | --- |
| Figuren/Crew | Gleiche Konturen, Körper-/Gesichtsplastik, differenzierte Mimik und gemalte Stofffalten; eigene Silhouette und Rolle |
| Rennwagen | Einheitliche Formfamilie, kräftige Rad-/Flügelsilhouetten, individuelle Teamflächen, gemalte Lichtkanten, lesbare Rückansicht; keine reine generische Umfärbung |
| Strecke | Kinderzimmermaterial als Fahrgrund, sparsame Garn-/Papier-/Spielzeugbegrenzung; Kontrast auf Auto und Kurvenverlauf konzentrieren |
| Werkstatt | Illustrierte Arbeitsflächen und wenige glaubwürdige Werkzeuge; klare Kontaktflächen für spätere Interaktionen |
| Teile/Items | Handgezeichnete erkennbare Funktionssilhouetten, sparsame Seltenheitsrahmen; Beschreibung liefert Nutzen, nicht eine Flut ähnlicher Glitzersymbole |
| UI/Icons | Dunkle klare Konturen, ruhige Papier-/Stoffflächen, große lesbare Zahlen; Bremspunkt, Position und Entscheidungen haben Vorrang |
| Animation/Effekte | Kurze Gewichtsverlagerung und gezeichnete Kontakt-/Bremsreaktionen; keine Effekte, die Sicht oder Kontrolle verdecken |

Eine echte 3D-Umsetzung würde einfache Formen mit gezeichneten Texturen,
begrenzten Lichtstufen und Konturen verbinden. Die Bildprobe liefert keinen
fertigen Shader, kein animierbares Fahrzeugmesh und kein fertiges Crew-Rig.

## Statische Stilprobe dieser Phase

[Stilprobe und unveränderte Originalreferenzen](../../previews/arcade-phase0/index.html).
Die Bildprobe wurde mit dem verfügbaren Bildwerkzeug auf Basis der Originale
d001/d004/d021/d026 neu erzeugt. Sie enthält:

- einen eigenständigen Rennwagen mit türkis-/korall-/elfenbeinfarbener Studienlackierung;
- eine perspektivische Teppichkurve mit Garn, Papierpfeilen, Stiften und Bauklötzen;
- eine neue Crew-Ingenieurin in dunkler Arbeitskleidung mit Notizbuch und Werkzeug;
- eine zusätzliche Fahrzeugansicht derselben Formfamilie.

Die Studienlackierung ist **kein neues Team und keine Änderung bestehender
Teamfarben**. Die Crew-Figur wird nicht zu d093 oder einem bereits spielbaren
Teammitglied. Das Bild ist Konzeptkunst und keine laufende Kamera oder
Spielansicht. Die Originalreferenzen stehen daneben, nicht im generierten Bild.

### Sichtbare Punkte für die Abnahme

Die kräftigen Konturen, warme Schattierung und sorgfältigen Gesichts-/Material-
formen treffen die gewünschte Richtung deutlich eher als die alten SVG-Figuren.
Der Teppich ist für eine echte Rennansicht noch zu detailreich; die spätere
Spieltextur soll ruhiger sein. Das Auto nimmt in der Konzeptkomposition viel
Bildfläche ein. Für die fahrbare Chase-Kamera müssen Abstand/Höhe und Vorblick
so eingestellt werden, dass mehrere Sekunden Fahrweg sichtbar sind. Diese
Lesbarkeit ist noch nicht durch einen Fahrtest belegt.

Freigabefragen: Passt die Illustration von Auto/Umgebung zur Porträtfamilie?
Passt die Crew-Figur zur gewünschten Welt? Ist die Materialidee als Richtung
geeignet? Die technische Kamera- und Fahrgefühlabnahme erfolgt getrennt in den
folgenden Phasen.
