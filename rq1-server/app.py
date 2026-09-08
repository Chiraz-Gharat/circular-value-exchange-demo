import os
import json
import uuid
import sqlite3
from flask import Flask, request, jsonify, render_template

# Import existing core modules
from mapper import map_free_text_to_cmrs, resolve_canonical_name
from validator import validate_cmrs
from prov_model import attach_provenance
from controlled_vocabularies import (
    MATERIAL_CATEGORIES, PROPERTY_CATALOG, UCUM_WHITELIST, OPERATORS, COMPLIANCE_REGIMES,
)
try:
    import llm_fallback
except ImportError:
    llm_fallback = None

# Feature-Flag: Der Regex-Parser (mapper.py) ist vollstaendig implementiert und
# getestet, wird aber seit dem Katalog-Benchmark (siehe
# benchmark_results/20260730_182859/Testmethodik_und_Ergebnisse.md) nicht mehr
# im produktiven Pfad verwendet - der LLM-Extraktion mit Reparatur-Loop (Qwen
# 2.5 7B) schlaegt sowohl den reinen Regex+Fallback-Hybrid als auch LLM-only
# ohne Reparatur. Der Code bleibt für spaetere Vergleiche/Wiederverwendung
# erhalten, ist ueber dieses Flag aber deaktiviert.
USE_REGEX_PARSER = False

# Einziges produktiv genutztes Modell (siehe Kommentar oben) - im Frontend gibt
# es bewusst keine Modellauswahl mehr, die anderen Provider-Keys in
# llm_fallback.DEFAULT_MODELS bleiben nur fuer Benchmark-/Vergleichszwecke
# nutzbar (tools/run_katalog_benchmark.py), nicht ueber die Web-UI.
DEFAULT_LLM_PROVIDER = "ollama"

app = Flask(__name__)


# CORS: Erlaubt Aufrufe von der separaten React/Vite-Web-App (anderer Port,
# z. B. dem Team-Frontend circular-value-exchange-demo unter localhost:8031),
# die per fetch() gegen diesen lokal laufenden Server extrahiert. Nur fuer
# lokale Entwicklung/Demo gedacht, keine Authentifizierung/Herkunftspruefung.
@app.before_request
def _handle_cors_preflight():
    if request.method == "OPTIONS":
        return jsonify({}), 200


@app.after_request
def _add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# Flask sortiert JSON-Antworten standardmäßig alphabetisch (app.json.sort_keys=True).
# Das ist schema-konform (JSON-Objekte sind laut RFC 8259 ungeordnet), verschleiert aber
# die logische Feldreihenfolge aus der CMRS-Spezifikation (type, id, raw_input, material,
# quantity/properties/constraints, context, provenance). Deaktiviert, damit die Ausgabe im
# Frontend der Reihenfolge entspricht, in der mapper.py/llm_fallback.py die Felder bauen.
app.json.sort_keys = False

# Configure SQLite DB
db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'database.db')

