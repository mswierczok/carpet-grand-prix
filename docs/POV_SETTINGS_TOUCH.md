# POV-Einstellungen und mobile Bedienung

Ausgangsbasis: `47bb3382dd9fea1fd3feb9548c824a89b11d8a2b` (PR #36).
Freigegebener Umfang: kompaktere Einstellungen, schneller erreichbarer
Fahrzeug-Reset und Behebung von Textauswahl/blockierenden Touch-Eingaben.

## Oberfläche

`race.html` zeigt oben eine haftende Schnellzugriffsleiste mit „Auto zurücksetzen“
und „Einstellungen“. Der bestehende Reset bleibt einschließlich Taste R und
Phasenbeschränkung unverändert. „Neues Rennen“ bleibt unten und startet wie
bisher die gesamte Sitzung neu.

Der native modale Dialog bündelt Grafik, Draufsicht-Wechsel, Schwierigkeit und
KI-Aufholhilfe. `src/ui/race-settings.js` verwaltet Öffnen, Schließen und Fokus.
Der Anwendungscontroller pausiert beim Öffnen und leert gehaltene Eingaben.
Schließen oder Escape lässt die Fahrt pausiert; „Fortsetzen“ startet bewusst
neu. Schwierigkeit/Aufholhilfe bleiben ab Countdown gesperrt. Bestehende
Speicherregeln bleiben erhalten: Schwierigkeit in der POV-Präferenz, Aufholhilfe
für die Fahrt, Grafik wie bisher. Kein neuer Speicher und keine Veränderung
des klassischen Startbildschirms. Der Dialog ist ein eigener Baustein für die
spätere Integration in dessen Einstellungen.

## Eingaben

Der Auswahlschutz umfasst die Fahrfläche einschließlich ihrer Beschriftungen:
`user-select`, WebKit-Auswahl-/Calloutschutz und `touch-action: none`.
`selectstart`, Kontextmenü und Ziehen werden dort unterdrückt. Nicht passive
Touch-Listener verhindern zusätzlich native Gesten auf der Fahrfläche. Außerhalb
bleiben normales Scrollen, Textauswahl und Formulare möglich; die globale
Viewport-Vergrößerung wird nicht gesperrt.

`controls.js` führt jede aktive Pointer-ID mit ihrem Knopf. Freigabe außerhalb,
`pointercancel` und verlorene Pointer-Capture beenden die jeweilige Eingabe;
weitere Finger auf demselben Knopf halten dessen Anzeige aktiv. Falls Capture
nicht verfügbar ist, bleiben globale Freigabe-Listener wirksam. Pause, Reset,
Dialog, Fokusverlust, verstecktes Dokument und `pagehide` leeren die Eingaben und
geben Captures frei. Während ein Dialog offen ist, werden Fahr-/Pause-/Reset-
Tastaturkürzel und neue Fahr-Pointer ignoriert. Tastaturbelegung und Umrechnung
der Befehle bleiben erhalten. Die freien Fahrtests verwenden dieselbe Korrektur.

Physik, KI-Fahrprofile, Windschatten, Aufholhilfe, Zeitnahme, Geometrie und
Team-/Fahrerdaten werden nicht geändert. Alle drei POV-Einstiegsseiten haben
neue Cache-URLs für die geänderte Steuerung, Styles und Anwendung. Der normale
Offline-Exporter bindet den zusätzlichen Dialogbaustein automatisch ein.

## Prüfungen und Grenzen

`tests/browser/race-settings.spec.js` prüft Desktop/Mobil, native Escape- und
Fokusbedienung, Pause samt blockierten Tastenkürzeln, Reset oben, gesperrte
Renneinstellungen, klassisches Speicherobjekt, Offlinebetrieb und Überbreite.
Ein echter Chromium-Touchlauf sendet mehrere gleichzeitige Finger über CDP,
einschließlich längerem Halten, einzelnem Loslassen, Verschieben aus dem Knopf,
Abbruch, Fokusverlust und erneuter Betätigung. Ereignisschutz und fehlende
Textauswahl werden geprüft. Screenshots dokumentieren den Dialog.

Die bisherigen Browserprüfungen öffnen Einstellungen über den tatsächlichen
Dialog und schließen ihn nach der Auswahl; Aussagen über Rennen und Ergebnisse
bleiben unverändert. Zwei historische Bytevergleiche nehmen gezielt nur
`controls.js` heraus: Die ausdrücklich beauftragte Eingabekorrektur verändert
diese Datei. Alle Physik-/Daten-/Geometrievergleiche bleiben erhalten; keine
Referenzdatei wurde erneuert.

Chromium-Mobilformat und CDP-Multitouch ersetzen keinen Test auf einem echten
iPhone/iPad in Safari. Insbesondere langes Halten und schnelles Wechseln zwischen
Gas und Lenken sollten nach Veröffentlichung auf dem verwendeten Gerät geprüft
werden. Ein FPS-/Rennphysik-Umbau gehört nicht zu dieser Änderung.
