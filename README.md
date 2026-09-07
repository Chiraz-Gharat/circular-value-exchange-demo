# Circular Value Exchange

## Zielsetzung

Dieser Webprototyp erzeugt aus Angeboten, Gesuchen und Aufbereitungspartnern mögliche Wertketten für Sekundärrohstoffe. Er trennt zwingende Zulässigkeitsprüfungen von einer anschließenden relativen Priorisierung. Er ist weder eine Handelsplattform mit verbindlichen Angeboten noch ein Nachweis wirtschaftlicher, ökologischer oder rechtlicher Vorteilhaftigkeit.

## Forschungsbezug FR7

FR7 bezeichnet hier das vorgegebene additive Bewertungsmodell aus Wirtschaftlichkeit, Ökologie, Realisierbarkeit und Deal-Qualität. Seine Umsetzung ist automatisiert prüfbar. Die Übereinstimmung mit der fachlichen Vorgabe ist nicht gleichbedeutend mit empirischer Validierung. Die vorhandene CMRS-Freitexterkennung ist eine separat gekennzeichnete RQ1-Demonstration; dieses Paket beansprucht keine neue RQ1-Evaluation oder abgeschlossene Teamintegration.

## Architektur

`src/main.tsx` bindet die React-Oberfläche in `index.html` ein. Komponenten stellen Eingaben und Ergebnisse dar; die Berechnung erfolgt in TypeScript-Modulen ohne React-Abhängigkeit. Der Rechenweg lautet:

```text
JSON / Registereingaben
        |
        v
Schema- und Werteprüfung --> Fehler: bestehendes Register beibehalten
        |
        v
Kandidatenbildung --> Hard Constraints --> ausgeschlossen + Gründe
                            |
                            v
                  zulässige Vergleichsmenge
                            |
                            v
                Teilindikatoren / Normalisierung
                            |
                   +--------+---------+
                   |                  |
            fehlender Wert       vollständig
                   |                  |
           Bewertung offen      FR7 + Rang
                   +--------+---------+
                            |
                     Prüflog / JSON-Export
```

Die JSON-Konfiguration enthält variable Registerdaten, Routen und deklarierte Modellannahmen. Fachlich fest vorgegebene Gewichte und Ordinalskalen liegen dagegen unveränderlich in `src/config/scoringConfig.ts`. Die Hauptgewichte können nicht in der Oberfläche oder durch einen alten Browserspeicher überschrieben werden.

## Projektstruktur

```text
index.html                   Statischer HTML-Einstieg
src/main.tsx                 React-Mount
src/styles.css               Anwendungsstile
.github/workflows/pages.yml  Prüfung und Veröffentlichung
src/components/              React-Oberfläche und JSON-Registereditor
src/config/                  Gewichte, Skalen, Einheiten, Schlüssel, Vokabulare
src/data/demo/               synthetische Register, Routen und CMRS-Beispiele
src/domain/matching/         Kandidatenbildung und Ausschlussprotokoll
src/domain/scoring/          Indikatoren, Aggregation und Ranking
src/domain/validation/       Eingabe- und Modellvalidierung
src/domain/context.ts        bestehende CMRS-Demonstration und Darstellungshilfen
src/storage/                 fehlertolerantes Lesen des Browserspeichers
src/types/                   Datenverträge
tests/                       fachliche Unit- und Regressionstests
public/                      lokale Bilddateien und Favicon
scripts/browser-check.mjs     Desktop-/Mobil-Akzeptanztest
```

## Technologiestack

React 19.2.6, TypeScript 5.9.3 im Strict-Modus und Vite 8.2.2. Die Anwendung läuft vollständig im Browser. Playwright 1.62.1 prüft die tatsächliche Oberfläche. Es gibt keine Server-, Python-, SQL- oder externe Modelllaufzeit. Der bisherige vinext-/Cloudflare-Serveradapter ist nicht mehr Teil dieses statischen Pages-Stands. Das Lockfile fixiert die Abhängigkeiten.

## Installation

Voraussetzung: Node.js ab 22.18.0 und npm. Geprüft wurde mit Node.js 24.15.0. Im entpackten Projektverzeichnis:

```sh
npm ci
```

Die Installation benötigt Zugang zum npm-Register oder einen vollständigen lokalen Cache. Es sind keine API-Schlüssel und keine `.env`-Datei erforderlich.

## Lokaler Start

```sh
npm run dev -- --host 127.0.0.1 --port 8031
```

Adresse: `http://127.0.0.1:8031/`. Daten liegen nur im Browserprofil. Der JSON-Export ist die portable Sicherung; ein anderer Browser oder Port besitzt einen anderen lokalen Speicher. Es gibt keine gemeinsame Datenhaltung, Anmeldung oder Zugriffskontrolle. Keine vertraulichen Echtdaten importieren.

