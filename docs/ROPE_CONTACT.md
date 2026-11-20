# Seilkontakt ohne pauschalen Stillstand

Ausgangspunkt: gemergte Lenk-Einstellung aus PR #46 (`a1e1b802`). Nutzerauftrag:
Bei leichtem Berühren des Seils weiterfahren und sich mit Gas und Lenken
befreien können, ohne jedes Mal den Rückwärtsgang zu benötigen.

## Verhalten

- Flacher Kontakt entfernt nur den Geschwindigkeitsanteil in Richtung Seil.
  Die Bewegung entlang der Begrenzung bleibt erhalten.
- Ein frontaler Aufprall bremst weiterhin ab. Bei niedriger Geschwindigkeit
  erlaubt Gas mit Lenken eine begrenzte Drehung vom Seil weg. Dasselbe gilt
  sinngemäß beim Rückwärtsfahren; dessen Vorwahl und Geschwindigkeitsgrenze bleiben.
- Ohne Lenken gibt es keine automatische Ausrichtung oder automatische Fahrt
  entlang der Rennlinie. Der Rückwärtsgang und der Fahrzeug-Reset bleiben nutzbar.
- Der dunkle Rand behält seinen bisherigen Rollwiderstand und geringeren Grip.
  Auf der freien Fahrbahn liefert die Physik exakt die bisherigen Zustände.

Die Kontaktantwort gilt für Spieler und Gegner gemeinsam. Es gibt keinen
zusätzlichen Motor-, Geschwindigkeits- oder Gripbonus. Der KI-Regler, seine
Schwierigkeiten, Windschatten, Aufholhilfe und Rundenzählung bleiben unverändert.

## Technik und Grenzen

`src/racing/rope-contact.js` ergänzt den bestehenden Physikkern als isolierter
Adapter. Er wird nach `physics.js` und vor `bridge-physics.js` geladen.
Damit bleiben Brückenebenen, Pit-Limiter und aerodynamische Adapter in ihrer
bisherigen Reihenfolge wirksam. Der ursprüngliche Physikkern wird nicht editiert.

Nur bei einem abgelehnten Seilkontakt berechnet der Adapter eine freie
Kandidatenbewegung mit denselben Kräften. Diese unsichere Position wird niemals
als Spielzustand veröffentlicht. Ein räumlich indizierter Ausschnitt der
tatsächlichen Konturen liefert die Kontaktrichtungen. Innere Inseln und offene
Trennseile werden ebenso berücksichtigt. Bei Brücken gilt ausschließlich die
aktuelle Fahrbahnebene samt deren bestehender zusätzlicher Korridorprüfung.

Die langsame Kontaktdrehung ist auf 0,9 Radiant pro Sekunde bei vollem Lenkbefehl
begrenzt und wirkt nur bei tatsächlichem Kontakt und passendem Antrieb unter
acht Streckeneinheiten pro Sekunde. Eine kleine lokale Freiraumkorrektur erlaubt
dem gedrehten Fahrzeugrechteck, am Seil vorbeizukommen. Sie ist pro Schritt
begrenzt und richtet sich nach dem überstrichenen Fahrzeugraum. Konkave Konturen
verwenden nötigenfalls eine lokale Suche gegen den echten Kollisionsprüfer.

Jede akzeptierte Bewegung einschließlich Zwischenposen wird weiterhin gegen
das vollständige Fahrzeugrechteck geprüft. Es gibt keinen Sprung zur Mittellinie,
keine gelockerten Ränder und keine Fahrt durch ein Trennseil. Ist keine sichere
Bewegung möglich, bleibt der bisherige Stopp die Rückfallebene.

Konturen, Streckenverläufe, Fahrzeugmaße und alle gespeicherten Zustandsfelder
bleiben gleich. Die Änderung führt weder ein Schadensmodell noch neue
Spielstandfelder ein. Index- und Kandidaten-Caches verwenden WeakMaps; sie
halten aufgegebene Strecken nicht im Speicher. Es gibt keine neuen Abhängigkeiten.

## Prüfung

`tests/unit/rope-contact.test.js` prüft:

- deutlichen Geschwindigkeitsunterschied gegenüber dem alten vollständigen Stopp;
- Losfahren nach frontalem Kontakt in beiden Lenkrichtungen;
- unverändertes frontales Anhalten ohne Lenken und normales Rückwärtsfahren;
- exakte Gleichheit ohne Kontakt und unveränderte Eingaben/Ausgangszustände;
- echte Streifkontakte auf allen 22 Strecken sowie oberen und unteren Brückenebenen;
- Gleiten an offenen Trennseilen in beiden Richtungen, auch rückwärts;
- Befreiung aus frontalen Kontakten an echten Rändern aller 22 Strecken, jeweils
  mit geprüftem Rechteck in jedem Physikschritt.

`tests/browser/rope-contact.spec.js` fährt tatsächlich per Tastatur bzw.
CDP-Mehrfingereingabe an das Bahrain-Seil und löst sich mit Gas und Gegenlenken.
Es werden keine Fahrzeugpositionen oder Geschwindigkeiten gesetzt. Ein weiteres
echtes WebGL-Rennen verlangt alle 13 gültigen Zieleinläufe. Dessen eine Testrunde
wird ausschließlich über die öffentliche Sitzungsoption eingestellt.

Die alte Brücken-Replayreferenz bleibt explizit ohne diesen neuen Adapter
eingefroren (`ropeContacts: false` im Test-Helfer). Aktuelle Spiel-, Kontakt- und
Kalendertests laden ihn standardmäßig. Keine historischen Fixtures werden erneuert.
Die Messwerkzeuge nehmen das neue Modul in ihre Quellprüfsummen auf.

Lokale Abnahme: 108 Unit-/Kalenderprüfungen im Hauptlauf bestanden; die
ausdrücklich isolierte historische Brückenreferenz wurde danach einzeln grün
bestätigt. Die sieben neuen Kontaktprüfungen sind auch im finalen Stand grün.
Sechs echte Desktop-/Mobil-Browserfahrten bestanden, einschließlich Offline-
Kontaktfahrten und beider Rennen mit je 13 gültigen Zieleinläufen. Die frühere
KI-Kalibrierung besteht mit null Seilkontakten und unveränderten Fahrzeuggrenzen.

Aufnahmen der tatsächlichen Kontaktfahrt: [Desktop und Mobilformat](rope-contact/).
Chromium-Emulation ersetzt keinen physischen iPhone-/Safari-Test. Aussagen zu
einer bestimmten Geräte-Bildrate werden aus diesen Prüfungen nicht abgeleitet.

```
npx vitest run tests/unit/rope-contact.test.js
npx playwright test tests/browser/rope-contact.spec.js
npm run build:arcade-offline
```
