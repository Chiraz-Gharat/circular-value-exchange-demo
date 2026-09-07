import type { PurityThresholds } from '../config/scoringConfig.ts';
import type { Demand,Offer,Processor } from './model.ts';
export type ModelConfig = {
  version: string;
  demoAssumptions: {
    DEMO_TRANSPORT_EMISSION_FACTOR: number;
    DEMO_PROCESS_EMISSION_FACTOR: number;
    DEMO_TRANSPORT_COST_EUR_PER_TKM: number;
  };
  purityReserveThresholds: PurityThresholds;
  routes: { from: string; to: string; distanceKm: number; source: string }[];
};
export type Dataset = { schemaVersion: string; provenance: string; offers: Offer[]; demands: Demand[]; processors: Processor[]; model: ModelConfig };