## Build

```sh
npm run build
npm run start -- --host 127.0.0.1 --port 8031
```

Der Build erzeugt ausschließlich statische Dateien in `dist/`. Diese werden als Actions-Artefakt veröffentlicht, niemals eingecheckt. Lokal ist der Basispfad `/`. Der Pages-Workflow setzt `APP_BASE_PATH` aus dem Repositorynamen. Zum gleichen lokalen Build:

```sh
APP_BASE_PATH=/circular-value-exchange-demo/ npm run build
APP_BASE_PATH=/circular-value-exchange-demo/ npm run start -- --port 8031
```

Navigation verwendet Hash-URLs, beispielsweise `/circular-value-exchange-demo/#chains`. Reloads benötigen damit keine serverseitigen Rewrite-Regeln. Pfade wie `/chains` ohne Hash sind keine Anwendungsrouten. Vite preview dient ausschließlich der lokalen Buildprüfung.

### GitHub Pages

Repository: https://github.com/Chiraz-Gharat/circular-value-exchange-demo

Pages-Ziel: https://chiraz-gharat.github.io/circular-value-exchange-demo/

In Settings → Pages muss die Quelle „GitHub Actions“ sein. Der Workflow prüft npm ci, Unit-Tests, TypeScript, ESLint, Build und Browserakzeptanz, bevor er das Artefakt veröffentlicht. Pull Requests werden geprüft, aber nicht veröffentlicht. Ein fehlgeschlagener Prüfschritt verhindert das Deployment. Laufzeitfreigaben bleiben auf die Deployment-Aufgabe begrenzt.

