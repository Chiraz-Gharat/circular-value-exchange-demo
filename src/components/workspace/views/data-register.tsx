import { DEFAULT_WEIGHTS as defaultWeights } from '../../../config/scoringConfig.ts';
import scenario from '../../../data/demo/scenario.ts';
import { cmrsCategoryLabels,cmrsRecordTypeLabel,csvDownload,initialCmrsRecords,initialDemands,initialOffers,initialProcessors,weightDescriptions,weightLabels } from '../../../domain/context.ts';
import { weightPercent } from '../../../domain/engine.ts';
import type { ScoreWeights } from '../../../types/model.ts';
import { ChainTable } from '../chain-results.tsx';
import { DataTable,MiniScore } from '../display.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function DataRegister({ state }: { state: Pick<WorkspaceState, 'page' | 'offers' | 'setOffers' | 'demands' | 'setDemands' | 'processors' | 'setProcessors' | 'model' | 'setModel' | 'provenance' | 'setProvenance' | 'cmrsRecords' | 'setCmrsRecords' | 'scoreWeights' | 'setScoreWeights' | 'setSelectedChainId' | 'setMessage' | 'chains' | 'scoredChains' | 'go'> }) {
  const { page, offers, setOffers, demands, setDemands, processors, setProcessors, setModel, setProvenance, cmrsRecords, setCmrsRecords, scoreWeights, setScoreWeights, setSelectedChainId, setMessage, scoredChains, go } = state;
  return (<>{page === "database" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Datenregister</p>
            <h2>Eingaben, Referenzdaten und berechnete Ketten.</h2>
            <p>
              Die veröffentlichte Anwendung zeigt die vollständige Datenbasis. Eingaben dieses
              Browserfensters bleiben im lokalen Register erhalten; Ketten werden live daraus berechnet.
            </p>
          </div>
          <div className="intake-strip">
            <MiniScore title="CMRS-Register" body="Freitext-Records aus dem RQ1-Erkenner, inklusive Validierung, Nachweisen und Datenvertrauen." />
            <MiniScore title="Angebote" body="Angebote aus der Seite Angebot, inklusive Preis, Menge, Qualität und Zertifikat." />
            <MiniScore title="Gesuche" body="Gesuche aus der Seite Gesuch, inklusive Bedarf, Mindestqualität, Zielpreis und Distanzlimit." />
            <MiniScore title="Berechnete Ketten" body="Ketten werden nicht manuell gepflegt, sondern aus den Registern berechnet." />
          </div>
          <div className="database-actions">
            <a download="angebote.csv" href={csvDownload(offers as unknown as Record<string, unknown>[])}>Angebote exportieren</a>
            <a download="gesuche.csv" href={csvDownload(demands as unknown as Record<string, unknown>[])}>Gesuche exportieren</a>
            <a download="ketten.csv" href={csvDownload(scoredChains as unknown as Record<string, unknown>[])}>Ketten exportieren</a>
            <button
              className="secondary"
              onClick={() => {
                setOffers(initialOffers);
                setDemands(initialDemands);
                setCmrsRecords(initialCmrsRecords);
                setScoreWeights(defaultWeights); setProcessors(initialProcessors); setModel(scenario.model); setProvenance(scenario.provenance);
                setMessage("Registerdaten wurden wiederhergestellt.");
              }}
              type="button"
          >
            Registerdaten wiederherstellen
          </button>
          </div>
          <h3>CMRS-Records aus RQ1</h3>
          <DataTable
            headers={["ID", "Typ", "Material", "Kategorie", "Menge", "Region", "Status"]}
            rows={cmrsRecords.map((record) => [
              record.recordId,
              cmrsRecordTypeLabel(record.recordType),
              record.canonicalName,
              cmrsCategoryLabels[record.cmrsCategory] ?? record.cmrsCategory,
              `${record.quantityValue ?? "-"} ${record.quantityUnit}`,
              record.region,
              record.valid ? "CMRS-validiert" : "Prüfpunkte offen",
            ])}
          />
          <h3>Angebote</h3>
          <DataTable
            headers={["ID", "Anbieter", "Material", "Menge", "Region", "Zertifikat"]}
            rows={offers.map((offer) => [
              offer.offerId,
              offer.supplier,
              offer.material,
              `${offer.quantity} ${offer.unit}`,
              offer.region,
              offer.certificate,
            ])}
          />
          <h3>Gesuche</h3>
          <DataTable
            headers={["ID", "Käufer", "Material", "Menge", "Region", "Zertifikat"]}
            rows={demands.map((demand) => [
              demand.demandId,
              demand.buyer,
              demand.material,
              `${demand.quantity} ${demand.unit}`,
              demand.region,
              demand.certificate,
            ])}
          />
          <h3>Aufbereiterregister</h3>
          <DataTable
            headers={["ID", "Partner", "Materialklasse", "Region", "Prozess", "Zertifikate"]}
            rows={processors.map((processor) => [
              processor.processorId,
              processor.name,
              processor.materialClass,
              processor.region,
              processor.focus,
              processor.certificates,
            ])}
          />
          <h3>Aktuelle Score-Einstellungen</h3>
          <DataTable
            headers={["Dimension", "Gewicht", "Wird genutzt für"]}
            rows={(Object.keys(weightLabels) as (keyof ScoreWeights)[]).map((key) => [
              weightLabels[key],
              `${weightPercent(scoreWeights, key)} %`,
              weightDescriptions[key],
            ])}
          />
          <h3>Erzeugte Ketten</h3>
          <ChainTable chains={scoredChains.slice(0, 12)} onSelect={(id) => {
            setSelectedChainId(id);
            go("chains");
          }} />
        </section>
      )}</>);
}
