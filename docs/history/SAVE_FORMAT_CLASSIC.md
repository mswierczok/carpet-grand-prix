# Spielstandformat

| Browser-Schlüssel | Inhalt |
| --- | --- |
| `carpet_gp_v072` | Universum, Meisterschaft und laufende Sitzungen |
| `carpet_gp_preferences_v1` | Geschwindigkeit, Führendenmarkierung, KI-Debug |
| `carpet_grand_prix_workshop_logos_v1` | Eigene Logos je Team |
| `carpet_gp_backup_pre_v03`, `carpet_gp_backup_pre_v04` | Historische Migrationssicherungen |

Aktuell: `v: 1`, `databaseVersion: 6`, `calendarVersion: 22`, `balanceVersion: 4`.
Aktives Rennen: `version: 7`; Rennarchiv: `raceVersion: 9`.
Master-Prüfsumme: `17f3949b0fe047658af79ff4b95de1363ce5471b13fe4f3b05457eb277135946`.

## Datenbereiche

- Saison/Runde, Modus, Team, Strategie, Ansicht und Vorschau.
- 13 Teams: Fahrzeugwerte, Konzeptgrenzen, Konten, Entwicklungszähler.
- 92 Fahrer in `drivers`, `free`, `retired`: Identitäten, Entwicklung, Verträge, Karriere.
- Fahrer-/Teampunkte, Saisonstatistiken und Teamzugehörigkeiten je Fahrer.
- Rennarchiv, Saisonhistorie, Nachrichten, Transfers und Wartungs-/Reglementpläne.
- `qualifying`, `activeQualifying`, `activeRace`, `lastRace`, einschließlich RNG.
- Optional `legacyArchive.original` als unverändertes Altuniversum.

`save()` gleicht Teamkonto und `credits`/`research` ab. Der Validator rekonstruiert
Punkte/Karriere aus dem Archiv. Aktive Rennen werden zusätzlich geprüft; die aktive
Qualifying-Sitzung wird derzeit weniger umfassend geprüft. Das Gerüst ändert dies nicht.

Bei ungültigem Laden wird das Browser-JSON geschützt, bei Speicherfehlern zum Export
aufgefordert. JSON-Export umfasst das Universum, jedoch keine separaten Einstellungen
oder Werkstattlogos. Browserprofile/Origins besitzen getrennte Speicherbereiche.

## Altversionen und Umbau

Der Sechs-Team-Import archiviert nach Rückfrage das Original und beginnt eine neue
13-Team-Karriere; er überträgt keine alten Punkte/Identitäten. Historische Acht-Rennen-
und Balance-Migrationen sind vorhanden, aber nicht alle Altformate bestehen den aktuellen
Validator. Diese Pfade nicht ungeprüft entfernen.

Beim Strukturumbau Speicherkennung, Felder, IDs, Reihenfolge und Stammdaten-Hash
erhalten. Keine Modulinstanzen/Funktionen serialisieren; Caches nach Laden neu aufbauen.
Neue Formate brauchen einen separaten Plan für Version, Quellen, Sicherung, Migration,
Fehlerbehandlung und Rückkehrmöglichkeit sowie Nutzerfreigabe.