def get_db():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS parsed_records (
            id TEXT PRIMARY KEY,
            record_type TEXT,
            raw_text TEXT NOT NULL,
            material_category TEXT,
            quantity_value REAL,
            quantity_unit TEXT,
            is_valid BOOLEAN,
            full_json TEXT NOT NULL,
            validation_summary TEXT,
            created_at TEXT
        )
    ''')
    # Migration für Bestands-DBs ohne created_at-Spalte
    cols = [r[1] for r in c.execute("PRAGMA table_info(parsed_records)").fetchall()]
    if "created_at" not in cols:
        c.execute("ALTER TABLE parsed_records ADD COLUMN created_at TEXT")
    conn.commit()
    conn.close()

# Ensure table exists
init_db()

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/process_text', methods=['POST'])
def process_text():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
        
    text = data['text']
    record_id = str(uuid.uuid4())

    # Fest verdrahtet auf Qwen 2.5 7B - das Frontend bietet bewusst keine
    # Modellauswahl mehr an, ein etwaig vom Client mitgeschicktes 'provider'
    # Feld wird ignoriert (siehe DEFAULT_LLM_PROVIDER oben).
    llm_provider = DEFAULT_LLM_PROVIDER
    llm_label = None

    try:
        if USE_REGEX_PARSER:
            # Alter Pfad: Regex-Parser zuerst, LLM nur als Fallback bei Fehlern/
            # Kategorie "other"/leerer Extraktion. Code bleibt erhalten, aber
            # per Feature-Flag deaktiviert (siehe Kommentar oben).
            record = map_free_text_to_cmrs(text, language="de", record_id=record_id, source="web_frontend")
            validation_result = validate_cmrs(record)

            is_empty = not record.get("quantity") and not record.get("properties") and not record.get("constraints")
            if llm_fallback and (validation_result.errors or record.get("material", {}).get("category") == "other" or is_empty):
                try:
                    record_llm, result_llm, _attempts = llm_fallback.extract_via_llm_validated(
                        text, provider=llm_provider
                    )
                    if record_id:
                        record_llm["id"] = record_id
                        result_llm = validate_cmrs(record_llm)
                    if validation_result.errors or len(result_llm.errors) <= len(validation_result.errors):
                        record = record_llm
                        validation_result = result_llm
                        llm_label = llm_fallback.PROVIDER_LABELS.get(llm_provider, llm_provider)
                except Exception as e:
                    import traceback
                    print(f"[LLM-FALLBACK ERROR] {e}")
                    traceback.print_exc()
        else:
            # Standardpfad: direkte LLM-Extraktion mit Reparatur-Loop, kein
            # Regex-Parser. Laut Benchmark die beste Kombination aus Score,
            # Validator-Rate und Faithfulness (siehe Kommentar oben).
            if not llm_fallback:
                return jsonify({'error': 'LLM-Extraktion nicht verfügbar (llm_fallback-Modul fehlt)'}), 500
            record, validation_result, _attempts = llm_fallback.extract_via_llm_validated(
                text, provider=llm_provider
            )
            record["id"] = record_id
            llm_label = llm_fallback.PROVIDER_LABELS.get(llm_provider, llm_provider)

        # Stamp provenance with the actual extraction method
        if record.get("provenance", {}).get("source") != "llm_fallback":
            record.setdefault("provenance", {})["source"] = "regex_parser"
        extraction_method = record["provenance"]["source"]

        # Attach provenance (disabled to comply with strict schema)
        # record = attach_provenance(record)
        
        # Extract fields for database
        record_type = record.get('type')
        material_cat = record.get('material', {}).get('category')
        
        qty_val = None
        qty_unit = None
        if 'quantity' in record:
            qty_val = record['quantity'].get('value')
            qty_unit = record['quantity'].get('unit_ucum')
            
        is_valid = validation_result.valid
        
        full_json_str = json.dumps(record, ensure_ascii=False)
        val_summary_str = json.dumps(validation_result.to_dict(), ensure_ascii=False)
        
        # Save to DB
        conn = get_db()
        c = conn.cursor()
        from datetime import datetime, timezone
        c.execute('''
            INSERT INTO parsed_records (id, record_type, raw_text, material_category, quantity_value, quantity_unit, is_valid, full_json, validation_summary, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (record_id, record_type, text, material_cat, qty_val, qty_unit, is_valid, full_json_str, val_summary_str,
              datetime.now(timezone.utc).isoformat()))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'record': {
                'id': record_id,
                'record_type': record_type,
                'raw_text': text,
                'material_category': material_cat,
                'quantity_value': qty_val,
                'quantity_unit': qty_unit,
                'is_valid': is_valid,
                'extraction_method': extraction_method,
                'llm_label': llm_label,
                'full_json': record,
                'validation_summary': validation_result.to_dict()
            }
        })
        
    except Exception as e:
        # Traceback nur serverseitig loggen, nie an den Client geben
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/vocabularies', methods=['GET'])
def get_vocabularies():
    """
    Liefert die kontrollierten Vokabulare fuer das editierbare Formular im
    Frontend (Dropdown-Optionen), damit Felder wie category/property_key/
    unit_ucum/op nur gueltige Werte annehmen koennen statt Freitext.
    Einzige Quelle: controlled_vocabularies.py (dieselbe, die Parser und
    Validator verwenden) - keine Duplikation der Enums im JS.
    """
    categories = [
        {"key": k, "label": v.get("label", k)} for k, v in MATERIAL_CATEGORIES.items()
    ]
    if llm_fallback:
        # Von Nutzern ueber "Manuell erfassen" -> "Neue Kategorie vorschlagen"
        # angelegte, KI-geprueft neue Kategorien (siehe check_or_register_category).
        for k, v in llm_fallback._load_custom_categories().items():
            categories.append({"key": k, "label": v.get("label", k)})
    properties = [
        {
            "key": k,
            "label": v.get("de", k),
            "units": v.get("units", []),
            "ops": v.get("ops", []),
            "cats": v.get("cats", []),
        }
        for k, v in PROPERTY_CATALOG.items()
    ]
    units = [{"code": k, "label": v} for k, v in UCUM_WHITELIST.items()]
    operators = [{"key": k, "label": v} for k, v in OPERATORS.items()]
    regimes = [{"key": k, "label": v} for k, v in COMPLIANCE_REGIMES.items()]
    return jsonify({
        "categories": categories,
        "properties": properties,
        "units": units,
        "operators": operators,
        "regimes": regimes,
        "record_types": [
            {"key": "offer", "label": "Angebot"},
            {"key": "demand", "label": "Nachfrage"},
        ],
    })


