import { cmrsSampleTexts, CMRS_DEMO_CREATED_AT } from '../data/demo/cmrs.ts';
export { cmrsSampleTexts } from '../data/demo/cmrs.ts';
import { SCORE_SCALE } from '../config/scoringConfig.ts';
import { CMRS_TRUST_HEURISTIC } from '../config/cmrsConfig.ts';
import { assetPath } from '../config/deployment.ts';
import { canonicalMaterialRules,cmrsCategoryLabels,cmrsPropertyExtractors,cmrsToMarketplaceClass,materialImages,regionHints,regions,ucumUnits } from '../config/vocabularies.ts';
import scenario from '../data/demo/scenario.ts';
import type { Demand,Offer,Processor,ScoredChain } from '../types/model.ts';
export { canonicalMaterialRules,cmrsCategoryLabels,cmrsPropertyExtractors,cmrsToMarketplaceClass,integrationReviewItems,materialClasses,materialImages,regionHints,regions,ucumUnits,weightDescriptions,weightLabels } from '../config/vocabularies.ts';
export const initialOffers: Offer[] = scenario.offers;
export const initialDemands: Demand[] = scenario.demands;
export const initialProcessors: Processor[] = scenario.processors;

export type PageId =
  | "start"
  | "cmrs"
  | "marketplace"
  | "offer"
  | "search"
  | "chains"
  | "explain"
  | "database";

export const pageIds: PageId[] = ["start", "cmrs", "marketplace", "offer", "search", "chains", "explain", "database"];

export const pageLabels: Record<PageId, string> = {
  start: "Start",
  cmrs: "Dateneingang",
  marketplace: "Marktplatz",
  offer: "Angebot",
  search: "Gesuch",
  chains: "Kettenplanung",
  explain: "Methodik",
  database: "Datenregister",
};

export type CmrsRecordType = "offer" | "demand";

export type CmrsSlot = {
  propertyKey: string;
  label: string;
  op: "min" | "max" | "range" | "equals";
  value: number | string;
  unit: string;
  evidence: string;
  evidenceStart?: number;
  evidenceEnd?: number;
};

export type CmrsValidationIssue = {
  code: string;
  rule: string;
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type CmrsRecord = {
  recordId: string;
  recordType: CmrsRecordType;
  rawText: string;
  materialLabel: string;
  canonicalName: string;
  cmrsCategory: string;
  materialClass: string;
  quantityValue: number | null;
  quantityUnit: string;
  location: string;
  region: string;
  properties: CmrsSlot[];
  constraints: CmrsSlot[];
  standards: string[];
  compliance: string[];
  validation: CmrsValidationIssue[];
  valid: boolean;
  confidence: "hoch" | "mittel" | "niedrig";
  extractionMethod: string;
  createdAt: string;
};

export const initialCmrsRecords: CmrsRecord[] = cmrsSampleTexts.map((text, index) =>
  parseCmrsText(text, `CMRS-${String(index + 1).padStart(3, "0")}`, CMRS_DEMO_CREATED_AT[index]),
);

export function nextId(prefix: string, ids: string[]) {
  const next =
    Math.max(
      0,
      ...ids
        .filter((id) => id.startsWith(prefix))
        .map((id) => Number(id.replace(prefix, "")))
        .filter(Number.isFinite),
    ) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function normalizeGermanNumber(value: string) {
  const cleaned = value.trim();
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cleaned)) {
    return Number(cleaned.replaceAll(".", "").replace(",", "."));
  }
  return Number(cleaned.replace(",", "."));
}

export function normalizeCmrsUnit(rawUnit: string) {
  return ucumUnits[rawUnit.toLowerCase()] ?? rawUnit;
}

export function detectCmrsRecordType(rawText: string): CmrsRecordType {
  const text = rawText.toLowerCase();
  if (/nicht\s+gesucht.*angebot|angebot.*nicht\s+gesucht/.test(text)) return "offer";
  if (/\b(suche|gesucht|benötige|benoetige|bedarf|nachfrage|kaufe|kaufen|brauchen)\b/.test(text)) {
    return "demand";
  }
  return "offer";
}

export function detectCmrsMaterial(rawText: string) {
  const hit = canonicalMaterialRules.find((rule) => rule.pattern.test(rawText));
  if (hit) return hit;

  const withoutQuantity = rawText.replace(/\d[\d.,]*\s*(?:kg|g|t|l|liter|m3|tonnen?|kilogramm)\b/i, "");
  const cleaned = withoutQuantity
    .replace(/^(?:ich|wir)?\s*(?:biete|bieten|angebot|suche|gesucht|benötige|benoetige|bedarf)\s*/i, "")
    .split(/[,.]/)[0]
    .trim();

  return {
    pattern: /./,
    label: cleaned || "Unbekanntes Material",
    canonicalName: cleaned || "Unbekanntes Material",
    category: "other",
  };
}

