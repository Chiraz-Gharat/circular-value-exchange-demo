import type { ReactNode } from 'react';
import { statusClass } from '../../domain/context.ts';
import { weightPercent } from '../../domain/engine.ts';
import type { ScoredChain,ScoreWeights } from '../../types/model.ts';
export function ChainTable({
  chains,
  onSelect,
  selectedId,
}: {
  chains: ScoredChain[];
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  return (
    <div className="table-wrap chain-table">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Kette</th>
            <th>Material</th>
            <th>Status</th>
            <th>Score</th>
            <th>Datenvertrauen</th>
            <th>Erklärung</th>
          </tr>
        </thead>
        <tbody>
          {chains.map((chain) => (
            <tr
              className={selectedId === chain.chainId ? "selected" : ""}
              key={chain.chainId}
              onClick={() => onSelect(chain.chainId)}
            >
              <td>{chain.rank}</td>
              <td>
                <strong>{chain.chainId}</strong>
                <small>{chain.supplier} → {chain.processor} → {chain.buyer}</small>
              </td>
              <td>{chain.material}</td>
              <td><span className={`pill ${statusClass(chain.status)}`}>{chain.status}</span></td>
              <td>{chain.totalScore ?? "-"}</td>
              <td>{chain.confidence}</td>
              <td><small>{chain.decision}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScoreBars({ chain, weights }: { chain: ScoredChain; weights: ScoreWeights }) {
  const rows = [
    ["Wirtschaft", chain.economics, weightPercent(weights, "economics")],
    ["Ökologie", chain.ecology, weightPercent(weights, "ecology")],
    ["Realisierbarkeit", chain.feasibility, weightPercent(weights, "feasibility")],
    ["Deal", chain.deal, weightPercent(weights, "deal")],
  ] as const;
  return (
    <div className="score-bars">
      {rows.map(([label, value, weight]) => (
        <div key={label}>
          <span>{label} · {weight}% Gewicht</span>
          <strong>{value === null ? "offen" : value.toFixed(2)}</strong>
          <i style={{ width: `${value ?? 0}%` }} />
        </div>
      ))}
    </div>
  );
}

export function FlowBox({
  badge,
  children,
  headline,
  title,
}: {
  badge: string;
  children: ReactNode;
  headline: string;
  title: string;
}) {
  return (
    <article className="flow-box">
      <span className="pill">{badge}</span>
      <small>{title}</small>
      <h3>{headline}</h3>
      {children}
    </article>
  );
}
