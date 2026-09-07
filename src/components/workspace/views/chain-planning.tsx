import { DEFAULT_WEIGHTS as defaultWeights } from '../../../config/scoringConfig.ts';
import { nextAction,statusClass } from '../../../domain/context.ts';
import { scoreFormula } from '../../../domain/engine.ts';
import { ChainTable,FlowBox,ScoreBars } from '../chain-results.tsx';
import { DataTable } from '../display.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function ChainPlanning({ state }: { state: Pick<WorkspaceState, 'page' | 'offers' | 'demands' | 'processors' | 'scoreWeights' | 'setSelectedChainId' | 'chains' | 'discardedPairs' | 'scoredChains' | 'selectedChain' | 'rankedChains' | 'excludedChains' | 'confidenceStats' | 'go'> }) {
  const { page, offers, demands, processors, scoreWeights, setSelectedChainId, discardedPairs, scoredChains, selectedChain, rankedChains, excludedChains, confidenceStats, go } = state;
  return (<>{page === "chains" && selectedChain && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Kettenplanung</p>
            <h2>Ketten erzeugen, prüfen und begründen.</h2>
            <p>
              Die Kettenplanung nimmt die aktuellen Registerdaten, bildet Kandidaten und trennt
              bewertbare Ketten von offenen Prüffällen.
            </p>
          </div>

          <div className="builder-dashboard">
            <article className="wide-panel">
              <p className="eyebrow">Kettenplanung</p>
              <h3>Register, aus denen die Ketten entstehen.</h3>
              <dl>
                <div><dt>Angebote</dt><dd>{offers.length}</dd></div>
                <div><dt>Gesuche</dt><dd>{demands.length}</dd></div>
                <div><dt>Aufbereiter</dt><dd>{processors.length}</dd></div>
                <div><dt>Vorfilter</dt><dd>{discardedPairs.length} verworfen</dd></div>
                <div><dt>Kandidaten</dt><dd>{scoredChains.length}</dd></div>
                <div><dt>Gerankt</dt><dd>{rankedChains.length}</dd></div>
                <div><dt>Nicht gerankt</dt><dd>{excludedChains.length}</dd></div>
              </dl>
              <p>
                Aktive Angebote und Gesuche werden mit passenden Aufbereitern verbunden.
                Stimmen Material oder Klasse nicht, landet das Paar bereits im Vorfilter.
              </p>
            </article>
            <article className="wide-panel">
              <p className="eyebrow">Datenvertrauen und Datenqualität</p>
              <h3>Wie belastbar sind die Kandidaten?</h3>
              <div className="confidence-grid">
                <span><strong>{confidenceStats.hoch}</strong> hoch</span>
                <span><strong>{confidenceStats.mittel}</strong> mittel</span>
                <span><strong>{confidenceStats.niedrig}</strong> niedrig</span>
              </div>
              <p>
                Das Datenvertrauen kommt aus der Datenqualität: validiert, strukturiert oder proxy.
                Sie erklärt die Belastbarkeit der Eingaben, nicht die Höhe des Scores.
              </p>
            </article>
          </div>

          <p className="formula">{scoreFormula(defaultWeights)}</p>

          <div className="chain-flow">
            <FlowBox title="Angebot" badge={selectedChain.offerId} headline={selectedChain.material}>
              <p>{selectedChain.supplier}</p>
              <p>{selectedChain.availableQuantity} {selectedChain.unit} · Reinheit {selectedChain.purity}%</p>
            </FlowBox>
            <span className="flow-arrow">→</span>
            <FlowBox title="Aufbereitung" badge={selectedChain.processorId} headline={selectedChain.processor}>
              <p>{selectedChain.materialClass} · {selectedChain.processCost.toLocaleString('de-DE')} EUR Prozesskosten</p>
              <p>Effizienz {selectedChain.resourceEfficiency} · Zuverlässigkeit {selectedChain.partnerReliability}</p>
            </FlowBox>
            <span className="flow-arrow">→</span>
            <FlowBox title="Gesuch" badge={selectedChain.demandId} headline={selectedChain.buyer}>
              <p>{selectedChain.requiredMaterial} · {selectedChain.requiredQuantity} {selectedChain.unit}</p>
              <p>Score {selectedChain.totalScore?.toFixed(2) ?? "Bewertung offen"} · {selectedChain.status}</p>
            </FlowBox>
          </div>

          <div className="split-section">
            <div>
              <h3>Berechnete Ketten</h3>
              <ChainTable chains={scoredChains} onSelect={setSelectedChainId} selectedId={selectedChain.chainId} />
            </div>
            <aside className="explain-panel">
              <span className={`pill ${statusClass(selectedChain.status)}`}>{selectedChain.status}</span>
              <span className="pill">Datenvertrauen {selectedChain.confidence}</span>
              <h3>{selectedChain.chainId}: {selectedChain.material} zu {selectedChain.buyer}</h3>
              <ScoreBars chain={selectedChain} weights={scoreWeights} />
              <p className="panel-note">{selectedChain.decision}</p>
              <h4>Audit-Trail</h4>
              <ol className="script-list compact-list">
                {selectedChain.auditTrail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <h4>Begründungen</h4>
              <ul>
                {selectedChain.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <button onClick={() => go("explain")} type="button">Nachvollziehbarkeit öffnen</button>
            </aside>
          </div>

          <div className="wide-panel">
            <h3>Prüflog: Warum Kandidaten nicht gerankt werden</h3>
            <DataTable
              headers={["Kette", "Status", "Ausschlussgrund", "Nächster Schritt"]}
              rows={(excludedChains.length ? excludedChains : scoredChains.filter((chain) => chain.status !== "Bewertbar"))

                .map((chain) => [
                  chain.chainId,
                  chain.status,
                  chain.exclusionReasons[0] ?? "Keine offene Prüfung",
                  nextAction(chain),
                ])}
            />
          </div>

          <div className="wide-panel">
            <h3>Vorfilter: Warum aus manchen Paaren keine Kette entsteht</h3>
            <DataTable
              headers={["Angebot", "Gesuch", "Material", "Grund"]}
              rows={discardedPairs.map((pair) => [
                pair.offerId,
                pair.demandId,
                `${pair.offerMaterial} / ${pair.demandMaterial}`,
                pair.reason,
              ])}
            />
          </div>
        </section>
      )}</>);
}
