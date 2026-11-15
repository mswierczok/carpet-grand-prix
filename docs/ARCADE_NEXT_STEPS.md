# Nach dem Fahrtest: vom einzelnen Auto zum Arcade-Rennen

Aktueller Nutzerauftrag: direkt das volle Feld. Umsetzung und Abnahme stehen
in [ARCADE_FULL_GRID.md](ARCADE_FULL_GRID.md); das kleine Feld wird dadurch
übersprungen. Die folgenden Run-/Inhaltspakete bleiben spätere Vorschläge.

Vorschlag vom 15. November 2026. Die Abkürzungskorrektur wird separat geprüft und
freigegeben. Die folgenden Pakete sind der weitere Entwicklungsplan, noch keine
Implementierung oder Merge-Freigabe. Der klassische Managementmodus und seine
Spielstände bleiben eigenständig.

## Nächstes Paket: kleines Bahrain-Rennen

Ein Spieler und **drei KI-Gegner** fahren drei Runden auf Bahrain. Dazu gehören
Startaufstellung, Countdown, Positionsanzeige, Zieleinlauf und Ergebnisliste.
Alle vier Fahrzeuge verwenden denselben Fahrkern. Die KI erzeugt Gas-, Brems-
und Lenkbefehle; sie wird nicht entlang der Strecke versetzt und fährt nicht
durch Seile. Bestehende Team-IDs, Farben und Fahrzeuge werden weiterverwendet.

Die erste KI muss Kurven vorausschauend anbremsen, Abstand halten, auf ein
langsameres Auto reagieren und eine freie Seite zum Überholen wählen.
Fahrzeugkontakte werden nachvollziehbar aufgelöst, ohne zufälligen Kontrollverlust
oder ein Verschieben ganzer Gruppen. Es gibt zunächst keine Items oder Upgrades.

Abnahme: mehrere vollständige Rennen, nachvollziehbare Positionen trotz
Überholmanövern und Überrundung, keine Abkürzungen, saubere Kontakte sowie
funktionierende Pause, Neustart und Offline-Ausgabe. Die Grafikleistung wird mit
mehreren sichtbaren Autos erneut gemessen. Echte Desktop-/Mobilgeräte bleiben
zusätzlich zur automatisierten Software-WebGL-Prüfung erforderlich.

## Danach: volles Feld mit 13 Fahrzeugen

Nach Abnahme des kleinen Rennens folgt ein Spieler gegen zwölf KI-Autos.
Überholen in Gruppen, enge Kurven, Startverkehr, freie Rückwärtsfahrt und das
Auflösen festgefahrener Situationen werden gezielt geprüft. Erst wenn das stabil
und flüssig funktioniert, bauen wir die Rennstruktur zum Run aus. Neue
Schwierigkeits- oder Fahrzeugwerte werden gesondert vorgeschlagen und abgestimmt.

## Anschließend: kleiner Roguelite-Run

Mehrere Rennen werden zu einem kurzen Durchlauf verbunden. Zwischen den Rennen
wählt der Spieler eine Belohnung; eine kleine Werkstatt zeigt ihre Wirkung auf
das Auto. Scheitern, erneuter Start und eine klare Abschlussübersicht gehören
zum ersten vollständigen Ablauf. Umfang, Sieg-/Niederlagenregeln und konkrete
Werte stehen vor diesem Paket zur Freigabe.

Der Arcade-Run erhält einen eigenen versionierten Speicherbereich. Alte
Meisterschaftsspielstände werden weder umgedeutet noch überschrieben. Laden,
Fortsetzen und Neustart werden vor Erweiterung des Systems abgesichert.

## Später: Fahrer, Items, Synergien und weitere Strecken

Danach folgen kleine, einzeln prüfbare Pakete für Fahrer-/Crew-Effekte, Teile,
Items, Kombinationen und Freischaltungen. Die vorhandenen Fahrer-IDs und die
hochgeladenen Originalporträts bleiben die Grundlage. Konkrete Effekte und ihre
Balance werden nicht ohne Freigabe festgelegt.

Die übrigen Strecken kommen schrittweise hinzu. Jede benötigt eine Prüfung ihrer
Seilgrenzen, Abkürzungen, KI-Linien und Kameralesbarkeit. Korea und Russland
brauchen zusätzlich tatsächliche Höhen-/Brückengeometrie. Klang, Effekte und
visuelle Details folgen mit gemessenem Leistungsbudget.

Jedes Paket bleibt ein eigener Entwicklungsbranch mit spielbarer Vorschau,
passenden Tests und ausdrücklicher Freigabe vor dem Merge.
