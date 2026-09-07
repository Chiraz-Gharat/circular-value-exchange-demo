import type { ReactNode } from 'react';
import { SCORE_SCALE } from '../../config/scoringConfig.ts';
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

export function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label>
      <span>{label}</span>
      <select defaultValue="" name={name} required>
        <option value="" disabled>Bitte wählen</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
