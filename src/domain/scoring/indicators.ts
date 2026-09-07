import type { PurityThresholds } from '../../config/scoringConfig.ts';
import { ABOVE_REFERENCE_PRICE_SCORE,AVAILABILITY_SCORES,DEFAULT_WEIGHTS,DISTANCE_BANDS,LONG_DISTANCE_SCORE,MASS_TO_TONNES,PRICE_BANDS,PURITY_RESERVE_SCORES,RELIABILITY_SCORES,SCORE_SCALE } from '../../config/scoringConfig.ts';
import type { ScoreWeights } from '../../types/model.ts';
export const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
export const nonnegative = (n: unknown): n is number => finite(n) && n >= 0;
export const percentage = (n: unknown): n is number => nonnegative(n) && n <= SCORE_SCALE.max;
export const canonical = (s: string) => s.normalize('NFKC').trim().toLocaleLowerCase('de-DE');
export const clamp = (n: number) => Math.max(SCORE_SCALE.min, Math.min(SCORE_SCALE.max, n));
export function tonnes(quantity: number, unit: string): number | null {
  const factor = MASS_TO_TONNES[unit.trim().toLowerCase()];
  const result = quantity * factor;
  return finite(quantity) && quantity > 0 && finite(result) && result > 0 ? result : null;
}
export function normalizedWeights(weights: ScoreWeights): ScoreWeights {
  for (const key of Object.keys(DEFAULT_WEIGHTS) as (keyof ScoreWeights)[]) {
    if (weights[key] !== DEFAULT_WEIGHTS[key]) throw new Error('FR7-Hauptgewichte sind fachlich festgelegt und nicht veränderbar.');
  }
  return { ...DEFAULT_WEIGHTS };
}
export function weightPercent(w: ScoreWeights, key: keyof ScoreWeights) { return normalizedWeights(w)[key] * SCORE_SCALE.max; }
export function scoreFormula(w: ScoreWeights) {
  normalizedWeights(w);
  const labels: Record<keyof ScoreWeights,string> = { economics:'Wirtschaftlichkeit', ecology:'Ökologie', feasibility:'Realisierbarkeit', deal:'Deal-Qualität' };
  return 'FR7 = '+(Object.keys(labels) as (keyof ScoreWeights)[]).map(key => w[key].toLocaleString('de-DE')+' × '+labels[key]).join(' + ');
}
export function minMax(value: unknown, values: unknown[], direction: 'benefit' | 'cost', allowNegative = false): number | null {
  const valid = (v: unknown): v is number => finite(v) && (allowNegative || v >= 0);
  if (!valid(value) || !values.length || !values.every(valid)) return null;
  const min = Math.min(...values), max = Math.max(...values);
  if (max === min || !finite(max - min)) return null;
  return clamp(SCORE_SCALE.max * ((direction === 'benefit' ? value - min : max - value) / (max - min)));
}
export function distanceScore(distance: unknown): number | null {
  if (!nonnegative(distance)) return null;
  return DISTANCE_BANDS.find(b => distance <= b.max)?.score ?? LONG_DISTANCE_SCORE;
}
export function priceScore(reference: unknown, offer: unknown): number | null {
  if (!nonnegative(reference) || reference === 0 || !nonnegative(offer)) return null;
  const saving = (reference - offer) / reference;
  return PRICE_BANDS.find(b => saving >= b.min)?.score ?? ABOVE_REFERENCE_PRICE_SCORE;
}
export const availabilityScore = (value: string): number | null => Object.hasOwn(AVAILABILITY_SCORES, value) ? AVAILABILITY_SCORES[value] : null;
export const reliabilityScore = (value: string | null | undefined): number | null => typeof value === 'string' && Object.hasOwn(RELIABILITY_SCORES, value) ? RELIABILITY_SCORES[value] : null;
export function validPurityThresholds(thresholds: PurityThresholds): boolean {
  const values = Object.keys(PURITY_RESERVE_SCORES).map(k => thresholds[k as keyof PurityThresholds]);
  return values.every(nonnegative) && values.every((v,i) => i === 0 || values[i - 1]! > v!);
}
export function purityReserveScore(purity: unknown, required: unknown, thresholds: PurityThresholds): number | null {
  if (!percentage(purity) || !percentage(required)) return null;
  if (purity < required) return SCORE_SCALE.min;
  if (!validPurityThresholds(thresholds)) return null;
  const reserve = purity - required;
  for (const key of Object.keys(PURITY_RESERVE_SCORES) as (keyof PurityThresholds)[]) {
    if (reserve >= thresholds[key]!) return PURITY_RESERVE_SCORES[key];
  }
  return null;
}
export function aggregate(scores: Record<string, number | null>, weights: Readonly<Record<string, number>>): number | null {
  let result = 0;
  for (const key of Object.keys(weights)) {
    const score = scores[key];
    if (!percentage(score)) return null;
    result += score * weights[key];
  }
  return finite(result) ? clamp(result) : null;
}
