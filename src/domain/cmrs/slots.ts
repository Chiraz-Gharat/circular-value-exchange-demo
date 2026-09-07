import { cmrsPropertyExtractors } from '../../config/vocabularies.ts';
import type { CmrsSlot } from '../../types/cmrs.ts';
import { normalizeCmrsUnit,normalizeGermanNumber } from './quantity.ts';
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
