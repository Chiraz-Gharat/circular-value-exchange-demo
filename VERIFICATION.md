# Verifikation des finalen Pages-Quellstands

Stand: 7. September 2026. Lokal geprüft mit Node.js 24.15.0.

| Prüfung | Lokales Ergebnis |
|---|---|
| npm ci | erfolgreich; Installation aus dem Lockfile |
| npm test | 70 bestanden, 0 fehlgeschlagen, 0 übersprungen |
| npm run typecheck | erfolgreich, TypeScript strict |
| npm run lint | erfolgreich; no-console und no-eval aktiviert |
| npm run build | erfolgreich; statische HTML-, JavaScript- und CSS-Dateien |
| APP_BASE_PATH=/circular-value-exchange-demo/ npm run build | erfolgreich mit Repositorypräfix |
| Browserakzeptanz | 24 Prüfungen bestanden, Desktop 1440 px und Mobil 390 px |
| Konsole und Ressourcen | keine Console Errors, keine JavaScript-Ausnahmen und keine HTTP-Fehler im Akzeptanzlauf |

## Browserabnahme

Für beide Viewports wurden sämtliche acht Navigationsziele angeklickt und anschließend neu geladen: Start, CMRS, Marktbild, Angebot, Gesuch, Ketten, Erklärungen und Register. Bilddateien wurden vollständig dekodiert. Zusätzlich wurden CMRS-Records erzeugt und nach Reload wiedergefunden, Angebote und Gesuche über echte Formularinteraktionen gespeichert sowie ein vollständiger FR7-Testdatensatz über den Registereditor importiert.

Der browserseitige JSON-Ergebnisexport wurde mit dem unabhängig ausgeführten TypeScript-Rechenkern vollständig verglichen. Der Testdatensatz enthält sowohl gerankte als auch ausgeschlossene Ketten. Status, Ausschlussgründe und neu geladene Ergebnisse wurden geprüft. Der Test läuft in isolierten Browserkontexten und verändert keine veröffentlichten Daten. Er enthält ausschließlich deklarierte Testschwellen und Teststrecken; diese gelangen nicht in das Standardszenario.

## Veröffentlichungsnachweis

Der Workflow `.github/workflows/pages.yml` wiederholt Installation, Unit-Tests, Typprüfung, Lint, Build und die 24 Browserprüfungen. Nur nach erfolgreichem Prüflauf wird `dist/` als Pages-Artefakt veröffentlicht. Der anschließende Job `verify-live` führt denselben Akzeptanztest gegen die tatsächlich veröffentlichte URL aus. Sein Ergebnis, der Deploymentstatus und der zugehörige Commit sind in den [GitHub-Actions-Läufen](https://github.com/Chiraz-Gharat/circular-value-exchange-demo/actions) dauerhaft dem geprüften Quellstand zugeordnet. Diese laufabhängigen Ergebnisse werden nicht durch einen statischen Text vorweggenommen.

Repository: https://github.com/Chiraz-Gharat/circular-value-exchange-demo

Pages-Ziel: https://chiraz-gharat.github.io/circular-value-exchange-demo/

Anwendungsunterseiten sind Hash-URLs, beispielsweise `#chains`. Beliebige pfadbasierte URLs ohne Hash werden nicht als zusätzliche Routen zugesichert. Alle lokalen Build-, Cache-, Testausgabe-, IDE- und Umgebungsdateien sind von Git ausgeschlossen. Das finale Source-ZIP wird unmittelbar aus dem finalen Git-Commit mit `git archive` erstellt und enthält denselben Quellbaum.

## Offene Fachpunkte

Die vier numerischen Reinheitsgrenzen, qualitative Partnerbewertungen und belastbare Kosten-/Emissionsdaten fehlen weiterhin. Gleichbleibende Transport- und CO₂-Werte können offene Min-Max-Bereiche erzeugen. Es gibt keine Ersatzbewertung oder automatische Umgewichtung. Das Standardszenario weist deshalb weiterhin offene Gesamtscores aus. Die Tests belegen korrekte Ausführung, keine empirische Modellvalidierung. Alle Werte und Designentscheidungen sind in `UNRESOLVED_ASSUMPTIONS.md` aufgeführt.

Nicht Bestandteil dieser Prüfung: vollständige Sicherheits- oder Barrierefreiheitszertifizierung, reale Zertifikatsprüfung, externe RQ1-Evaluation oder wissenschaftliche Nachvalidierung der separat vorhandenen Word-Datei.

## Abhängigkeiten

Der initiale Audit meldete sieben bekannte Befunde. Vite wurde innerhalb der Hauptversion 8 auf 8.2.2 aktualisiert; die übrigen betroffenen transitiven Pakete wurden kompatibel aktualisiert. Der abschließende npm-Audit meldet null bekannte Sicherheitslücken. Das ist eine zeitpunktbezogene Datenbankprüfung, keine Garantie für vollständige Sicherheit.
