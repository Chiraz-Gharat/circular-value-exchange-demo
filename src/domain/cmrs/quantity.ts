import { ucumUnits } from '../../config/vocabularies.ts';

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
