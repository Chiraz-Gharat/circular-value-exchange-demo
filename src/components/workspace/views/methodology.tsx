import { DEFAULT_WEIGHTS as defaultWeights } from '../../../config/scoringConfig.ts';
import { scoreFormula } from '../../../domain/engine.ts';
import { DataTable,MiniScore } from '../display.tsx';
import type { WorkspaceState } from '../use-workspace.ts';
export function MethodologyView({ state }: { state: Pick<WorkspaceState, 'page' | 'scoreWeights'> }) {
  const { page, scoreWeights } = state;
  return (<>{page === "explain" && (
        <section className="page-grid">
          <div className="page-title compact">
            <p className="eyebrow">Methodik</p>
            <h2>Berechnungslogik und Nachvollziehbarkeit.</h2>
            <p>
              Kurzfassung: Datenbasis, Kettenerzeugung, harte Ausschlüsse,
              FR7-Score und Datenvertrauen.
            </p>
          </div>

          <div className="explain-grid">
            <article>
              <span className="pill good">1</span>
              <h3>Datenbasis</h3>
              <p>Angebote, Gesuche, CMRS-Records und Aufbereiter bilden die Register.</p>
            </article>
            <article>
              <span className="pill good">2</span>
              <h3>Kettenplanung</h3>
              <p>Anbieter, Aufbereiter und Käufer werden zu Kandidaten verbunden.</p>
            </article>
            <article>
              <span className="pill warn">3</span>
              <h3>Muss-Kriterien</h3>
              <p>Materialfit, Reinheit, Zertifikat, Transport und Distanz laufen vor dem Score.</p>
            </article>
            <article>
              <span className="pill good">4</span>
              <h3>FR7-Ranking</h3>
              <p>Nur bewertbare Ketten erhalten Score; Datenvertrauen und Begründung bleiben sichtbar.</p>
            </article>
          </div>

          <div className="wide-panel">
            <h3>FR7-Formel</h3>
            <p className="formula">
              {scoreFormula(scoreWeights)}
            </p>
            <div className="score-grid">
              <MiniScore title="Wirtschaftlichkeit" body="Deckungsbeitrag, Erlös, Prozesskosten und Transportkosten." />
              <MiniScore title="Ökologie" body="CO2, Distanz und Ressourceneffizienz." />
              <MiniScore title="Realisierbarkeit" body="Mengenfit, Qualitätsfit, Verfügbarkeit, Reinheitsreserve und Compliance." />
              <MiniScore title="Deal-Qualität" body="Preisattraktivität, qualitative Partnerverlässlichkeit, Abschlussindex und Deckungsbeitrag." />
            </div>
          </div>

          <p className="formula">{scoreFormula(defaultWeights)}</p>

          <div className="wide-panel">
            <h3>Integration RQ1 → RQ2</h3>
            <DataTable
              headers={["RQ1-Baustein", "Übernahme im Marktplatz", "Nutzen für die Wertschöpfungskette"]}
              rows={[
                ["CMRS v1.1.0", "Dateneingang erzeugt strukturierte Records", "Matching läuft auf normalisierten Feldern statt auf Freitext"],
                ["Validator mit E-/W-Codes", "Prüfpunkte erscheinen im CMRS- und Chain-Prüflog", "Ausschlüsse sind belegbar und nicht nur Bauchgefühl"],
                ["Nachweise/Herkunft", "Originaltext, Position und Quelle bleiben sichtbar", "Nachvollziehbarkeit vom Eingang bis zum Ranking"],
                ["Referenzprüfung", "Korrekturpfad als Referenz für robuste Extraktion", "Begründung, warum Datenqualität vor Matching priorisiert wird"],
              ]}
            />
          </div>

          <div className="workbench-grid">
            <article className="wide-panel">
              <p className="eyebrow">Wo sind die Daten?</p>
              <h3>Fünf Register bilden die Datenbasis.</h3>
              <DataTable
                headers={["Register", "Quelle", "Nutzung im System"]}
                rows={[
                  ["Angebote", "Seite Angebot", "Eingang für Material, Menge, Preis, Reinheit und Datenqualität"],
                  ["Gesuche", "Seite Gesuch", "Eingang für Bedarf, Mindestqualität, Zielpreis und Distanzlimit"],
                  ["CMRS-Records", "Seite Dateneingang", "normalisierte Rohdaten aus RQ1 vor Übernahme in den Marktplatz"],
                  ["Aufbereiter", "Referenzregister", "Prozesskosten, Effizienz, Zertifikate und Zuverlässigkeit"],
                  ["Ketten", "live berechnet", "werden aus Angeboten, Gesuchen und Aufbereitern erzeugt"],
                ]}
              />
            </article>
            <article className="wide-panel">
              <p className="eyebrow">Wie entsteht eine Kette?</p>
              <h3>Die Kettenplanung arbeitet in fünf Schritten.</h3>
              <ol className="script-list compact-list">
                <li>Aktive Angebote und aktive Gesuche werden geladen.</li>
                <li>Materialklasse und Material werden verglichen.</li>
                <li>Ein passender Aufbereitungspartner wird eingesetzt.</li>
                <li>Menge, Distanz, CO2, Kosten und Deal-Werte werden berechnet.</li>
                <li>Muss-Kriterien entscheiden, ob der Kandidat gerankt oder ins Prüflog verschoben wird.</li>
              </ol>
            </article>
          </div>

          <div className="wide-panel">
            <h3>Ausschlusslogik und Datenvertrauen</h3>
            <DataTable
              headers={["Prüfung", "Wann kritisch?", "Was wird angezeigt?"]}
              rows={[
                ["Materialfit", "Material ist nur Klassenmatch oder weicht ab", "Nicht gerankt oder Materialprüfung"],
                ["Reinheit", "Angebot liegt unter Mindestanforderung", "Ausschlussgrund mit Prozentwerten"],
                ["Zertifikat", "Nachweis entspricht nicht dem Bedarf", "Zertifikatslücke und nächster Schritt"],
                ["Distanz", "Route überschreitet Maximaldistanz", "Distanzprüfung mit Kilometerwert"],
                ["Datenvertrauen", "Datenqualität ist abgeleitet oder nur strukturiert", "hoch, mittel oder niedrig pro Kette"],
              ]}
            />
          </div>

          <div className="wide-panel">
            <h3>Case-to-Capability-Ableitung</h3>
            <DataTable
              rows={[
                ["MaterialDistrict", "Katalog, Taxonomie, Facettensuche", "Materialprofile und sichtbare Listings"],
                ["KiertoaSuomesta", "Inserate, Standort, Kontakt", "Marktplatz-Basis plus Handover"],
                ["AgriPLaCE", "gewichtetes Matching", "FR7-Scoring und Muss-Kriterien"],
                ["BioeconomyVentures", "Profile, TRL, Evaluation", "Deal-Qualität und Partnerfit"],
                ["SCALE-UP", "regionale Governance", "Datenqualität und Rollenlogik"],
                ["DECIDE", "Wertkettenplanung", "Kettenbildung und Erklärbarkeit"],
              ]}
              headers={["Case", "Beobachtetes Muster", "Umsetzung in der Plattform"]}
            />
          </div>

          <div className="wide-panel">
            <h3>Präsentationsablauf</h3>
            <ol className="script-list">
              <li>Überblick öffnen: Der Marktplatz ist mehr als ein Anzeigenportal.</li>
              <li>Auf der Seite &quot;Angebot&quot; ein neues Materialangebot speichern.</li>
              <li>Auf der Seite &quot;Gesuch&quot; einen passenden Bedarf speichern.</li>
              <li>In der Kettenplanung zeigen, wie daraus Kettenkandidaten entstehen.</li>
              <li>Auf Score, Datenvertrauen und Begründungen verweisen.</li>
              <li>Auf dieser Seite die wissenschaftliche Logik und Case-Ableitung erklären.</li>
            </ol>
          </div>
        </section>
      )}</>);
}
