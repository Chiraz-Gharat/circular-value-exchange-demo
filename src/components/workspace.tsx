import { DEMO_ASSUMPTION_NOTICE } from '../config/demoAssumptions.ts';
import { pageIds,pageLabels } from '../domain/context.ts';
import { useWorkspace } from './workspace/use-workspace.ts';
import { EmptyChains } from './workspace/views/empty-chains.tsx';
import { ChainPlanning } from './workspace/views/chain-planning.tsx';
import { CmrsIntake } from './workspace/views/cmrs-intake.tsx';
import { DatasetControls } from './workspace/views/dataset-controls.tsx';
import { DataRegister } from './workspace/views/data-register.tsx';
import { MethodologyView } from './workspace/views/methodology.tsx';
import { MarketplaceView } from './workspace/views/marketplace.tsx';
import { OfferForm } from './workspace/views/offer-form.tsx';
import { DemandForm } from './workspace/views/demand-form.tsx';
import { StartHero } from './workspace/views/start-hero.tsx';
import { StartOverview } from './workspace/views/start-overview.tsx';
export default function Home() {
  const state = useWorkspace();
  const { page, provenance, message, go } = state;
  return (<main>
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => go("start")} type="button">
            <span className="brand-mark">CVX</span>
            <span>
              Circular Value Exchange
              <small>Sekundärrohstoffe handeln und Wertketten belegen</small>
            </span>
          </button>
          <div className="header-right">
            <span className="market-status"><i /> RQ2 · Szenariorechnung</span>
            <nav aria-label="Hauptnavigation">
              {pageIds.map((id) => (
                <button
                  className={page === id ? "active" : ""}
                  key={id}
                  onClick={() => go(id)}
                  type="button"
                >
                  {pageLabels[id]}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <p className="dataset-provenance">{provenance}</p><p className="dataset-provenance">{DEMO_ASSUMPTION_NOTICE}</p>
      <StartHero state={state} />

      <div className="message-bar">
        <strong>Systemstatus</strong>
        <span>{message}</span>
      </div>

      <StartOverview state={state} />

      <CmrsIntake state={state} />

      <EmptyChains state={state} />
      <MarketplaceView state={state} />

      <OfferForm state={state} />

      <DemandForm state={state} />

      <ChainPlanning state={state} />

      <MethodologyView state={state} />

      <DatasetControls state={state} />
      <DataRegister state={state} />
      <footer className="site-footer">
        <strong>Circular Value Exchange</strong>
        <span>Fachprototyp für RQ2: Marktplatz, CMRS-Dateneingang, Kettenplanung, FR7-Ranking und Audit-Trail.</span>
      </footer>
    </main>);
}
