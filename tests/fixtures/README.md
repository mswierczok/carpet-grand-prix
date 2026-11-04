# Referenzdaten

Quelle: unveränderte `index.html` aus Commit
`ea88f1daf238431a1dbac540df7e452dd2a44e54`.
SHA-256: `b35c4fa0f2170df77597979c1a8fdf11bda9ef1fe306401b7151a6bfc1e5c4d1`.

Die JSON-Dateien sind künstliche Testspielstände aus dem Originalspiel, keine
privaten Nutzerspielstände. `npm run fixtures:generate` erzeugt sie mit dokumentierten
Zufallsfolgen und verweigert sowohl ein abweichendes Original als auch das
Überschreiben bestehender Dateien. Der Generator wird nicht in CI ausgeführt.

- `initial.json`: Saison 1 vor dem Qualifying.
- `qualified.json`: vollständiges Q1/Q2/Q3 samt Startaufstellung.
- `activeQualifying.json`: pausiertes Q1 nach 90 Schritten.
- `activeRace.json`: pausiertes Bahrain-Rennen nach 300 Schritten.
- `completedWeekend.json`: erstes Rennen beendet und genau einmal gewertet.
- `reference.json`: Herkunft, Seeds, Geometrien und gerundete Rennvergleichswerte.

Referenzen bei einem strukturellen Umbau beibehalten. Der Testadapter muss später
an die Modulstruktur angepasst werden; die erwarteten Spielwerte bleiben gleich.
Rennvergleichswerte werden auf sechs Nachkommastellen gerundet, um unbedeutende
plattformabhängige Rundungsreste nicht als Spieländerung zu behandeln.
