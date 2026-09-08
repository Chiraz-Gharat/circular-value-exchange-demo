import { AVAILABILITY_SCORES } from '../../../config/scoringConfig.ts';
import { regions } from '../../../domain/context.ts';
import { MiniScore } from '../display.tsx';
import { FormGrid,MaterialClassField,NumberField,SelectField,TextField } from '../form-controls.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function OfferForm({ state }: { state: Pick<WorkspaceState, 'extraMaterialClasses' | 'go' | 'page' | 'prefill' | 'prefillKey' | 'registerMaterialClass' | 'submitOffer'> }) {
  const { extraMaterialClasses, go, page, prefill, prefillKey, registerMaterialClass, submitOffer } = state;
  return (<>{page === "offer" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Angebot</p>
            <h2>Materialangebot einstellen.</h2>
            <p>
              Der Eintrag wird sofort gespeichert und gegen vorhandene Gesuche geprüft.
            </p>
          </div>
          <div className="intake-strip">
            <MiniScore title="Speicherung" body="Das Angebot landet direkt im Angebotsregister." />
            <MiniScore title="Kettenerzeugung" body="Material, Menge, Reinheit, Region und Zertifikat steuern die Kettenbildung." />
            <MiniScore title="Ranking" body="FR7 bewertet vier Dimensionen; Datenvertrauen wird separat ausgewiesen." />
          </div>
          <form className="form-panel" key={prefillKey} onSubmit={submitOffer}>
            <FormGrid>
              <TextField defaultValue="" label="Anbieter" name="supplier" />
              <TextField defaultValue="" label="Branche" name="sector" />
              <SelectField defaultValue={prefill?.region ?? ""} label="Region" name="region" options={regions} />
              <MaterialClassField defaultValue={prefill?.materialClass ?? ""} extraClasses={extraMaterialClasses} onRegisterClass={registerMaterialClass} />
              <TextField defaultValue={prefill?.material ?? ""} label="Material" name="material" />
              <TextField defaultValue="" label="Form" name="form" />
              <NumberField defaultValue={prefill?.purity} label="Reinheit in %" name="purity" />
              <NumberField defaultValue={prefill?.quantity} label="Menge" name="quantity" />
              <TextField defaultValue={prefill?.unit ?? ""} label="Einheit" name="unit" />
              <NumberField defaultValue={undefined} label="Qualitätsscore" name="qualityScore" />
              <SelectField
                label="Verfügbarkeit"
                name="availability"
                options={Object.keys(AVAILABILITY_SCORES)}
              />
              <TextField defaultValue={prefill?.certificate ?? ""} label="Zertifikat" name="certificate" />
              <SelectField label="Transport zulässig" name="transportOk" options={["ja", "nein"]} />
              <SelectField label="Regulatorisch zulässig" name="regulationOk" options={["ja", "nein"]} />
              <NumberField defaultValue={undefined} label="Referenzpreis EUR/t" name="referencePrice" />
              <NumberField defaultValue={undefined} label="Angebotspreis EUR/t" name="offerPrice" />
              <SelectField defaultValue={prefill?.evidence ?? ""} label="Datenqualität" name="evidence" options={["validiert", "strukturiert", "proxy"]} />
              <TextField defaultValue="" label="Notiz" name="note" />
            </FormGrid>
            <div className="form-actions">
              <button type="submit">Angebot speichern</button>
              <button className="secondary" onClick={() => go("marketplace")} type="button">Zum Marktplatz</button>
            </div>
          </form>
        </section>
      )}</>);
}
