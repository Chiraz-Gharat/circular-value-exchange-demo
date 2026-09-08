// Uebergabe RQ1 -> RQ2: Aus einem geprueften CMRS-Record werden genau die
// Felder vorbelegt, die fachlich aus dem Materialtext ableitbar sind. Alle
// uebrigen Marktparameter (Anbieter, Preise, Freigaben, Qualitaetsscore,
// Zielpreis, Distanzlimit) bleiben bewusst leer und muessen erfasst werden.
import { cmrsToMarketplaceClass,regionHints,regions } from '../../config/vocabularies.ts';
import type { CmrsRecord } from '../../types/cmrs.ts';

export type CmrsFormPrefill = {
  region: string;
  materialClass: string;
  material: string;
  quantity: number | undefined;
  unit: string;
  purity: number | undefined;
  certificate: string;
  evidence: string;
};

function prefillRegion(record: CmrsRecord) {
  const candidates = [record.region, record.location].filter(Boolean);
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const direct = regions.find((entry) => lower.includes(entry.toLowerCase()));
    if (direct) return direct;
    const city = Object.keys(regionHints).find((hint) => lower.includes(hint));
    if (city) return regionHints[city];
  }
  return "";
}

function prefillPurity(record: CmrsRecord) {
  const slots = record.recordType === "offer" ? record.properties : record.constraints;
  const hit = slots.find((slot) => slot.propertyKey === "purity");
  return typeof hit?.value === "number" ? hit.value : undefined;
}

export function cmrsFormPrefill(record: CmrsRecord): CmrsFormPrefill {
  return {
    region: prefillRegion(record),
    materialClass: cmrsToMarketplaceClass[record.cmrsCategory] ?? "",
    material: record.canonicalName || record.materialLabel,
    quantity: record.quantityValue ?? undefined,
    unit: record.quantityUnit,
    purity: prefillPurity(record),
    certificate: record.standards.join(", "),
    // Datenqualitaet: ein extrahierter und gepruefter CMRS-Record ist
    // strukturiert erfasst; "validiert" bliebe eine fachliche Einstufung,
    // die bewusst der Nutzer trifft.
    evidence: "strukturiert",
  };
}