@app.route('/api/check_category', methods=['POST'])
def check_category():
    """
    Fuer "Manuell erfassen": Nutzer schlaegt eine neue Materialkategorie vor,
    die nicht im Dropdown steht. Ein LLM-Aufruf prueft zuerst, ob inhaltlich
    nicht doch eine bestehende Kategorie passt (inkl. Tippfehler-Korrektur),
    bevor die neue Kategorie dauerhaft registriert wird. Gilt bewusst nur fuer
    den manuellen Pfad - die KI-Extraktion aus Freitext bleibt auf die
    bestehenden Kategorien beschraenkt.
    """
    data = request.get_json()
    if not data or not data.get('material_label') or not data.get('proposed_label'):
        return jsonify({'error': 'material_label und proposed_label erforderlich'}), 400
    if not llm_fallback:
        return jsonify({'error': 'KI-Pruefung nicht verfuegbar (llm_fallback-Modul fehlt)'}), 500
    try:
        result = llm_fallback.check_or_register_category(
            data['material_label'], data['proposed_label'], provider=DEFAULT_LLM_PROVIDER
        )
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/validate_record', methods=['POST'])
def validate_record():
    """
    Validiert einen (moeglicherweise vom Nutzer im Formular korrigierten)
    CMRS-Record neu, ohne die Extraktion zu wiederholen. Wird vom Frontend
    bei jeder Formular-Aenderung aufgerufen, um Fehler live zu markieren.
    """
    data = request.get_json()
    if not data or 'record' not in data:
        return jsonify({'error': 'No record provided'}), 400
    try:
        result = validate_cmrs(data['record'])
        return jsonify({'validation_summary': result.to_dict()})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def _reground_canonical_name(record_id: str, record: dict) -> None:
    """
    Leitet material.normalized.canonical_name neu ab, WENN der Nutzer die
    Materialbezeichnung (label_raw) im Formular geaendert hat.

    Hintergrund: canonical_name ist im Formular bewusst nicht editierbar - er
    wird beim Extrahieren aus dem kontrollierten Vokabular abgeleitet. Aendert
    der Nutzer aber das Material (z. B. "PP-Regranulat" -> "PET-Flakes"), wuerde
    der alte canonical_name zu einem voellig anderen Material gehoeren. Da der
    Wert spaeter fuers Matching genutzt wird, muss er der Korrektur folgen.

    Verhalten bei geaendertem label_raw:
      - Vokabular-Treffer  -> kontrollierter Name wird gesetzt
      - kein Treffer       -> canonical_name wird ENTFERNT (kein belegbarer
                              Name vorhanden; Validator meldet dann W540 als
                              Hinweis, statt eine falsche Normalisierung zu
                              behalten)
    Bei unveraendertem label_raw bleibt alles wie es ist (auch eine frueher
    per LLM/Cache ermittelte Schaetzung bleibt erhalten).

    Existiert noch KEINE vorherige DB-Zeile (z. B. bei "Manuell erfassen" -
    dort gibt es nie eine vorherige Extraktion), wird das genauso wie eine
    Aenderung behandelt: label_raw wird beim allerersten Speichern einmalig
    gegen das kontrollierte Vokabular geerdet, statt dauerhaft leer zu bleiben.
    """
    material = record.get('material')
    if not isinstance(material, dict):
        return
    new_label = material.get('label_raw')
    if not new_label:
        return

    # Bisher gespeicherte Bezeichnung laden, um Aenderung zu erkennen
    conn = get_db()
    row = conn.execute(
        'SELECT full_json FROM parsed_records WHERE id = ?', (record_id,)
    ).fetchone()
    conn.close()
    if row:
        try:
            old_record = json.loads(row['full_json'])
            old_label = (old_record.get('material') or {}).get('label_raw')
        except (json.JSONDecodeError, TypeError):
            old_label = None
    else:
        old_label = None  # keine vorherige Zeile -> wie eine Aenderung behandeln

    if row and old_label == new_label:
        return  # Material unveraendert -> canonical_name bleibt gueltig

    canonical = resolve_canonical_name(new_label)
    normalized = material.setdefault('normalized', {})
    if canonical:
        normalized['canonical_name'] = canonical
    else:
        normalized.pop('canonical_name', None)
        if not normalized:
            material.pop('normalized', None)


