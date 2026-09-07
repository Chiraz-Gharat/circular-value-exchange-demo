import { assetPath } from '../config/deployment.ts';
import { materialImages } from '../config/vocabularies.ts';
import type { ScoredChain } from '../types/model.ts';

export function csvDownload(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const body = rows.map((row) =>
    headers
      .map((header) => {
        const value = String(row[header] ?? "");
        return `"${value.replaceAll('"', '""')}"`;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...body].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function statusClass(status: string) {
  if (status === "Bewertbar" || status === "aktiv" || status === "Kette erzeugt") return "good";
  if (status === "Prüfen" || status.includes("offen") || status.includes("prüfung")) return "warn";
  return "risk";
}

export function nextAction(chain: ScoredChain) {
  if (!chain.exactMaterial) return "Materialsubstitution fachlich prüfen oder Gesuch präzisieren.";
  if (!chain.purityOk) return "Qualitätsnachweis anfordern oder Aufbereitungsschritt ergänzen.";
  if (!chain.certificateOk) return "Zertifikat nachreichen oder alternativen Käufer wählen.";
  if (!chain.distanceOk) return "Regionalen Aufbereiter suchen oder Distanzlimit anpassen.";
  if (!chain.transportOk) return "Transportfreigabe mit Anbieter klären.";
  if (!chain.regulationOk) return "Regulatorische Prüfung abschließen.";
  return chain.totalScore === null ? "Offene Modellannahmen fachlich klären." : "Für Verhandlung freigeben.";
}

export function materialImage(materialClass: string) {
  return assetPath(materialImages[materialClass] ?? materialImages.Sonstige);
}