export function extractCmrsQuantity(rawText: string) {
  const match = rawText.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(kg|kilogramm|g|gramm|t|tonne|tonnen|l|liter|m3)\b/i);
  if (!match) return { value: null, unit: "", evidence: "", evidenceStart: undefined, evidenceEnd: undefined };

  return {
    value: normalizeGermanNumber(match[1]),
    unit: normalizeCmrsUnit(match[2]),
    evidence: match[0],
    evidenceStart: match.index,
    evidenceEnd: match.index === undefined ? undefined : match.index + match[0].length,
  };
}

export function detectCmrsLocation(rawText: string) {
  const lower = rawText.toLowerCase();
  const directRegion = regions.find((region) => lower.includes(region.toLowerCase()));
  if (directRegion) return { location: directRegion, region: directRegion };

  const city = Object.keys(regionHints).find((hint) => lower.includes(hint));
  if (city) {
    return {
      location: city[0].toUpperCase() + city.slice(1),
      region: regionHints[city],
    };
  }

  return { location: "", region: regions[0] };
}

export function detectSlotOperator(evidence: string): CmrsSlot["op"] {
  const lower = evidence.toLowerCase();
  if (/(max\.?|höchstens|unter|bis zu|<=|<)/.test(lower)) return "max";
  if (/(min\.?|mind\.?|mindestens|>=|>)/.test(lower)) return "min";
  return "equals";
}

export function extractCmrsSlots(rawText: string) {
  return cmrsPropertyExtractors.flatMap((extractor) => {
    const match = rawText.match(extractor.pattern);
    if (!match) return [];

    const unit = extractor.propertyKey === "particle_size_max" && match[2]
      ? normalizeCmrsUnit(match[2].replace("µ", "u"))
      : extractor.unit;

    return [{
      propertyKey: extractor.propertyKey,
      label: extractor.label,
      op: detectSlotOperator(match[0]),
      value: normalizeGermanNumber(match[1]),
      unit,
      evidence: match[0],
      evidenceStart: match.index,
      evidenceEnd: match.index === undefined ? undefined : match.index + match[0].length,
    }];
  });
}

export function detectCmrsStandards(rawText: string) {
  return Array.from(rawText.matchAll(/\b(?:ISO|DIN|EN|ASTM|IEC)\s*[- ]?[A-Z0-9-]+/gi))
    .map((match) => match[0].replace(/\s+/g, " ").trim());
}

export function detectCmrsCompliance(rawText: string) {
  return Array.from(rawText.matchAll(/\b(REACH|SCIP|RoHS|CLP|WEEE|WFD)\b/gi)).map((match) =>
    match[1].toUpperCase(),
  );
}

export function validateCmrsRecord(record: CmrsRecord) {
  const issues: CmrsValidationIssue[] = [];
  const addIssue = (
    severity: CmrsValidationIssue["severity"],
    code: string,
    rule: string,
    path: string,
    message: string,
  ) => issues.push({ severity, code, rule, path, message });

  if (!record.recordType) addIssue("error", "E101", "R02", "type", "type muss offer oder demand sein.");
  if (!record.rawText) addIssue("error", "E100", "R01", "raw_input.text", "Originaltext fehlt.");
  if (!record.materialLabel || record.materialLabel === "Unbekanntes Material") {
    addIssue("error", "E100", "R01", "material.label_raw", "Materialbezeichnung fehlt.");
  }
  if (!record.location) addIssue("error", "E100", "R01", "context.location", "Standort oder Region fehlt.");
  if (record.recordType === "offer" && (!record.quantityValue || record.quantityValue <= 0)) {
    addIssue("error", "E301", "R03", "quantity", "Angebot erfordert eine positive Mengenangabe.");
  }
  if (record.recordType === "demand" && record.constraints.length === 0) {
    addIssue("error", "E311", "R04", "constraints", "Gesuch erfordert mindestens eine Anforderung.");
  }
  if (record.quantityUnit && !Object.values(ucumUnits).includes(record.quantityUnit)) {
    addIssue("error", "E202", "R06", "quantity.unit_ucum", "Einheit ist nicht in der UCUM-Whitelist.");
  }

  [...record.properties, ...record.constraints].forEach((slot, index) => {
    if (slot.unit === "%" && typeof slot.value === "number" && (slot.value < 0 || slot.value > SCORE_SCALE.max)) {
      addIssue("error", "E401", "R13", `slots[${index}].value`, "Prozentwerte müssen zwischen 0 und 100 liegen.");
    }
    if (!slot.evidence) {
      addIssue("warning", "W501", "R19", `slots[${index}].evidence`, "Textbeleg fehlt.");
    }
  });

  if (record.cmrsCategory === "other") {
    addIssue("warning", "W540", "R28", "material.normalized", "Material wurde nicht sicher normalisiert.");
  }
  if (
    record.cmrsCategory === "metal" &&
    /späne|spaene|chips/i.test(record.rawText) &&
    !record.properties.some((slot) => slot.propertyKey === "oil_content")
  ) {
    addIssue("warning", "W531", "R24", "properties.oil_content", "Metallspäne sollten einen Ölanteil enthalten.");
  }

  return issues;
}

