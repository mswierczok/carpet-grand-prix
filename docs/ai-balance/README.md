# KI-Abstimmung: Messprotokoll Phase 2.2

Methodik, Parameter, Speicherregeln und Grenzen: [AI_DIFFICULTY.md](../AI_DIFFICULTY.md).

Alle Zeiten stammen aus identischer unveränderter Fahrzeugphysik, normalen Steuerbefehlen und isolierten Fahrten. Vier vollständige Runden pro Lauf; Mittelwert der drei fliegenden Runden nach der Einfahrphase. Die Tastaturreferenz und alte KI sind auf den veröffentlichten Stand von Phase 2.1 eingefroren. **Keine menschlichen Referenzfahrten und keine garantierten Prozentabstände für jede Strecke.**

## Bahrain-Kalibrierung

| Fahrer | Sekunden/Runde | Änderung zur Tastaturreferenz |
| --- | ---: | ---: |
| keyboard-reference | 25.597 | +0.00 % |
| published-ai | 26.088 | +1.92 % |
| beginner | 27.321 | +6.74 % |
| normal | 26.109 | +2.00 % |
| hard | 25.491 | -0.41 % |
| expert | 25.044 | -2.16 % |

Die technischen Bahrain-Zielbereiche werden erreicht. Andere Strecken haben andere Kurvenanteile; besonders bei beinahe Vollgasrunden sind die Abstände kleiner. Neue manuelle Referenzfahrten bleiben für eine endgültige menschliche Kalibrierung erforderlich. Alle neuen KI-Läufe erreichen das gemeinsame Limit von 118,8 km/h.

## Repräsentative Strecken

| Strecke | Tastaturreferenz | Alte KI | Anfänger | Normal | Schwer | Experte |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| bahrain | 25.597 | 26.088 | 27.321 | 26.109 | 25.491 | 25.044 |
| france | 36.908* | 37.932 | 39.289 | 37.120 | 35.811 | 35.618 |
| portugal | 26.240 | 25.850 | 26.933 | 25.467 | 24.967 | 24.768 |
| japan | 41.563 | 41.386 | 42.980 | 40.722 | 39.834 | 39.142 |
| russia | 37.711 | 37.975 | 38.501 | 37.767 | 37.646 | 37.497 |

*Die eingefrorene Tastaturreferenz berührt in Frankreich für sechs Physikschritte (0,05 s) den Rand. Die Zeit ist entsprechend gekennzeichnet; die neuen KI-Läufe auf allen fünf Strecken sind rand- und seilkontaktfrei. Abstände zur automatisierten Referenz sind Balancing-Indikatoren, kein Beleg für menschliche Schwierigkeitsstufen.

128 gemeinsame räumliche Abschnitte enthalten Tempo, Mindesttempo, Brems- und Gasanteil. Die Definition dieser Abschnitte ist für alle Fahrer gleich. Rohwerte, Sektorzeiten und verwendete Parameter: [representative.json](representative.json).

## Vollständiger Kalender

| Strecke | Normal | Schwer | Experte | Rand-/Seilkontakt |
| --- | ---: | ---: | ---: | --- |
| bahrain | 26.109 | 25.491 | 25.044 | keiner |
| luxembourg | 43.188 | 43.061 | 42.736 | keiner |
| canada | 30.443 | 29.989 | 29.633 | keiner |
| france | 37.120 | 35.811 | 35.618 | keiner |
| switzerland | 36.232 | 35.836 | 35.690 | keiner |
| portugal | 25.467 | 24.967 | 24.768 | keiner |
| india | 43.267 | 42.443 | 41.839 | keiner |
| brazil | 29.877 | 29.439 | 29.233 | keiner |
| south-africa | 34.554 | 34.022 | 33.633 | keiner |
| korea | 35.136 | 34.298 | 33.890 | keiner |
| usa | 33.751 | 33.410 | 33.067 | keiner |
| belgium | 25.166 | 24.700 | 24.494 | keiner |
| sweden | 24.490 | 23.933 | 23.437 | keiner |
| germany | 30.398 | 30.063 | 30.034 | keiner |
| japan | 40.722 | 39.834 | 39.142 | keiner |
| china | 29.494 | 28.603 | 28.444 | keiner |
| russia | 37.767 | 37.646 | 37.497 | keiner |
| australia | 35.047 | 34.978 | 34.967 | keiner |
| england | 28.437 | 27.494 | 27.367 | keiner |
| italy | 31.164 | 30.555 | 30.280 | keiner |
| hungary | 31.387 | 31.067 | 30.748 | keiner |
| abu-dhabi | 32.796 | 32.520 | 32.367 | keiner |

**66 Kalenderläufe, jeweils vier vollständige Runden: kein Rand- oder Seilkontakt. In allen 22 Mittelwertvergleichen ist Schwer schneller als Normal und Experte schneller als Schwer.** Das ist ein freier Fahrvergleich; Verkehr, menschliche Fahrfehler und Zweikämpfe verändern Rennzeiten. Rohwerte und Quellprüfsummen: [catalog.json](catalog.json).

Die bestehenden Rundenzahlen aus Phase 2.1 bleiben zum Vergleich unverändert. Neue KI-Zeiten können auf einzelnen Strecken kürzere Rennen ergeben; nach der menschlichen Abnahme sollte die Rundentabelle erneut gegen tatsächliche Feldrennen bewertet werden.

## Bekannte Grenzen

Die sauberen Fahrtests ersetzen keine Verkehrsrennen. Zusätzlich prüfen die Browserfälle Anfänger in Frankreich, Schwer in Russland und Experte in Bahrain bis zu 13 echten Zieleinläufen. Die bestehende Normal-Matrix fährt weiterhin alle 22 Strecken mit vollem Feld. Die Diagnose ist über `race.html?balance=1` erreichbar. Software-WebGL und beschleunigte Browseruhren sind keine Geräte-FPS-Abnahme. Windschatten und Aufholbonus sind nicht implementiert.
