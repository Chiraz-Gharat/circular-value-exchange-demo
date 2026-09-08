// Echte RQ1-CMRS-Extraktion ueber den lokalen Flask-Server (siehe app.py,
// llm_fallback.py). Ausschliesslich KI-Extraktion, kein Regex-Fallback: bei
// nicht erreichbarem Server wird ein Fehler geworfen, den der Aufrufer
// anzeigen muss, statt eine unechte Simulation zu liefern.
import { cmrsToMarketplaceClass } from '../../config/vocabularies.ts';
import type { CmrsRecord,CmrsRecordType,CmrsSlot,CmrsValidationIssue } from '../../types/cmrs.ts';

const CMRS_API_URL = 'http://localhost:5000/api/process_text';
const CMRS_VALIDATE_URL = 'http://localhost:5000/api/validate_record';
const CMRS_CATEGORY_URL = 'http://localhost:5000/api/check_category';

type BackendEvidence = { quote?: string; start?: number; end?: number };
type BackendSlot = {
  property_key: string;
  op?: string;
  value: number | string;
  unit_ucum?: string;
  evidence?: BackendEvidence[];
};
type BackendIssue = {
  code: string;
  rule: string;
  severity: 'error' | 'warning';
  path: string;
  message: string;
};

const VALID_OPS: CmrsSlot['op'][] = ['min', 'max', 'range', 'equals'];

function mapSlot(item: BackendSlot): CmrsSlot {
  const evidence = item.evidence?.[0];
  const op = VALID_OPS.includes(item.op as CmrsSlot['op']) ? (item.op as CmrsSlot['op']) : 'equals';
  return {
    propertyKey: item.property_key,
    label: item.property_key,
    op,
    value: item.value,
    unit: item.unit_ucum ?? '',
    evidence: evidence?.quote ?? '',
    evidenceStart: evidence?.start,
    evidenceEnd: evidence?.end,
  };
}

