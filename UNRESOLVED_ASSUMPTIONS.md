# Annahmen- und Parameterverzeichnis

Stand: 7. September 2026. Dieses Verzeichnis unterscheidet dokumentierte Vorgaben von synthetischen Werten und fachlich offenen Entscheidungen. „Fachlich dokumentiert“ bedeutet bei den FR7-Gewichten und Skalen: in der Aufgabenstellung explizit vorgegeben, nicht empirisch bewiesen. Technische Größen wie Dateigrößenlimits, CSS-Abstände, Zeitverzögerungen und Schema-IDs sind keine fachlichen Kalibrierungsparameter.

Die Registerwerte werden vollständig und feldweise aufgeführt, einschließlich Namen, Freigaben, Zertifikatsangaben und Routenquellen. Kein Eintrag belegt eine tatsächliche Geschäftsbeziehung oder Materialprüfung. Die früheren Parameter marginTarget = 0,30, savingTarget = 0,30, distanceReferenceKm = 600 und co2ReferenceKgPerT = 100 werden im aktuellen Rechenkern nicht mehr verwendet. Die Preisvorteilgrenze 0,30 bleibt ausschließlich in der ausdrücklich vorgegebenen Deal-Ordinalskala erhalten.

| Parameter | Wert | Verwendung | Status | Kommentar |
|---|---|---|---|---|
| DEFAULT_WEIGHTS | {"economics":0.35,"ecology":0.25,"feasibility":0.25,"deal":0.15} | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| DIMENSION_WEIGHTS | {"economics":{"contribution":0.4,"revenue":0.25,"processCost":0.2,"transportCost":0.15},"ecology":{"co2":0.45,"resourceEfficiency":0.3,"distance":0.25},"feasibility":{"quantity":0.3,"quality":0.25,"availability":0.2,"purityReserve":0.15,"compliance":0.1},"deal":{"price":0.35,"reliability":0.3,"probability":0.2,"contribution":0.15}} | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| DISTANCE_BANDS | [{"max":50,"score":100},{"max":150,"score":85},{"max":300,"score":70},{"max":500,"score":55},{"max":800,"score":40},{"max":1200,"score":25}] | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| LONG_DISTANCE_SCORE | 10 | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| PRICE_BANDS | [{"min":0.3,"score":100},{"min":0.2,"score":80},{"min":0.1,"score":60},{"min":0,"score":40}] | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| ABOVE_REFERENCE_PRICE_SCORE | 20 | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| AVAILABILITY_SCORES | {"kontinuierlich":100,"regelmäßig":80,"saisonal":60,"einmalige Charge":40,"unsicher":20} | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| RELIABILITY_SCORES | {"sehr zuverlässig / passende Kapazität / klare Rolle":100,"guter Partnerfit":80,"akzeptabler Partnerfit":60,"unsicherer Partnerfit":40,"schwacher Partnerfit":20} | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| PURITY_RESERVE_SCORES | {"deutlich":100,"klar":80,"knapp":60,"minimal":30} | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| SCORE_SCALE | {"min":0,"max":100} | FR7-Bewertung | fachlich dokumentiert | Aus fachlicher Zielvorgabe; kein empirischer Validierungsnachweis. |
| MASS_TO_TONNES | {"t":1,"kg":0.001,"g":0.000001} | Einheitenumrechnung | fachlich dokumentiert | SI-Umrechnung der unterstützten Masseneinheiten; keine Kalibrierung. |
| DEMO_TRANSPORT_EMISSION_FACTOR | 0.08 | Kosten-/Emissionsproxy | synthetische Demo-Annahme | Übernommener Wert ohne belastbare Herleitung; keine reale Ökobilanz bzw. Marktbeobachtung. |
| DEMO_PROCESS_EMISSION_FACTOR | 12 | Kosten-/Emissionsproxy | synthetische Demo-Annahme | Übernommener Wert ohne belastbare Herleitung; keine reale Ökobilanz bzw. Marktbeobachtung. |
| DEMO_TRANSPORT_COST_EUR_PER_TKM | 0.1 | Kosten-/Emissionsproxy | synthetische Demo-Annahme | Übernommener Wert ohne belastbare Herleitung; keine reale Ökobilanz bzw. Marktbeobachtung. |
| purityReserveThresholds.deutlich | null | Untergrenze in Prozentpunkten | noch zu validieren | Fachlich zu definieren; null erzeugt keinen Ersatzscore. |
| purityReserveThresholds.klar | null | Untergrenze in Prozentpunkten | noch zu validieren | Fachlich zu definieren; null erzeugt keinen Ersatzscore. |
| purityReserveThresholds.knapp | null | Untergrenze in Prozentpunkten | noch zu validieren | Fachlich zu definieren; null erzeugt keinen Ersatzscore. |
| purityReserveThresholds.minimal | null | Untergrenze in Prozentpunkten | noch zu validieren | Fachlich zu definieren; null erzeugt keinen Ersatzscore. |
| Intensitätsnormalisierung | EUR/t und kg CO₂/t | Vergleich zulässiger Alternativen | noch zu validieren | Konzeptionelle Entscheidung; Abgrenzung gegen absolute Mengenwirkung fachlich prüfen. |
| Min-Max bei gleichen Grenzen | null | Keine künstliche Gleichbewertung | noch zu validieren | Konzeptionelle Behandlung eines unbestimmbaren Teilindikators. |
| Vergleichsmenge | alle Hard-Constraint-konformen Kandidaten | Min-Max-Referenz | noch zu validieren | Kann verschiedene Materialklassen enthalten; Wechselwirkungen und Rangumkehr untersuchen. |
| Mengenfit | 100 × min(Angebot, Bedarf, Kapazität) / Bedarf | Realisierbarkeit | noch zu validieren | Konzeptionelle Bedarfsdeckung; keine gemeinsame Allokation über mehrere Ketten. |
| Massenbilanz | Eingangsmasse = Verkaufsmasse | Deckungsbeitrag und Emissionsproxy | synthetische Demo-Annahme | Kein Ausbeuteverlust, Ausschuss oder Nebenprodukt modelliert. |
| Kostenabgrenzung | Einkauf + Prozess + Transport | Deckungsbeitrag | noch zu validieren | Keine Fixkosten, Steuern, Lagerkosten oder zeitliche Finanzierung. |
| Routensymmetrie | Hinweg = Rückweg | Registrierte Transportabschnitte | synthetische Demo-Annahme | Keine routingbasierte Entfernungsbestimmung. |
| ComplianceScore | 100 | Nur nach bestandenen Hard Constraints | fachlich dokumentiert | Logische Ableitung, kein zusätzlicher empirischer Messwert. |
| Zertifikatsvergleich | normalisierter Textvergleich bei Anbieter und Aufbereiter | Zulässigkeit | noch zu validieren | Gültigkeit, Geltungsbereich, Ablauf und Echtheit werden nicht extern geprüft. |
| Datenvertrauen RQ2 | proxy → niedrig; sonst mittel | Separates Erklärmerkmal | noch zu validieren | Unkalibrierte kategorielle Heuristik, kein Scoreanteil. |
| CMRS_TRUST_HEURISTIC | {"maxIssues":2,"highEvidence":4,"mediumEvidence":2} | Bestehende RQ1-Demo | noch zu validieren | Unveränderte Altwerte zentralisiert; keine neue Extraktionsevaluation. |
| Material-/Regionvokabulare | src/config/vocabularies.ts | Erkennung und Auswahl | noch zu validieren | Begrenzter Demonstrationsumfang; keine vollständige Taxonomie oder vollständige Regionalliste. |
| Regelbasierte CMRS-Muster | src/config/vocabularies.ts und src/domain/cmrs/ | Freitexterkennung | noch zu validieren | Sprachliche Regeln und Warnungen ohne neu nachgewiesene Präzision/Recall. |
| Test-Reinheitsgrenzen | 10/5/1/0 Prozentpunkte | Nur Unit-Testfixtures | synthetische Demo-Annahme | Nicht in Produktivkonfiguration oder Demodatensatz; dienen nur der Rechenprüfung. |
| Weitere Testwerte | tests/*.test.mjs | Rechenfixtures und Grenzfälle | synthetische Demo-Annahme | Keine fachliche Parametrisierung; keine übernommenen Marktwerte. |
| CMRS-Beispiel 1 | 500 kg PP-Regranulat, Feuchte max 0,3 %, Reinheit 92 %, Standort Berlin. | RQ1-Demo-Eingabe | synthetische Demo-Annahme | Enthaltene Mengen und Qualitätswerte sind keine Messungen. |
| CMRS-Beispiel 2 | Suche PP-Granulat, mind. 300 kg, Reinheit min. 80 %, ISO 14001, Berlin/Brandenburg. | RQ1-Demo-Eingabe | synthetische Demo-Annahme | Enthaltene Mengen und Qualitätswerte sind keine Messungen. |
| CMRS-Beispiel 3 | 2 t Aluminiumspäne, Ölanteil max 1 %, Standort Dortmund, ISO 9001. | RQ1-Demo-Eingabe | synthetische Demo-Annahme | Enthaltene Mengen und Qualitätswerte sind keine Messungen. |
| CMRS-Beispielzeitstempel | ["2026-08-27T10:00:00.000Z","2026-08-27T10:01:00.000Z","2026-08-27T10:02:00.000Z"] | Demoprovenienz | synthetische Demo-Annahme | Keine tatsächlichen Beobachtungszeitpunkte. |
| offers.A001.offerId | A001 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.status | aktiv | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.supplier | PolyLoop GmbH | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.sector | Kunststoffverarbeitung | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.region | Baden-Württemberg | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.materialClass | Kunststoff | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.material | PP | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.form | Granulat | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.purity | 92 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.quantity | 900 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.unit | t | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.qualityScore | 88 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.availability | kontinuierlich | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.certificate | ISO14001 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.transportOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.regulationOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.referencePrice | 760 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.offerPrice | 610 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.evidence | proxy | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A001.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Stabile PP-Fraktion mit belastbarer Zertifikatslage. | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.offerId | A002 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.status | aktiv | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.supplier | Glaswerk Elbe | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.sector | Glas | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.region | Sachsen | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.materialClass | Glas | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.material | Altglas | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.form | Scherben | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.purity | 89 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.quantity | 1500 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.unit | t | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.qualityScore | 86 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.availability | kontinuierlich | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.certificate | ISO14001 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.transportOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.regulationOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.referencePrice | 610 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.offerPrice | 500 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.evidence | proxy | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A002.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Standardfraktion mit kurzen Wegen. | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.offerId | A003 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.status | aktiv | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.supplier | AgroRest BW | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.sector | Agrar | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.region | Baden-Württemberg | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.materialClass | Biomasse | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.material | Hanfaser | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.form | Fasern | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.purity | 78 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.quantity | 420 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.unit | t | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.qualityScore | 83 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.availability | regelmäßig | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.certificate | ISO14001 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.transportOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.regulationOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.referencePrice | 720 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.offerPrice | 575 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.evidence | proxy | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A003.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Bioökonomischer Nebenstrom mit Kosmetik- und Materialpotenzial. | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.offerId | A004 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.status | aktiv | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.supplier | FoodSide GmbH | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.sector | Lebensmittel | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.region | Bayern | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.materialClass | Biomasse | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.material | Stärkeschlamm | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.form | Flüssig | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.purity | 68 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.quantity | 1100 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.unit | t | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.qualityScore | 79 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.availability | kontinuierlich | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.certificate | ISCC | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.transportOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.regulationOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.referencePrice | 840 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.offerPrice | 710 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.evidence | proxy | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A004.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Hohe Mengenstabilität bei zusätzlichem Prozessaufwand. | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.offerId | A005 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.status | Nachweis offen | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.supplier | AluCut Werke | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.sector | Metallverarbeitung | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.region | Nordrhein-Westfalen | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.materialClass | Metall | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.material | Aluminium | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.form | Späne | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.purity | 95 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.quantity | 1200 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.unit | t | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.qualityScore | 94 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.availability | kontinuierlich | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.certificate | kein Zertifikat | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.transportOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.regulationOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.referencePrice | 910 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.offerPrice | 765 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.evidence | proxy | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A005.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Technisch stark, aber Zertifikat muss nachgereicht werden. | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.offerId | A006 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.status | aktiv | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.supplier | Textilwerk Nord | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.sector | Textil | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.region | Niedersachsen | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.materialClass | Textil | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.material | Baumwolle | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.form | Fasern | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.purity | 84 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.quantity | 500 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.unit | t | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.qualityScore | 82 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.availability | kontinuierlich | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.certificate | OEKO-TEX | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.transportOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.regulationOk | true | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.referencePrice | 520 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.offerPrice | 430 | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.evidence | proxy | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| offers.A006.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Gute ökologische Wirkung bei begrenzter Menge. | Synthetisches Register / offers | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.demandId | G001 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.status | aktiv | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.buyer | Packwerk AG | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.sector | Verpackung | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.region | Baden-Württemberg | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.materialClass | Kunststoff | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.material | PP | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.minPurity | 80 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.quantity | 700 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.unit | t | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.certificate | ISO14001 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.targetPrice | 650 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.revenue | 560 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.contractProbability | 78 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.maxDistance | 180 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G001.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Rezyklat für Verpackungsanwendung. | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.demandId | G002 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.status | aktiv | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.buyer | MehrwegFlasche AG | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.sector | Verpackung | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.region | Sachsen | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.materialClass | Glas | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.material | Altglas | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.minPurity | 75 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.quantity | 1200 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.unit | t | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.certificate | ISO14001 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.targetPrice | 520 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.revenue | 500 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.contractProbability | 74 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.maxDistance | 150 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G002.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Kontinuierlicher Bedarf für Flaschenproduktion. | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.demandId | G003 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.status | aktiv | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.buyer | NaturaCare GmbH | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.sector | Kosmetik | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.region | Baden-Württemberg | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.materialClass | Biomasse | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.material | Hanfaser | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.minPurity | 65 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.quantity | 360 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.unit | t | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.certificate | ISO14001 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.targetPrice | 600 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.revenue | 545 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.contractProbability | 73 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.maxDistance | 160 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G003.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Naturfaser für Produktlinie mit regionalem Bezug. | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.demandId | G004 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.status | aktiv | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.buyer | BioPoly Solutions | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.sector | Biopolymere | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.region | Bayern | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.materialClass | Biomasse | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.material | Stärkeschlamm | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.minPurity | 55 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.quantity | 950 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.unit | t | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.certificate | ISCC | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.targetPrice | 735 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.revenue | 690 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.contractProbability | 76 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.maxDistance | 260 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G004.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Fermentierbarer Nebenstrom für Biopolymerproduktion. | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.demandId | G005 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.status | aktiv | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.buyer | Maschinenbau Weber | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.sector | Maschinenbau | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.region | Nordrhein-Westfalen | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.materialClass | Metall | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.material | Aluminium | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.minPurity | 90 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.quantity | 900 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.unit | t | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.certificate | ISO9001 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.targetPrice | 790 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.revenue | 780 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.contractProbability | 86 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.maxDistance | 220 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G005.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Zertifikat ist zwingend, sonst kein Handover. | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.demandId | G006 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.status | aktiv | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.buyer | ThermoFaser GmbH | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.sector | Bauprodukte | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.region | Niedersachsen | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.materialClass | Textil | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.material | Baumwolle | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.minPurity | 70 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.quantity | 600 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.unit | t | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.certificate | OEKO-TEX | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.targetPrice | 455 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.revenue | 440 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.contractProbability | 70 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.maxDistance | 180 | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| demands.G006.note | Synthetischer Szenariodatensatz; keine Marktbeobachtung. Dämmstoffproduktion mit stabiler Qualitätsanforderung. | Synthetisches Register / demands | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.processorId | P001 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.name | Recytec Süd | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.region | Baden-Württemberg | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.materialClass | Kunststoff | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.focus | Sortierung und Regranulierung | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.processCost | 180 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.resourceEfficiency | 86 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.reliability | 85 | Synthetisches Register / processors | synthetische Demo-Annahme | Historischer Zahlenwert; wird nicht gescort. |
| processors.P001.certificates | ISO14001 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.supportedMaterials | ["PP"] | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.capacityT | 2000 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P001.reliabilityCategory | null | Partnerverlässlichkeit | noch zu validieren | Qualitative Kategorie fehlt; keine Umdeutung des numerischen Altwerts. |
| processors.P002.processorId | P002 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.name | Sortglas Mitte | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.region | Sachsen | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.materialClass | Glas | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.focus | Glasbruchsortierung | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.processCost | 140 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.resourceEfficiency | 91 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.reliability | 82 | Synthetisches Register / processors | synthetische Demo-Annahme | Historischer Zahlenwert; wird nicht gescort. |
| processors.P002.certificates | ISO14001 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.supportedMaterials | ["Altglas"] | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.capacityT | 2000 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P002.reliabilityCategory | null | Partnerverlässlichkeit | noch zu validieren | Qualitative Kategorie fehlt; keine Umdeutung des numerischen Altwerts. |
| processors.P003.processorId | P003 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.name | BioExtract Labs | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.region | Baden-Württemberg | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.materialClass | Biomasse | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.focus | Faser- und Inhaltsstoffextraktion | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.processCost | 190 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.resourceEfficiency | 93 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.reliability | 81 | Synthetisches Register / processors | synthetische Demo-Annahme | Historischer Zahlenwert; wird nicht gescort. |
| processors.P003.certificates | ISO14001 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.supportedMaterials | ["Hanfaser","Stärkeschlamm"] | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.capacityT | 2000 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P003.reliabilityCategory | null | Partnerverlässlichkeit | noch zu validieren | Qualitative Kategorie fehlt; keine Umdeutung des numerischen Altwerts. |
| processors.P004.processorId | P004 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.name | Fermenta Circular | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.region | Bayern | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.materialClass | Biomasse | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.focus | Fermentation | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.processCost | 260 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.resourceEfficiency | 90 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.reliability | 77 | Synthetisches Register / processors | synthetische Demo-Annahme | Historischer Zahlenwert; wird nicht gescort. |
| processors.P004.certificates | ISCC | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.supportedMaterials | ["Hanfaser","Stärkeschlamm"] | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.capacityT | 2000 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P004.reliabilityCategory | null | Partnerverlässlichkeit | noch zu validieren | Qualitative Kategorie fehlt; keine Umdeutung des numerischen Altwerts. |
| processors.P005.processorId | P005 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.name | Metallkreislauf Rhein | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.region | Nordrhein-Westfalen | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.materialClass | Metall | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.focus | Schmelzen und Legieren | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.processCost | 300 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.resourceEfficiency | 78 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.reliability | 90 | Synthetisches Register / processors | synthetische Demo-Annahme | Historischer Zahlenwert; wird nicht gescort. |
| processors.P005.certificates | ISO9001 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.supportedMaterials | ["Aluminium"] | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.capacityT | 2000 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P005.reliabilityCategory | null | Partnerverlässlichkeit | noch zu validieren | Qualitative Kategorie fehlt; keine Umdeutung des numerischen Altwerts. |
| processors.P006.processorId | P006 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.name | Sortex Circular | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.region | Niedersachsen | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.materialClass | Textil | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.focus | Textilsortierung und Faseraufbereitung | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.processCost | 160 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.resourceEfficiency | 95 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.reliability | 80 | Synthetisches Register / processors | synthetische Demo-Annahme | Historischer Zahlenwert; wird nicht gescort. |
| processors.P006.certificates | OEKO-TEX | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.supportedMaterials | ["Baumwolle"] | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.capacityT | 2000 | Synthetisches Register / processors | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| processors.P006.reliabilityCategory | null | Partnerverlässlichkeit | noch zu validieren | Qualitative Kategorie fehlt; keine Umdeutung des numerischen Altwerts. |
| routes.0.from | Baden-Württemberg | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.0.to | Baden-Württemberg | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.0.distanceKm | 45 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.0.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.1.from | Baden-Württemberg | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.1.to | Sachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.1.distanceKm | 175 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.1.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.2.from | Baden-Württemberg | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.2.to | Bayern | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.2.distanceKm | 230 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.2.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.3.from | Baden-Württemberg | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.3.to | Nordrhein-Westfalen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.3.distanceKm | 285 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.3.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.4.from | Baden-Württemberg | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.4.to | Niedersachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.4.distanceKm | 340 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.4.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.5.from | Sachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.5.to | Sachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.5.distanceKm | 45 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.5.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.6.from | Sachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.6.to | Bayern | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.6.distanceKm | 230 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.6.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.7.from | Sachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.7.to | Nordrhein-Westfalen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.7.distanceKm | 285 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.7.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.8.from | Sachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.8.to | Niedersachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.8.distanceKm | 340 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.8.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.9.from | Bayern | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.9.to | Bayern | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.9.distanceKm | 45 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.9.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.10.from | Bayern | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.10.to | Nordrhein-Westfalen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.10.distanceKm | 285 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.10.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.11.from | Bayern | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.11.to | Niedersachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.11.distanceKm | 340 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.11.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.12.from | Nordrhein-Westfalen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.12.to | Nordrhein-Westfalen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.12.distanceKm | 45 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.12.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.13.from | Nordrhein-Westfalen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.13.to | Niedersachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.13.distanceKm | 340 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.13.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.14.from | Niedersachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.14.to | Niedersachsen | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.14.distanceKm | 45 | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |
| routes.14.source | Synthetische Szenarioannahme, keine gemessene Fahrstrecke | Synthetisches Register / routes | synthetische Demo-Annahme | Übernommen, nicht als reale Beobachtung oder Freigabe validiert. |

## Pages-Prüfstand

Die statische Bereitstellung verändert keine FR7-Gewichte, Szenariodaten oder fachlichen Schwellen. Der Browserakzeptanztest setzt ausschließlich in einem isolierten Browserkontext die vier Testgrenzen 10/5/1/0 und die Partnerkategorie „guter Partnerfit“, um einen vollständigen Rechenlauf zu prüfen. Diese Werte werden nicht in die veröffentlichte Demokonfiguration übernommen. Testeingaben werden nur im isolierten Browserspeicher gespeichert, nicht an einen Server übertragen.

Der vollständige Browser-Rechentest variiert zusätzlich seine isolierten Routen auf Distanz = Registerindex + 1 km. Damit sind CO₂- und Transportkosten-Min-Max-Bereiche im Test bestimmbar. Auch diese rein technischen Testwerte sind keine fachlichen Annahmen des veröffentlichten Szenarios. Im übernommenen Standardszenario können gleich lange zulässige Routen weiterhin offene Normalisierungsergebnisse verursachen.

## Missing-Data-Hardening

Fehlende Ortsangaben bleiben leer; es gibt keine synthetische Ersatzregion. Unklare oder widersprüchliche Freitexte erhalten unknown und benötigen manuelle Prüfung. Die expliziten sprachlichen Regeln sind weiterhin nicht empirisch validiert. Historische reliability-Zahlen sind optional und bleiben ohne Einfluss auf FR7. Durch die Modulaufteilung werden keine weiteren fachlichen Annahmen eingeführt.