Technische Referenzen: [Vite: Static Deployment](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub: Custom Workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Tests

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Tests verwenden den nativen Node-Test-Runner und importieren den TypeScript-Rechenkern direkt. Testdaten mit vollständig gesetzten Reinheitsgrenzen sind ausschließlich Rechenfixtures, keine produktiven Kalibrierungen. Die Tests prüfen Formeln, Skalen, Grenzen, Ausschlüsse, Normalisierung, Sortierung, fehlerhafte Eingaben und Nichtmutation. Ein bestandener Test belegt Implementierungskonsistenz, nicht die Validität der Daten oder die Eignung für reale Entscheidungen.

## Datenmodell

Ein `Dataset` enthält `schemaVersion`, `provenance`, `offers`, `demands`, `processors` und `model`. IDs müssen innerhalb ihres Registers eindeutig sein. Import und gespeicherte RQ2-Register werden vor der Übernahme geprüft. Unbekannte Schema-Versionen, ungültige Zahlen, negative Kosten, unvollständige Routen und widersprüchliche Reinheitskonfigurationen werden abgewiesen.

Mengen werden aus g, kg oder t in Tonnen umgerechnet. Sämtliche Preise, Erlöse und Prozesskosten beziehen sich unabhängig von der Mengen-Eingabeeinheit auf EUR/t. Reinheiten sind Prozentangaben; Reinheitsreserven sind Differenzen in Prozentpunkten. Die verarbeitbare Menge ist das Minimum aus Angebot, Nachfrage und Partnerkapazität. Preise und Erlöse sind Szenariowerte, keine beobachteten Marktpreise.

Für jede Kombination entsteht eine Kandidatenkette mit stabiler ID. Angebot, Prozesspartner und Gesuch werden separat referenziert. Die Routenlänge ist die Summe beider Transportabschnitte. Registrierte Routen werden symmetrisch verwendet; fehlende Strecken werden nicht geschätzt. Ein intern verwendeter Null-Platzhalter für eine fehlende Route kann deshalb niemals als tatsächlich kostenlose oder emissionsfreie bewertbare Kette eingehen.

Der Gesamtdeckungsbeitrag ist `Erlös - Materialeinkauf - Prozesskosten - Transportkosten`. Das Modell unterstellt gleiche verarbeitete und verkaufte Masse, keine Ausbeuteverluste und keine Fixkosten. `targetPrice` bleibt Registerinformation, ist aber keine verdeckte zusätzliche Preisformel. Numerische historische `reliability`-Werte bleiben zur Nachvollziehbarkeit erhalten, werden jedoch nicht gescort. Dafür ist eine dokumentierte `reliabilityCategory` erforderlich.

## Hard Constraints

Vor jeder Indikatorberechnung müssen Material und Materialklasse, Mindestreinheit, erforderliche Zertifikate, Transportfreigabe, Routenverfügbarkeit, maximale Transportdistanz und regulatorische Freigabe erfüllt sein. Zusätzlich werden Registerfreigabe, Partner-Werkstofffreigabe und positive verarbeitbare Menge geprüft. Zertifikatanforderungen gelten sowohl für Anbieter als auch Aufbereiter. Mehrere Zertifikate werden durch Komma oder Semikolon getrennt; es erfolgt normalisierter Textvergleich, keine Zertifikatsprüfung bei einer Prüfstelle.

Nicht passende Materialpaare oder fehlende Aufbereitungsklassen erscheinen im separaten Verwerfungsprotokoll. Andere unzulässige Kandidaten erhalten `ausgeschlossen`, keinen Teil- oder Gesamtscore und keinen Rang. Sie gehören nicht zur Min-Max-Vergleichsmenge. Zulässige, aber unvollständig bewertbare Kandidaten erhalten `Bewertung offen`; dieser Zustand ist kein Hard-Constraint-Verstoß.

## Scoringmodell

Alle Teilindikatoren liegen bei bestimmbarer Bewertung zwischen 0 und 100. Fehlende Werte werden als `null` weitergegeben, nicht durch Nullpunkte, Mittelwerte oder eine Umverteilung der übrigen Gewichte ersetzt. Die Reihenfolge der Ergebnistabelle ist absteigender Gesamtscore, bei Gleichheit stabile Ketten-ID. Exakt gleiche Gesamtscores teilen sich den Rang; danach wird der entsprechende Rang übersprungen. Rundung dient nur der Darstellung, nicht der Rangberechnung.

## Hauptgewichtungen

| Dimension | Gewicht |
|---|---:|
| Wirtschaftlichkeit | 0,35 |
| Ökologie | 0,25 |
| Realisierbarkeit | 0,25 |
| Deal-Qualität | 0,15 |

`FR7 = 0,35 W + 0,25 Ö + 0,25 R + 0,15 D`

## Interne Dimensionsgewichtungen

| Dimension | Teilindikatoren und Gewichte |
|---|---|
| Wirtschaftlichkeit | Deckungsbeitrag 0,40; Erlös 0,25; Prozesskosten 0,20; Transportkosten 0,15 |
| Ökologie | CO₂ 0,45; Ressourceneffizienz 0,30; Distanz 0,25 |
| Realisierbarkeit | Mengenfit 0,30; Qualitätsfit 0,25; Verfügbarkeit 0,20; Reinheitsreserve 0,15; Compliance 0,10 |
| Deal-Qualität | Preisattraktivität 0,35; Partnerverlässlichkeit 0,30; Abschlussindex 0,20; Deckungsbeitrag 0,15 |

Der Mengenfit entspricht `100 × verarbeitbare Menge / Nachfragemenge`, begrenzt auf den Scorebereich. Qualitätsfit, Ressourceneffizienz und Abschlussindex sind deklarierte Szenarioeingaben, keine gemessenen Modellleistungen oder geschätzten Eintrittswahrscheinlichkeiten. Compliance beträgt bei zulässigen Ketten 100 und wird aus den bestandenen Freigaben abgeleitet. Der Deckungsbeitrag wirkt entsprechend der Vorgabe in zwei Dimensionen; diese doppelte Berücksichtigung ist keine unabhängige Evidenz.

Distanz: bis einschließlich 50/150/300/500/800/1200 km gelten 100/85/70/55/40/25 Punkte, darüber 10. Dezimalwerte sind lückenlos eingeordnet: 50,01 km gehören zur zweiten Stufe. Die explizite Transportrestriktion des Gesuchs gilt zusätzlich.

Verfügbarkeit: kontinuierlich 100, regelmäßig 80, saisonal 60, einmalige Charge 40, unsicher 20. Preisattraktivität: Preisvorteil `(Referenzpreis - Angebotspreis) / Referenzpreis`; mindestens 30/20/10/0 Prozent ergeben 100/80/60/40 Punkte, negative Vorteile 20. Ein positiver Referenzpreis ist erforderlich.

Die fünf Partnerkategorien ergeben 100/80/60/40/20 Punkte. Reinheitsreserven sind mit 100/80/60/30 Punkten vorgesehen. Ihre vier numerischen Untergrenzen sind absichtlich `null`, weil sie nicht fachlich vorliegen. Zur Konfiguration sind vier endliche, nicht negative, streng absteigende Grenzen erforderlich. Es wird keine freie Prozentgrenze ergänzt.

## Normalisierung

Deckungsbeitrag und Erlös sind Nutzenkriterien; Prozesskosten, Transportkosten und CO₂ sind Kostenkriterien. Alle fünf Größen werden vor dem Vergleich auf eine Tonne bezogen. Diese Intensitätsbetrachtung ist eine konzeptionelle Entscheidung, damit eine größere Menge allein keine bessere Bewertung verursacht. Die zugelassenen Kandidaten der aktuellen Berechnung bilden die Vergleichsmenge.

```text
Nutzen: 100 × (x - min) / (max - min)
Kosten: 100 × (max - x) / (max - min)
```

Bei gleicher Unter- und Obergrenze, leerer Vergleichsmenge, fehlenden oder nicht endlichen Werten ist der Teilscore offen. Eine Einzelalternative erhält deshalb keinen künstlichen Vollscore. Negative Deckungsbeiträge sind möglich und werden relativ verglichen; bei Kosten sind negative Werte unzulässig. Ein hoher relativer Wirtschaftlichkeitsscore garantiert keinen positiven Deckungsbeitrag. Das Hinzufügen einer Alternative kann die Normalisierung und damit bestehende Scores verändern.

## Synthetische Demonstrationsdaten

Alle Firmenbezeichnungen, Preise, Mengen, Routen, Qualitätswerte, Kapazitäten, Freigaben und CMRS-Beispiele sind Demonstrationsdaten. Die Dateien unter `src/data/demo/` enthalten den übernommenen Szenariostand getrennt von den Berechnungsfunktionen. Das Annahmenverzeichnis führt diese Werte einzeln auf. Angaben wie ISO-Zertifikate sind keine verifizierten Zertifizierungen der genannten Organisationen. Die Bebilderung dient der Illustration, nicht dem Materialnachweis.

## Proxy- und Demo-Annahmen

Die Berechnung verwendet 0,08 kg CO₂/(t·km), 12 kg CO₂/t Prozess und 0,10 EUR/(t·km) ausschließlich als deklarierte synthetische Proxys. `CO₂ = Masse × (Distanz × Transportfaktor + Prozessfaktor)`. Die alte CO₂-Referenz von 100 kg/t und die lineare Distanzreferenz von 600 km entfallen. Ebenso entfallen allgemeine Margen- und Einsparungsziele als Bewertungsgrenzen.

Vier Statusarten müssen begrifflich auseinandergehalten werden: fachlich dokumentierte Parameter aus der Aufgabenstellung, konzeptionelle Designentscheidungen der Umsetzung, synthetische Demonstrationsannahmen und noch nicht empirisch validierte Eingaben. Das vollständige Verzeichnis steht in `UNRESOLVED_ASSUMPTIONS.md`; seine Statustabelle verwendet die drei ausdrücklich vorgegebenen Statusbezeichnungen. Designentscheidungen ohne Validierungsnachweis stehen dort unter „noch zu validieren“.

## Limitationen

Das Standardszenario ergibt bewusst keinen abschließenden FR7-Rang, solange Reinheitsgrenzen und qualitative Partnerkategorien fehlen. Das ist eine offengelegte Modelllücke, kein durch Ersatzwerte verdeckter Rechenfehler. Gleichbleibende Kosten oder CO₂-Werte können weitere offene Teilindikatoren verursachen. Änderungen an Grenzwerten benötigen fachliche Freigabe und Provenienz, nicht nur technisch gültiges JSON.

Es fehlen unter anderem empirische Gewichtskalibrierung, Sensitivitätsstudien mit realen Daten, vollständige Ökobilanz einschließlich Systemgrenzen und Allokation, rechtliche Einzelfallprüfung, Kapazitätsplanung über Zeit und gemeinsame Mengenallokation zwischen konkurrierenden Ketten. Die Kandidaten sind Alternativen, kein gleichzeitig ausführbarer Produktionsplan. Nichtnegative Eingaben verhindern weder fehlerhafte Sachangaben noch unrealistische Größenordnungen.

Die RQ1-Regelerkennung ist sprachlich begrenzt und ihre Datenvertrauensheuristik nicht kalibriert. Provenienz und technisch bestandene Validierung ersetzen keine Sachprüfung. Das Browserregister ist keine produktive Datenbank. Die Tests sind keine vollständige Sicherheits-, Barrierefreiheits- oder Browserkompatibilitätsprüfung.

## Reproduzierbarkeit

Für einen Lauf gemeinsam sichern: exportiertes Register, Modellversion, vollständige Modellkonfiguration, FR7-Gewichte, Ergebnisexport und Lockfile. Im Prüflog stehen Vergleichsmenge, Teilindikatoren, Routenquellen und verwendete Proxys. Die Ergebnisse sind für identische Eingaben deterministisch; lediglich Exportzeitstempel ändern sich. Alte Browserdaten werden wegen der neuen Schema- und Speicherkennungen nicht stillschweigend migriert.

`CHANGE_REPORT.md` dokumentiert die Änderungen und tatsächlich ausgeführten Prüfungen. Das Quellcode-ZIP enthält keine Abhängigkeiten, Builds, lokalen Caches oder Geheimnisse. Nach dem Entpacken wird ausschließlich über `npm ci` installiert. Die separat vorhandene Word-Datei ist nicht Bestandteil dieses Quellcodeprüfstands und wurde nicht wissenschaftlich nachvalidiert. Die finale Source-ZIP wird mit git archive direkt aus dem finalen Commit erstellt, damit die enthaltenen Dateien genau dem Commit entsprechen.
