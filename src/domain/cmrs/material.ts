import { canonicalMaterialRules } from '../../config/vocabularies.ts';

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
