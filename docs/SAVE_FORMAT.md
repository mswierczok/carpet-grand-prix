# Speicherbereiche des aktuellen Spiels

Run-Kampagne, frühere Kampagne, freie/Meisterschafts-POV-Spielstände und
Einstellungen besitzen getrennte Speicherbereiche. Der Run erhält einen neuen
Schlüssel; bestehende Validatoren, Checkpoints und die historische Datenbank-
Prüfsumme bleiben erhalten. Die archivierte passive Simulation bleibt getrennt.

| Browser-Schlüssel | Inhalt |
| --- | --- |
| `carpet_gp_roguelite_run_v1` | Run-Hülle 1: aktiver Run und Archiv, Seed/Angebote, feste Route, Entscheidungen, Phasenstatus, native Session und vollständige Ergebnisse; keine Migration alter Kampagnenfolgen |
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

## Roguelite-Run

[Run-Format und Fortschrittsschutz](ROGUELITE_RUN_SYSTEM.md#speicherung-und-frühere-kampagne).
Die Run-Hülle speichert aktive und frühere Runs atomar unter einem neuen Schlüssel.
CAS-Prüfung verhindert konkurrierende Überschreibungen. Angebote, gewählte Fähigkeit,
Route, Ergebnisse und terminale Zustände desselben Run-IDs dürfen nicht zurückgesetzt
werden. Ein gewerteter Rennstart benötigt einen dauerhaft gesicherten Checkpoint.
Die frühere Kampagne bleibt in ihrem ursprünglichen Schlüssel unverändert erhalten.

## Fahrzeugleistung und Qualifying-Format

Neue native Checkpoints tragen `performance: {version: 2, context: "campaign" |
"historical"}` und `qualifyingFormat: "flying-one-v1"`. Neue Qualifying-Sessions
speichern zusätzlich `format: "flying-one-v1"` und einen validierten negativen
`qualifyingStartS`; sie zählen genau eine vollständige Runde nach der ersten
Zielpassage. Fehlende Kennungen bedeuten das uniforme alte Fahrzeugmodell und
die alte Auslaufrunde plus zwei schnelle Runden. Root-Speicherschlüssel und
Versionen bleiben erhalten; gemischte/neue unbekannte Unterformate werden
abgelehnt. Archivzeiten werden nicht neu berechnet.

Echte PR-55-Checkpoints und deren exakte Fortsetzung sowie die festen
Parameterpakete des Modells v1 sind automatisiert geprüft.
[V1-Vertrag und Messungen](VEHICLE_PERFORMANCE_AND_QUALIFYING.md).

V1-Kennungen bleiben exakt V1, auch beim Neustart desselben Wochenendes.
Nur ein neuer Grand Prix ohne native Session beginnt mit V2; das gilt ebenfalls
für einen älteren Run nach abgeschlossenem V1-Wochenende. Route, Fahrerwahl,
Events und Ergebnisse werden dabei nicht migriert. Ein gespeichertes Grid ist
bereits Teil seines versionierten Wochenendes. Details: [V2-Vertrag](VEHICLE_BALANCE_V2.md#speichervertrag-und-übergang).


## Optionales KI-Fahrermodell v3

Neue Kampagnenwochenenden enthalten `config.driving` mit `version: 3`, einem
gespeicherten 32-Bit-Seed und der tatsächlichen 13-Team-Startliste (`lineup`).
Der native KI-Speicher jedes Fahrzeugs speichert die passende Fahrer-ID, denselben
Seed und die Sessionart. Kampagne, Wochenende und Session müssen übereinstimmen.
Die Run-Kampagne leitet den Wochenend-Seed aus dem bereits gespeicherten Run-Seed
und der Strecke ab. Die bisherige Kampagne speichert ebenfalls den einmal
bestimmten Seed im nativen Wochenende.

Fehlendes `driving` bleibt die bisherige KI: laufende PR-56-Wochenenden werden
nicht auf Fahrerattribute umgestellt. Physikmodell und Qualifying-Format werden
unabhängig davon geprüft. Unbekannte Versionen und widersprüchliche Fahrerlisten
werden zurückgewiesen; bestehende gültige Slots und historische Zeiten bleiben
erhalten. Es gibt keine Änderung der Root-Speicherschlüssel oder Run-Map.
Details: [Fahrerpersönlichkeiten](DRIVER_PERSONALITIES_AND_DYNAMIC_RACING.md).

Die Entwicklungsfassungen `driving` v1 und v2 bleiben ebenfalls exakt fortsetzbar.
Version 2 berücksichtigt zusätzlich schnelle Kurven bei der fahrerabhängigen
Ausführung. Version 3 ergänzt langsames, physikalisch gefahrenes Umfahren stehender Fahrzeuge sowie den dafür gespeicherten Ausweichzustand. Das ist unabhängig vom unveränderten Fahrzeugmodell v1.