@app.route('/api/save_corrected', methods=['POST'])
def save_corrected():
    """
    Speichert eine vom Nutzer im Formular korrigierte oder komplett manuell
    erfasste Version eines Records (Human-in-the-Loop): validiert final und
    schreibt die DB-Zeile. Das macht die menschlich bestaetigte/korrigierte
    Version zur massgeblichen - nicht die rohe Extraktion.

    Upsert statt reinem UPDATE: Bei "Manuell ausfuellen" existiert noch keine
    DB-Zeile (der Nutzer hat nie /api/process_text aufgerufen), das Frontend
    erzeugt die id clientseitig. Bei einer per KI extrahierten und dann
    korrigierten Version existiert die Zeile bereits - dann wird sie ersetzt.
    """
    data = request.get_json()
    if not data or 'id' not in data or 'record' not in data:
        return jsonify({'error': 'id und record erforderlich'}), 400

    record_id = data['id']
    record = data['record']

    try:
        _reground_canonical_name(record_id, record)
        result = validate_cmrs(record)

        record_type = record.get('type')
        material_cat = record.get('material', {}).get('category')
        qty = record.get('quantity') or {}
        qty_val = qty.get('value')
        qty_unit = qty.get('unit_ucum')
        raw_text = (record.get('raw_input') or {}).get('text') or '(manuell erfasst)'

        full_json_str = json.dumps(record, ensure_ascii=False)
        val_summary_str = json.dumps(result.to_dict(), ensure_ascii=False)

        conn = get_db()
        c = conn.cursor()
        from datetime import datetime, timezone
        c.execute('''
            INSERT INTO parsed_records
                (id, record_type, raw_text, material_category, quantity_value,
                 quantity_unit, is_valid, full_json, validation_summary, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                record_type = excluded.record_type,
                material_category = excluded.material_category,
                quantity_value = excluded.quantity_value,
                quantity_unit = excluded.quantity_unit,
                is_valid = excluded.is_valid,
                full_json = excluded.full_json,
                validation_summary = excluded.validation_summary
        ''', (record_id, record_type, raw_text, material_cat, qty_val, qty_unit,
              result.valid, full_json_str, val_summary_str, datetime.now(timezone.utc).isoformat()))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'validation_summary': result.to_dict()})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/records', methods=['GET'])
def get_records():
    conn = get_db()
    c = conn.cursor()
    # Neueste zuerst; NULL-created_at (Altbestand) landet bei DESC am Ende
    c.execute('SELECT * FROM parsed_records ORDER BY created_at DESC LIMIT 50')
    rows = c.fetchall()
    conn.close()

    records = []
    for row in rows:
        records.append({
            'id': row['id'],
            'record_type': row['record_type'],
            'raw_text': row['raw_text'],
            'material_category': row['material_category'],
            'quantity_value': row['quantity_value'],
            'quantity_unit': row['quantity_unit'],
            'is_valid': bool(row['is_valid']),
            'full_json': json.loads(row['full_json']),
            'validation_summary': json.loads(row['validation_summary']) if row['validation_summary'] else None
        })

    return jsonify({'records': records})

if __name__ == '__main__':
    # host=0.0.0.0 (statt Flask-Standard 127.0.0.1): noetig, damit die App im
    # Docker-Container von aussen ueber die Port-Weiterleitung erreichbar ist
    # - 127.0.0.1 waere nur auf der Loopback-Schnittstelle des Containers
    # selbst sichtbar. Beim nativen Start ist das ohne Auswirkung, weil man
    # dort ohnehin nur ueber localhost/127.0.0.1 zugreift.
    # Debug nur aktiv, wenn explizit gesetzt (FLASK_DEBUG=1)
    app.run(host='0.0.0.0', debug=os.getenv('FLASK_DEBUG') == '1', port=5000)
