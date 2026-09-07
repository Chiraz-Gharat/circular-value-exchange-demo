import test from 'node:test';
import assert from 'node:assert/strict';
import scenario from '../src/data/demo/scenario.ts';
import { validateDataset } from '../src/domain/validation/dataset.ts';
import { minMax } from '../src/domain/scoring/indicators.ts';

test('Leere Reinheitskonfiguration ist nicht gleich vier offenen Schwellen', () => {
  const data = structuredClone(scenario);
  data.model.purityReserveThresholds = {};
  assert.ok(validateDataset(data).some(error => error.includes('Reinheitsgrenzen')));
});
test('Unbekannte Partnerkategorie wird beim Import abgewiesen', () => {
  const data = structuredClone(scenario);
  data.processors[0].reliabilityCategory = 'fast perfekt';
  assert.ok(validateDataset(data).some(error => error.includes('Partnerkategorie')));
});
test('Große endliche Zahlen werden ohne Zwischenüberlauf normalisiert', () => {
  assert.equal(minMax(5e307, [0, 1e308], 'benefit'), 50);
});
