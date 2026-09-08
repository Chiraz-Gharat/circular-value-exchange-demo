import type { MouseEvent,ReactNode } from 'react';
import { useState } from 'react';
import { SCORE_SCALE } from '../../config/scoringConfig.ts';
import { cmrsToMarketplaceClass } from '../../config/vocabularies.ts';
import { checkOrRegisterCategoryViaApi } from '../../domain/cmrs/client.ts';
import { materialClasses } from '../../domain/context.ts';

// Sentinel-Wert des Dropdowns fuer "neue Kategorie vorschlagen" - nie ein
// gespeicherter Wert, siehe MaterialClassField.
const NEW_CATEGORY_OPTION = "__new__";
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

export function TextField({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return (
    <label>
      <span>{label}</span>
      <input defaultValue={defaultValue} name={name} required={!["certificate"].includes(name)} />
    </label>
  );
}

export function NumberField({ defaultValue, label, name }: { defaultValue: number | undefined; label: string; name: string }) {
  return (
    <label>
      <span>{label}</span>
      <input defaultValue={defaultValue} min="0" step="any" max={["purity","minPurity","qualityScore","contractProbability"].includes(name)?SCORE_SCALE.max:undefined} name={name} required type="number" />
    </label>
  );
}

export function SelectField({ defaultValue = "", label, name, options }: { defaultValue?: string; label: string; name: string; options: string[] }) {
  return (
    <label>
      <span>{label}</span>
      <select defaultValue={options.includes(defaultValue) ? defaultValue : ""} name={name} required>
        <option value="" disabled>Bitte wählen</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

// Materialklasse mit KI-geprüfter Vokabularerweiterung: der Vorschlag geht an
// check_or_register_category(), das zuerst prüft, ob eine bestehende Kategorie
// inhaltlich passt. Nur ein echt neuer Vorschlag wird als zusätzliche Klasse
// aufgenommen (Human-in-the-Loop: die Übernahme bleibt eine Nutzerhandlung).
export function MaterialClassField({
  defaultValue = "",
  extraClasses,
  onRegisterClass,
}: {
  defaultValue?: string;
  extraClasses: string[];
  onRegisterClass: (materialClass: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [proposal, setProposal] = useState("");
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState("");

  const options = [...materialClasses, ...extraClasses];
  const proposing = value === NEW_CATEGORY_OPTION;

  async function checkProposal(event: MouseEvent<HTMLButtonElement>) {
    const formElement = event.currentTarget.form;
    const materialInput = formElement?.elements.namedItem("material");
    const materialLabel = materialInput instanceof HTMLInputElement ? materialInput.value.trim() : "";
    if (!proposal.trim()) {
      setNote("Bitte zuerst eine Bezeichnung eintragen.");
      return;
    }
    setChecking(true);
    setNote("");
    try {
      const result = await checkOrRegisterCategoryViaApi(materialLabel, proposal.trim());
      if (result.isNew) {
        onRegisterClass(result.label);
        setValue(result.label);
        setNote(`Neue Kategorie "${result.label}" registriert.`);
      } else {
        const mapped = cmrsToMarketplaceClass[result.category] ?? "Sonstige";
        setValue(mapped);
        setNote(`Bestehende Kategorie passt: ${result.label} → ${mapped}.`);
      }
      setProposal("");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Kategorieprüfung fehlgeschlagen.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <label>
      <span>Materialklasse</span>
      <select
        name={proposing ? undefined : "materialClass"}
        onChange={(event) => setValue(event.target.value)}
        required
        value={value}
      >
        <option value="" disabled>Bitte wählen</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value={NEW_CATEGORY_OPTION}>+ Neue Kategorie vorschlagen…</option>
      </select>
      {proposing ? (
        <span className="category-proposal">
          {/* Solange nur ein Vorschlag offen ist, geht bewusst ein leerer Wert
              ins Formular: die bestehende Datensatzprüfung meldet dann
              "materialClass: Angabe fehlt." statt einen Platzhalter zu speichern. */}
          <input name="materialClass" type="hidden" value="" />
          <input
            onChange={(event) => setProposal(event.target.value)}
            placeholder="z. B. Carbonfasern"
            value={proposal}
          />
          <button className="secondary" disabled={checking} onClick={checkProposal} type="button">
            {checking ? "Wird geprüft…" : "KI-Prüfung"}
          </button>
        </span>
      ) : null}
      {note ? <em className="field-error-msg">{note}</em> : null}
    </label>
  );
}
