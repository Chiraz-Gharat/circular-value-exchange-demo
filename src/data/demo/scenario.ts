import { DEMO_ASSUMPTIONS } from '../../config/demoAssumptions.ts';
import { MODEL_VERSION,UNDEFINED_PURITY_THRESHOLDS } from '../../config/scoringConfig.ts';
import { CURRENT_SCHEMA_VERSION } from '../../config/storage.ts';
import type { Dataset } from '../../types/dataset.ts';
import demands from './demands.json' with { type: 'json' };
import offers from './offers.json' with { type: 'json' };
import processors from './processors.json' with { type: 'json' };
import routes from './routes.json' with { type: 'json' };
const scenario: Dataset = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  provenance: 'Synthetisches Testszenario. Firmen, Mengen, Preise, Strecken und Indizes sind keine Marktbeobachtungen.',
  offers, demands, processors,
  model: { version: MODEL_VERSION, demoAssumptions: { ...DEMO_ASSUMPTIONS }, purityReserveThresholds: { ...UNDEFINED_PURITY_THRESHOLDS }, routes },
};
export default scenario;
