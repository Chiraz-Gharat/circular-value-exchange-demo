import type { FormEvent } from 'react';
import { useEffect,useMemo,useState } from 'react';
import { DEFAULT_WEIGHTS as defaultWeights } from '../../config/scoringConfig.ts';
import { CURRENT_SCHEMA_VERSION,STORAGE_KEYS } from '../../config/storage.ts';
import scenario from '../../data/demo/scenario.ts';
import type { CmrsRecord,PageId } from '../../domain/context.ts';
import { boolValue,cmrsRecordTypeLabel,cmrsSampleTexts,initialCmrsRecords,initialDemands,initialOffers,initialProcessors,isPageId,materialClasses,nextId,numberValue,readStoredRows,readStoredWeights,textValue } from '../../domain/context.ts';
import { extractCmrsRecordViaApi } from '../../domain/cmrs/client.ts';
import type { CmrsFormPrefill } from '../../domain/cmrs/prefill.ts';
import { cmrsFormPrefill } from '../../domain/cmrs/prefill.ts';
import type { ModelConfig } from '../../domain/engine.ts';
import { generateChains,rejectedPairs,scoreChains,validateDataset } from '../../domain/engine.ts';
import type { Demand,Offer,Processor,ScoreWeights } from '../../types/model.ts';
export function useWorkspace() {
  const [page, setPage] = useState<PageId>("start");
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [demands, setDemands] = useState<Demand[]>(initialDemands);
  const [processors, setProcessors] = useState<Processor[]>(initialProcessors);
  const [model, setModel] = useState<ModelConfig>(scenario.model);
  const [provenance, setProvenance] = useState(scenario.provenance);
  const [cmrsRecords, setCmrsRecords] = useState<CmrsRecord[]>(initialCmrsRecords);
  const [cmrsText, setCmrsText] = useState(cmrsSampleTexts[0]);
  const [cmrsLoading, setCmrsLoading] = useState(false);
  const [extraMaterialClasses, setExtraMaterialClasses] = useState<string[]>([]);
  // Vorbelegung aus einem uebernommenen CMRS-Record. Die Formulare arbeiten mit
  // unkontrollierten Feldern (defaultValue), deshalb erzwingt der hochgezaehlte
  // prefillKey ein Neuaufsetzen, sobald ein weiterer Record uebernommen wird.
  const [prefill, setPrefill] = useState<CmrsFormPrefill | null>(null);
  const [prefillVersion, setPrefillVersion] = useState(0);
  const prefillKey = `prefill-${prefillVersion}`;
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

  async function submitCmrsText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCmrsLoading(true);
    try {
      const record = await extractCmrsRecordViaApi(
        cmrsText,
        nextId("CMRS-", cmrsRecords.map((item) => item.recordId)),
      );
      setCmrsRecords((current) => [record, ...current]);
      setMessage(
        `${record.recordId} wurde als ${cmrsRecordTypeLabel(record.recordType)} strukturiert: ${
          record.valid ? "CMRS-validiert" : "mit offenen Prüfpunkten"
        }.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CMRS-Extraktion fehlgeschlagen.");
    } finally {
      setCmrsLoading(false);
    }
  }

  function updateCmrsRecord(updated: CmrsRecord) {
    setCmrsRecords((current) => current.map((item) => (item.recordId === updated.recordId ? updated : item)));
  }

  function registerMaterialClass(materialClass: string) {
    setExtraMaterialClasses((current) =>
      current.includes(materialClass) || materialClasses.includes(materialClass)
        ? current
        : [...current, materialClass],
    );
  }

  function transferCmrsRecord(record: CmrsRecord) {
    if (record.recordType === 'unknown') { setMessage('Datensatztyp unbekannt; manuelle Prüfung erforderlich.'); return; }
    setMessage(record.valid ? 'Materialdaten aus dem CMRS-Record wurden übernommen. RQ2-Marktparameter und Freigaben müssen ausdrücklich erfasst werden.' : 'Offene RQ1-Prüfpunkte müssen vor einer Freigabe geklärt werden.');
    if(record.valid) {
      setPrefill(cmrsFormPrefill(record));
      setPrefillVersion((current) => current + 1);
      go(record.recordType === 'offer' ? 'offer' : 'search');
    }
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


  return { page, offers, setOffers, demands, setDemands, processors, setProcessors, model, setModel, provenance, setProvenance, cmrsRecords, setCmrsRecords, cmrsText, setCmrsText, cmrsLoading, extraMaterialClasses, registerMaterialClass, prefill, prefillKey, scoreWeights, setScoreWeights, query, setQuery, setSelectedChainId, message, setMessage, chains, discardedPairs, scoredChains, selectedChain, exactChains, rankedChains, excludedChains, cmrsIssueCount, confidenceStats, filteredOffers, filteredDemands, go, submitCmrsText, updateCmrsRecord, transferCmrsRecord, submitOffer, submitDemand };
}
export type WorkspaceState = ReturnType<typeof useWorkspace>;
