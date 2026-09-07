import { MiniScore } from '../display.tsx';
import { DemandCard,ListingCard } from '../listing-cards.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function MarketplaceView({ state }: { state: Pick<WorkspaceState, 'page' | 'query' | 'setQuery' | 'scoredChains' | 'excludedChains' | 'filteredOffers' | 'filteredDemands' | 'go'> }) {
  const { page, query, setQuery, scoredChains, excludedChains, filteredOffers, filteredDemands, go } = state;
  return (<>{page === "marketplace" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Marktplatz</p>
            <h2>Angebote und Gesuche in einem Marktbild.</h2>
            <p>
              Suche nach Material, Unternehmen, Region oder Nachweis. Neue Einträge werden
              sofort von der Kettenplanung berücksichtigt.
            </p>
          </div>

          <div className="market-actions-grid">
            <article className="action-panel supply">
              <span className="pill good">Für Anbieter</span>
              <h3>Material anbieten</h3>
              <p>Material, Menge, Reinheit, Preis, Region und Nachweise erfassen.</p>
              <button onClick={() => go("offer")} type="button">Angebot einstellen</button>
            </article>
            <article className="action-panel demand">
              <span className="pill">Für Käufer</span>
              <h3>Gesuch aufgeben</h3>
              <p>Mindestqualität, Zielpreis, Zertifikat und Distanzlimit festlegen.</p>
              <button onClick={() => go("search")} type="button">Gesuch einstellen</button>
            </article>
            <article className="action-panel builder">
              <span className="pill warn">Erklärbar</span>
              <h3>Ketten prüfen</h3>
              <p>Passende Wertketten, Score, Datenvertrauen und Ausschlussgründe ansehen.</p>
              <button onClick={() => go("chains")} type="button">Kettenplanung öffnen</button>
            </article>
          </div>

          <div className="market-toolbar">
            <div className="search-row">
              <input
                aria-label="Marktplatz durchsuchen"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Material, Unternehmen, Region oder Nachweis suchen"
                value={query}
              />
              <button onClick={() => go("offer")} type="button">Angebot einstellen</button>
              <button className="secondary" onClick={() => go("search")} type="button">Gesuch einstellen</button>
            </div>
          </div>
          <div className="market-summary">
            <MiniScore title={`${filteredOffers.length} Angebote`} body="verfügbare Materialströme mit Menge, Qualität und Nachweis" />
            <MiniScore title={`${filteredDemands.length} Gesuche`} body="Bedarfe mit Mindestqualität, Zielpreis und Distanzlimit" />
            <MiniScore title={`${scoredChains.length} Ketten`} body="live aus Angebot, Gesuch und Aufbereitungspartnern berechnet" />
            <MiniScore title={`${excludedChains.length} Prüfpunkte`} body="Kandidaten, die vor dem Ranking gestoppt wurden" />
          </div>
          <div className="market-columns">
            <div>
              <div className="market-section-head">
                <h3>Angebote</h3>
                <span>{filteredOffers.length} Treffer</span>
              </div>
              <div className="card-list">
                {filteredOffers.map((offer) => (
                  <ListingCard key={offer.offerId} offer={offer} />
                ))}
              </div>
            </div>
            <div>
              <div className="market-section-head">
                <h3>Gesuche</h3>
                <span>{filteredDemands.length} Treffer</span>
              </div>
              <div className="card-list">
                {filteredDemands.map((demand) => (
                  <DemandCard demand={demand} key={demand.demandId} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}</>);
}