export async function extractCmrsRecordViaApi(rawText: string, recordId: string): Promise<CmrsRecord> {
  let response: Response;
  try {
    response = await fetch(CMRS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText }),
    });
  } catch {
    throw new Error(
      `CMRS-Server unter ${CMRS_API_URL} nicht erreichbar. Bitte "python app.py" lokal starten.`,
    );
  }

  if (!response.ok) {
    throw new Error(`CMRS-Server antwortete mit Status ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error ?? 'CMRS-Extraktion fehlgeschlagen.');
  }

  const full = payload.record.full_json;
  const validationSummary = payload.record.validation_summary;
  const material = full.material ?? {};
  const normalized = material.normalized ?? {};
  const context = full.context ?? {};

  const properties: CmrsSlot[] = (full.properties ?? []).map(mapSlot);
  const constraints: CmrsSlot[] = (full.constraints ?? []).map(mapSlot);

  let quantityValue: number | null = typeof full.quantity?.value === 'number' ? full.quantity.value : null;
  let quantityUnit: string = full.quantity?.unit_ucum ?? '';
  if (quantityValue === null) {
    const quantityConstraint = (full.constraints ?? []).find(
      (item: BackendSlot) => item.property_key === 'quantity',
    );
    if (quantityConstraint) {
      quantityValue = typeof quantityConstraint.value === 'number' ? quantityConstraint.value : null;
      quantityUnit = quantityConstraint.unit_ucum ?? '';
    }
  }

  const validation: CmrsValidationIssue[] = [
    ...(validationSummary?.errors ?? []),
    ...(validationSummary?.warnings ?? []),
  ].map((issue: BackendIssue) => ({
    code: issue.code,
    rule: issue.rule,
    severity: issue.severity,
    path: issue.path,
    message: issue.message,
  }));

  const warningCount: number = validationSummary?.warning_count ?? 0;
  const valid: boolean = Boolean(validationSummary?.valid);
  const recordType = (full.type as CmrsRecordType) ?? 'unknown';

  return {
    recordId,
    recordType,
    rawText,
    materialLabel: material.label_raw ?? '',
    canonicalName: normalized.canonical_name ?? material.label_raw ?? '',
    cmrsCategory: material.category ?? 'other',
    materialClass: cmrsToMarketplaceClass[material.category] ?? 'Sonstige',
    quantityValue,
    quantityUnit,
    location: context.location ?? '',
    region: context.market_region?.[0] ?? '',
    properties,
    constraints,
    standards: (full.standards ?? []).map((item: { name?: string }) => item.name ?? String(item)),
    compliance: (full.safety_compliance ?? []).map((item: { regime?: string }) => item.regime ?? String(item)),
    validation,
    valid,
    confidence: !valid ? 'niedrig' : warningCount > 0 ? 'mittel' : 'hoch',
    extractionMethod: payload.record.llm_label
      ? `KI-Extraktion (${payload.record.llm_label})`
      : 'KI-Extraktion (LLM-first mit Reparatur-Loop)',
    createdAt: full.provenance?.created_at ?? new Date().toISOString(),
  };
}

type BackendEvidenceItem = { quote?: string; start?: number; end?: number };
type BackendPropertyLike = { evidence?: BackendEvidenceItem[]; [key: string]: unknown };

// cmrsJson() (serialization.ts) ist fuer die JSON-Vorschau in der Karte gebaut
// und haengt dafuer ein zusaetzliches, nicht schema-konformes
// "category_label"-Feld an sowie immer ein evidence-Objekt, auch ohne echten
// Beleg. Mit der bisherigen, regelbasierten Demo-Erzeugung fiel das nie auf
// (dort war evidence immer gesetzt); echte LLM-Records haben oft keinen
// Beleg. Fuer den strikten Server-Validator wird hier eine bereinigte Kopie
// gebaut, ohne die Anzeige-Funktion selbst zu aendern.
function sanitizeForValidation(payload: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(payload) as Record<string, unknown> & {
    material?: { category_label?: unknown };
    properties?: BackendPropertyLike[];
    constraints?: BackendPropertyLike[];
  };
  if (clone.material) delete clone.material.category_label;
  for (const key of ['properties', 'constraints'] as const) {
    const items = clone[key];
    if (!Array.isArray(items)) continue;
    clone[key] = items.map((item) => {
      if (!Array.isArray(item.evidence)) return item;
      const cleaned = item.evidence.filter((ev) => ev.quote || (ev.start !== undefined && ev.end !== undefined));
      if (cleaned.length > 0) return { ...item, evidence: cleaned };
      const rest = { ...item };
      delete rest.evidence;
      return rest;
    });
  }
  return clone;
}

// Revalidiert einen (moeglicherweise im Formular korrigierten) CMRS-Record neu,
// ohne die Extraktion zu wiederholen - identisches Muster wie im echten
// Korrekturformular (app.py: /api/validate_record, main.js: applyValidationHighlights).
export async function validateCmrsRecordViaApi(
  cmrsJsonPayload: Record<string, unknown>,
): Promise<{ validation: CmrsValidationIssue[]; valid: boolean }> {
  let response: Response;
  try {
    response = await fetch(CMRS_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: sanitizeForValidation(cmrsJsonPayload) }),
    });
  } catch {
    throw new Error(`CMRS-Server unter ${CMRS_VALIDATE_URL} nicht erreichbar.`);
  }

  if (!response.ok) {
    throw new Error(`Validierung fehlgeschlagen (Status ${response.status}).`);
  }

  const payload = await response.json();
  const summary = payload.validation_summary;
  const validation: CmrsValidationIssue[] = [
    ...(summary?.errors ?? []),
    ...(summary?.warnings ?? []),
  ].map((issue: BackendIssue) => ({
    code: issue.code,
    rule: issue.rule,
    severity: issue.severity,
    path: issue.path,
    message: issue.message,
  }));

  return { validation, valid: Boolean(summary?.valid) };
}

// Neue Materialkategorie vorschlagen: ein LLM-Aufruf prueft zuerst, ob eine
// bestehende Kategorie inhaltlich passt (inkl. Tippfehler-Korrektur), erst
// danach wird wirklich neu registriert (app.py: /api/check_category).
export type CategoryCheckResult = { category: string; label: string; isNew: boolean };

export async function checkOrRegisterCategoryViaApi(
  materialLabel: string,
  proposedLabel: string,
): Promise<CategoryCheckResult> {
  let response: Response;
  try {
    response = await fetch(CMRS_CATEGORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material_label: materialLabel, proposed_label: proposedLabel }),
    });
  } catch {
    throw new Error(`CMRS-Server unter ${CMRS_CATEGORY_URL} nicht erreichbar.`);
  }

  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? `Kategorieprüfung fehlgeschlagen (Status ${response.status}).`);
  }

  return { category: payload.category, label: payload.label, isNew: Boolean(payload.is_new) };
}