export function cmrsDataTrust(valid: boolean, issueCount: number, evidenceCount: number) {
  if (!valid || issueCount > CMRS_TRUST_HEURISTIC.maxIssues) return "niedrig";
  if (evidenceCount >= CMRS_TRUST_HEURISTIC.highEvidence) return "hoch";
  if (evidenceCount >= CMRS_TRUST_HEURISTIC.mediumEvidence) return "mittel";
  return "niedrig";
}

export function parseCmrsText(rawText: string, recordId: string, createdAt = new Date().toISOString()): CmrsRecord {
  const recordType = detectCmrsRecordType(rawText);
  const material = detectCmrsMaterial(rawText);
  const quantity = extractCmrsQuantity(rawText);
  const location = detectCmrsLocation(rawText);
  const slots = extractCmrsSlots(rawText);
  const quantitySlot: CmrsSlot | null = quantity.value
    ? {
        propertyKey: "quantity",
        label: "Menge",
        op: recordType === "demand" ? "min" : "equals",
        value: quantity.value,
        unit: quantity.unit,
        evidence: quantity.evidence || `${quantity.value} ${quantity.unit}`,
        evidenceStart: quantity.evidenceStart,
        evidenceEnd: quantity.evidenceEnd,
      }
    : null;
  const properties = recordType === "offer" ? slots : [];
  const constraints = recordType === "demand" ? [...(quantitySlot ? [quantitySlot] : []), ...slots] : [];
  const baseRecord: CmrsRecord = {
    recordId,
    recordType,
    rawText,
    materialLabel: material.label,
    canonicalName: material.canonicalName,
    cmrsCategory: material.category,
    materialClass: cmrsToMarketplaceClass[material.category] ?? "Sonstige",
    quantityValue: quantity.value,
    quantityUnit: quantity.unit,
    location: location.location,
    region: location.region,
    properties,
    constraints,
    standards: detectCmrsStandards(rawText),
    compliance: detectCmrsCompliance(rawText),
    validation: [],
    valid: false,
    confidence: "niedrig",
    extractionMethod: "RQ1-CMRS-Erkenner mit geprüfter Feldprojektion und Textbelegen.",
    createdAt,
  };
  const validation = validateCmrsRecord(baseRecord);
  const valid = validation.every((issue) => issue.severity !== "error");
  const evidenceCount = [
    baseRecord.materialLabel,
    baseRecord.quantityValue,
    baseRecord.location,
    ...baseRecord.properties.map((slot) => slot.evidence),
    ...baseRecord.constraints.map((slot) => slot.evidence),
  ].filter(Boolean).length;

  return {
    ...baseRecord,
    validation,
    valid,
    confidence: cmrsDataTrust(valid, validation.length, evidenceCount),
  };
}

