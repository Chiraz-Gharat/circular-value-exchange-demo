import type { CmrsRecord,CmrsValidationIssue } from '../../domain/context.ts';
import { cmrsCategoryLabels,cmrsJson,cmrsProvBundle,cmrsRecordTypeLabel } from '../../domain/context.ts';
export function CmrsRecordCard({
  onTransfer,
  record,
}: {
  onTransfer: (record: CmrsRecord) => void;
  record: CmrsRecord;
}) {
  const slots = record.recordType === "offer" ? record.properties : record.constraints;
  const errors = record.validation.filter((issue) => issue.severity === "error");
  const warnings = record.validation.filter((issue) => issue.severity === "warning");

  return (
    <article className="cmrs-record">
      <div className="record-head">
        <div>
          <span className={`pill ${record.valid ? "good" : "warn"}`}>
            {record.valid ? "CMRS-validiert" : "Prüfpunkte offen"}
          </span>
          <span className="pill">{cmrsRecordTypeLabel(record.recordType)}</span>
          <span className="pill">Datenvertrauen {record.confidence}</span>
        </div>
        <strong>{record.recordId}</strong>
      </div>

      <p className="raw-text">{record.rawText}</p>

      <div className="lineage-row">
        <span>Quelle: {record.extractionMethod}</span>
        <span>Herkunft: {record.createdAt.slice(0, 10)}</span>
        <span>Nachweisfelder: {slots.length}</span>
      </div>

      <dl className="cmrs-summary-grid">
        <div><dt>label_raw</dt><dd>{record.materialLabel}</dd></div>
        <div><dt>canonical_name</dt><dd>{record.canonicalName}</dd></div>
        <div><dt>CMRS-Kategorie</dt><dd>{cmrsCategoryLabels[record.cmrsCategory] ?? record.cmrsCategory}</dd></div>
        <div><dt>Marktplatzklasse</dt><dd>{record.materialClass}</dd></div>
        <div><dt>Menge</dt><dd>{record.quantityValue ?? "-"} {record.quantityUnit}</dd></div>
        <div><dt>Region</dt><dd>{record.region}</dd></div>
      </dl>

      <div className="slot-list">
        <strong>{record.recordType === "unknown" ? "Typ ungeklärt" : record.recordType === "offer" ? "Properties" : "Constraints"}</strong>
        {slots.length === 0 ? (
          <p>Keine Slots erkannt. Der Datensatz bleibt erklärbar, aber fachlich unvollständig.</p>
        ) : (
          slots.map((slot) => (
            <span key={`${record.recordId}-${slot.propertyKey}-${slot.evidence}`}>
              {slot.label}: {slot.op} {slot.value} {slot.unit}
              {slot.evidenceStart !== undefined ? ` · ${slot.evidenceStart}-${slot.evidenceEnd}` : ""}
            </span>
          ))
        )}
      </div>

      <IssueList errors={errors} warnings={warnings} />

      <details className="json-details">
        <summary>CMRS-JSON anzeigen</summary>
        <pre>{JSON.stringify(cmrsJson(record), null, 2)}</pre>
      </details>

      <details className="json-details">
        <summary>Herkunftsdaten anzeigen</summary>
        <pre>{JSON.stringify(cmrsProvBundle(record), null, 2)}</pre>
      </details>

      <div className="form-actions">
        <button onClick={() => onTransfer(record)} type="button">
          {record.recordType === "unknown" ? "Manuelle Prüfung erforderlich" : record.recordType === "offer" ? "Ins Angebotsregister übernehmen" : "Ins Gesuchsregister übernehmen"}
        </button>
      </div>
    </article>
  );
}

export function IssueList({
  errors,
  warnings,
}: {
  errors: CmrsValidationIssue[];
  warnings: CmrsValidationIssue[];
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return <p className="issue-clean">Validator: keine Fehler, keine Warnungen.</p>;
  }

  return (
    <div className="issue-list">
      {[...errors, ...warnings].map((issue) => (
        <p className={issue.severity === "error" ? "issue-error" : "issue-warning"} key={`${issue.code}-${issue.path}`}>
          <strong>{issue.code}</strong> {issue.path}: {issue.message}
        </p>
      ))}
    </div>
  );
}
