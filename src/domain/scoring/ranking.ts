import { DEFAULT_WEIGHTS,DIMENSION_WEIGHTS,SCORE_SCALE } from '../../config/scoringConfig.ts';
import type { ModelConfig } from '../../types/dataset.ts';
import type { Chain,ScoredChain,ScoreWeights } from '../../types/model.ts';
import { aggregate,availabilityScore,clamp,distanceScore,minMax,normalizedWeights,percentage,priceScore,purityReserveScore } from './indicators.ts';

export function hardConstraintReasons(chain: Chain): string[] {
  const reasons = [...chain.inputIssues];
  for (const [passed, reason] of [
    [chain.exactMaterial && chain.classMatch, 'Materialanforderung nicht erfüllt.'],
    [chain.purityOk, 'Mindestreinheit nicht erreicht.'],
    [chain.certificateOk, 'Erforderliches Zertifikat fehlt.'],
    [chain.distanceOk, 'Transportdistanz fehlt oder überschreitet die explizite Transportrestriktion.'],
    [chain.transportOk, 'Transport nicht zulässig.'],
    [chain.regulationOk, 'Regulatorische Freigabe fehlt.'],
  ] as const) if (!passed) reasons.push(reason);
  return [...new Set(reasons)];
}
export function dimensionScores(indicators: Record<string, number | null>) {
  return {
    economics: aggregate(indicators, DIMENSION_WEIGHTS.economics),
    ecology: aggregate(indicators, DIMENSION_WEIGHTS.ecology),
    feasibility: aggregate(indicators, DIMENSION_WEIGHTS.feasibility),
    deal: aggregate(indicators, DIMENSION_WEIGHTS.deal),
  };
}
export function scoreChains(chains: Chain[], weights: ScoreWeights, model: ModelConfig): ScoredChain[] {
  normalizedWeights(weights);
  const eligible = chains.filter(c => hardConstraintReasons(c).length === 0);
  const unitValue = (c: Chain, key: 'profit'|'revenue'|'processCost'|'transportCost'|'co2Kg') => c[key] / c.matchedQuantity;
  const normalized = (c: Chain, key: 'profit'|'revenue'|'processCost'|'transportCost'|'co2Kg', direction: 'benefit'|'cost') =>
    minMax(unitValue(c,key), eligible.map(r => unitValue(r,key)), direction, key === 'profit');
  const results: ScoredChain[] = chains.map(chain => {
    const exclusionReasons = hardConstraintReasons(chain);
    const allowed = exclusionReasons.length === 0;
    const indicators: Record<string, number | null> = allowed ? {
      contribution: normalized(chain,'profit','benefit'),
      revenue: normalized(chain,'revenue','benefit'),
      processCost: normalized(chain,'processCost','cost'),
      transportCost: normalized(chain,'transportCost','cost'),
      co2: normalized(chain,'co2Kg','cost'),
      resourceEfficiency: percentage(chain.resourceEfficiency) ? chain.resourceEfficiency : null,
      distance: distanceScore(chain.distanceKm),
      quantity: chain.requiredQuantity > 0 ? clamp(SCORE_SCALE.max * chain.matchedQuantity / chain.requiredQuantity) : null,
      quality: percentage(chain.qualityScore) ? chain.qualityScore : null,
      availability: availabilityScore(chain.availability),
      purityReserve: purityReserveScore(chain.purity, chain.minPurity, model.purityReserveThresholds),
      compliance: chain.regulationOk && chain.certificateOk ? SCORE_SCALE.max : null,
      price: priceScore(chain.referencePrice, chain.offerPrice),
      reliability: chain.partnerReliability,
      probability: percentage(chain.contractProbability) ? chain.contractProbability : null,
    } : {};
    const dimensions = dimensionScores(indicators);
    const unresolvedReasons = allowed ? Object.entries(indicators).filter(([,v]) => v === null).map(([key]) =>
      key === 'purityReserve' ? 'Reinheitsreserve: numerische Schwellen noch fachlich zu definieren.' :
      key === 'reliability' ? 'Partnerverlässlichkeit: qualitative Kategorie fehlt; Altwert wird nicht umgedeutet.' :
      `${key}: fehlender Wert oder kein bestimmbarer Min-Max-Bereich.`) : [];
    const totalScore = allowed ? aggregate(dimensions, DEFAULT_WEIGHTS) : null;
    const status = !allowed ? 'ausgeschlossen' : totalScore === null ? 'Bewertung offen' : 'Bewertbar';
    const auditTrail = [
      `Modell ${model.version}; Kette ${chain.chainId}.`,
      `Masse ${chain.matchedQuantity} t; Deckungsbeitrag ${chain.profit} EUR.`,
      `Min-Max-Vergleich: ${eligible.length} zulässige Kandidaten; wirtschaftliche Größen EUR/t, CO₂ kg/t. Gleichheit ergibt einen offenen Teilscore.`,
      `Proxy-Faktoren (synthetisch): ${JSON.stringify(model.demoAssumptions)}.`,
      `Routenquelle: ${chain.routeSource}.`,
      `Einzelindikatoren: ${JSON.stringify(indicators)}.`,
      `Dimensionsgewichte: ${JSON.stringify(DIMENSION_WEIGHTS)}; FR7: ${JSON.stringify(DEFAULT_WEIGHTS)}.`,
      'Negative Deckungsbeiträge sind im Nutzenvergleich erlaubt. Keine absolute Rentabilitätszusage. Keine vollständige Ökobilanz.',
    ];
    return { ...chain, ...dimensions, indicators, unresolvedReasons, totalScore, status, rank: '-',
      confidence: chain.evidence === 'proxy' ? 'niedrig' : 'mittel',
      quantityFit: indicators.quantity ?? null, priceScore: indicators.price ?? null, distanceScore: indicators.distance ?? null,
      reasons: [...exclusionReasons,...unresolvedReasons], exclusionReasons, auditTrail,
      decision: totalScore === null ? `${status}: ${[...exclusionReasons,...unresolvedReasons].join(' ')}` : `FR7 ${totalScore.toFixed(2)}; relative Priorisierung zulässiger Alternativen.`,
    };
  });
  results.sort((a,b) => (b.totalScore ?? -1) - (a.totalScore ?? -1) || a.chainId.localeCompare(b.chainId));
  let rank = 0; let previous: number | null = null;
  return results.map((c,index) => {
    if(c.totalScore === null) return c;
    if(previous !== c.totalScore) rank = index + 1;
    previous = c.totalScore;
    return { ...c, rank: String(rank) };
  });
}
export function rankedChains(chains: ScoredChain[]): ScoredChain[] { return chains.filter(c => c.totalScore !== null); }
