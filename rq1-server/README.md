# RQ1-Server (CMRS-Extraktion)

Flask-Backend, das Freitext per LLM (Ollama, standardmäßig Qwen 2.5 7B) in strukturiertes
CMRS-v1.1.0-JSON überführt und gegen 34 Regeln validiert. Wird vom "CMRS-Dateneingang" des
Frontends unter `http://localhost:5000` aufgerufen (siehe `../src/domain/cmrs/client.ts`).
Kein eigenes UI nötig für die Team-Integration; `templates/`/`static/` sind ein zusätzliches,
eigenständiges Test-Frontend für den Server selbst.

## Voraussetzungen

- Python 3.12 (oder Docker)
- [Ollama](https://ollama.com) lokal installiert, Modell heruntergeladen: `ollama pull qwen2.5:7b`

## Nativer Start

```sh
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Läuft dann auf `http://127.0.0.1:5000`. `GEMINI_API_KEY` ist optional (nur für den nicht
produktiv genutzten Cloud-Fallback), keine `.env`-Datei zwingend erforderlich.

## Start mit Docker (zusammen mit dem Frontend)

Im Repository-Root (nicht hier in `rq1-server/`):

```sh
docker compose up --build
```

Startet Frontend (`http://localhost:8031`) und diesen Server (`http://localhost:5000`)
zusammen. Vor dem allerersten Start müssen drei Laufzeit-Dateien hier in `rq1-server/`
bereits als (leere) Dateien existieren, sonst legt Docker sie versehentlich als Verzeichnisse an:

```sh
touch rq1-server/database.db
echo "{}" > rq1-server/canonical_name_memory.json
echo "{}" > rq1-server/custom_categories.json
```

(unter Windows/PowerShell: `New-Item rq1-server/database.db`, `Set-Content rq1-server/canonical_name_memory.json '{}'`, entsprechend für die dritte Datei)

## API-Endpunkte

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/process_text` | POST | Freitext-Extraktion (LLM mit Reparatur-Loop) |
| `/api/validate_record` | POST | Revalidiert einen (ggf. korrigierten) CMRS-Record |
| `/api/check_category` | POST | Prüft/registriert eine neue Materialkategorie |
| `/api/vocabularies` | GET | Kontrollierte Vokabulare (Kategorien, Properties, Einheiten) |
| `/api/records` | GET | Gespeicherte Datensätze |

## Herkunft

Dieser Ordner ist eine Kopie des CMRS-RQ1-Prototyps (separates Repository, Jahresprojekt).
Änderungen an der Extraktions-/Validierungslogik selbst gehören dorthin, nicht hierher.
