import { assetPath } from '../../../config/deployment.ts';
import type { WorkspaceState } from '../use-workspace.ts';
export function StartHero({ state }: { state: Pick<WorkspaceState, 'page' | 'offers' | 'demands' | 'processors' | 'cmrsRecords' | 'setSelectedChainId' | 'scoredChains' | 'exactChains' | 'rankedChains' | 'excludedChains' | 'go'> }) {
  const { page, offers, demands, processors, cmrsRecords, setSelectedChainId, scoredChains, exactChains, rankedChains, excludedChains, go } = state;
  return (<>{page === "start" && (
        <>
          <section className="hero">
            <img alt="Materialproben und digitales Marktplatzregister" src={assetPath("marketplace-hero-v2.png")} />
            <div className="hero-shell">
              <div className="hero-copy">
                <p className="eyebrow">Sekundärrohstoff-Marktplatz</p>
                <h1>Circular Value Exchange</h1>
                <p className="hero-kicker">Material einstellen. Bedarf finden. Wertkette prüfen.</p>
                <p>
                  Angebote und Gesuche werden strukturiert gespeichert, mit Aufbereitungspartnern
                  kombiniert und als nachvollziehbare Wertschöpfungsketten bewertet.
                </p>
                <div className="hero-actions">
                  <button onClick={() => go("marketplace")} type="button">Marktplatz öffnen</button>
                  <button onClick={() => go("offer")} type="button">Material anbieten</button>
                  <button className="secondary" onClick={() => go("cmrs")} type="button">Freitext erfassen</button>
                </div>
              </div>
              <aside className="hero-market-card" aria-label="Aktueller Marktstatus">
                <p className="eyebrow">Marktstatus</p>
                <h2>{rankedChains.length} belastbare Ketten</h2>
                <p>
                  Lokale Register, Vorfilter, Ranking und Prüflog greifen auf dieselben Datensätze zu.
                </p>
                <dl className="hero-ledger">
                  <div><dt>Angebote</dt><dd>{offers.length}</dd></div>
                  <div><dt>Gesuche</dt><dd>{demands.length}</dd></div>
                  <div><dt>Aufbereiter</dt><dd>{processors.length}</dd></div>
                  <div><dt>Prüffälle</dt><dd>{excludedChains.length}</dd></div>
                </dl>
                <button className="secondary" onClick={() => go("chains")} type="button">Ketten ansehen</button>
              </aside>
            </div>
            <div className="market-tape" aria-label="Aktuelle Ketten aus dem Register">
              {scoredChains.slice(0, 3).map((chain) => (
                <button key={chain.chainId} onClick={() => {
                  setSelectedChainId(chain.chainId);
                  go("chains");
                }} type="button">
                  <span>{chain.chainId}</span>
                  <strong>{chain.material}</strong>
                  <small>{chain.supplier} → {chain.buyer}</small>
                  <em>{chain.totalScore ?? "Prüfen"}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="stats-band" aria-label="Registerkennzahlen">
            <article>
              <strong>{cmrsRecords.length}</strong>
              <span>strukturierte Eingänge</span>
            </article>
            <article>
              <strong>{offers.length}</strong>
              <span>aktive Angebote</span>
            </article>
            <article>
              <strong>{demands.length}</strong>
              <span>aktive Gesuche</span>
            </article>
            <article>
              <strong>{exactChains}</strong>
              <span>Kettenkandidaten</span>
            </article>
            <article>
              <strong>{rankedChains.length}</strong>
              <span>gerankt</span>
            </article>
          </section>
        </>
      )}</>);
}
