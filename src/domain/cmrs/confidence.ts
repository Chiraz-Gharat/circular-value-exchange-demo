import { CMRS_TRUST_HEURISTIC } from '../../config/cmrsConfig.ts';

export function cmrsDataTrust(valid: boolean, issueCount: number, evidenceCount: number) {
  if (!valid || issueCount > CMRS_TRUST_HEURISTIC.maxIssues) return "niedrig";
  if (evidenceCount >= CMRS_TRUST_HEURISTIC.highEvidence) return "hoch";
  if (evidenceCount >= CMRS_TRUST_HEURISTIC.mediumEvidence) return "mittel";
  return "niedrig";
}
