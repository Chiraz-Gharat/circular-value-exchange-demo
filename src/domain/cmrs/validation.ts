import { SCORE_SCALE } from '../../config/scoringConfig.ts';
import { ucumUnits } from '../../config/vocabularies.ts';
import type { CmrsRecord,CmrsValidationIssue } from '../../types/cmrs.ts';
export function validateCmrsRecord(record: CmrsRecord) {
  const issues: CmrsValidationIssue[] = [];
  const addIssue = (
    severity: CmrsValidationIssue["severity"],
    code: string,
    rule: string,
    path: string,
    message: string,
  ) => issues.push({ severity, code, rule, path, message });

  if (record.recordType !== "offer" && record.recordType !== "demand") addIssue("error", "E101", "R02", "type", "Datensatztyp unbekannt oder widersprüchlich; manuelle Prüfung erforderlich.");
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
