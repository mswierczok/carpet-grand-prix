# Rennlängen: Messungen und feste Formate

Protokoll und vierstufiger Entwicklungsplan: [PHASE2.md](../PHASE2.md).

Alle 22 Referenzen stammen von einem unabhängigen vorsichtigen Tastatur-Testpiloten mit unveränderter Fahrzeugphysik. Pro Strecke: Mittel aus drei sauberen fliegenden Runden ohne Seil- oder Randkontakt; keine menschlichen Referenzzeiten. Die erste volle Runde wird verworfen. Rohwerte, ausgeschlossene Runden und Prüfsummen: [clean-reference.json](clean-reference.json).

Rundung auf 210 Sekunden einschließlich gemessener Startanfahrt, Schutzgrenzen 4–12 Runden; Bahrain ausdrücklich acht. Prognosen sind keine garantierten persönlichen Rennzeiten. Die Werte liegen bei 3:07,6–3:54,6 Minuten. Die zusätzliche heutige KI-Messung bestimmt die Rundenzahl nicht.

| Strecke | Referenz Testpilot (s) | KI allein (s) | Runden | Prognose |
| --- | ---: | ---: | ---: | ---: |
| Bahrain | 29.059 | 26.088 | 8 | 3:54.6 |
| Luxemburg | 44.583 | 43.434 | 5 | 3:45.1 |
| Kanada | 32.885 | 30.778 | 6 | 3:19.5 |
| Frankreich | 42.910 | 37.932 | 5 | 3:36.7 |
| Schweiz | 38.589 | 36.593 | 5 | 3:15.1 |
| Portugal | 29.212 | 25.850 | 7 | 3:26.6 |
| Indien | 48.525 | 43.924 | 4 | 3:16.3 |
| Brasilien | 35.371 | 30.669 | 6 | 3:34.4 |
| Südafrika | 38.935 | 35.763 | 5 | 3:16.8 |
| Korea | 41.228 | 36.059 | 5 | 3:28.5 |
| USA | 35.849 | 33.771 | 6 | 3:37.3 |
| Belgien | 28.402 | 25.812 | 7 | 3:21.0 |
| Schweden | 27.841 | 24.838 | 7 | 3:17.0 |
| Deutschland | 36.218 | 31.742 | 6 | 3:39.5 |
| Japan | 46.368 | 41.386 | 4 | 3:07.6 |
| China | 33.809 | 29.456 | 6 | 3:25.0 |
| Russland | 39.863 | 37.975 | 5 | 3:21.5 |
| Australien | 39.112 | 35.697 | 5 | 3:17.7 |
| England | 33.878 | 29.502* | 6 | 3:25.4 |
| Italien | 34.478 | 31.587 | 6 | 3:29.0 |
| Ungarn | 35.249 | 32.467 | 6 | 3:33.6 |
| Abu Dhabi | 34.827 | 32.935 | 6 | 3:31.1 |

*England: Im zusätzlichen KI-Vergleich berührte der unveränderte Pilot den Rand. Diese Zeit ist keine saubere Referenz und wird nicht zur Kalibrierung verwendet. Der unabhängige Referenzpilot hat auch dort drei vollständig saubere Runden geliefert.

Spitzengeschwindigkeit, Gas-/Bremsanteile und Kontaktzähler im Rohprotokoll beziehen sich auf den gesamten jeweiligen Messlauf. KI-Messungen verwenden analoge normale Steuerbefehle; der Referenzpilot binäre Tastaturbefehle. Unterschiedliche Strategien erlauben daraus keine Aussage über menschliches Können oder Schwierigkeitsgrade.

## Volle Rennen

Alle drei Läufe benutzen die tatsächlichen Standardformate und enden mit 13 Zieleinläufen. Das Testfahrzeug wird per normalen binären Lenk-/Pedalbefehlen gesteuert. Zeiten ab Grün, ohne den dreisekündigen Countdown.

| Strecke | Runden | Sieger | Testfahrzeug | Letzter | Kontaktanfänge mit Spielerbeteiligung | Bei 30 Hz beobachtete Seilkontakt-Frames |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| bahrain | 8 | 3:31,882 | 3:47,620 | 3:49,069 | 12 | 0 |
| france | 5 | 3:10,911 | 3:28,606 | 3:30,500 | 25 | 0 |
| russia | 5 | 3:11,168 | 3:22,340 | 3:26,441 | 32 | 0 |

Messdaten: [full-grid.json](full-grid.json). Dies sind Rennen mit Verkehr und Fahrzeugkontakten, keine sauberen Referenzrunden. Die Feldmessung und die Browserprüfung nutzen den bisherigen feedbackgesteuerten Tastaturpiloten und nicht den vorsichtigeren Referenzpiloten. Alle drei Testfahrzeug-Zeiten liegen im Zielbereich. Das beweist weder menschliches Können noch identische Dauer auf allen 22 Strecken oder spätere Schwierigkeitsgrade. Die Prognosen aller 22 und diese drei real simulierten Feldläufe sind bewusst getrennt.
