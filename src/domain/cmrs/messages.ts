// Fehlermeldungen zeigen dieselbe Bezeichnung wie das Formular-Label, nicht
// den technischen Schema-Pfad (z. B. "Material" statt "material.label_raw") -
// identisches Muster wie main.js: applyValidationHighlights/pathToLabel.
import type { CmrsValidationIssue } from '../../types/cmrs.ts';

const CMRS_PATH_LABELS: Record<string, string> = {
  type: "Art",
  "material.label_raw": "Material",
  "material.category": "Kategorie",
  "context.location": "Standort",
  "quantity.value": "Menge",
  "quantity.unit_ucum": "Menge",
  quantity: "Menge",
};

export function cmrsFriendlyIssueMessage(issue: CmrsValidationIssue) {
  const label = CMRS_PATH_LABELS[issue.path];
  return label ? issue.message.replaceAll(issue.path, label) : issue.message;
}
