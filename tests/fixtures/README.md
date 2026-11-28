# Referenzdaten

Die bisherigen Dateien `initial`, `qualified`, `activeQualifying`, `activeRace`,
`completedWeekend` und `reference` stammen aus der unveränderten ursprünglichen
`index.html` (`ea88f1daf238431a1dbac540df7e452dd2a44e54`, SHA-256
`b35c4fa0f2170df77597979c1a8fdf11bda9ef1fe306401b7151a6bfc1e5c4d1`).
Sie sind künstliche Teststände, keine privaten Nutzerspielstände. Ihre Bytes
bleiben beim Cleanup unverändert. Aktuelle Tests verwenden sie als historische
Beispiele und Speicher-Sentinels; sie starten daraus keine passive Simulation.
Der frühere Generator und die zugehörige Saisonprüfung befinden sich nur noch
im [Git-Archiv](../../docs/LEGACY_CLEANUP.md).

`historical-invariants.json` wurde vor der Entfernung aus dem geprüften Stand
`fc338593c33c8e25063fc5ffd22511f7ded9b3c9` erfasst. Es hält exakte SHA-256-Werte
aller 22 ursprünglichen Geometrie-/Bogenlängen-/Boxenarrays, Breiten, Längen,
Sektoren sowie bisherige Werkstattkosten und Entwicklungszuwächse fest. Die
Herkunftsprüfung schützt den Ausgangs-HTML-Hash. Damit bleiben diese relevanten
Aussagen ohne den alten Spieladapter überprüfbar.

Referenzen nicht automatisch in CI erzeugen und nicht zum Beseitigen roter
Tests überschreiben. Änderungen brauchen einen belegten Ausgangsstand und
bei geändertem Spielverhalten eine ausdrückliche Freigabe.

Die Ergänzungen `driver-pr56-legacy.json` und `driver-v1/v2/v3-checkpoints.json`
sind neue, getrennte native Renn- und Qualifying-Referenzen. Sie wurden mit normalen
Fahrbefehlen aus unveränderten, im jeweiligen JSON dokumentierten Commits erfasst.
Die Quellhashes und die exakten Folgezustände werden geprüft. Kein vorhandenes
Referenzfile wurde dafür ersetzt. Die Generatoren `capture-driver-legacy-fixtures.js`
und `capture-driver-profile-reference.js` schreiben ausschließlich nach `dist/`;
die manuelle Übernahme neuer, eindeutig benannter Referenzen bleibt sichtbar.
