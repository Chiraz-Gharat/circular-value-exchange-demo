"use client";
import { CURRENT_SCHEMA_VERSION,STORAGE_KEYS } from '../config/storage.ts';

import { DEMO_ASSUMPTION_NOTICE } from '../config/demoAssumptions.ts';
import { assetPath } from '../config/deployment.ts';

import type { FormEvent,ReactNode } from 'react';
import { useEffect,useMemo,useState } from 'react';
import { SCORE_SCALE,AVAILABILITY_SCORES,DEFAULT_WEIGHTS as defaultWeights } from '../config/scoringConfig.ts';
import scenario from '../data/demo/scenario.ts';
import type { CmrsRecord,CmrsValidationIssue,PageId } from '../domain/context.ts';
import { boolValue,cmrsCategoryLabels,cmrsJson,cmrsProvBundle,cmrsSampleTexts,csvDownload,initialCmrsRecords,initialDemands,initialOffers,initialProcessors,integrationReviewItems,isPageId,materialClasses,materialImage,nextAction,nextId,numberValue,pageIds,pageLabels,parseCmrsText,readStoredRows,readStoredWeights,regions,statusClass,textValue,weightDescriptions,weightLabels } from '../domain/context.ts';
import type { ModelConfig } from '../domain/engine.ts';
import { generateChains,rejectedPairs,scoreChains,scoreFormula,validateDataset,weightPercent } from '../domain/engine.ts';
import type { Demand,Offer,Processor,ScoredChain,ScoreWeights } from '../types/model.ts';
import { DatasetEditor } from './dataset-editor';
export default function Home() {
  const [page, setPage] = useState<PageId>("start");
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [demands, setDemands] = useState<Demand[]>(initialDemands);
  const [processors, setProcessors] = useState<Processor[]>(initialProcessors);
  const [model, setModel] = useState<ModelConfig>(scenario.model);
  const [provenance, setProvenance] = useState(scenario.provenance);
  const [cmrsRecords, setCmrsRecords] = useState<CmrsRecord[]>(initialCmrsRecords);
  const [cmrsText, setCmrsText] = useState(cmrsSampleTexts[0]);
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>(defaultWeights);
  const [query, setQuery] = useState("");
  const [selectedChainId, setSelectedChainId] = useState("K001");
  const [storageReady, setStorageReady] = useState(false);
  const [message, setMessage] = useState(
    "Eingaben werden im lokalen Register gespeichert; die Kettenplanung berechnet passende Ketten automatisch.",
  );

  useEffect(() => {
    const syncPageFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (isPageId(hash)) setPage(hash);
    };

    const frame = window.requestAnimationFrame(() => {
      syncPageFromHash();
      try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.workspace);
        if (raw) {
          const saved = JSON.parse(raw);
          const errors = validateDataset(saved);
          if (errors.length) throw new Error(errors[0]);
          setOffers(saved.offers); setDemands(saved.demands); setProcessors(saved.processors); setModel(saved.model); setProvenance(saved.provenance);
        }
      } catch { setMessage('Gespeicherte RQ2-Daten konnten nicht geladen werden. Das Beispielszenario ist aktiv.'); }
      setCmrsRecords(readStoredRows(STORAGE_KEYS.cmrsRecords, initialCmrsRecords));
      setScoreWeights(readStoredWeights());
      setStorageReady(true);
    });

    window.addEventListener("hashchange", syncPageFromHash);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncPageFromHash);
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify({schemaVersion:CURRENT_SCHEMA_VERSION, provenance, offers, demands, processors, model}));
      window.localStorage.setItem(STORAGE_KEYS.scoreWeights, JSON.stringify(scoreWeights));
      window.localStorage.setItem(STORAGE_KEYS.cmrsRecords, JSON.stringify(cmrsRecords));
    } catch { queueMicrotask(()=>setMessage('Lokale Speicherung nicht möglich. Bitte das Register als JSON exportieren.')); }
  }, [offers, demands, processors, model, provenance, scoreWeights, cmrsRecords, storageReady]);

  const chains = useMemo(() => generateChains(offers, demands, processors, model), [offers, demands, processors, model]);
  const discardedPairs = useMemo(() => rejectedPairs(offers, demands, processors), [offers, demands, processors]);
  const scoredChains = useMemo(() => scoreChains(chains, scoreWeights, model), [chains, scoreWeights, model]);
  const selectedChain = scoredChains.find((chain) => chain.chainId === selectedChainId) ?? scoredChains[0];
  const exactChains = scoredChains.filter((chain) => chain.exactMaterial).length;
  const rankedChains = scoredChains.filter((chain) => chain.status === "Bewertbar");
  const excludedChains = scoredChains.filter((chain) => chain.totalScore === null);
  const cmrsIssueCount = cmrsRecords.reduce((sum, record) => sum + record.validation.length, 0);
  const confidenceStats = {
    hoch: scoredChains.filter((chain) => chain.confidence === "hoch").length,
    mittel: scoredChains.filter((chain) => chain.confidence === "mittel").length,
    niedrig: scoredChains.filter((chain) => chain.confidence === "niedrig").length,
  };
  const filteredOffers = offers.filter((offer) =>
    [offer.material, offer.supplier, offer.region, offer.certificate, offer.materialClass]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const filteredDemands = demands.filter((demand) =>
    [demand.material, demand.buyer, demand.region, demand.certificate, demand.materialClass]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  function go(next: PageId) {
    setPage(next);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitCmrsText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const record = parseCmrsText(cmrsText, nextId("CMRS-", cmrsRecords.map((item) => item.recordId)));
    setCmrsRecords((current) => [record, ...current]);
    setMessage(
      `${record.recordId} wurde als ${record.recordType === "offer" ? "Angebot" : "Gesuch"} strukturiert: ${
        record.valid ? "CMRS-validiert" : "mit offenen Prüfpunkten"
      }.`,
    );
  }

  function transferCmrsRecord(record: CmrsRecord) {
    setMessage(record.valid ? 'Materialdaten liegen vor. RQ2-Marktparameter und Freigaben müssen ausdrücklich erfasst werden.' : 'Offene RQ1-Prüfpunkte müssen vor einer Freigabe geklärt werden.');
    if(record.valid) go(record.recordType === 'offer' ? 'offer' : 'search');
  }

  function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const offer: Offer = {
      offerId: nextId("A", offers.map((item) => item.offerId)),
      status: "aktiv",
      supplier: textValue(form, "supplier"),
      sector: textValue(form, "sector"),
      region: textValue(form, "region"),
      materialClass: textValue(form, "materialClass"),
      material: textValue(form, "material"),
      form: textValue(form, "form"),
      purity: numberValue(form, "purity"),
      quantity: numberValue(form, "quantity"),
      unit: textValue(form, "unit") || "t",
      qualityScore: numberValue(form, "qualityScore"),
      availability: textValue(form, "availability"),
      certificate: textValue(form, "certificate"),
      transportOk: boolValue(form, "transportOk"),
      regulationOk: boolValue(form, "regulationOk"),
      referencePrice: numberValue(form, "referencePrice"),
      offerPrice: numberValue(form, "offerPrice"),
      evidence: textValue(form, "evidence"),
      note: textValue(form, "note"),
    };
    const errors = validateDataset({schemaVersion:CURRENT_SCHEMA_VERSION,provenance,offers:[offer],demands:[],processors:[],model});
    if(errors.length) { setMessage(errors.join(' ')); return; }
    setOffers((current) => [...current, offer]);
    setMessage(`Angebot ${offer.offerId} wurde gespeichert. Die Kettenplanung nutzt den Datensatz automatisch.`);
    go("chains");
  }

  function submitDemand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const demand: Demand = {
      demandId: nextId("G", demands.map((item) => item.demandId)),
      status: "aktiv",
      buyer: textValue(form, "buyer"),
      sector: textValue(form, "sector"),
      region: textValue(form, "region"),
      materialClass: textValue(form, "materialClass"),
      material: textValue(form, "material"),
      minPurity: numberValue(form, "minPurity"),
      quantity: numberValue(form, "quantity"),
      unit: textValue(form, "unit") || "t",
      certificate: textValue(form, "certificate"),
      targetPrice: numberValue(form, "targetPrice"),
      revenue: numberValue(form, "revenue"),
      contractProbability: numberValue(form, "contractProbability"),
      maxDistance: numberValue(form, "maxDistance"),
      note: textValue(form, "note"),
    };
    const errors = validateDataset({schemaVersion:CURRENT_SCHEMA_VERSION,provenance,offers:[],demands:[demand],processors:[],model});
    if(errors.length) { setMessage(errors.join(' ')); return; }
    setDemands((current) => [...current, demand]);
    setMessage(`Gesuch ${demand.demandId} wurde gespeichert. Die Kettenplanung hat die Kandidaten neu berechnet.`);
    go("chains");
  }

  return (
    <main>
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => go("start")} type="button">
            <span className="brand-mark">CVX</span>
            <span>
              Circular Value Exchange
              <small>Sekundärrohstoffe handeln und Wertketten belegen</small>
            </span>
          </button>
          <div className="header-right">
            <span className="market-status"><i /> RQ2 · Szenariorechnung</span>
            <nav aria-label="Hauptnavigation">
              {pageIds.map((id) => (
                <button
                  className={page === id ? "active" : ""}
                  key={id}
                  onClick={() => go(id)}
                  type="button"
                >
                  {pageLabels[id]}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <p className="dataset-provenance">{provenance}</p><p className="dataset-provenance">{DEMO_ASSUMPTION_NOTICE}</p>
      {page === "start" && (
        <>
          <section className="hero">
            <img alt="Materialproben und digitales Marktplatzregister" src={assetPath("marketplace-hero-v2.png")} />
            <div className="hero-shell">
              <div className="hero-copy">
                <p className="eyebrow">Sekundärrohstoff-Marktplatz</p>
                <h1>Circular Value Exchange</h1>
                <p className="hero-kicker">Material einstellen. Bedarf finden. Wertkette prüfen.</p>
                <p>
                  Angebote und Gesuche werden strukturiert gespeichert, mit Aufbereitungspartnern
                  kombiniert und als nachvollziehbare Wertschöpfungsketten bewertet.
                </p>
                <div className="hero-actions">
                  <button onClick={() => go("marketplace")} type="button">Marktplatz öffnen</button>
                  <button onClick={() => go("offer")} type="button">Material anbieten</button>
                  <button className="secondary" onClick={() => go("cmrs")} type="button">Freitext erfassen</button>
                </div>
              </div>
              <aside className="hero-market-card" aria-label="Aktueller Marktstatus">
                <p className="eyebrow">Marktstatus</p>
                <h2>{rankedChains.length} belastbare Ketten</h2>
                <p>
                  Lokale Register, Vorfilter, Ranking und Prüflog greifen auf dieselben Datensätze zu.
                </p>
                <dl className="hero-ledger">
                  <div><dt>Angebote</dt><dd>{offers.length}</dd></div>
                  <div><dt>Gesuche</dt><dd>{demands.length}</dd></div>
                  <div><dt>Aufbereiter</dt><dd>{processors.length}</dd></div>
                  <div><dt>Prüffälle</dt><dd>{excludedChains.length}</dd></div>
                </dl>
                <button className="secondary" onClick={() => go("chains")} type="button">Ketten ansehen</button>
              </aside>
            </div>
            <div className="market-tape" aria-label="Aktuelle Ketten aus dem Register">
              {scoredChains.slice(0, 3).map((chain) => (
                <button key={chain.chainId} onClick={() => {
                  setSelectedChainId(chain.chainId);
                  go("chains");
                }} type="button">
                  <span>{chain.chainId}</span>
                  <strong>{chain.material}</strong>
                  <small>{chain.supplier} → {chain.buyer}</small>
                  <em>{chain.totalScore ?? "Prüfen"}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="stats-band" aria-label="Registerkennzahlen">
            <article>
              <strong>{cmrsRecords.length}</strong>
              <span>strukturierte Eingänge</span>
            </article>
            <article>
              <strong>{offers.length}</strong>
              <span>aktive Angebote</span>
            </article>
            <article>
              <strong>{demands.length}</strong>
              <span>aktive Gesuche</span>
            </article>
            <article>
              <strong>{exactChains}</strong>
              <span>Kettenkandidaten</span>
            </article>
            <article>
              <strong>{rankedChains.length}</strong>
              <span>gerankt</span>
            </article>
          </section>
        </>
      )}

      <div className="message-bar">
        <strong>Systemstatus</strong>
        <span>{message}</span>
      </div>

      {page === "start" && (
        <section className="page-grid">
          <div className="page-title">
            <p className="eyebrow">Arbeitsablauf</p>
            <h2>Vom Markteintrag zur belastbaren Kette.</h2>
            <p>
              Der Ablauf lässt sich von links nach rechts lesen:
              erfassen, speichern, kombinieren, prüfen und erst dann ranken.
            </p>
          </div>

          <div className="process-flow">
            {[
              ["1", "Erfassen", "Freitext oder Formular wird zu einem Registereintrag.", "cmrs"],
              ["2", "Speichern", "Angebot oder Gesuch landet im passenden Register.", "database"],
              ["3", "Verbinden", "Anbieter, Aufbereiter und Käufer werden kombiniert.", "chains"],
              ["4", "Prüfen", "Material, Reinheit, Zertifikat und Distanz entscheiden.", "chains"],
              ["5", "Belegen", "Score, Datenvertrauen und Ausschlussgrund bleiben sichtbar.", "explain"],
            ].map(([step, title, body, target]) => (
              <button className="process-step" key={step} onClick={() => go(target as PageId)} type="button">
                <span>{step}</span>
                <strong>{title}</strong>
                <small>{body}</small>
              </button>
            ))}
          </div>

          <div className="workbench-grid">
            <article className="wide-panel narrative-panel">
              <p className="eyebrow">Datenfluss</p>
              <h3>Alle Eingaben arbeiten auf denselben Registern.</h3>
              <div className="process-line">
                <span>Eingang</span>
                <span>Register</span>
                <span>Ketten</span>
                <span>Prüfung</span>
                <span>Ranking</span>
              </div>
              <p>
                Daten kommen über <strong>Dateneingang</strong>, <strong>Angebot</strong> oder{" "}
                <strong>Gesuch</strong> ins Register. Die Kettenplanung kombiniert sie mit
                Aufbereitungspartnern und schreibt jede offene Prüfung ins Prüflog.
              </p>
            </article>
            <article className="wide-panel system-ledger">
              <p className="eyebrow">Registerstand</p>
              <dl>
                <div><dt>Angebotsregister</dt><dd>{offers.length} Einträge</dd></div>
                <div><dt>Gesuchsregister</dt><dd>{demands.length} Einträge</dd></div>
                <div><dt>CMRS-Records</dt><dd>{cmrsRecords.length} extrahiert</dd></div>
                <div><dt>Partnerregister</dt><dd>{processors.length} Aufbereiter</dd></div>
                <div><dt>Vorfilter verworfen</dt><dd>{discardedPairs.length} Paare</dd></div>
                <div><dt>Kettenkandidaten</dt><dd>{scoredChains.length} Ketten</dd></div>
                <div><dt>Gerankt</dt><dd>{rankedChains.length} Ketten</dd></div>
                <div><dt>Prüflog</dt><dd>{excludedChains.length + cmrsIssueCount} Einträge</dd></div>
              </dl>
              <div className="form-actions">
                <button onClick={() => go("marketplace")} type="button">Marktbild öffnen</button>
                <button className="secondary" onClick={() => go("database")} type="button">Datenregister</button>
              </div>
            </article>
          </div>

          <p className="formula">{scoreFormula(defaultWeights)}</p>

          <div className="split-section">
            <div>
              <h3>Aktuelle Angebote</h3>
              <div className="card-list">
                {offers.slice(0, 3).map((offer) => (
                  <ListingCard key={offer.offerId} offer={offer} />
                ))}
              </div>
            </div>
            <div>
              <h3>Top-Ketten</h3>
              <ChainTable chains={scoredChains.slice(0, 5)} onSelect={(id) => {
                setSelectedChainId(id);
                go("chains");
              }} />
            </div>
          </div>
        </section>
      )}

      {page === "cmrs" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">RQ1 integriert</p>
            <h2>CMRS-Dateneingang.</h2>
            <p>
              Materialtexte aus Anzeige, E-Mail oder Formular werden in CMRS-Records
              überführt und danach kontrolliert in Angebot oder Gesuch übertragen.
            </p>
          </div>

          <div className="trace-strip">
            {["Freitext", "CMRS-Record", "Validator", "Register", "Kettenplanung"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="cmrs-layout">
            <form className="form-panel cmrs-intake" onSubmit={submitCmrsText}>
              <h3>Materialtext erfassen</h3>
              <label>
                <span>Freitext aus Anzeige, E-Mail oder Formular</span>
                <textarea
                  onChange={(event) => setCmrsText(event.target.value)}
                  value={cmrsText}
                />
              </label>
              <div className="example-row">
                {cmrsSampleTexts.map((sample, index) => (
                  <button
                    className="secondary"
                    key={sample}
                    onClick={() => setCmrsText(sample)}
                    type="button"
                  >
                    Beispiel {index + 1}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button type="submit">CMRS-Record erzeugen</button>
                <button className="secondary" onClick={() => go("database")} type="button">Register ansehen</button>
              </div>
            </form>

            <article className="wide-panel cmrs-method">
              <p className="eyebrow">Integrationscheck</p>
              <h3>Was aus RQ1 übernommen wurde.</h3>
              <div className="integration-checks">
                {integrationReviewItems.map(([title, body]) => (
                  <div key={title}>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="wide-panel">
            <h3>CMRS-Record-Historie</h3>
            <div className="record-list">
              {cmrsRecords.map((record) => (
                <CmrsRecordCard
                  key={record.recordId}
                  onTransfer={transferCmrsRecord}
                  record={record}
                />
              ))}
            </div>
          </div>

          <div className="wide-panel">
            <h3>Validierungsbefund aus RQ1</h3>
            <p className="panel-note">
              Für die Arbeit bleibt wichtig: Der geprüfte Korrekturpfad liefert die
              stabilste Datenqualität. Die Anwendung bildet den Ablauf erklärbar ab und zeigt, wo
              Validierung und Nachweise in RQ2 weiterverwendet werden.
            </p>
            <p>Die Referenzbefunde zur Extraktion gehören zur RQ1-Vorarbeit. Dieser RQ2-Rechenkern erhebt keine neue Extraktionsmessung.</p>
          </div>
        </section>
      )}

      {page === 'chains' && !selectedChain && <section className="page-grid"><h2>Keine Kettenkandidaten</h2><p>{offers.length} Angebote, {demands.length} Gesuche, {processors.length} Aufbereiter.</p><DataTable headers={['Angebot','Gesuch','Grund']} rows={discardedPairs.map(p=>[p.offerId,p.demandId,p.reason])}/><button onClick={()=>go('database')} type="button">Datenregister öffnen</button></section>}
      {page === "marketplace" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Marktplatz</p>
            <h2>Angebote und Gesuche in einem Marktbild.</h2>
            <p>
              Suche nach Material, Unternehmen, Region oder Nachweis. Neue Einträge werden
              sofort von der Kettenplanung berücksichtigt.
            </p>
          </div>

          <div className="market-actions-grid">
            <article className="action-panel supply">
              <span className="pill good">Für Anbieter</span>
              <h3>Material anbieten</h3>
              <p>Material, Menge, Reinheit, Preis, Region und Nachweise erfassen.</p>
              <button onClick={() => go("offer")} type="button">Angebot einstellen</button>
            </article>
            <article className="action-panel demand">
              <span className="pill">Für Käufer</span>
              <h3>Gesuch aufgeben</h3>
              <p>Mindestqualität, Zielpreis, Zertifikat und Distanzlimit festlegen.</p>
              <button onClick={() => go("search")} type="button">Gesuch einstellen</button>
            </article>
            <article className="action-panel builder">
              <span className="pill warn">Erklärbar</span>
              <h3>Ketten prüfen</h3>
              <p>Passende Wertketten, Score, Datenvertrauen und Ausschlussgründe ansehen.</p>
              <button onClick={() => go("chains")} type="button">Kettenplanung öffnen</button>
            </article>
          </div>

          <div className="market-toolbar">
            <div className="search-row">
              <input
                aria-label="Marktplatz durchsuchen"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Material, Unternehmen, Region oder Nachweis suchen"
                value={query}
              />
              <button onClick={() => go("offer")} type="button">Angebot einstellen</button>
              <button className="secondary" onClick={() => go("search")} type="button">Gesuch einstellen</button>
            </div>
          </div>
          <div className="market-summary">
            <MiniScore title={`${filteredOffers.length} Angebote`} body="verfügbare Materialströme mit Menge, Qualität und Nachweis" />
            <MiniScore title={`${filteredDemands.length} Gesuche`} body="Bedarfe mit Mindestqualität, Zielpreis und Distanzlimit" />
            <MiniScore title={`${scoredChains.length} Ketten`} body="live aus Angebot, Gesuch und Aufbereitungspartnern berechnet" />
            <MiniScore title={`${excludedChains.length} Prüfpunkte`} body="Kandidaten, die vor dem Ranking gestoppt wurden" />
          </div>
          <div className="market-columns">
            <div>
              <div className="market-section-head">
                <h3>Angebote</h3>
                <span>{filteredOffers.length} Treffer</span>
              </div>
              <div className="card-list">
                {filteredOffers.map((offer) => (
                  <ListingCard key={offer.offerId} offer={offer} />
                ))}
              </div>
            </div>
            <div>
              <div className="market-section-head">
                <h3>Gesuche</h3>
                <span>{filteredDemands.length} Treffer</span>
              </div>
              <div className="card-list">
                {filteredDemands.map((demand) => (
                  <DemandCard demand={demand} key={demand.demandId} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {page === "offer" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Angebot</p>
            <h2>Materialangebot einstellen.</h2>
            <p>
              Der Eintrag wird sofort gespeichert und gegen vorhandene Gesuche geprüft.
            </p>
          </div>
          <div className="intake-strip">
            <MiniScore title="Speicherung" body="Das Angebot landet direkt im Angebotsregister." />
            <MiniScore title="Kettenerzeugung" body="Material, Menge, Reinheit, Region und Zertifikat steuern die Kettenbildung." />
            <MiniScore title="Ranking" body="FR7 bewertet vier Dimensionen; Datenvertrauen wird separat ausgewiesen." />
          </div>
          <form className="form-panel" onSubmit={submitOffer}>
            <FormGrid>
              <TextField defaultValue="" label="Anbieter" name="supplier" />
              <TextField defaultValue="" label="Branche" name="sector" />
              <SelectField label="Region" name="region" options={regions} />
              <SelectField label="Materialklasse" name="materialClass" options={materialClasses} />
              <TextField defaultValue="" label="Material" name="material" />
              <TextField defaultValue="" label="Form" name="form" />
              <NumberField defaultValue={undefined} label="Reinheit in %" name="purity" />
              <NumberField defaultValue={undefined} label="Menge" name="quantity" />
              <TextField defaultValue="" label="Einheit" name="unit" />
              <NumberField defaultValue={undefined} label="Qualitätsscore" name="qualityScore" />
              <SelectField
                label="Verfügbarkeit"
                name="availability"
                options={Object.keys(AVAILABILITY_SCORES)}
              />
              <TextField defaultValue="" label="Zertifikat" name="certificate" />
              <SelectField label="Transport zulässig" name="transportOk" options={["ja", "nein"]} />
              <SelectField label="Regulatorisch zulässig" name="regulationOk" options={["ja", "nein"]} />
              <NumberField defaultValue={undefined} label="Referenzpreis EUR/t" name="referencePrice" />
              <NumberField defaultValue={undefined} label="Angebotspreis EUR/t" name="offerPrice" />
              <SelectField label="Datenqualität" name="evidence" options={["validiert", "strukturiert", "proxy"]} />
              <TextField defaultValue="" label="Notiz" name="note" />
            </FormGrid>
            <div className="form-actions">
              <button type="submit">Angebot speichern</button>
              <button className="secondary" onClick={() => go("marketplace")} type="button">Zum Marktplatz</button>
            </div>
          </form>
        </section>
      )}

      {page === "search" && (
        <section className="page-grid">
          <div className="page-title compact">
              <p className="eyebrow">Gesuch</p>
            <h2>Gesuch erfassen und passende Angebote prüfen.</h2>
            <p>
              Das Gesuch definiert Mindestanforderungen; die Kettenplanung zeigt passende und ausgeschiedene Ketten.
            </p>
          </div>
          <div className="intake-strip">
            <MiniScore title="Speicherung" body="Das Gesuch landet direkt im Gesuchsregister." />
            <MiniScore title="Muss-Kriterien" body="Material, Reinheit, Zertifikat und Distanz entscheiden vor dem Ranking." />
            <MiniScore title="Marktlogik" body="Referenzpreis, Partnerverlässlichkeit, Abschlussindex und Deckungsbeitrag prägen die Deal-Qualität." />
          </div>
          <div className="split-section">
            <div>
              <div className="search-row single">
                <input
                  aria-label="Angebote suchen"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="z. B. PP, Hanffaser, Altglas"
                  value={query}
                />
              </div>
              <div className="card-list">
                {filteredOffers.slice(0, 5).map((offer) => (
                  <ListingCard key={offer.offerId} offer={offer} />
                ))}
              </div>
            </div>
            <form className="form-panel tight" onSubmit={submitDemand}>
              <h3>Gesuch erfassen</h3>
              <FormGrid>
                <TextField defaultValue="" label="Unternehmen" name="buyer" />
                <TextField defaultValue="" label="Branche" name="sector" />
                <SelectField label="Region" name="region" options={regions} />
                <SelectField label="Materialklasse" name="materialClass" options={materialClasses} />
                <TextField defaultValue={query} label="Benötigtes Material" name="material" />
                <NumberField defaultValue={undefined} label="Mindestreinheit in %" name="minPurity" />
                <NumberField defaultValue={undefined} label="Benötigte Menge" name="quantity" />
                <TextField defaultValue="" label="Einheit" name="unit" />
                <TextField defaultValue="" label="Benötigtes Zertifikat" name="certificate" />
                <NumberField defaultValue={undefined} label="Zielpreis EUR/t" name="targetPrice" />
                <NumberField defaultValue={undefined} label="Verkaufserlös EUR/t" name="revenue" />
                <NumberField defaultValue={undefined} label="Max. Distanz km" name="maxDistance" />
                <NumberField defaultValue={undefined} label="Abschlussindex (Szenario)" name="contractProbability" />
                <TextField defaultValue="" label="Notiz" name="note" />
              </FormGrid>
              <div className="form-actions">
                <button type="submit">Gesuch speichern</button>
              </div>
            </form>
          </div>
        </section>
      )}

      {page === "chains" && selectedChain && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Kettenplanung</p>
            <h2>Ketten erzeugen, prüfen und begründen.</h2>
            <p>
              Die Kettenplanung nimmt die aktuellen Registerdaten, bildet Kandidaten und trennt
              bewertbare Ketten von offenen Prüffällen.
            </p>
          </div>

          <div className="builder-dashboard">
            <article className="wide-panel">
              <p className="eyebrow">Kettenplanung</p>
              <h3>Register, aus denen die Ketten entstehen.</h3>
              <dl>
                <div><dt>Angebote</dt><dd>{offers.length}</dd></div>
                <div><dt>Gesuche</dt><dd>{demands.length}</dd></div>
                <div><dt>Aufbereiter</dt><dd>{processors.length}</dd></div>
                <div><dt>Vorfilter</dt><dd>{discardedPairs.length} verworfen</dd></div>
                <div><dt>Kandidaten</dt><dd>{scoredChains.length}</dd></div>
                <div><dt>Gerankt</dt><dd>{rankedChains.length}</dd></div>
                <div><dt>Nicht gerankt</dt><dd>{excludedChains.length}</dd></div>
              </dl>
              <p>
                Aktive Angebote und Gesuche werden mit passenden Aufbereitern verbunden.
                Stimmen Material oder Klasse nicht, landet das Paar bereits im Vorfilter.
              </p>
            </article>
            <article className="wide-panel">
              <p className="eyebrow">Datenvertrauen und Datenqualität</p>
              <h3>Wie belastbar sind die Kandidaten?</h3>
              <div className="confidence-grid">
                <span><strong>{confidenceStats.hoch}</strong> hoch</span>
                <span><strong>{confidenceStats.mittel}</strong> mittel</span>
                <span><strong>{confidenceStats.niedrig}</strong> niedrig</span>
              </div>
              <p>
                Das Datenvertrauen kommt aus der Datenqualität: validiert, strukturiert oder proxy.
                Sie erklärt die Belastbarkeit der Eingaben, nicht die Höhe des Scores.
              </p>
            </article>
          </div>

          <p className="formula">{scoreFormula(defaultWeights)}</p>

          <div className="chain-flow">
            <FlowBox title="Angebot" badge={selectedChain.offerId} headline={selectedChain.material}>
              <p>{selectedChain.supplier}</p>
              <p>{selectedChain.availableQuantity} {selectedChain.unit} · Reinheit {selectedChain.purity}%</p>
            </FlowBox>
            <span className="flow-arrow">→</span>
            <FlowBox title="Aufbereitung" badge={selectedChain.processorId} headline={selectedChain.processor}>
              <p>{selectedChain.materialClass} · {selectedChain.processCost.toLocaleString('de-DE')} EUR Prozesskosten</p>
              <p>Effizienz {selectedChain.resourceEfficiency} · Zuverlässigkeit {selectedChain.partnerReliability}</p>
            </FlowBox>
            <span className="flow-arrow">→</span>
            <FlowBox title="Gesuch" badge={selectedChain.demandId} headline={selectedChain.buyer}>
              <p>{selectedChain.requiredMaterial} · {selectedChain.requiredQuantity} {selectedChain.unit}</p>
              <p>Score {selectedChain.totalScore?.toFixed(2) ?? "Bewertung offen"} · {selectedChain.status}</p>
            </FlowBox>
          </div>

          <div className="split-section">
            <div>
              <h3>Berechnete Ketten</h3>
              <ChainTable chains={scoredChains} onSelect={setSelectedChainId} selectedId={selectedChain.chainId} />
            </div>
            <aside className="explain-panel">
              <span className={`pill ${statusClass(selectedChain.status)}`}>{selectedChain.status}</span>
              <span className="pill">Datenvertrauen {selectedChain.confidence}</span>
              <h3>{selectedChain.chainId}: {selectedChain.material} zu {selectedChain.buyer}</h3>
              <ScoreBars chain={selectedChain} weights={scoreWeights} />
              <p className="panel-note">{selectedChain.decision}</p>
              <h4>Audit-Trail</h4>
              <ol className="script-list compact-list">
                {selectedChain.auditTrail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <h4>Begründungen</h4>
              <ul>
                {selectedChain.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <button onClick={() => go("explain")} type="button">Nachvollziehbarkeit öffnen</button>
            </aside>
          </div>

          <div className="wide-panel">
            <h3>Prüflog: Warum Kandidaten nicht gerankt werden</h3>
            <DataTable
              headers={["Kette", "Status", "Ausschlussgrund", "Nächster Schritt"]}
              rows={(excludedChains.length ? excludedChains : scoredChains.filter((chain) => chain.status !== "Bewertbar"))

                .map((chain) => [
                  chain.chainId,
                  chain.status,
                  chain.exclusionReasons[0] ?? "Keine offene Prüfung",
                  nextAction(chain),
                ])}
            />
          </div>

          <div className="wide-panel">
            <h3>Vorfilter: Warum aus manchen Paaren keine Kette entsteht</h3>
            <DataTable
              headers={["Angebot", "Gesuch", "Material", "Grund"]}
              rows={discardedPairs.map((pair) => [
                pair.offerId,
                pair.demandId,
                `${pair.offerMaterial} / ${pair.demandMaterial}`,
                pair.reason,
              ])}
            />
          </div>
        </section>
      )}

      {page === "explain" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Methodik</p>
            <h2>Berechnungslogik und Nachvollziehbarkeit.</h2>
            <p>
              Kurzfassung: Datenbasis, Kettenerzeugung, harte Ausschlüsse,
              FR7-Score und Datenvertrauen.
            </p>
          </div>

          <div className="explain-grid">
            <article>
              <span className="pill good">1</span>
              <h3>Datenbasis</h3>
              <p>Angebote, Gesuche, CMRS-Records und Aufbereiter bilden die Register.</p>
            </article>
            <article>
              <span className="pill good">2</span>
              <h3>Kettenplanung</h3>
              <p>Anbieter, Aufbereiter und Käufer werden zu Kandidaten verbunden.</p>
            </article>
            <article>
              <span className="pill warn">3</span>
              <h3>Muss-Kriterien</h3>
              <p>Materialfit, Reinheit, Zertifikat, Transport und Distanz laufen vor dem Score.</p>
            </article>
            <article>
              <span className="pill good">4</span>
              <h3>FR7-Ranking</h3>
              <p>Nur bewertbare Ketten erhalten Score; Datenvertrauen und Begründung bleiben sichtbar.</p>
            </article>
          </div>

          <div className="wide-panel">
            <h3>FR7-Formel</h3>
            <p className="formula">
              {scoreFormula(scoreWeights)}
            </p>
            <div className="score-grid">
              <MiniScore title="Wirtschaftlichkeit" body="Deckungsbeitrag, Erlös, Prozesskosten und Transportkosten." />
              <MiniScore title="Ökologie" body="CO2, Distanz und Ressourceneffizienz." />
              <MiniScore title="Realisierbarkeit" body="Mengenfit, Qualitätsfit, Verfügbarkeit, Reinheitsreserve und Compliance." />
              <MiniScore title="Deal-Qualität" body="Preisattraktivität, qualitative Partnerverlässlichkeit, Abschlussindex und Deckungsbeitrag." />
            </div>
          </div>

          <p className="formula">{scoreFormula(defaultWeights)}</p>

          <div className="wide-panel">
            <h3>Integration RQ1 → RQ2</h3>
            <DataTable
              headers={["RQ1-Baustein", "Übernahme im Marktplatz", "Nutzen für die Wertschöpfungskette"]}
              rows={[
                ["CMRS v1.1.0", "Dateneingang erzeugt strukturierte Records", "Matching läuft auf normalisierten Feldern statt auf Freitext"],
                ["Validator mit E-/W-Codes", "Prüfpunkte erscheinen im CMRS- und Chain-Prüflog", "Ausschlüsse sind belegbar und nicht nur Bauchgefühl"],
                ["Nachweise/Herkunft", "Originaltext, Position und Quelle bleiben sichtbar", "Nachvollziehbarkeit vom Eingang bis zum Ranking"],
                ["Referenzprüfung", "Korrekturpfad als Referenz für robuste Extraktion", "Begründung, warum Datenqualität vor Matching priorisiert wird"],
              ]}
            />
          </div>

          <div className="workbench-grid">
            <article className="wide-panel">
              <p className="eyebrow">Wo sind die Daten?</p>
              <h3>Fünf Register bilden die Datenbasis.</h3>
              <DataTable
                headers={["Register", "Quelle", "Nutzung im System"]}
                rows={[
                  ["Angebote", "Seite Angebot", "Eingang für Material, Menge, Preis, Reinheit und Datenqualität"],
                  ["Gesuche", "Seite Gesuch", "Eingang für Bedarf, Mindestqualität, Zielpreis und Distanzlimit"],
                  ["CMRS-Records", "Seite Dateneingang", "normalisierte Rohdaten aus RQ1 vor Übernahme in den Marktplatz"],
                  ["Aufbereiter", "Referenzregister", "Prozesskosten, Effizienz, Zertifikate und Zuverlässigkeit"],
                  ["Ketten", "live berechnet", "werden aus Angeboten, Gesuchen und Aufbereitern erzeugt"],
                ]}
              />
            </article>
            <article className="wide-panel">
              <p className="eyebrow">Wie entsteht eine Kette?</p>
              <h3>Die Kettenplanung arbeitet in fünf Schritten.</h3>
              <ol className="script-list compact-list">
                <li>Aktive Angebote und aktive Gesuche werden geladen.</li>
                <li>Materialklasse und Material werden verglichen.</li>
                <li>Ein passender Aufbereitungspartner wird eingesetzt.</li>
                <li>Menge, Distanz, CO2, Kosten und Deal-Werte werden berechnet.</li>
                <li>Muss-Kriterien entscheiden, ob der Kandidat gerankt oder ins Prüflog verschoben wird.</li>
              </ol>
            </article>
          </div>

          <div className="wide-panel">
            <h3>Ausschlusslogik und Datenvertrauen</h3>
            <DataTable
              headers={["Prüfung", "Wann kritisch?", "Was wird angezeigt?"]}
              rows={[
                ["Materialfit", "Material ist nur Klassenmatch oder weicht ab", "Nicht gerankt oder Materialprüfung"],
                ["Reinheit", "Angebot liegt unter Mindestanforderung", "Ausschlussgrund mit Prozentwerten"],
                ["Zertifikat", "Nachweis entspricht nicht dem Bedarf", "Zertifikatslücke und nächster Schritt"],
                ["Distanz", "Route überschreitet Maximaldistanz", "Distanzprüfung mit Kilometerwert"],
                ["Datenvertrauen", "Datenqualität ist abgeleitet oder nur strukturiert", "hoch, mittel oder niedrig pro Kette"],
              ]}
            />
          </div>

          <div className="wide-panel">
            <h3>Case-to-Capability-Ableitung</h3>
            <DataTable
              rows={[
                ["MaterialDistrict", "Katalog, Taxonomie, Facettensuche", "Materialprofile und sichtbare Listings"],
                ["KiertoaSuomesta", "Inserate, Standort, Kontakt", "Marktplatz-Basis plus Handover"],
                ["AgriPLaCE", "gewichtetes Matching", "FR7-Scoring und Muss-Kriterien"],
                ["BioeconomyVentures", "Profile, TRL, Evaluation", "Deal-Qualität und Partnerfit"],
                ["SCALE-UP", "regionale Governance", "Datenqualität und Rollenlogik"],
                ["DECIDE", "Wertkettenplanung", "Kettenbildung und Erklärbarkeit"],
              ]}
              headers={["Case", "Beobachtetes Muster", "Umsetzung in der Plattform"]}
            />
          </div>

          <div className="wide-panel">
            <h3>Präsentationsablauf</h3>
            <ol className="script-list">
              <li>Überblick öffnen: Der Marktplatz ist mehr als ein Anzeigenportal.</li>
              <li>Auf der Seite &quot;Angebot&quot; ein neues Materialangebot speichern.</li>
              <li>Auf der Seite &quot;Gesuch&quot; einen passenden Bedarf speichern.</li>
              <li>In der Kettenplanung zeigen, wie daraus Kettenkandidaten entstehen.</li>
              <li>Auf Score, Datenvertrauen und Begründungen verweisen.</li>
              <li>Auf dieser Seite die wissenschaftliche Logik und Case-Ableitung erklären.</li>
            </ol>
          </div>
        </section>
      )}

      {page === 'database' && <DatasetEditor dataset={{schemaVersion:CURRENT_SCHEMA_VERSION,provenance,offers,demands,processors,model}} weights={scoreWeights} results={scoredChains} onApply={(data)=>{setOffers(data.offers);setDemands(data.demands);setProcessors(data.processors);setModel(data.model);setProvenance(data.provenance);setMessage('Datenregister geprüft und übernommen.');}} />}
      {page === "database" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Datenregister</p>
            <h2>Eingaben, Referenzdaten und berechnete Ketten.</h2>
            <p>
              Die veröffentlichte Anwendung zeigt die vollständige Datenbasis. Eingaben dieses
              Browserfensters bleiben im lokalen Register erhalten; Ketten werden live daraus berechnet.
            </p>
          </div>
          <div className="intake-strip">
            <MiniScore title="CMRS-Register" body="Freitext-Records aus dem RQ1-Erkenner, inklusive Validierung, Nachweisen und Datenvertrauen." />
            <MiniScore title="Angebote" body="Angebote aus der Seite Angebot, inklusive Preis, Menge, Qualität und Zertifikat." />
            <MiniScore title="Gesuche" body="Gesuche aus der Seite Gesuch, inklusive Bedarf, Mindestqualität, Zielpreis und Distanzlimit." />
            <MiniScore title="Berechnete Ketten" body="Ketten werden nicht manuell gepflegt, sondern aus den Registern berechnet." />
          </div>
          <div className="database-actions">
            <a download="angebote.csv" href={csvDownload(offers as unknown as Record<string, unknown>[])}>Angebote exportieren</a>
            <a download="gesuche.csv" href={csvDownload(demands as unknown as Record<string, unknown>[])}>Gesuche exportieren</a>
            <a download="ketten.csv" href={csvDownload(scoredChains as unknown as Record<string, unknown>[])}>Ketten exportieren</a>
            <button
              className="secondary"
              onClick={() => {
                setOffers(initialOffers);
                setDemands(initialDemands);
                setCmrsRecords(initialCmrsRecords);
                setScoreWeights(defaultWeights); setProcessors(initialProcessors); setModel(scenario.model); setProvenance(scenario.provenance);
                setMessage("Registerdaten wurden wiederhergestellt.");
              }}
              type="button"
          >
            Registerdaten wiederherstellen
          </button>
          </div>
          <h3>CMRS-Records aus RQ1</h3>
          <DataTable
            headers={["ID", "Typ", "Material", "Kategorie", "Menge", "Region", "Status"]}
            rows={cmrsRecords.map((record) => [
              record.recordId,
              record.recordType === "offer" ? "Angebot" : "Gesuch",
              record.canonicalName,
              cmrsCategoryLabels[record.cmrsCategory] ?? record.cmrsCategory,
              `${record.quantityValue ?? "-"} ${record.quantityUnit}`,
              record.region,
              record.valid ? "CMRS-validiert" : "Prüfpunkte offen",
            ])}
          />
          <h3>Angebote</h3>
          <DataTable
            headers={["ID", "Anbieter", "Material", "Menge", "Region", "Zertifikat"]}
            rows={offers.map((offer) => [
              offer.offerId,
              offer.supplier,
              offer.material,
              `${offer.quantity} ${offer.unit}`,
              offer.region,
              offer.certificate,
            ])}
          />
          <h3>Gesuche</h3>
          <DataTable
            headers={["ID", "Käufer", "Material", "Menge", "Region", "Zertifikat"]}
            rows={demands.map((demand) => [
              demand.demandId,
              demand.buyer,
              demand.material,
              `${demand.quantity} ${demand.unit}`,
              demand.region,
              demand.certificate,
            ])}
          />
          <h3>Aufbereiterregister</h3>
          <DataTable
            headers={["ID", "Partner", "Materialklasse", "Region", "Prozess", "Zertifikate"]}
            rows={processors.map((processor) => [
              processor.processorId,
              processor.name,
              processor.materialClass,
              processor.region,
              processor.focus,
              processor.certificates,
            ])}
          />
          <h3>Aktuelle Score-Einstellungen</h3>
          <DataTable
            headers={["Dimension", "Gewicht", "Wird genutzt für"]}
            rows={(Object.keys(weightLabels) as (keyof ScoreWeights)[]).map((key) => [
              weightLabels[key],
              `${weightPercent(scoreWeights, key)} %`,
              weightDescriptions[key],
            ])}
          />
          <h3>Erzeugte Ketten</h3>
          <ChainTable chains={scoredChains.slice(0, 12)} onSelect={(id) => {
            setSelectedChainId(id);
            go("chains");
          }} />
        </section>
      )}
      <footer className="site-footer">
        <strong>Circular Value Exchange</strong>
        <span>Fachprototyp für RQ2: Marktplatz, CMRS-Dateneingang, Kettenplanung, FR7-Ranking und Audit-Trail.</span>
      </footer>
    </main>
  );
}

function CmrsRecordCard({
  onTransfer,
  record,
}: {
  onTransfer: (record: CmrsRecord) => void;
  record: CmrsRecord;
}) {
  const slots = record.recordType === "offer" ? record.properties : record.constraints;
  const errors = record.validation.filter((issue) => issue.severity === "error");
  const warnings = record.validation.filter((issue) => issue.severity === "warning");

  return (
    <article className="cmrs-record">
      <div className="record-head">
        <div>
          <span className={`pill ${record.valid ? "good" : "warn"}`}>
            {record.valid ? "CMRS-validiert" : "Prüfpunkte offen"}
          </span>
          <span className="pill">{record.recordType === "offer" ? "Angebot" : "Gesuch"}</span>
          <span className="pill">Datenvertrauen {record.confidence}</span>
        </div>
        <strong>{record.recordId}</strong>
      </div>

      <p className="raw-text">{record.rawText}</p>

      <div className="lineage-row">
        <span>Quelle: {record.extractionMethod}</span>
        <span>Herkunft: {record.createdAt.slice(0, 10)}</span>
        <span>Nachweisfelder: {slots.length}</span>
      </div>

      <dl className="cmrs-summary-grid">
        <div><dt>label_raw</dt><dd>{record.materialLabel}</dd></div>
        <div><dt>canonical_name</dt><dd>{record.canonicalName}</dd></div>
        <div><dt>CMRS-Kategorie</dt><dd>{cmrsCategoryLabels[record.cmrsCategory] ?? record.cmrsCategory}</dd></div>
        <div><dt>Marktplatzklasse</dt><dd>{record.materialClass}</dd></div>
        <div><dt>Menge</dt><dd>{record.quantityValue ?? "-"} {record.quantityUnit}</dd></div>
        <div><dt>Region</dt><dd>{record.region}</dd></div>
      </dl>

      <div className="slot-list">
        <strong>{record.recordType === "offer" ? "Properties" : "Constraints"}</strong>
        {slots.length === 0 ? (
          <p>Keine Slots erkannt. Der Datensatz bleibt erklärbar, aber fachlich unvollständig.</p>
        ) : (
          slots.map((slot) => (
            <span key={`${record.recordId}-${slot.propertyKey}-${slot.evidence}`}>
              {slot.label}: {slot.op} {slot.value} {slot.unit}
              {slot.evidenceStart !== undefined ? ` · ${slot.evidenceStart}-${slot.evidenceEnd}` : ""}
            </span>
          ))
        )}
      </div>

      <IssueList errors={errors} warnings={warnings} />

      <details className="json-details">
        <summary>CMRS-JSON anzeigen</summary>
        <pre>{JSON.stringify(cmrsJson(record), null, 2)}</pre>
      </details>

      <details className="json-details">
        <summary>Herkunftsdaten anzeigen</summary>
        <pre>{JSON.stringify(cmrsProvBundle(record), null, 2)}</pre>
      </details>

      <div className="form-actions">
        <button onClick={() => onTransfer(record)} type="button">
          {record.recordType === "offer" ? "Ins Angebotsregister übernehmen" : "Ins Gesuchsregister übernehmen"}
        </button>
      </div>
    </article>
  );
}

function IssueList({
  errors,
  warnings,
}: {
  errors: CmrsValidationIssue[];
  warnings: CmrsValidationIssue[];
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return <p className="issue-clean">Validator: keine Fehler, keine Warnungen.</p>;
  }

  return (
    <div className="issue-list">
      {[...errors, ...warnings].map((issue) => (
        <p className={issue.severity === "error" ? "issue-error" : "issue-warning"} key={`${issue.code}-${issue.path}`}>
          <strong>{issue.code}</strong> {issue.path}: {issue.message}
        </p>
      ))}
    </div>
  );
}

function ListingCard({ offer }: { offer: Offer }) {
  return (
    <article className="listing-card">
      <div className="material-thumb">
        <img alt={`${offer.materialClass} Materialprobe`} src={materialImage(offer.materialClass)} />
        <span>{offer.materialClass}</span>
      </div>
      <div>
        <span className={`pill ${statusClass(offer.status)}`}>{offer.status}</span>
        <span className="pill">{offer.evidence}</span>
      </div>
      <h4>{offer.material} · {offer.form}</h4>
      <p>{offer.supplier} · {offer.sector}</p>
      <dl>
        <div><dt>Menge</dt><dd>{offer.quantity} {offer.unit}</dd></div>
        <div><dt>Reinheit</dt><dd>{offer.purity}%</dd></div>
        <div><dt>Preis</dt><dd>{offer.offerPrice} €/t</dd></div>
        <div><dt>Region</dt><dd>{offer.region}</dd></div>
        <div><dt>Zertifikat</dt><dd>{offer.certificate}</dd></div>
        <div><dt>Verfügbarkeit</dt><dd>{offer.availability}</dd></div>
      </dl>
    </article>
  );
}

function DemandCard({ demand }: { demand: Demand }) {
  return (
    <article className="listing-card demand">
      <div className="material-thumb">
        <img alt={`${demand.materialClass} Materialprobe`} src={materialImage(demand.materialClass)} />
        <span>{demand.materialClass}</span>
      </div>
      <div>
        <span className={`pill ${statusClass(demand.status)}`}>{demand.status}</span>
        <span className="pill">{demand.materialClass}</span>
      </div>
      <h4>Gesuch: {demand.material}</h4>
      <p>{demand.buyer} · {demand.sector}</p>
      <dl>
        <div><dt>Menge</dt><dd>{demand.quantity} {demand.unit}</dd></div>
        <div><dt>Min. Reinheit</dt><dd>{demand.minPurity}%</dd></div>
        <div><dt>Zielpreis</dt><dd>{demand.targetPrice} €/t</dd></div>
        <div><dt>Region</dt><dd>{demand.region}</dd></div>
        <div><dt>Nachweis</dt><dd>{demand.certificate}</dd></div>
        <div><dt>Distanzlimit</dt><dd>{demand.maxDistance} km</dd></div>
      </dl>
    </article>
  );
}

function ChainTable({
  chains,
  onSelect,
  selectedId,
}: {
  chains: ScoredChain[];
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  return (
    <div className="table-wrap chain-table">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Kette</th>
            <th>Material</th>
            <th>Status</th>
            <th>Score</th>
            <th>Datenvertrauen</th>
            <th>Erklärung</th>
          </tr>
        </thead>
        <tbody>
          {chains.map((chain) => (
            <tr
              className={selectedId === chain.chainId ? "selected" : ""}
              key={chain.chainId}
              onClick={() => onSelect(chain.chainId)}
            >
              <td>{chain.rank}</td>
              <td>
                <strong>{chain.chainId}</strong>
                <small>{chain.supplier} → {chain.processor} → {chain.buyer}</small>
              </td>
              <td>{chain.material}</td>
              <td><span className={`pill ${statusClass(chain.status)}`}>{chain.status}</span></td>
              <td>{chain.totalScore ?? "-"}</td>
              <td>{chain.confidence}</td>
              <td><small>{chain.decision}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreBars({ chain, weights }: { chain: ScoredChain; weights: ScoreWeights }) {
  const rows = [
    ["Wirtschaft", chain.economics, weightPercent(weights, "economics")],
    ["Ökologie", chain.ecology, weightPercent(weights, "ecology")],
    ["Realisierbarkeit", chain.feasibility, weightPercent(weights, "feasibility")],
    ["Deal", chain.deal, weightPercent(weights, "deal")],
  ] as const;
  return (
    <div className="score-bars">
      {rows.map(([label, value, weight]) => (
        <div key={label}>
          <span>{label} · {weight}% Gewicht</span>
          <strong>{value === null ? "offen" : value.toFixed(2)}</strong>
          <i style={{ width: `${value ?? 0}%` }} />
        </div>
      ))}
    </div>
  );
}

function FlowBox({
  badge,
  children,
  headline,
  title,
}: {
  badge: string;
  children: ReactNode;
  headline: string;
  title: string;
}) {
  return (
    <article className="flow-box">
      <span className="pill">{badge}</span>
      <small>{title}</small>
      <h3>{headline}</h3>
      {children}
    </article>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function TextField({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return (
    <label>
      <span>{label}</span>
      <input defaultValue={defaultValue} name={name} required={!["certificate"].includes(name)} />
    </label>
  );
}

function NumberField({ defaultValue, label, name }: { defaultValue: number | undefined; label: string; name: string }) {
  return (
    <label>
      <span>{label}</span>
      <input defaultValue={defaultValue} min="0" step="any" max={["purity","minPurity","qualityScore","contractProbability"].includes(name)?SCORE_SCALE.max:undefined} name={name} required type="number" />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label>
      <span>{label}</span>
      <select defaultValue="" name={name} required>
        <option value="" disabled>Bitte wählen</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function MiniScore({ body, title }: { body: string; title: string }) {
  return (
    <article className="mini-score">
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
