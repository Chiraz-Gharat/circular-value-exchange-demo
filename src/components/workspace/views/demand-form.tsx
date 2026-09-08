import { regions } from '../../../domain/context.ts';
import { MiniScore } from '../display.tsx';
import { FormGrid,MaterialClassField,NumberField,SelectField,TextField } from '../form-controls.tsx';
import { ListingCard } from '../listing-cards.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function DemandForm({ state }: { state: Pick<WorkspaceState, 'extraMaterialClasses' | 'filteredOffers' | 'page' | 'prefill' | 'prefillKey' | 'query' | 'registerMaterialClass' | 'setQuery' | 'submitDemand'> }) {
  const { extraMaterialClasses, filteredOffers, page, prefill, prefillKey, query, registerMaterialClass, setQuery, submitDemand } = state;
  return (<>{page === "search" && (
        <section className="page-grid">
          <div className="page-title compact">
              <p className="eyebrow">Gesuch</p>
            <h2>Gesuch erfassen und passende Angebote prüfen.</h2>
            <p>
              Das Gesuch definiert Mindestanforderungen; die Kettenplanung zeigt passende und ausgeschiedene Ketten.
            </p>
          </div>
          <div className="intake-strip">
            <MiniScore title="Speicherung" body="Das Gesuch landet direkt im Gesuchsregister." />
            <MiniScore title="Muss-Kriterien" body="Material, Reinheit, Zertifikat und Distanz entscheiden vor dem Ranking." />
            <MiniScore title="Marktlogik" body="Referenzpreis, Partnerverlässlichkeit, Abschlussindex und Deckungsbeitrag prägen die Deal-Qualität." />
          </div>
          <div className="split-section">
            <div>
              <div className="search-row single">
                <input
                  aria-label="Angebote suchen"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="z. B. PP, Hanffaser, Altglas"
                  value={query}
                />
              </div>
              <div className="card-list">
                {filteredOffers.slice(0, 5).map((offer) => (
                  <ListingCard key={offer.offerId} offer={offer} />
                ))}
              </div>
            </div>
            <form className="form-panel tight" key={prefillKey} onSubmit={submitDemand}>
              <h3>Gesuch erfassen</h3>
              <FormGrid>
                <TextField defaultValue="" label="Unternehmen" name="buyer" />
                <TextField defaultValue="" label="Branche" name="sector" />
                <SelectField defaultValue={prefill?.region ?? ""} label="Region" name="region" options={regions} />
                <MaterialClassField defaultValue={prefill?.materialClass ?? ""} extraClasses={extraMaterialClasses} onRegisterClass={registerMaterialClass} />
                <TextField defaultValue={prefill?.material ?? query} label="Benötigtes Material" name="material" />
                <NumberField defaultValue={prefill?.purity} label="Mindestreinheit in %" name="minPurity" />
                <NumberField defaultValue={prefill?.quantity} label="Benötigte Menge" name="quantity" />
                <TextField defaultValue={prefill?.unit ?? ""} label="Einheit" name="unit" />
                <TextField defaultValue={prefill?.certificate ?? ""} label="Benötigtes Zertifikat" name="certificate" />
                <NumberField defaultValue={undefined} label="Zielpreis EUR/t" name="targetPrice" />
                <NumberField defaultValue={undefined} label="Verkaufserlös EUR/t" name="revenue" />
                <NumberField defaultValue={undefined} label="Max. Distanz km" name="maxDistance" />
                <NumberField defaultValue={undefined} label="Abschlussindex (Szenario)" name="contractProbability" />
                <TextField defaultValue="" label="Notiz" name="note" />
              </FormGrid>
              <div className="form-actions">
                <button type="submit">Gesuch speichern</button>
              </div>
            </form>
          </div>
        </section>
      )}</>);
}
