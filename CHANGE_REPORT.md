# Änderungsbericht

Stand: 7. September 2026. Bezug: fachliche Zielvorgaben für den FR7-Quellcodeprüfstand. Ausgangspunkt war die lokal erhaltene Webversion, mit React und TypeScript.

## Fachliche Änderungen

| Thema | vorher | nachher | Datei | Begründung |
|---|---|---|---|---|
| Hauptgewichte | Gewichte über Oberfläche veränderbar | fest 0,35/0,25/0,25/0,15; abweichende Eingaben abgewiesen | src/config/scoringConfig.ts; src/domain/scoring/indicators.ts | unveränderte fachliche Vorgabe |
| Wirtschaftlichkeit | Marge, Einsparung und Kosteneffizienz | Deckungsbeitrag 0,40; Erlös 0,25; Prozesskosten 0,20; Transportkosten 0,15 | src/domain/scoring/ranking.ts | vier getrennte Indikatoren |
| Referenzwerte | marginTarget, savingTarget, distanceReferenceKm und co2ReferenceKgPerT | keine Verwendung im aktuellen Rechenkern | src/config/scoringConfig.ts | keine unbelegten allgemeinen Normalisierungsziele |
| Ökologie | Distanz und Ressourceneffizienz falsch gewichtet | CO₂ 0,45; Ressourceneffizienz 0,30; Distanz 0,25 | src/config/scoringConfig.ts | korrigierte Zuordnung |
| Distanz | linear gegen 600 km normalisiert | lückenlose dokumentierte Stufenskala; oberhalb 1200 km 10 Punkte | src/domain/scoring/indicators.ts | dokumentierte Penalty Function |
| Emissionen und Transportkosten | technische Werte als normale Modellparameter | drei explizite Demo-Proxys; UI-Hinweis und Prüflog | src/config/demoAssumptions.ts; src/domain/matching/chains.ts | fehlende empirische Herleitung sichtbar |
| Realisierbarkeit | pauschaler konstanter Anteil und abweichende Gewichte | Mengenfit, Qualitätsfit, Verfügbarkeit, Reinheitsreserve, Compliance gemäß Vorgabe | src/domain/scoring/ranking.ts | keine verdeckte Pauschalaufwertung |
| Reinheitsreserve | kein separat konfigurierbarer Indikator | eigene Funktion; vier offene numerische Schwellen | src/domain/scoring/indicators.ts; src/config/scoringConfig.ts | keine erfundenen Grenzen |
| Compliance | konstanter Term innerhalb einer Mischformel | Hard Constraint; 100 Punkte nur bei bestandenen Freigaben | src/domain/scoring/ranking.ts | Zulässigkeit geht vor Priorisierung |
| Deal-Qualität | abweichende Teilgewichte | Preis 0,35; Partner 0,30; Abschlussindex 0,20; Deckungsbeitrag 0,15 | src/config/scoringConfig.ts | fachliche Zielstruktur |
| Preisattraktivität | uneinheitliche Referenz-/Zielpreislogik | Preisvorteil gegenüber Referenzpreis; exakte Ordinalskala | src/domain/scoring/indicators.ts | keine zweite versteckte Preisformel |
| Partnerverlässlichkeit | numerische Zwischenwerte aus Szenario | nur explizite qualitative Kategorien; historische Werte nicht umgedeutet | src/types/model.ts; src/domain/matching/chains.ts | keine erfundenen Zwischenscores |
| Hard Constraints | mit Berechnung vermischte Prüfungen | vorgeschaltete, protokollierte Ausschlüsse; keine Scores für unzulässige Ketten | src/domain/scoring/ranking.ts | nachvollziehbare Trennung |
| Normalisierung | absolute Referenzen | Nutzen-/Kosten-Min-Max innerhalb zulässiger Kandidaten, je Tonne | src/domain/scoring/indicators.ts | explizite Vergleichsbasis ohne frei gesetzte Referenz |
| Gleiche Werte | uneindeutiger Grenzfall | Teilscore null; keine Division durch null und keine Ersatzgewichtung | src/domain/scoring/indicators.ts | methodisch offener Fall bleibt sichtbar |
| Mengen | Gefahr verschiedener Eingabeeinheiten | g/kg/t in Tonnen; Kapazität begrenzt verarbeitbare Menge | src/domain/matching/chains.ts | einheitliche Rechenbasis |
| Reihenfolge | Gefahr von Rangvergabe trotz fehlender Bewertung | ausschließlich vollständige Scores gerankt; stabile ID bei Gleichstand | src/domain/scoring/ranking.ts | nachvollziehbare Priorisierung |

## Technische Änderungen

