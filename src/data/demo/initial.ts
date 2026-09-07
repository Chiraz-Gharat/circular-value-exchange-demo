import { parseCmrsText } from '../../domain/cmrs/parser.ts';
import type { CmrsRecord } from '../../types/cmrs.ts';
import type { Demand,Offer,Processor } from '../../types/model.ts';
import { CMRS_DEMO_CREATED_AT,cmrsSampleTexts } from './cmrs.ts';
import scenario from './scenario.ts';
export const initialOffers: Offer[] = scenario.offers;

export const initialDemands: Demand[] = scenario.demands;

export const initialProcessors: Processor[] = scenario.processors;

export const initialCmrsRecords: CmrsRecord[] = cmrsSampleTexts.map((text, index) =>
  parseCmrsText(text, `CMRS-${String(index + 1).padStart(3, "0")}`, CMRS_DEMO_CREATED_AT[index]),
);
