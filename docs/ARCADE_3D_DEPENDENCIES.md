# Prüfung der 3D-Abhängigkeiten

14. November 2026, vor Einführung geprüft. Phase 2 verwendet **Three.js 0.187.0**
als Renderer, nicht als Fahrphysik oder Spielengine. Das Paket meldet MIT-Lizenz,
keine weiteren Laufzeitabhängigkeiten und 21.030.536 entpackte Paketbytes.
Der Großteil davon wird nicht ausgeliefert. Die initiale lokal gebündelte Auswahl
für dieses Spiel umfasst 604.280 Bytes vor HTTP-Kompression.

Nutzen: echte perspektivische Kamera, Tiefenpuffer, Meshes, Toon-Materialien,
SVG-Geometrieimport, WebGL-Ressourcen und Kontextwiederherstellung. Die Alternative
eines eigenen WebGL-Renderers würde genau diese Systeme selbst pflegen müssen.
Eine größere Komplettengine wird für ein Fahrzeug und eine Strecke nicht benötigt.
Die Entscheidung folgt dem [Vergleich aus Phase 0](arcade-phase0/RENDERING.md).

`three` ist exakt als Entwicklungsabhängigkeit gepinnt. Seine geprüfte Ausgabe
liegt zusätzlich unter `src/vendor/three.js`; Pages lädt sie lokal. Es gibt weder
CDN-Zugriff noch Paketinstallation beim Spielen. Die MIT-Lizenz steht vollständig
in `licenses/three-MIT.txt` und im ausgelieferten Bundle, auch im Offline-HTML.

Als Buildwerkzeug dient **Rolldown 1.2.16 (MIT)**. Dieselbe Version war bereits
über die Testwerkzeuge installiert und gelockt; sie wird nun ausdrücklich als
direkte Entwicklungsabhängigkeit gepinnt. Keine eigene Modulauflösung oder
Regex-Bündelung von ES-Imports. `three-entry.js` legt die Auswahl fest,
`build-arcade3d-engine.js` erzeugt eine klassische IIFE. Die Offline-Ausgabe
bettet lediglich die fertigen, expliziten Script-Dateien ein.

Prüfung: `npm audit --json` nach Installation meldete **0 bekannte Meldungen**
in allen Schweregraden. Das ist eine Abfrage zu diesem Stand, keine Zusage für
künftige Paketversionen. Die bestehende Lockdatei wurde nur für die direkten
Einträge, die neue Three-Version und die dadurch geänderte Peer-Einordnung ergänzt.

## Browser- und Ausfallverhalten

Die neue 3D-Ansicht benötigt **WebGL 2**. Ohne passenden Kontext wird dieselbe
Fahrsitzung in der vorhandenen 2D-Ansicht bedienbar. Bei Kontextverlust werden
Eingaben gelöst und das Spiel pausiert. Nach Wiederherstellung muss der Spieler
bewusst fortsetzen; alternativ wechselt er sofort in die Draufsicht.

CI/Cloud haben keine physische GPU. Nur die Testkonfiguration erlaubt ausdrücklich
Chromiums Software-WebGL (`--enable-unsafe-swiftshader`); dieser Browserparameter
wird nicht an Spieler ausgeliefert. Softwaremessungen beweisen keine Hardware-FPS.
Reale Safari-/iPhone-/GPU-Prüfungen bleiben zur Abnahme offen.

Die erzeugte Datei ist in `.gitattributes` als Fremdcode markiert. Nur für sie
ist die Git-Leerzeichenprüfung ausgenommen, weil die ursprünglichen mehrzeiligen
GLSL-Strings Leerzeichen/Tabulatoren enthalten. Sie werden nicht nachträglich
umgeschrieben; der reproduzierbare Buildvergleich bleibt bytegenau.

## Reproduzierbarkeit

- `npm run build:arcade3d-engine`: lokale Ausgabe neu erzeugen.
- `npm run check:arcade3d-engine`: Build im Speicher gegen die eingecheckte Datei
  vergleichen; Bestandteil der CI.
- `npm run build:arcade-offline`: eigenständige 2D- und 3D-Fahrtests erzeugen.
- Bei laufendem `npm run serve:test`:
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run measure:arcade3d -- --software-webgl`
  misst echte Frame-Abstände und CPU-Abgabezeiten getrennt. Kein virtuelles
  Playwright-Zeitmodell in dieser Messung. Physische GPU nicht durch Softwarewerte ersetzen.
