import type { CmrsRecordType } from '../../types/cmrs.ts';

export function detectCmrsRecordType(rawText: string): CmrsRecordType {
  const text = rawText.toLowerCase();
  if (/nicht\s+gesucht.*angebot|angebot.*nicht\s+gesucht/.test(text)) return 'offer';
  const demand = /\b(suche|gesucht|benötige|benoetige|bedarf|nachfrage|kaufe|kaufen|brauchen)\b/.test(text);
  const offer = /\b(angebot|biete|bieten|verkaufe|verkaufen)\b/.test(text);
  if (demand && !offer) return 'demand';
  if (offer && !demand) return 'offer';
  return 'unknown';
}

export function cmrsRecordTypeLabel(type: CmrsRecordType): string {
  return { offer: 'Angebot', demand: 'Gesuch', unknown: 'Unbekannt – manuelle Prüfung' }[type];
}