export function cmrsJson(record: CmrsRecord) {
  const evidenceFor = (slot: CmrsSlot) => ({
    quote: slot.evidence,
    start: slot.evidenceStart,
    end: slot.evidenceEnd,
  });

  return {
    type: record.recordType,
    id: record.recordId,
    raw_input: { text: record.rawText, language: "de" },
    material: {
      label_raw: record.materialLabel,
      normalized: { canonical_name: record.canonicalName },
      category: record.cmrsCategory,
      category_label: cmrsCategoryLabels[record.cmrsCategory] ?? record.cmrsCategory,
    },
    quantity: record.quantityValue
      ? { value: record.quantityValue, unit_ucum: record.quantityUnit }
      : undefined,
    properties: record.properties.map((slot) => ({
      property_key: slot.propertyKey,
      op: slot.op,
      value: slot.value,
      unit_ucum: slot.unit,
      evidence: [evidenceFor(slot)],
    })),
    constraints: record.constraints.map((slot) => ({
      property_key: slot.propertyKey,
      op: slot.op,
      value: slot.value,
      unit_ucum: slot.unit,
      evidence: [evidenceFor(slot)],
    })),
    standards: record.standards.map((name) => ({ name })),
    safety_compliance: record.compliance.map((regime) => ({ regime })),
    context: { location: record.location, market_region: [record.region] },
    provenance: {
      created_at: record.createdAt,
      source: "rq1_cmrs_intake",
      cmrs_version: "1.1.0",
    },
  };
}

export function cmrsProvBundle(record: CmrsRecord) {
  return {
    "@context": {
      prov: "http://www.w3.org/ns/prov#",
      cmrs: "https://cmrs.example.org/vocab#",
    },
    bundle: `bundle:${record.recordId}`,
    entity: {
      [`entity:raw_${record.recordId}`]: {
        "prov:type": "Originaltext",
        "cmrs:language": "de",
        "cmrs:text_length": record.rawText.length,
      },
      [`entity:cmrs_${record.recordId}`]: {
        "prov:type": "CMRSRecord",
        "cmrs:record_id": record.recordId,
        "cmrs:record_type": record.recordType,
        "cmrs:material_category": record.cmrsCategory,
      },
    },
    activity: {
      [`activity:mapping_${record.recordId}`]: {
        "prov:type": "mapping_activity",
        "prov:startedAtTime": record.createdAt,
        "prov:endedAtTime": record.createdAt,
        "cmrs:source": "rq1_cmrs_intake",
        "cmrs:schema_version": "1.1.0",
      },
    },
    agent: {
      "agent:rq1_cmrs_intake": {
        "prov:type": "tool",
        "prov:label": "RQ1 CMRS-Erkenner",
        "cmrs:version": "1.1.0",
      },
    },
    wasGeneratedBy: [
      { entity: `entity:cmrs_${record.recordId}`, activity: `activity:mapping_${record.recordId}` },
    ],
    used: [
      { activity: `activity:mapping_${record.recordId}`, entity: `entity:raw_${record.recordId}` },
    ],
    wasAssociatedWith: [
      { activity: `activity:mapping_${record.recordId}`, agent: "agent:rq1_cmrs_intake" },
    ],
    wasDerivedFrom: [
      { generatedEntity: `entity:cmrs_${record.recordId}`, usedEntity: `entity:raw_${record.recordId}` },
    ],
  };
}

export function numberValue(form: FormData, name: string) {
  const raw = form.get(name);
  const value = typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
  return form.get(name) === null || String(form.get(name)).trim() === "" ? NaN : value;
}

export function textValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export function boolValue(form: FormData, name: string) {
  return textValue(form, name) === "ja";
}

export function csvDownload(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const body = rows.map((row) =>
    headers
      .map((header) => {
        const value = String(row[header] ?? "");
        return `"${value.replaceAll('"', '""')}"`;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...body].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function statusClass(status: string) {
  if (status === "Bewertbar" || status === "aktiv" || status === "Kette erzeugt") return "good";
  if (status === "Prüfen" || status.includes("offen") || status.includes("prüfung")) return "warn";
  return "risk";
}

export function nextAction(chain: ScoredChain) {
  if (!chain.exactMaterial) return "Materialsubstitution fachlich prüfen oder Gesuch präzisieren.";
  if (!chain.purityOk) return "Qualitätsnachweis anfordern oder Aufbereitungsschritt ergänzen.";
  if (!chain.certificateOk) return "Zertifikat nachreichen oder alternativen Käufer wählen.";
  if (!chain.distanceOk) return "Regionalen Aufbereiter suchen oder Distanzlimit anpassen.";
  if (!chain.transportOk) return "Transportfreigabe mit Anbieter klären.";
  if (!chain.regulationOk) return "Regulatorische Prüfung abschließen.";
  return chain.totalScore === null ? "Offene Modellannahmen fachlich klären." : "Für Verhandlung freigeben.";
}

export function materialImage(materialClass: string) {
  return assetPath(materialImages[materialClass] ?? materialImages.Sonstige);
}

export function isPageId(value: string): value is PageId {
  return pageIds.includes(value as PageId);
}

export { readStoredRows,readStoredWeights } from '../storage/browser.ts';
