import { DEFAULT_WEIGHTS as defaultWeights } from '../config/scoringConfig.ts';
import { STORAGE_KEYS } from '../config/storage.ts';
import { normalizedWeights } from '../domain/scoring/indicators.ts';
import type { ScoreWeights } from '../types/model.ts';
export function readStoredRows<T>(key: string, fallback: T[]) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function readStoredWeights() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.scoreWeights);
    if (!raw) return defaultWeights;
    const parsed = JSON.parse(raw) as Partial<ScoreWeights>;
    const stored = (key: keyof ScoreWeights) => {
      const value = Number(parsed[key]);
      return Number.isFinite(value) ? value : defaultWeights[key];
    };

    const weights = {
      economics: stored("economics"),
      ecology: stored("ecology"),
      feasibility: stored("feasibility"),
      deal: stored("deal"),
    };
    normalizedWeights(weights);
    return weights;
  } catch {
    return defaultWeights;
  }
}
