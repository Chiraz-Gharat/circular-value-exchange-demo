import { cmrsToMarketplaceClass } from '../../config/vocabularies.ts';
import type { CmrsRecord,CmrsSlot } from '../../types/cmrs.ts';
import { cmrsDataTrust } from './confidence.ts';
import { detectCmrsLocation } from './location.ts';
import { detectCmrsMaterial } from './material.ts';
import { extractCmrsQuantity } from './quantity.ts';
import { detectCmrsRecordType } from './record-type.ts';
import { detectCmrsCompliance,detectCmrsStandards,extractCmrsSlots } from './slots.ts';
import { validateCmrsRecord } from './validation.ts';
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