| Thema | vorher | nachher | Datei | Begründung |
|---|---|---|---|---|
| Modulstruktur | Rechenkern, Konfiguration und UI eng gekoppelt | domain, config, data/demo, components, storage, types | src/ | unabhängige Tests des Rechenkerns |
| UI-Einstieg | große App-Datei mit Domänenhilfen | schlanker App-Einstieg; Oberfläche unter components | src/main.tsx; src/components/workspace.tsx | klare Zuständigkeiten |
| Demo-Daten | Register und Beispieltexte verteilt | JSON-Register, Routen und CMRS-Beispiele getrennt von Logik | src/data/demo/ | synthetische Daten identifizierbar |
| Vokabulare | Listen in der Oberfläche | zentrale Regionen, Materialklassen und Zuordnungen | src/config/vocabularies.ts | keine mehrfach gepflegten Listen |
| Browserpersistenz | alte Schlüssel und Gewichtedaten | neue Schema-Version; zentrale Schlüssel; kontrolliertes Laden | src/config/storage.ts; src/storage/browser.ts | keine stille Altstandmigration |
| Import | begrenzte Strukturprüfung | Typ-, Zahlen-, ID-, Routen-, Kategorie- und Schwellenprüfung | src/domain/validation/dataset.ts | fehlerhafte Daten vor Übernahme abweisen |
| Dateilesen | unbehandelter Lesefehler möglich | Fehlermeldung ohne Registeränderung | src/components/dataset-editor.tsx | bestehende Daten erhalten |
| Ketten-ID | Trennzeichen potenziell in IDs möglich | Trennzeichen innerhalb der Komponenten zusätzlich kodiert | src/domain/matching/chains.ts | eindeutige Kombinationen |
| Basispfad | konkrete Projektpfade | Vite-Basisvariable und Medienhelper | src/config/deployment.ts; vite.config.ts | kein festes Repositorypräfix in Fachlogik |
| Typen und Imports | Altlasten und generierte Referenzen | Strict-Modus, ungenutzte Symbole verboten, organisierte Imports | tsconfig.json; src/ | statische Prüfung |
| Datenbankvorbereitung | ungenutzte Drizzle-/D1-Dateien | nicht Bestandteil des aktuellen Pakets; unnötige direkte Abhängigkeiten entfernt | package.json; package-lock.json | keine vorgetäuschte persistente Serverdatenbank |
| Tests | Tests der alten Formel | neuer Zielmodell-Testbestand mit Grenz- und Regressionstests | tests/reviewed.test.mjs; tests/validation-reviewed.test.mjs | alte Erwartungen nicht mit neuer Formel vermischen |
| Beschreibung | knappe und teilweise veraltete Implementierungsangaben | tatsächliche Webarchitektur, Rechenweg, Grenzen und Startbefehle | README.md | prüfbare technische Beschreibung |
| Unbekannte Parameter | nicht vollständig inventarisiert | zentrale Statustabelle plus sämtliche Demo-Registerwerte | UNRESOLVED_ASSUMPTIONS.md | keine verschwiegenen Szenariowerte |

## Umfang und Abgrenzung

Das aktuelle Paket enthält keine zweite veraltete Scoringimplementierung. Die bisherigen Verzeichnisse `lib/`, `components/`, `data/`, `db/`, `drizzle/`, `examples/` und die ersetzten Tests verbleiben im gesicherten Ausgangsordner außerhalb dieses Pakets. Benötigte Bestandteile wurden in die neue Struktur überführt. Die aktuelle Anwendung verwendet ausschließlich diese neue Struktur.

Die bestehende RQ1-Demonstration bleibt erhalten; ihre Heuristik ist zentral benannt und als unkalibriert ausgewiesen. Historische Extraktionsmesswerte werden nicht als neue Evaluation präsentiert. Eine neue RQ1-Studie, Team-Integration oder Aktualisierung der vorhandenen Word-Dokumentation ist nicht Gegenstand dieses Quellcodeprüfstands. Die Veröffentlichung erfolgt nun als statischer Pages-Build.

## Abschlussprüfung

Die tatsächlichen Prüfergebnisse werden in `VERIFICATION.md` festgehalten. Ein grüner Build oder Testbericht beseitigt keine fachlichen Datenlücken. Insbesondere sind Reinheitsgrenzen, Partnerkategorien, reale Kosten- und Emissionsfaktoren sowie empirische Validierung weiterhin offen. Im unverändert übernommenen Szenario ist deshalb ein fehlender Gesamtrang das beabsichtigte, transparente Ergebnis.

## Finalisierung für GitHub Pages

| Thema | vorher | nachher | Datei | Begründung |
|---|---|---|---|---|
| Hosting | vinext mit Serveradapter | statischer React-/Vite-Build | index.html; src/main.tsx; vite.config.ts | GitHub Pages stellt keine Serverlaufzeit bereit |
| Veröffentlichte Dateien | generierter Altbuild im main-Branch | vollständiger Sourcecode; Build nur Actions-Artefakt | .github/workflows/pages.yml | reproduzierbarer Quellstand ohne eingecheckte Buildreste |
| Basispfad | nicht end-to-end geprüft | Workflowwert aus Repositoryname; Hash-Navigation | vite.config.ts; scripts/browser-check.mjs | Reload und Assets unter Projektpfad |
| Abhängigkeiten | ungenutzte Server-/Worker-Pakete | entfernt; Playwright als Testabhängigkeit | package.json; package-lock.json | nur tatsächlich genutzte Laufzeiten |
| CMRS-Speicherung | neue Records nur im laufenden Zustand | CMRS-Register wird lokal persistiert | src/components/workspace.tsx | Reload darf erfasste Records nicht verlieren |
| Akzeptanzprüfung | zusätzlicher Browserlauf blockiert | automatisierte Desktop-/Mobiltests im Repository und Workflow | scripts/browser-check.mjs | Formulare, CMRS, FR7, Ausschlüsse, Reload, Assets und Konsole prüfen |
| Ausschluss lokaler Dateien | unvollständige Schutzliste | Builds, Caches, Umgebungsdateien, Schlüssel, IDE-Dateien und Archive ignoriert | .gitignore | keine lokalen Laufzeitdaten veröffentlichen |

| Sicherheitsprüfung | npm ci meldete sieben Auditbefunde | Vite 8.2.2 und kompatible transitive Sicherheitsupdates | package.json; package-lock.json | vom npm-Audit identifizierte bekannte Lücken beseitigt; keine erzwungenen Hauptversionswechsel |

| Browserplattformen | Statusanzeige konnte unter Linux die Navigation überdecken | Status und Navigation in getrennten Grid-Zeilen; Navigation bricht bei Platzmangel um | src/styles.css | tatsächlichen Klickkonflikt beseitigt, keine erzwungenen Testklicks |
