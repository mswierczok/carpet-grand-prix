# Entwicklung und Freigabe

1. Nutzer beschreibt ein Ziel in natürlicher Sprache. Entwickler ermittelt Systeme
   und benennt notwendige Mechanik-/Balancingänderungen vor der Umsetzung.
2. Aktuellen freigegebenen `main` prüfen und eigenen Entwicklungszweig anlegen.
3. Kleine Umsetzung mit passenden Tests vorbereiten.
4. PR mit Problem, Verhalten, Prüfungen und bekannten Grenzen erstellen.
5. Verständliches Ergebnis zeigen; ausdrückliche Freigabe des konkreten PR abwarten.
6. Erst danach zusammenführen, Pages-Auslieferung und Start/Laden prüfen.

Diese Vorbereitung autorisiert weder Merge noch vollständigen Modulumbau.
Kein Auto-Merge; keine Produktionsveröffentlichung aus Entwicklungszweigen.

## Wiederherstellung

Vor Release Referenz und JSON-Testexport sichern. Bei Problemen per Revert-PR zur
freigegebenen Version zurückkehren; kein Force-Push auf `main`. Ein Code-Revert macht
ein neues Spielstandformat nicht automatisch rückgängig. Daher beim Umbau Format erhalten.

Der Referenzcommit ist dauerhaft auffindbar. Ein zusätzlicher Tag und Branch-Schutz
sind mögliche Ergänzungen; diese Vorbereitung ändert keine Repository-Einstellungen.
CI ist erst mit konfiguriertem Branch-Schutz technisch verpflichtend. Bis dahin
gilt die dokumentierte Freigaberegel.
