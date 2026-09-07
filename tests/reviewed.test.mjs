import test from 'node:test';
import assert from 'node:assert/strict';
import scenario from '../src/data/demo/scenario.ts';
import { DEFAULT_WEIGHTS, DIMENSION_WEIGHTS, AVAILABILITY_SCORES, RELIABILITY_SCORES } from '../src/config/scoringConfig.ts';
import { minMax, distanceScore, priceScore, availabilityScore, reliabilityScore, purityReserveScore, aggregate } from '../src/domain/scoring/indicators.ts';
import { generateChains, scoreChains, rankedChains, hardConstraintReasons, dimensionScores, validateDataset } from '../src/domain/engine.ts';

function fixtures() {
  const d = structuredClone(scenario);
  // Ausschließlich Testgrenzen, keine fachliche Empfehlung oder Demo-Konfiguration.
  d.model.purityReserveThresholds = { deutlich: 10, klar: 5, knapp: 1, minimal: 0 };
  const candidates = generateChains(d.offers,d.demands,d.processors,d.model).filter(c => !hardConstraintReasons(c).length).slice(0,3);
  candidates.forEach((c,i) => Object.assign(c, {
    matchedQuantity: 1, requiredQuantity: 1, profit: i * 10 - 5,
    revenue: 100 + i * 10, processCost: 10 + i, transportCost: 2 + i,
    co2Kg: 20 + i, partnerReliability: reliabilityScore('guter Partnerfit'),
  }));
  return { d, candidates };
}
test('Dokumentierte Hauptgewichte',()=>assert.deepEqual(DEFAULT_WEIGHTS,{economics:.35,ecology:.25,feasibility:.25,deal:.15}));
for(const [name,expected] of Object.entries({
  economics:{contribution:.4,revenue:.25,processCost:.2,transportCost:.15},
  ecology:{co2:.45,resourceEfficiency:.3,distance:.25},
  feasibility:{quantity:.3,quality:.25,availability:.2,purityReserve:.15,compliance:.1},
  deal:{price:.35,reliability:.3,probability:.2,contribution:.15},
})) test('Dimensionsgewichte '+name,()=>{
  assert.deepEqual(DIMENSION_WEIGHTS[name],expected);
  const scores=Object.fromEntries(Object.keys(expected).map((key,i)=>[key,(i+1)*10]));
  const manual=Object.entries(expected).reduce((sum,[key,w])=>sum+w*scores[key],0);
  assert.equal(dimensionScores(scores)[name],manual);
});
for(const [distance,expected] of [[0,100],[50,100],[50.01,85],[51,85],[150,85],[150.01,70],[151,70],[300,70],[300.01,55],[301,55],[500,55],[500.01,40],[501,40],[800,40],[800.01,25],[801,25],[1200,25],[1200.01,10],[1201,10]]) {
  test('Distanzgrenze '+distance,()=>assert.equal(distanceScore(distance),expected));
}
test('Ungültige Distanzen',()=>{for(const v of [-1,NaN,Infinity,null])assert.equal(distanceScore(v),null);});
for(const [key,value] of Object.entries(AVAILABILITY_SCORES))test('Verfügbarkeit '+key,()=>assert.equal(availabilityScore(key),value));
for(const [key,value] of Object.entries(RELIABILITY_SCORES))test('Partner '+key,()=>assert.equal(reliabilityScore(key),value));
test('Unbekannte qualitative Werte',()=>{assert.equal(availabilityScore('unbekannt'),null);assert.equal(reliabilityScore('85'),null);});
for(const [offer,expected] of [[70,100],[70.01,80],[80,80],[80.01,60],[90,60],[90.01,40],[100,40],[100.01,20]])test('Preisgrenze '+offer,()=>assert.equal(priceScore(100,offer),expected));
test('Fehlende Preise und Nullreferenz',()=>{assert.equal(priceScore(0,10),null);assert.equal(priceScore(100,null),null);});
test('Benefit normal',()=>assert.equal(minMax(3,[1,3,5],'benefit'),50));
test('Cost normal',()=>assert.equal(minMax(2,[1,3,5],'cost'),75));
test('Konstanter Bereich bleibt offen',()=>assert.equal(minMax(4,[4,4],'benefit'),null));
test('Fehlende Werte',()=>{assert.equal(minMax(null,[1,2],'cost'),null);assert.equal(minMax(1,[],'cost'),null);});
test('NaN und Infinity',()=>{for(const value of [NaN,Infinity,-Infinity]){assert.equal(minMax(value,[0,1],'benefit'),null);assert.equal(minMax(0,[0,value],'benefit'),null);}});
test('Negative Kosten unzulässig, negativer Deckungsbeitrag zulässig',()=>{assert.equal(minMax(-1,[-1,1],'cost'),null);assert.equal(minMax(-1,[-1,1],'benefit',true),0);});
test('Fehlende Reinheitsschwellen erzeugen keinen Score',()=>assert.equal(purityReserveScore(95,90,scenario.model.purityReserveThresholds),null));
test('Reinheitsreserve-Skala nur bei definierten Testgrenzen',()=>{
  const {d}=fixtures();for(const [purity,expected] of [[100,100],[95,80],[91,60],[90,30],[89,0]])assert.equal(purityReserveScore(purity,90,d.model.purityReserveThresholds),expected);
});
for(const [key,reason] of [['exactMaterial','Material'],['purityOk','Mindestreinheit'],['certificateOk','Zertifikat'],['transportOk','Transport'],['regulationOk','Regulatorische']])test('Hard Constraint '+key,()=>{
  const {d,candidates}=fixtures();candidates[0][key]=false;
  const results=scoreChains(candidates,DEFAULT_WEIGHTS,d.model);
  const c=results.find(c=>c.chainId===candidates[0].chainId);
  assert.equal(c.totalScore,null);assert.equal(c.status,'ausgeschlossen');assert.match(c.exclusionReasons.join(' '),new RegExp(reason));
  assert.ok(!rankedChains(results).some(c=>c.chainId===candidates[0].chainId));
});
test('Vollständiges Ranking sortiert und begrenzt',()=>{
  const {d,candidates}=fixtures();const r=rankedChains(scoreChains(candidates,DEFAULT_WEIGHTS,d.model));
  assert.equal(r.length,3);
  for(let i=0;i<r.length;i++){assert.ok(r[i].totalScore>=0&&r[i].totalScore<=100);if(i)assert.ok(r[i-1].totalScore>=r[i].totalScore);}
  const c=r[0];assert.equal(c.totalScore,aggregate({economics:c.economics,ecology:c.ecology,feasibility:c.feasibility,deal:c.deal},DEFAULT_WEIGHTS));
});
test('Demo bleibt ohne erfundene Schwellen offen',()=>{
  assert.deepEqual(validateDataset(scenario),[]);
  const r=scoreChains(generateChains(scenario.offers,scenario.demands,scenario.processors,scenario.model),DEFAULT_WEIGHTS,scenario.model);
  assert.equal(rankedChains(r).length,0);assert.ok(r.some(c=>c.unresolvedReasons.some(s=>s.includes('Reinheitsreserve'))));
});
test('Zertifikat und Compliance-Score stammen aus Muss-Prüfung',()=>{const {d,candidates}=fixtures();assert.equal(scoreChains(candidates,DEFAULT_WEIGHTS,d.model)[0].indicators.compliance,100);});
test('Ausgeschlossene Ausreißer ändern Normalisierungsbereich nicht',()=>{
  const {d,candidates}=fixtures();const a=scoreChains(candidates,DEFAULT_WEIGHTS,d.model);
  const extra={...candidates[0],chainId:'outlier',profit:999999,regulationOk:false};
  const b=scoreChains([...candidates,extra],DEFAULT_WEIGHTS,d.model);
  for(const c of a)assert.equal(c.totalScore,b.find(v=>v.chainId===c.chainId).totalScore);
});
test('Keine Ersatzwerte für nicht endliche Importwerte',()=>{const d=structuredClone(scenario);d.offers[0].offerPrice=NaN;assert.ok(validateDataset(d).length);assert.throws(()=>generateChains(d.offers,d.demands,d.processors,d.model));});
test('Atomarer Datenvertrag und doppelte IDs',()=>{const d=structuredClone(scenario);d.offers.push(d.offers[0]);assert.ok(validateDataset(d).some(e=>e.includes('Doppelte ID')));});
test('Keine Scores bei fehlenden Indikatoren',()=>assert.equal(aggregate({economics:null,ecology:100,feasibility:100,deal:100},DEFAULT_WEIGHTS),null));
test('Hauptgewichte sind unveränderbar',()=>{const {d,candidates}=fixtures();assert.throws(()=>scoreChains(candidates,{...DEFAULT_WEIGHTS,economics:.5},d.model));});
test('Keine Eingabemutation',()=>{const {d,candidates}=fixtures();const before=structuredClone(candidates);scoreChains(candidates,DEFAULT_WEIGHTS,d.model);assert.deepEqual(candidates,before);});
