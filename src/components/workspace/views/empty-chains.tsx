import { DataTable } from '../display.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function EmptyChains({ state }: { state: Pick<WorkspaceState, 'page' | 'offers' | 'demands' | 'processors' | 'discardedPairs' | 'selectedChain' | 'go'> }) {
  const { page, offers, demands, processors, discardedPairs, selectedChain, go } = state;
  return (<>{page === 'chains' && !selectedChain && <section className="page-grid"><h2>Keine Kettenkandidaten</h2><p>{offers.length} Angebote, {demands.length} Gesuche, {processors.length} Aufbereiter.</p><DataTable headers={['Angebot','Gesuch','Grund']} rows={discardedPairs.map(p=>[p.offerId,p.demandId,p.reason])}/><button onClick={()=>go('database')} type="button">Datenregister öffnen</button></section>}</>);
}
