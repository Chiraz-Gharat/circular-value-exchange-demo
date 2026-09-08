import { useState } from 'react';
import type { CmrsRecord,CmrsSlot } from '../../domain/context.ts';
import { cmrsCategoryLabels,cmrsJson,cmrsProvBundle,cmrsRecordTypeLabel } from '../../domain/context.ts';
import { validateCmrsRecordViaApi } from '../../domain/cmrs/client.ts';
import { cmrsFriendlyIssueMessage } from '../../domain/cmrs/messages.ts';

const SLOT_OPS: CmrsSlot['op'][] = ['min', 'max', 'range', 'equals'];

export function CmrsRecordCard({
  onTransfer,
  onUpdate,
  record,
}: {
  onTransfer: (record: CmrsRecord) => void;
  onUpdate: (record: CmrsRecord) => void;
  record: CmrsRecord;
}) {
  // Bearbeitbare Arbeitskopie: die im Korrekturformular ueblichen Aenderungen
  // (Material, Kategorie, Menge, Standort, Slot-Werte) werden hier direkt am
  // erzeugten CMRS-Record vorgenommen, identisch zum Korrekturformular der
  // echten Anwendung, statt den KI-Vorschlag nur read-only anzuzeigen.
  const [draft, setDraft] = useState<CmrsRecord>(record);
  const [busy, setBusy] = useState(false);

  const slotsKey = draft.recordType === "demand" ? "constraints" : "properties";
  const slots = draft[slotsKey];
  const errors = draft.validation.filter((issue) => issue.severity === "error");

  function patch(changes: Partial<CmrsRecord>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function patchSlot(index: number, changes: Partial<CmrsSlot>) {
    setDraft((current) => {
      const nextSlots = current[slotsKey].map((slot, i) => (i === index ? { ...slot, ...changes } : slot));
      return { ...current, [slotsKey]: nextSlots };
    });
  }

  async function checkAndSave() {
    setBusy(true);
    try {
      const { validation, valid } = await validateCmrsRecordViaApi(cmrsJson(draft));
      const updated = { ...draft, validation, valid };
      setDraft(updated);
      onUpdate(updated);
    } catch (error) {
      setDraft((current) => ({
        ...current,
        validation: [{
          code: "E000",
          rule: "-",
          severity: "error",
          path: "-",
          message: error instanceof Error ? error.message : "Validierung fehlgeschlagen.",
        }],
        valid: false,
      }));
    } finally {
      setBusy(false);
    }
  }

  function errorFor(path: string) {
    return errors.find((issue) => issue.path === path);
  }

  function slotError(index: number) {
    return errors.find((issue) => issue.path === `${slotsKey}[${index}].evidence` || issue.path.startsWith(`${slotsKey}[${index}]`));
  }

  const typeErrors = errors.filter((issue) => !issue.path.startsWith("properties") && !issue.path.startsWith("constraints") && !errorFor(issue.path));

  return (
    <article className="cmrs-record">
      <div className="record-head">
        <div>
          <span className={`pill ${draft.valid ? "good" : "warn"}`}>
            {draft.valid ? "CMRS-validiert" : "Prüfpunkte offen"}
          </span>
          <span className="pill">{cmrsRecordTypeLabel(draft.recordType)}</span>
          <span className="pill">Datenvertrauen {draft.confidence}</span>
        </div>
        <strong>{draft.recordId}</strong>
      </div>

      <p className="raw-text">{draft.rawText}</p>

      <div className="lineage-row">
        <span>Quelle: {draft.extractionMethod}</span>
        <span>Herkunft: {draft.createdAt.slice(0, 10)}</span>
        <span>Nachweisfelder: {slots.length}</span>
      </div>

      <div className="cmrs-summary-grid cmrs-summary-edit">
        <label>
          <span>label_raw</span>
          <input onChange={(event) => patch({ materialLabel: event.target.value })} value={draft.materialLabel} />
          {errorFor("material.label_raw") ? <em className="field-error-msg">{cmrsFriendlyIssueMessage(errorFor("material.label_raw")!)}</em> : null}
        </label>
        <label>
          <span>canonical_name</span>
          <input onChange={(event) => patch({ canonicalName: event.target.value })} value={draft.canonicalName} />
        </label>
        <label>
          <span>CMRS-Kategorie</span>
          <select
            onChange={(event) => patch({ cmrsCategory: event.target.value })}
            value={draft.cmrsCategory}
          >
            {Object.entries(cmrsCategoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {errorFor("material.category") ? <em className="field-error-msg">{cmrsFriendlyIssueMessage(errorFor("material.category")!)}</em> : null}
        </label>
        <label>
          <span>Menge</span>
          <span className="cmrs-inline-fields">
            <input
              onChange={(event) => patch({ quantityValue: event.target.value === "" ? null : Number(event.target.value) })}
              type="number"
              value={draft.quantityValue ?? ""}
            />
            <input onChange={(event) => patch({ quantityUnit: event.target.value })} value={draft.quantityUnit} />
          </span>
          {errorFor("quantity") || errorFor("quantity.value") || errorFor("quantity.unit_ucum") ? (
            <em className="field-error-msg">
              {cmrsFriendlyIssueMessage((errorFor("quantity") || errorFor("quantity.value") || errorFor("quantity.unit_ucum"))!)}
            </em>
          ) : null}
        </label>
        <label>
          <span>Standort</span>
          <input onChange={(event) => patch({ location: event.target.value })} value={draft.location} />
          {errorFor("context.location") ? <em className="field-error-msg">{cmrsFriendlyIssueMessage(errorFor("context.location")!)}</em> : null}
        </label>
        <label>
          <span>Region</span>
          <input onChange={(event) => patch({ region: event.target.value })} value={draft.region} />
        </label>
      </div>

      <div className="slot-list">
        <strong>{draft.recordType === "unknown" ? "Typ ungeklärt" : draft.recordType === "offer" ? "Properties" : "Constraints"}</strong>
        {slots.length === 0 ? (
          <p>Keine Slots erkannt. Der Datensatz bleibt erklärbar, aber fachlich unvollständig.</p>
        ) : (
          slots.map((slot, index) => (
            <div className="slot-row-edit" key={`${draft.recordId}-${slot.propertyKey}-${index}`}>
              <span>{slot.label}</span>
              <select onChange={(event) => patchSlot(index, { op: event.target.value as CmrsSlot['op'] })} value={slot.op}>
                {SLOT_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              <input
                onChange={(event) => patchSlot(index, { value: Number(event.target.value) })}
                type="number"
                value={typeof slot.value === "number" ? slot.value : ""}
              />
              <input onChange={(event) => patchSlot(index, { unit: event.target.value })} value={slot.unit} />
              {slotError(index) ? <em className="slot-error-msg">{cmrsFriendlyIssueMessage(slotError(index)!)}</em> : null}
            </div>
          ))
        )}
      </div>

      {typeErrors.length > 0 ? (
        <div className="issue-list">
          {typeErrors.map((issue) => (
            <p className="issue-error" key={`${issue.code}-${issue.path}`}>{cmrsFriendlyIssueMessage(issue)}</p>
          ))}
        </div>
      ) : null}

      <details className="json-details">
        <summary>CMRS-JSON anzeigen</summary>
        <pre>{JSON.stringify(cmrsJson(draft), null, 2)}</pre>
      </details>

      <details className="json-details">
        <summary>Herkunftsdaten anzeigen</summary>
        <pre>{JSON.stringify(cmrsProvBundle(draft), null, 2)}</pre>
      </details>

      <div className="form-actions">
        <button disabled={busy} onClick={checkAndSave} type="button">
          {busy ? "Wird geprüft…" : "Korrektur prüfen und speichern"}
        </button>
        <button onClick={() => onTransfer(draft)} type="button">
          {draft.recordType === "unknown" ? "Manuelle Prüfung erforderlich" : draft.recordType === "offer" ? "Ins Angebotsregister übernehmen" : "Ins Gesuchsregister übernehmen"}
        </button>
      </div>
    </article>
  );
}
