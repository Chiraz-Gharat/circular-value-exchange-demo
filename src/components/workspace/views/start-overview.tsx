import { DEFAULT_WEIGHTS as defaultWeights } from '../../../config/scoringConfig.ts';
import type { PageId } from '../../../domain/context.ts';
import { scoreFormula } from '../../../domain/engine.ts';
import { ChainTable } from '../chain-results.tsx';
import { ListingCard } from '../listing-cards.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function StartOverview({ state }: { state: Pick<WorkspaceState, 'page' | 'offers' | 'demands' | 'processors' | 'cmrsRecords' | 'setSelectedChainId' | 'chains' | 'discardedPairs' | 'scoredChains' | 'rankedChains' | 'excludedChains' | 'cmrsIssueCount' | 'go'> }) {
  const { page, offers, demands, processors, cmrsRecords, setSelectedChainId, discardedPairs, scoredChains, rankedChains, excludedChains, cmrsIssueCount, go } = state;
  return (<>{page === "start" && (
        <section className="page-grid">
          <div className="page-title">
            <p className="eyebrow">Arbeitsablauf</p>
            <h2>Vom Markteintrag zur belastbaren Kette.</h2>
            <p>
              Der Ablauf lässt sich von links nach rechts lesen:
              erfassen, speichern, kombinieren, prüfen und erst dann ranken.
            </p>
          </div>

          <div className="process-flow">
            {[
              ["1", "Erfassen", "Freitext oder Formular wird zu einem Registereintrag.", "cmrs"],
              ["2", "Speichern", "Angebot oder Gesuch landet im passenden Register.", "database"],
              ["3", "Verbinden", "Anbieter, Aufbereiter und Käufer werden kombiniert.", "chains"],
              ["4", "Prüfen", "Material, Reinheit, Zertifikat und Distanz entscheiden.", "chains"],
              ["5", "Belegen", "Score, Datenvertrauen und Ausschlussgrund bleiben sichtbar.", "explain"],
            ].map(([step, title, body, target]) => (
              <button className="process-step" key={step} onClick={() => go(target as PageId)} type="button">
                <span>{step}</span>
                <strong>{title}</strong>
                <small>{body}</small>
              </button>
            ))}
          </div>

          <div className="workbench-grid">
            <article className="wide-panel narrative-panel">
              <p className="eyebrow">Datenfluss</p>
              <h3>Alle Eingaben arbeiten auf denselben Registern.</h3>
              <div className="process-line">
                <span>Eingang</span>
                <span>Register</span>
                <span>Ketten</span>
                <span>Prüfung</span>
                <span>Ranking</span>
              </div>
              <p>
                Daten kommen über <strong>Dateneingang</strong>, <strong>Angebot</strong> oder{" "}
                <strong>Gesuch</strong> ins Register. Die Kettenplanung kombiniert sie mit
                Aufbereitungspartnern und schreibt jede offene Prüfung ins Prüflog.
              </p>
            </article>
            <article className="wide-panel system-ledger">
              <p className="eyebrow">Registerstand</p>
              <dl>
                <div><dt>Angebotsregister</dt><dd>{offers.length} Einträge</dd></div>
                <div><dt>Gesuchsregister</dt><dd>{demands.length} Einträge</dd></div>
                <div><dt>CMRS-Records</dt><dd>{cmrsRecords.length} extrahiert</dd></div>
                <div><dt>Partnerregister</dt><dd>{processors.length} Aufbereiter</dd></div>
                <div><dt>Vorfilter verworfen</dt><dd>{discardedPairs.length} Paare</dd></div>
                <div><dt>Kettenkandidaten</dt><dd>{scoredChains.length} Ketten</dd></div>
                <div><dt>Gerankt</dt><dd>{rankedChains.length} Ketten</dd></div>
                <div><dt>Prüflog</dt><dd>{excludedChains.length + cmrsIssueCount} Einträge</dd></div>
              </dl>
              <div className="form-actions">
                <button onClick={() => go("marketplace")} type="button">Marktbild öffnen</button>
                <button className="secondary" onClick={() => go("database")} type="button">Datenregister</button>
              </div>
            </article>
          </div>

          <p className="formula">{scoreFormula(defaultWeights)}</p>

          <div className="split-section">
            <div>
              <h3>Aktuelle Angebote</h3>
              <div className="card-list">
                {offers.slice(0, 3).map((offer) => (
                  <ListingCard key={offer.offerId} offer={offer} />
                ))}
              </div>
            </div>
            <div>
              <h3>Top-Ketten</h3>
              <ChainTable chains={scoredChains.slice(0, 5)} onSelect={(id) => {
                setSelectedChainId(id);
                go("chains");
              }} />
            </div>
          </div>
        </section>
      )}</>);
}
