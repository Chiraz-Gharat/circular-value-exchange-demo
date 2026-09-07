import { CURRENT_SCHEMA_VERSION } from '../../config/storage.ts';
import type { ModelConfig } from '../../types/dataset.ts';
import type { Chain,Demand,Offer,Processor,RejectedPair } from '../../types/model.ts';
import { availabilityScore,canonical,percentage,reliabilityScore,tonnes } from '../scoring/indicators.ts';
import { modelIssues,rowIssues,validateDataset } from '../validation/dataset.ts';
function certificatesMatch(available: string, required: string): boolean {
  const tokens=(s:string)=>s.split(/[;,]/).map(x=>canonical(x).replace(/\s/g,'')).filter(Boolean);
  const present=new Set(tokens(available));return tokens(required).every(x=>present.has(x));
}
function routeFor(a: string,b: string,model:ModelConfig) {
  return model.routes.find(r=>(canonical(r.from)===canonical(a)&&canonical(r.to)===canonical(b)) || (canonical(r.from)===canonical(b)&&canonical(r.to)===canonical(a)));
}

export function generateChains(offers:Offer[],demands:Demand[],processors:Processor[],model:ModelConfig):Chain[] {
  const chains:Chain[]=[];
  const configErrors=modelIssues(model);
  const errors=validateDataset({schemaVersion:CURRENT_SCHEMA_VERSION, provenance:'Berechnung',offers,demands,processors,model});
  if(errors.length) throw new Error(errors.join(' '));
  for(const offer of offers.filter(r=>r.status!=='archiviert')) for(const demand of demands.filter(r=>r.status!=='archiviert')) {
    const exactMaterial=canonical(offer.material)===canonical(demand.material);
    const classMatch=canonical(offer.materialClass)===canonical(demand.materialClass);
    if(!exactMaterial&&!classMatch) continue;
    for(const p of processors.filter(p=>canonical(p.materialClass)===canonical(offer.materialClass))) {
      const issues=[...rowIssues(offer,'offer'),...rowIssues(demand,'demand'),...rowIssues(p,'processor'),...configErrors];
      if(offer.status!=='aktiv'||demand.status!=='aktiv') issues.push('Datensatz noch nicht freigegeben.');
      if(!p.supportedMaterials.some(x=>canonical(x)===canonical(offer.material))) issues.push('Aufbereiter besitzt keine Werkstofffreigabe.');
      if(!classMatch) issues.push('Materialklassen widersprechen sich.');
      const a=tonnes(offer.quantity,offer.unit);const d=tonnes(demand.quantity,demand.unit);
      const q=a!==null&&d!==null?Math.min(a,d,p.capacityT):0;
      if(!(q>0)) issues.push('Keine positive verarbeitbare Menge.');
      const r1=routeFor(offer.region,p.region,model), r2=routeFor(p.region,demand.region,model);
      if(!r1||!r2) issues.push('Dokumentierte Transportstrecke fehlt.');
      if(!percentage(availabilityScore(offer.availability))) issues.push('Verfügbarkeit nicht in der konfigurierten Skala enthalten.');
      const distanceKm=r1&&r2?r1.distanceKm+r2.distanceKm:0;
      const transportCost=q*distanceKm*model.demoAssumptions.DEMO_TRANSPORT_COST_EUR_PER_TKM;
      const processCost=q*p.processCost;
      const revenue=q*demand.revenue;
      const certOk=certificatesMatch(offer.certificate,demand.certificate)&&certificatesMatch(p.certificates,demand.certificate);
      chains.push({chainId:[offer.offerId,p.processorId,demand.demandId].map(value=>encodeURIComponent(value).replaceAll('~','%7E')).join('~'),offerId:offer.offerId,demandId:demand.demandId,processorId:p.processorId,supplier:offer.supplier,processor:p.name,buyer:demand.buyer,supplierSector:offer.sector,buyerSector:demand.sector,materialClass:offer.materialClass,material:offer.material,requiredMaterial:demand.material,form:offer.form,regionPath:`${offer.region} / ${p.region} / ${demand.region}`,exactMaterial,classMatch,purityOk:offer.purity>=demand.minPurity,certificateOk:certOk,distanceOk:Boolean(r1&&r2)&&distanceKm<=demand.maxDistance,transportOk:offer.transportOk,regulationOk:offer.regulationOk,availableQuantity:a??0,requiredQuantity:d??0,matchedQuantity:q,unit:'t',purity:offer.purity,minPurity:demand.minPurity,qualityScore:offer.qualityScore,availability:offer.availability,distanceKm,co2Kg:q*(distanceKm*model.demoAssumptions.DEMO_TRANSPORT_EMISSION_FACTOR+model.demoAssumptions.DEMO_PROCESS_EMISSION_FACTOR),resourceEfficiency:p.resourceEfficiency,processCost,transportCost,revenue,referencePrice:offer.referencePrice,offerPrice:offer.offerPrice,targetPrice:demand.targetPrice,partnerReliability:reliabilityScore(p.reliabilityCategory),contractProbability:demand.contractProbability,evidence:offer.evidence,stage:'Kandidatenprüfung',matchType:exactMaterial?'Materialmatch':'Klassenmatch',inputIssues:issues,profit:revenue-q*offer.offerPrice-processCost-transportCost,modelVersion:model.version,routeSource:[r1?.source,r2?.source].filter(Boolean).join('; ')});
    }
  }
  return chains;
}

export function rejectedPairs(offers:Offer[],demands:Demand[],processors:Processor[]):RejectedPair[] {
  const rows:RejectedPair[]=[];
  for(const o of offers.filter(r=>r.status!=='archiviert')) for(const d of demands.filter(r=>r.status!=='archiviert')) {
    let reason='';
    if(canonical(o.material)!==canonical(d.material)&&canonical(o.materialClass)!==canonical(d.materialClass)) reason='Material und Materialklasse passen nicht zusammen.';
    else if(!processors.some(p=>canonical(p.materialClass)===canonical(o.materialClass))) reason='Kein Aufbereiter dieser Materialklasse im Register.';
    if(reason) rows.push({offerId:o.offerId,demandId:d.demandId,offerMaterial:o.material,demandMaterial:d.material,offerClass:o.materialClass,demandClass:d.materialClass,reason});
  }
  return rows;
}
