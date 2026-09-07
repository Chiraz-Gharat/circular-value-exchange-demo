import { cmrsSampleTexts,integrationReviewItems } from '../../../domain/context.ts';
import { CmrsRecordCard } from '../cmrs-record-card.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function CmrsIntake({ state }: { state: Pick<WorkspaceState, 'page' | 'cmrsRecords' | 'cmrsText' | 'setCmrsText' | 'go' | 'submitCmrsText' | 'transferCmrsRecord'> }) {
  const { page, cmrsRecords, cmrsText, setCmrsText, go, submitCmrsText, transferCmrsRecord } = state;
  return (<>{page === "cmrs" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">RQ1 integriert</p>
            <h2>CMRS-Dateneingang.</h2>
            <p>
              Materialtexte aus Anzeige, E-Mail oder Formular werden in CMRS-Records
              überführt und danach kontrolliert in Angebot oder Gesuch übertragen.
            </p>
          </div>

          <div className="trace-strip">
            {["Freitext", "CMRS-Record", "Validator", "Register", "Kettenplanung"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="cmrs-layout">
            <form className="form-panel cmrs-intake" onSubmit={submitCmrsText}>
              <h3>Materialtext erfassen</h3>
              <label>
                <span>Freitext aus Anzeige, E-Mail oder Formular</span>
                <textarea
                  onChange={(event) => setCmrsText(event.target.value)}
                  value={cmrsText}
                />
              </label>
              <div className="example-row">
                {cmrsSampleTexts.map((sample, index) => (
                  <button
                    className="secondary"
                    key={sample}
                    onClick={() => setCmrsText(sample)}
                    type="button"
                  >
                    Beispiel {index + 1}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button type="submit">CMRS-Record erzeugen</button>
                <button className="secondary" onClick={() => go("database")} type="button">Register ansehen</button>
              </div>
            </form>

            <article className="wide-panel cmrs-method">
              <p className="eyebrow">Integrationscheck</p>
              <h3>Was aus RQ1 übernommen wurde.</h3>
              <div className="integration-checks">
                {integrationReviewItems.map(([title, body]) => (
                  <div key={title}>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="wide-panel">
            <h3>CMRS-Record-Historie</h3>
            <div className="record-list">
              {cmrsRecords.map((record) => (
                <CmrsRecordCard
                  key={record.recordId}
                  onTransfer={transferCmrsRecord}
                  record={record}
                />
              ))}
            </div>
          </div>

          <div className="wide-panel">
            <h3>Validierungsbefund aus RQ1</h3>
            <p className="panel-note">
              Für die Arbeit bleibt wichtig: Der geprüfte Korrekturpfad liefert die
              stabilste Datenqualität. Die Anwendung bildet den Ablauf erklärbar ab und zeigt, wo
              Validierung und Nachweise in RQ2 weiterverwendet werden.
            </p>
            <p>Die Referenzbefunde zur Extraktion gehören zur RQ1-Vorarbeit. Dieser RQ2-Rechenkern erhebt keine neue Extraktionsmessung.</p>
          </div>
        </section>
      )}</>);
}
