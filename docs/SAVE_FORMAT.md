# Speicherbereiche des aktuellen Spiels

Der Cleanup verändert keinen aktiven Validator, Schlüssel, Checkpoint oder
Datenbankhash. Kampagne, freie/Meisterschafts-POV-Spielstände und Einstellungen
bleiben getrennt. Nur der Zugang zur archivierten passiven Simulation ändert sich.

| Browser-Schlüssel | Inhalt |
| --- | --- |
| `carpet_gp_campaign_v1` | Kampagnenformat 2: Team/Fahrer, 39er-Zuordnung, Wochenende, Fortschritt und eingefrorene Ergebnisse; validierte Migration aus Format 1 |
| `carpet_gp_pov_game_v1` | POV-Format 1: freies Rennen oder 22-Rennen-Meisterschaft, Wochenende und Fahrzeugentwicklung |
| `carpet_gp_pov_preferences_v1` | Gemeinsame POV-Einstellungen einschließlich Lenkempfindlichkeit |
| `carpet_gp_pov_selection_v1` | Zuletzt bewusst gewähltes Team und Strecke |

Native `RaceWeekend`-/Session-Checkpoints werden über `pov-checkpoint.js`
validiert und pausiert wiederhergestellt. Die Kampagne verwendet ihren eigenen
Speicher und Autosave; historische Ergebnisse halten die damaligen Fahrer-
und Teamidentitäten fest. Details: [CAMPAIGN.md](CAMPAIGN.md), [POV_CAREER.md](POV_CAREER.md).

Defekte, neuere oder nicht kompatible Daten bleiben beim Laden erhalten.
Importe werden geprüft, bevor sie vorhandene Daten ersetzen. Speicherfehler
und konkurrierende Änderungen müssen über die bestehenden Schutzpfade behandelt
werden. Diese Logik ist im Cleanup bytegleich erhalten.

## Klassische Daten

`carpet_gp_v072`, `carpet_gp_preferences_v1`,
`carpet_grand_prix_workshop_logos_v1`, `carpet_gp_backup_pre_v03` und
`carpet_gp_backup_pre_v04` werden nicht gelöscht, migriert oder umgewidmet.
`archive.html` liest ausschließlich auf ausdrücklichen Exportklick
`carpet_gp_v072` und lädt dessen unveränderten Rohtext herunter. Auch beschädigte
Rohdaten werden nicht still repariert. Weitere Slots bleiben unangetastet.

Für die alte Anwendung den Tag `classic-simulation-archive-2026-11-21`
wiederherstellen und JSON über deren ursprünglichen Import öffnen. Browser,
Origin und file://-Pfade können verschiedene Speicherbereiche besitzen.
Export deshalb im bisherigen Browser/Origin vornehmen.
[Wiederherstellung](LEGACY_CLEANUP.md) · [historisches klassisches Format](history/SAVE_FORMAT_CLASSIC.md).

Die historische Stammdaten-Prüfsumme bleibt
`17f3949b0fe047658af79ff4b95de1363ce5471b13fe4f3b05457eb277135946`.
Es gibt keine automatische Übertragung in die Kampagne.
