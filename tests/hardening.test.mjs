import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectCmrsLocation } from '../src/domain/cmrs/location.ts';
import { detectCmrsRecordType, cmrsRecordTypeLabel } from '../src/domain/cmrs/record-type.ts';
import { parseCmrsText } from '../src/domain/cmrs/parser.ts';
import { cmrsJson } from '../src/domain/cmrs/serialization.ts';
import { generateChains, scoreChains, validateDataset } from '../src/domain/engine.ts';
import scenario from '../src/data/demo/scenario.ts';
import { DEFAULT_WEIGHTS } from '../src/config/scoringConfig.ts';

test('Fehlender Standort erzeugt keine Ersatzregion', () => {
  assert.deepEqual(detectCmrsLocation('Biete 500 kg PP, Reinheit 92 %.'), { location: '', region: '' });
});
test('Fehlender Standort wird weiterhin validiert', () => {
  const record = parseCmrsText('Biete 500 kg PP, Reinheit 92 %.', 'missing');
  assert.equal(record.region, '');
  assert.equal(record.valid, false);
  assert.ok(record.validation.some(issue => issue.path === 'context.location'));
  assert.deepEqual(cmrsJson(record).context, { location: '', market_region: [''] });
});
test('Expliziter Standort und bekannte Stadt bleiben erkannt', () => {
  assert.deepEqual(detectCmrsLocation('Standort Bayern'), { location: 'Bayern', region: 'Bayern' });
  assert.deepEqual(detectCmrsLocation('Standort Dortmund'), { location: 'Dortmund', region: 'Nordrhein-Westfalen' });
});
for (const text of ['', '500 kg PP, Reinheit 92 %, Berlin.', 'Materialdaten zur Prüfung.', 'Biete PP und suche PP.']) {
  test('Unbekannter oder widersprüchlicher Typ: ' + JSON.stringify(text), () => assert.equal(detectCmrsRecordType(text), 'unknown'));
}
for (const text of ['Biete PP.', 'Angebot: 500 kg PP.', 'Wir verkaufen PP.', 'Nicht gesucht, Angebot: PP.']) {
  test('Explizites Angebot: ' + text, () => assert.equal(detectCmrsRecordType(text), 'offer'));
}
for (const text of ['Suche PP.', 'Bedarf: 500 kg PP.', 'Wir benötigen PP, gesucht in Berlin.']) {
  test('Explizites Gesuch: ' + text, () => assert.equal(detectCmrsRecordType(text), 'demand'));
}
test('Unknown verlangt manuelle Prüfung und wird nicht als Gesuch ausgegeben', () => {
  const record = parseCmrsText('500 kg PP, Reinheit 92 %, Berlin.', 'unknown');
  assert.equal(record.recordType, 'unknown');
  assert.equal(record.valid, false);
  assert.equal(record.confidence, 'niedrig');
  assert.ok(record.validation.some(issue => issue.code === 'E101' && issue.path === 'type'));
  assert.match(cmrsRecordTypeLabel(record.recordType), /manuelle Prüfung/);
  assert.equal(cmrsJson(record).type, 'unknown');
});
test('Processor ohne Legacy-reliability erfüllt das aktive Schema', () => {
  const dataset = structuredClone(scenario);
  for (const processor of dataset.processors) delete processor.reliability;
  assert.deepEqual(validateDataset(dataset), []);
  const run = d => scoreChains(generateChains(d.offers, d.demands, d.processors, d.model), DEFAULT_WEIGHTS, d.model);
  assert.deepEqual(run(dataset), run(scenario));
});
test('Bestehende numerische Legacy-Werte bleiben importierbar', () => assert.deepEqual(validateDataset(scenario), []));
test('Qualitative Partnerkategorie bleibt validiert', () => {
  const dataset = structuredClone(scenario);
  delete dataset.processors[0].reliability;
  dataset.processors[0].reliabilityCategory = 'guter Partnerfit';
  assert.deepEqual(validateDataset(dataset), []);
  dataset.processors[0].reliabilityCategory = 'unbekannte Kategorie';
  assert.ok(validateDataset(dataset).some(issue => issue.includes('Partnerkategorie')));
});
test('Quelltextnachweis: kein regions[0]-Fallback', () => {
  assert.doesNotMatch(readFileSync(new URL('../src/domain/cmrs/location.ts', import.meta.url), 'utf8'), /regions\s*\[\s*0\s*\]/);
});
test('Quelltextnachweis: reliability ist optional', () => {
  const types = readFileSync(new URL('../src/types/model.ts', import.meta.url), 'utf8');
  assert.match(types, /reliability\?: number/);
  assert.doesNotMatch(types, /\breliability: number/);
});
