import { DEMO_ASSUMPTIONS } from '../../config/demoAssumptions.ts';
import { MODEL_VERSION,PURITY_RESERVE_SCORES,RELIABILITY_SCORES } from '../../config/scoringConfig.ts';
import { CURRENT_SCHEMA_VERSION } from '../../config/storage.ts';
import type { Dataset,ModelConfig } from '../../types/dataset.ts';
import type { Demand,Offer,Processor } from '../../types/model.ts';
import { canonical,finite,nonnegative,percentage,tonnes,validPurityThresholds } from '../scoring/indicators.ts';
export function rowIssues(row: Offer | Demand | Processor, kind: 'offer'|'demand'|'processor'): string[] {
  const r = row as unknown as Record<string, unknown>;
  const errors: string[] = [];
  const required = kind === 'offer' ? ['offerId','status','supplier','sector','region','materialClass','material','form','unit','availability','evidence','note'] : kind === 'demand' ? ['demandId','status','buyer','sector','region','materialClass','material','unit','note'] : ['processorId','name','region','materialClass','focus'];
  for(const k of required) if(typeof r[k] !== 'string' || !(r[k] as string).trim()) errors.push(`${k}: Angabe fehlt.`);
  const percentages = kind === 'offer' ? ['purity','qualityScore'] : kind === 'demand' ? ['minPurity','contractProbability'] : ['resourceEfficiency','reliability'];
  for(const k of percentages) if(!percentage(r[k])) errors.push(`${k}: Wert muss zwischen 0 und 100 liegen.`);
  const numbers = kind === 'offer' ? ['offerPrice','referencePrice'] : kind === 'demand' ? ['targetPrice','revenue','maxDistance'] : ['processCost','capacityT'];
  for(const k of numbers) if(!nonnegative(r[k])) errors.push(`${k}: Endlicher nicht negativer Wert erforderlich.`);
  if(kind !== 'processor' && (typeof r.unit !== 'string' || tonnes(r.quantity as number,r.unit) === null)) errors.push('quantity/unit: Positive Masse in g, kg oder t erforderlich.');
  if(kind === 'offer') {
    if(!(finite(r.referencePrice) && r.referencePrice > 0)) errors.push('referencePrice: Positiver Referenzpreis erforderlich.');
    for(const k of ['transportOk','regulationOk']) if(typeof r[k] !== 'boolean') errors.push(`${k}: Explizite Freigabe erforderlich.`);
  }
  if(kind === 'processor' && (!Array.isArray(r.supportedMaterials) || !r.supportedMaterials.length || r.supportedMaterials.some(x=>typeof x !== 'string' || !x.trim()))) errors.push('supportedMaterials: Freigegebene Werkstoffe fehlen.');
  if(kind === 'processor' && r.reliabilityCategory != null && (typeof r.reliabilityCategory !== 'string' || !Object.hasOwn(RELIABILITY_SCORES,r.reliabilityCategory))) errors.push('reliabilityCategory: Unbekannte Partnerkategorie.');
  const certKey = kind === 'processor' ? 'certificates' : 'certificate';
  if(typeof r[certKey] !== 'string') errors.push(`${certKey}: Text erforderlich; leer bedeutet keine Angabe bzw. keine Anforderung.`);
  if(kind !== 'processor' && !['aktiv','archiviert','Nachweis offen'].includes(r.status as string)) errors.push('status: Unbekannter Registerstatus.');
  return errors;
}

export function modelIssues(model: ModelConfig): string[] {
  const errors: string[]=[];
  if(!model || typeof model !== 'object') return ['Modellkonfiguration fehlt.'];
  if(model.version !== MODEL_VERSION) errors.push('Nicht unterstützte Modellversion.');
  if(!model.demoAssumptions || Object.keys(DEMO_ASSUMPTIONS).some(k=>!nonnegative(model.demoAssumptions[k as keyof typeof DEMO_ASSUMPTIONS]))) errors.push('Proxy-Faktoren fehlen oder sind ungültig.');
  const thresholds = model.purityReserveThresholds;
  if(!thresholds || typeof thresholds !== 'object' || Object.keys(thresholds).length !== Object.keys(PURITY_RESERVE_SCORES).length || Object.keys(PURITY_RESERVE_SCORES).some(k => !Object.hasOwn(thresholds,k)) || (!Object.values(thresholds).every(x=>x===null) && !validPurityThresholds(thresholds))) errors.push('Reinheitsgrenzen müssen vollständig null oder endlich, nicht negativ und streng absteigend sein.');
  const seen = new Set<string>();
  if(!Array.isArray(model.routes)) errors.push('Routenregister fehlt.');
  else for(const route of model.routes) {
    if(!route || typeof route.from !== 'string' || typeof route.to !== 'string' || !nonnegative(route.distanceKm) || typeof route.source !== 'string' || !route.source.trim()) { errors.push('Route ohne gültige Endpunkte, Distanz oder Quelle.'); continue; }
    const id=JSON.stringify([canonical(route.from),canonical(route.to)].sort());
    if(seen.has(id)) errors.push(`Route mehrfach definiert: ${route.from} / ${route.to}.`);
    seen.add(id);
  }
  return errors;
}

export function validateDataset(value: unknown): string[] {
  if(!value || typeof value !== 'object') return ['Datensatz muss ein Objekt sein.'];
  const d=value as Dataset; const errors: string[]=[];
  if(d.schemaVersion !== CURRENT_SCHEMA_VERSION) errors.push('Nicht unterstützte Schema-Version.');
  if(typeof d.provenance !== 'string' || !d.provenance.trim()) errors.push('Herkunft der Daten fehlt.');
  for(const [key,kind,id] of [['offers','offer','offerId'],['demands','demand','demandId'],['processors','processor','processorId']] as const) {
    if(!Array.isArray(d[key])) {errors.push(`${key}: Register fehlt.`);continue;}
    const seen=new Set();
    d[key].forEach((r,i)=>{
      if(!r || typeof r !== 'object') {errors.push(`${key}[${i}]: Objekt erforderlich.`);return;}
      const identifier=(r as unknown as Record<string,unknown>)[id];
      if(seen.has(identifier)) errors.push(`${key}: Doppelte ID ${identifier}.`);
      seen.add(identifier);errors.push(...rowIssues(r,kind).map(e=>`${key}[${i}]: ${e}`));
    });
  }
  errors.push(...modelIssues(d.model));return errors;
}
