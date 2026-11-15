# Fahrgefühl: sanftere Lenkung und Rückwärtsgang

15. November 2026. Nutzerauftrag: Die Lenkung ist zu sensibel; ein Rückwärtsgang
soll ergänzt werden. Grundlage ist das veröffentlichte `main`
`1e98252ca84a964e7a1fe42698c7c29a235b0cf8`, Entwicklungsbranch
`codex/gentle-steering-reverse`. Diese ausdrücklich gewünschte Verhaltensänderung
betrifft ausschließlich die beiden manuellen Fahrtests, nicht die klassische
Simulation oder deren gespeicherte Meisterschaften.

## Bedienung

| Eingabe | Verhalten |
| --- | --- |
| W / ↑ / Gas | Vorwärts beschleunigen; aus Rückwärtsfahrt zuerst bis null bremsen, dann vorwärts fahren |
| S / ↓ / Bremse–Rückwärts | Bei Vorwärtsfahrt bremsen; im Stand weitere 0,25 Sekunden halten, dann rückwärts fahren |
| Beide Pedale gleichzeitig | Bremsen bis null; kein Beschleunigen und keine Rückwärts-Vorwahl |
| A/D / ←/→ | Sanfter einlenken; beim Loslassen zügig zentrieren; rückwärts physikalisch passende Lenkrichtung |
| P / Fokusverlust | Pause, Eingaben lösen, angefangene Rückwärts-Vorwahl löschen |
| R / Zurücksetzen | Weiterhin ausdrücklich das Fahrzeug zurücksetzen, nicht den Gang wählen |

Die Geschwindigkeit bleibt als positiver Betrag lesbar. Die zusätzliche
Fahrstufe zeigt **D**, **N** oder **R**; in der 3D-Fahransicht steht bei
Rückwärtsfahrt außerdem `R · … km/h`. Die Bildschirmtaste und die Anleitung
benennen beide Funktionen. Die Kamera bleibt auf derselben Fahrzeugseite und
schwenkt beim Gangwechsel nicht plötzlich um 180 Grad.

## Lenkung

Die maximale Lenkstellung im Stand bleibt erhalten. Bei höherem Tempo wird
der angeforderte Lenkwinkel reduziert:

`maxSteer / (1 + 0,65 × (Tempo / 70)²)`.

Hier ist Tempo der Geschwindigkeitsbetrag in SE/s; 70 SE/s entsprechen in der
bisherigen Anzeige etwa 75,6 km/h.

Das Einlenken wird mit Faktor 4/s statt bisher 7/s geglättet. Loslassen und
Zentrieren verwenden 9/s, damit der Wagen nach einem kurzen Tipp nicht lange
weiter einlenkt. Rückwärts wird der Betrag des Tempos für die Dosierung verwendet.
Gas, normale Höchstgeschwindigkeit, Bremskraft und maximaler Grip bleiben gleich.

Ein reproduzierbarer Vergleich gegen den veröffentlichten Git-Stand prüft denselben
0,15-s-Lenktipp bei anfänglich 86,4 km/h und identischen Startkoordinaten: vorher
etwa **17,08°**, jetzt etwa **7,43°** Richtungsänderung. Das beschreibt diesen
kurzen Testfall, nicht eine pauschale Prozentangabe für sämtliche Kurven.
Die bestehenden drei gültigen Bahrain-Testfahrten funktionieren weiter, ohne
Ideallinienzwang oder Änderungen am Testfahrer.

## Rückwärtsfahrt und technische Grenzen

- Rückwärtsantrieb 20 Streckeneinheiten/s², Höchsttempo 22 SE/s, angezeigt
  höchstens etwa **24 km/h**. Vorwärtswerte bleiben unverändert.
- Vor jedem Richtungswechsel wird bis null gebremst. Kein sofortiger Sprung
  von positiver zu negativer Geschwindigkeit oder umgekehrt.
- Rollen, Schulterreibung und die vorhandene Begrenzung wirken in beiden
  Richtungen. Nach Randkontakt kann der Spieler zurück- bzw. vorwärts wegfahren.
- Der bisherige Geschwindigkeitsbetrag bleibt `speed`. Nur die flüchtige
  Fahrsitzung ergänzt `longitudinalSpeed` für die vorzeichenbehaftete Bewegung
  und `reverseHold` für die kurze Vorwahl. Keine neuen Speicherfelder, keine
  Migration, keine Änderung an Team-/Fahrer-/Streckendaten.
- Start/Ziel und Kontrollpunkte werden während tatsächlicher Rückwärtsfahrt
  nicht gezählt – auch dann nicht, wenn das rückwärts stehende Auto räumlich
  in Rennrichtung über die Linie fährt. Kurzes Rangieren macht eine Runde nicht
  automatisch ungültig; die vollständige Kontrollpunktfolge muss weiter vorwärts
  durchfahren werden. Die bestehende Offroad-Regel bleibt erhalten.

Die geänderten Scripts und das Stylesheet erhalten eine neue Versionskennung
in ihren URLs, damit Pages keine bereits zwischengespeicherte alte Steuerung
mit der neuen Anzeige mischt. Der Offline-Build bettet auch diese Dateien
weiter vollständig ein. 2D und 3D verwenden denselben Fahrkern.

## Nachweise

- 75 Modul-/Integrationstests bestanden. Acht zusätzliche Prüfungen sichern
  den Vergleich der Lenktipps, Rückwärts-Haltezeit, Richtungswechsel, Rollen,
  kombinierte Pedale, rückwärtige Begrenzung, Pause/Reset, Rundenzählung und Kamera.
- Acht neue Browserprüfungen auf Desktop und im Pixel-7-Format bestanden:
  echte S/W-Tastaturbedienung und Bildschirmtaste in beiden Ansichten,
  Fahrstufenanzeige, dosierter Lenktipp, Fokusverlust und unveränderte Browserdaten.
- Die früheren Stopp-Tests beobachten weiterhin ausdrücklich den Stillstand;
  sie lösen die Bremse nun vor der gewollten Rückwärts-Vorwahl. Keine Referenz-
  oder Spielstanddateien wurden geändert, um einen Testfehler zu verdecken.
- Zusätzlich laufen die bisherigen 2D-/3D-Rundenprüfungen und die vollständige
  CI. Offline-Builds und Pages-Projektpfade bleiben Bestandteil dieser Prüfungen.

Das persönliche Fahrgefühl braucht deine Bewertung in der Vorschau. Es werden
keine neuen Aussagen über Hardware-FPS gemacht; die offenen Gerätegrenzen aus
Phase 2 bleiben davon unabhängig.
