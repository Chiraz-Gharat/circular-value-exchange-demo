import { CURRENT_SCHEMA_VERSION } from '../../../config/storage.ts';
import { DatasetEditor } from '../../dataset-editor';
import type { WorkspaceState } from '../use-workspace.ts';
export function DatasetControls({ state }: { state: Pick<WorkspaceState, 'page' | 'offers' | 'setOffers' | 'demands' | 'setDemands' | 'processors' | 'setProcessors' | 'model' | 'setModel' | 'provenance' | 'setProvenance' | 'scoreWeights' | 'setMessage' | 'scoredChains'> }) {
  const { page, offers, setOffers, demands, setDemands, processors, setProcessors, model, setModel, provenance, setProvenance, scoreWeights, setMessage, scoredChains } = state;
  return (<>{page === 'database' && <DatasetEditor dataset={{schemaVersion:CURRENT_SCHEMA_VERSION,provenance,offers,demands,processors,model}} weights={scoreWeights} results={scoredChains} onApply={(data)=>{setOffers(data.offers);setDemands(data.demands);setProcessors(data.processors);setModel(data.model);setProvenance(data.provenance);setMessage('Datenregister geprüft und übernommen.');}} />}</>);
}
