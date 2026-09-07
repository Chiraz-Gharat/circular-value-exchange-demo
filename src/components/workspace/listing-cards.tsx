import { materialImage,statusClass } from '../../domain/context.ts';
import type { Demand,Offer } from '../../types/model.ts';
export function ListingCard({ offer }: { offer: Offer }) {
  return (
    <article className="listing-card">
      <div className="material-thumb">
        <img alt={`${offer.materialClass} Materialprobe`} src={materialImage(offer.materialClass)} />
        <span>{offer.materialClass}</span>
      </div>
      <div>
        <span className={`pill ${statusClass(offer.status)}`}>{offer.status}</span>
        <span className="pill">{offer.evidence}</span>
      </div>
      <h4>{offer.material} · {offer.form}</h4>
      <p>{offer.supplier} · {offer.sector}</p>
      <dl>
        <div><dt>Menge</dt><dd>{offer.quantity} {offer.unit}</dd></div>
        <div><dt>Reinheit</dt><dd>{offer.purity}%</dd></div>
        <div><dt>Preis</dt><dd>{offer.offerPrice} €/t</dd></div>
        <div><dt>Region</dt><dd>{offer.region}</dd></div>
        <div><dt>Zertifikat</dt><dd>{offer.certificate}</dd></div>
        <div><dt>Verfügbarkeit</dt><dd>{offer.availability}</dd></div>
      </dl>
    </article>
  );
}

export function DemandCard({ demand }: { demand: Demand }) {
  return (
    <article className="listing-card demand">
      <div className="material-thumb">
        <img alt={`${demand.materialClass} Materialprobe`} src={materialImage(demand.materialClass)} />
        <span>{demand.materialClass}</span>
      </div>
      <div>
        <span className={`pill ${statusClass(demand.status)}`}>{demand.status}</span>
        <span className="pill">{demand.materialClass}</span>
      </div>
      <h4>Gesuch: {demand.material}</h4>
      <p>{demand.buyer} · {demand.sector}</p>
      <dl>
        <div><dt>Menge</dt><dd>{demand.quantity} {demand.unit}</dd></div>
        <div><dt>Min. Reinheit</dt><dd>{demand.minPurity}%</dd></div>
        <div><dt>Zielpreis</dt><dd>{demand.targetPrice} €/t</dd></div>
        <div><dt>Region</dt><dd>{demand.region}</dd></div>
        <div><dt>Nachweis</dt><dd>{demand.certificate}</dd></div>
        <div><dt>Distanzlimit</dt><dd>{demand.maxDistance} km</dd></div>
      </dl>
    </article>
  );
}
