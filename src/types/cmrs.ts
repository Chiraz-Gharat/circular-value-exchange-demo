
export type CmrsRecordType = "offer" | "demand" | "unknown";

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
