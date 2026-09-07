import { cmrsCategoryLabels } from '../../config/vocabularies.ts';
import type { CmrsRecord,CmrsSlot } from '../../types/cmrs.ts';
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
