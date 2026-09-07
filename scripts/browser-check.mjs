import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';
import scenario from '../src/data/demo/scenario.ts';
import { DEFAULT_WEIGHTS } from '../src/config/scoringConfig.ts';
import { generateChains, scoreChains } from '../src/domain/engine.ts';

const basePath = process.env.APP_BASE_PATH || '/';
const remote = process.env.BROWSER_BASE_URL;
const server = remote ? null : await preview({ preview: { port: 8032, strictPort: true } });
const base = remote || `http://127.0.0.1:8032${basePath}`;
const browser = await chromium.launch({ headless: true });
const failures = [];
const checks = [];
await mkdir('test-results', { recursive: true });

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await page.goto(base);
    await page.getByRole('heading', { name: 'Circular Value Exchange', exact: true }).waitFor();
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    const routes = ['start', 'cmrs', 'marketplace', 'offer', 'search', 'chains', 'explain', 'database'];
    for (const [index, route] of routes.entries()) {
      await nav.getByRole('button').nth(index).click();
      await page.waitForURL(`**/#${route}`);
      await page.reload();
      await page.waitForFunction(() => document.querySelector('h2') !== null);
      await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
      assert.equal(await page.locator('main').count(), 1);
      assert.ok(await page.locator('main').innerText());
      checks.push(`${width}px: Navigation, Reload und Assets #${route}`);
      if (['start', 'chains', 'database'].includes(route)) await page.screenshot({ path: `test-results/${width}-${route}.png`, fullPage: true });
    }
    await page.goto(base + '#cmrs');
    await page.getByRole('button', { name: 'CMRS-Record erzeugen', exact: true }).click();
    await page.getByText(/CMRS-004 wurde als/).waitFor();
    await page.reload();
    await page.getByText('CMRS-004', { exact: true }).first().waitFor();
    checks.push(`${width}px: CMRS-Extraktion und Persistenz`);

    for (const kind of ['offer', 'search']) {
      await page.goto(base + '#' + kind);
      const submit = page.getByRole('button', { name: kind === 'offer' ? 'Angebot speichern' : 'Gesuch speichern', exact: true });
      const fields = kind === 'offer' ? {
        supplier: 'Browserprüfung Angebot', sector: 'Test', material: 'PP', form: 'Granulat', purity: '95', quantity: '2', qualityScore: '80', certificate: 'ISO14001', referencePrice: '1000', offerPrice: '700', note: 'Synthetischer Akzeptanztest',
      } : {
        buyer: 'Browserprüfung Gesuch', sector: 'Test', material: 'PP', minPurity: '90', quantity: '1', certificate: 'ISO14001', targetPrice: '900', revenue: '1200', contractProbability: '80', maxDistance: '1500', note: 'Synthetischer Akzeptanztest',
      };
      for (const [name, value] of Object.entries(fields)) await page.locator(`[name="${name}"]`).fill(value);
      await page.locator('[name="materialClass"]').selectOption('Kunststoff');
      await page.locator('[name="region"]').selectOption('Bayern');
      await page.locator('[name="unit"]').fill('t');
      if (kind === 'offer') {
        await page.locator('[name="transportOk"]').selectOption('ja');
        await page.locator('[name="regulationOk"]').selectOption('ja');
        await page.locator('[name="availability"]').selectOption('kontinuierlich');
        await page.locator('[name="evidence"]').selectOption('proxy');
      }
      await submit.click();
      await page.waitForURL('**/#chains');
      await page.getByText(kind === 'offer' ? /Angebot A\d+ wurde gespeichert/ : /Gesuch G\d+ wurde gespeichert/).waitFor();
      checks.push(`${width}px: ${kind === 'offer' ? 'Angebot' : 'Gesuch'} über Formular gespeichert`);
    }

    const dataset = structuredClone(scenario);
    // Ausschließlich browserlokale Testkonfiguration, keine fachliche Kalibrierung.
    dataset.model.purityReserveThresholds = { deutlich: 10, klar: 5, knapp: 1, minimal: 0 };
    for (const processor of dataset.processors) processor.reliabilityCategory = 'guter Partnerfit';
    dataset.model.routes.forEach((route,index) => { route.distanceKm = index + 1; route.source = 'Synthetische Browser-Teststrecke'; });
    const expected = scoreChains(generateChains(dataset.offers, dataset.demands, dataset.processors, dataset.model), DEFAULT_WEIGHTS, dataset.model);
    assert.ok(expected.some(chain => chain.totalScore !== null));
    assert.ok(expected.some(chain => chain.exclusionReasons.length));
    await page.goto(base + '#database');
    await page.getByRole('button', { name: 'Register bearbeiten', exact: true }).click();
    await page.getByRole('textbox', { name: 'Register und Modellkonfiguration' }).fill(JSON.stringify(dataset));
    await page.getByRole('button', { name: 'Prüfen und übernehmen', exact: true }).click();
    await page.goto(base + '#chains');
    await page.getByText('Bewertbar', { exact: true }).first().waitFor();
    await page.getByText('ausgeschlossen', { exact: true }).first().waitFor();
    await page.reload();
    await page.getByText('Bewertbar', { exact: true }).first().waitFor();
    await page.getByText(/Reinheits|Zertifikat|Transport/).first().waitFor();
    await page.goto(base + '#database');
    const downloadReady = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Berechnung exportieren', exact: true }).click();
    const download = await downloadReady;
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.deepEqual(exported.results, expected, 'UI-Export muss exakt der unabhängigen Fachberechnung entsprechen');
    checks.push(`${width}px: Import, Chain-Bildung, vollständiger FR7-Testlauf, Hard Constraints, Gründe und Reload`);
    await page.close();
  }
  assert.deepEqual(failures, [], 'Browserfehler oder fehlgeschlagene Asset-Anfragen');
} finally {
  await browser.close();
  await server?.close();
  await writeFile('test-results/browser-results.json', JSON.stringify({ base, checks, failures }, null, 2));
}
process.stdout.write(`${checks.length} Browserprüfungen bestanden; keine Console Errors oder HTTP-Fehler.\n`);
