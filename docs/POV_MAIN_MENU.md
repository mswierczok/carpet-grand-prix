# POV als normaler Spieleinstieg

Ausgangsbasis: `590f57a14328e9b7ab505b6f7e125705b63446ad` (PR #37).
Auftrag: POV-Einstieg mit zentralen Einstellungen und gespeicherter Team-/
Streckenauswahl; den bisherigen Simulationsmodus im normalen Einstieg ersetzen.

## Ablauf und Grenzen dieses Schritts

Die veröffentlichte Stammadresse und `index.html` führen über den kleinen
`main-entry.js`-Baustein zu `play.html`. Das neue Hauptmenü bietet Rennen,
gespeicherte Auswahl und Einstellungen. Danach werden eines der 13 Teams und
eine der 22 Strecken gewählt; `race.html` übernimmt die Auswahl in eine neue,
pausierte Startaufstellung. Dort bleiben Qualifying und Direktstart verfügbar.
Die Teamauswahl verwendet unverändert die 13 bisherigen Showroom-WebPs;
Wechsel sind per Auswahlfeld, Knöpfen, Pfeiltasten und horizontaler Wischgeste möglich.
Es wird keine neue Fahrphysik, Meisterschaft oder Fahrerzuordnung eingeführt.

„Letzte Auswahl laden“ lädt ausschließlich Team und Strecke. Laufende Rennen,
Qualifying-Ergebnisse, Startaufstellungen, Meisterschaftspunkte und Werkstatt-
Fortschritt werden noch nicht zwischen POV-Sitzungen gespeichert. Das Menü
erklärt ausdrücklich, dass ein neues Rennwochenende vorbereitet wird.

Der frühere Simulationsmodus wird nicht mehr als regulärer neuer Spielmodus
angeboten. „Bisherigen Spielstand öffnen“ führt zu `index.html?legacy=1` und
erhält die bisherige Anwendung für vorhandene Meisterschaften einschließlich
Import/Export. Ihr Code wird ausschließlich um den einzelnen externen
Weiterleitungs-Tag ergänzt. Es gibt weder automatische Migration noch Löschung
oder Verbuchung von POV-Ergebnissen in klassische Spielstände.

## Speicherung und Übergabe

`pov-preferences.js` behält `carpet_gp_pov_preferences_v1` und Version 1 bei.
Die bisherigen Datensätze mit nur `difficulty` bleiben gültig. Optionale Felder:

| Feld | Gültige Werte | Standard |
| --- | --- | --- |
| `difficulty` | beginner, normal, hard, expert | normal |
| `quality` | auto, low | auto |
| `catchup` | boolean | true |

Die bisherige `save(difficulty)`-Schnittstelle bleibt erhalten. `update(patch)`
prüft erlaubte Felder und erhält unbekannte vorhandene Felder. Neuere Versionen
werden beim Schreiben abgelehnt. Im Menü und Rennen gelten dieselben Werte;
bewusste Änderungen werden gespeichert. Die Aufholhilfe gilt damit ab diesem
Schritt auch für künftige POV-Rennen. Ihre Berechnung bleibt unverändert.
Automatische Grafikreduktion des Renderers wird nicht als Nutzerwahl gespeichert.

`pov-selection.js` speichert unter dem neuen Schlüssel
`carpet_gp_pov_selection_v1` ein Objekt mit `version: 1`, `teamId`, `trackId`.
IDs müssen im bestehenden Team-/Streckenkatalog vorhanden sein. Es werden nur
bewusste Auswahländerungen und der Start gespeichert; Laden schreibt nichts.
Defekte/unbekannte Auswahl liest die Anwendung als Vauclair/Bahrain, ohne die
Datei zu überschreiben. Ein bewusstes Speichern repariert beschädigtes JSON;
neuere Versionen werden erhalten und der Schreibversuch verständlich abgelehnt.

Der Menüstart übergibt gültige Einstellungen zusätzlich als URL-Parameter.
Dadurch bleibt die gewählte Fahrt auch bei verweigertem Storage möglich.
Explizite Parameter haben Vorrang; ungültige Team-/Strecken-/Schwierigkeits-/
Grafikwerte fallen auf die geprüfte gespeicherte Auswahl zurück. Veränderungen
im Rennen aktualisieren vorhandene Übergabeparameter, damit Neuladen keine
älteren Menüwerte über die neue Auswahl legt. Vorhandene A/B-Parameter für
Windschatten und Aufholhilfe bleiben bedienbar.

Es werden keine klassischen Schlüssel, IDs, Stamm-/Geometriedaten oder
Ergebnisformate geändert. Eine gesperrte oder volle Speicherung blockiert die
Fahrt nicht; die Oberfläche meldet, dass die Auswahl nur für diesen Start gilt.

## GitHub Pages und Offlinebetrieb

Alle Pfade bleiben relativ zum Pages-Projekt. Neue/geänderte Laufzeitdateien
haben neue Cache-URLs. Das Hauptmenü lädt keine Physik oder WebGL-Engine.

`build:arcade-offline` erzeugt zusätzlich
`carpet-grand-prix-menu-offline.html`: Styles, Module und alle Teamfahrzeugbilder
sind eingebettet. Es öffnet die beiliegende `carpet-grand-prix-race-offline.html`;
deren Hauptmenü-Link führt zurück. Das CI-Artefakt `carpet-grand-prix-arcade-preview`
enthält beide Dateien sowie die freien Fahrtests und die bisherige klassische
Ein-Datei-Ausgabe. Für Navigation zwischen Dateien müssen sie zusammen im selben
Ordner liegen. Die einzelne Renndatei bleibt auch direkt spielbar.

Die klassische `carpet-grand-prix-offline.html` enthält ausdrücklich keine
Weiterleitung und bleibt unverändert eigenständig nutzbar. Browser können
Storage für lokale Dateien unterschiedlich behandeln; URL-Übergabe sichert den
aktuellen Start auch dann ab.

## Prüfungen

Neue Modultests prüfen Speicherung ohne Seiteneffekte, gültige IDs, beschädigte/
neuere Auswahl, verweigerten Storage, alte POV-Präferenzen, unbekannte Felder
und den exakt erhaltenen früheren Spielcode. Keine Fixture wurde regeneriert.
Historische Quellvergleiche normalisieren ausschließlich den einen genehmigten
externen Einstiegstag. Bestehende Browserprüfungen öffnen das erhaltene Spiel
explizit über `?legacy=1`; ihre Simulation-/Speicher-/Bildbehauptungen bleiben.

`pov-menu.spec.js` prüft auf Desktop und Mobil: tatsächliche Stammadress-
Weiterleitung, alle 13 Bildzuordnungen, 3D-Übergabe, gemeinsamen Einstellungsstand,
Rückkehr und Neuladen, verweigerte Schreibvorgänge sowie den Zugang zum
unveränderten Altspielstand. Der Offlinefall schaltet das Netzwerk vollständig
ab und liefert ausschließlich die beiden erzeugten HTML-Dokumente aus. Weitere
Ressourcenanfragen dürfen nicht entstehen. Die vorhandenen Mehrfinger-/Dialog-
und Altspielstand-/Bildprüfungen laufen weiterhin.

Chromium-Mobilformat ersetzt keinen vollständigen Safari-/Gerätetest. Speicherung
laufender POV-Wochenenden und Anbindung an Meisterschaft/Werkstatt sind eigene
Folgeschritte; deren Ergebnis-/Fahrerzuordnung wird hier nicht vorweggenommen.
