// Fachliche Zielvorgabe vom 7. September 2026; keine empirische Kalibrierung.
export const DEFAULT_WEIGHTS = { economics: 0.35, ecology: 0.25, feasibility: 0.25, deal: 0.15 } as const;
export const DIMENSION_WEIGHTS = {
  economics: { contribution: 0.40, revenue: 0.25, processCost: 0.20, transportCost: 0.15 },
  ecology: { co2: 0.45, resourceEfficiency: 0.30, distance: 0.25 },
  feasibility: { quantity: 0.30, quality: 0.25, availability: 0.20, purityReserve: 0.15, compliance: 0.10 },
  deal: { price: 0.35, reliability: 0.30, probability: 0.20, contribution: 0.15 },
} as const;
export const DISTANCE_BANDS = [
  { max: 50, score: 100 }, { max: 150, score: 85 }, { max: 300, score: 70 },
  { max: 500, score: 55 }, { max: 800, score: 40 }, { max: 1200, score: 25 },
] as const;
export const LONG_DISTANCE_SCORE = 10;
export const PRICE_BANDS = [
  { min: 0.30, score: 100 }, { min: 0.20, score: 80 }, { min: 0.10, score: 60 }, { min: 0, score: 40 },
] as const;
export const ABOVE_REFERENCE_PRICE_SCORE = 20;
export const AVAILABILITY_SCORES: Record<string, number> = { kontinuierlich: 100, regelmäßig: 80, saisonal: 60, 'einmalige Charge': 40, unsicher: 20 };
export const RELIABILITY_SCORES: Record<string, number> = {
  'sehr zuverlässig / passende Kapazität / klare Rolle': 100,
  'guter Partnerfit': 80, 'akzeptabler Partnerfit': 60, 'unsicherer Partnerfit': 40, 'schwacher Partnerfit': 20,
};
export const PURITY_RESERVE_SCORES = { deutlich: 100, klar: 80, knapp: 60, minimal: 30 } as const;
export type PurityThresholds = Record<keyof typeof PURITY_RESERVE_SCORES, number | null>;
// Prozentpunkte oberhalb der Mindestreinheit; noch fachlich zu definieren.
export const UNDEFINED_PURITY_THRESHOLDS: PurityThresholds = { deutlich: null, klar: null, knapp: null, minimal: null };
export const SCORE_SCALE = { min: 0, max: 100 } as const;
export const MASS_TO_TONNES: Record<string, number> = { t: 1, kg: 0.001, g: 0.000001 };
export const MODEL_VERSION = 'FR7-reviewed-3.0';
