import os
import re
import json
import uuid
import threading
from datetime import datetime, timezone

from google import genai
from google.genai import types as genai_types
import requests
from dotenv import load_dotenv

from controlled_vocabularies import UNIT_ALIASES_DE, MATERIAL_CATEGORIES
from mapper import extract_material_label

load_dotenv()

# ─── Gedaechtnis-Cache fuer LLM-erfundene canonical_names ────────────────────
# Fuer Materialien AUSSERHALB des kontrollierten Vokabulars (KNOWN_MATERIALS)
# entscheidet das LLM frei. Damit dieselbe Materialbezeichnung nicht bei jedem
# Aufruf unterschiedlich benannt wird, wird der ERSTE LLM-Vorschlag pro
# label_raw dauerhaft gespeichert und danach immer wiederverwendet (Konsistenz
# statt wiederholtem freien Raten). WICHTIG: Das ist KEINE Aufnahme in das
# kuratierte, normbelegte KNOWN_MATERIALS-Vokabular - nur ein Konsistenz-
# Gedaechtnis fuer unbekannte Materialien ohne echte Quelle dahinter.
_CANONICAL_MEMORY_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "canonical_name_memory.json"
)
_canonical_memory_lock = threading.Lock()


def _load_canonical_memory() -> dict:
    if not os.path.exists(_CANONICAL_MEMORY_PATH):
        return {}
    try:
        with open(_CANONICAL_MEMORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _atomic_write_json(path: str, data: dict) -> None:
    """
    Schreibt JSON per Tmp-Datei + os.replace() (atomar auf normalen
    Dateisystemen). Faellt auf einen direkten Schreibvorgang zurueck, wenn
    os.replace() scheitert: Bei Docker-Bind-Mounts einzelner Dateien (siehe
    docker-compose.yml, canonical_name_memory.json/custom_categories.json)
    laesst sich der gemountete Inode unter Docker Desktop/Windows nicht
    atomar ersetzen ([Errno 16] Device or resource busy).
    """
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
    try:
        os.replace(tmp_path, path)
    except OSError:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def _save_canonical_memory(memory: dict) -> None:
    _atomic_write_json(_CANONICAL_MEMORY_PATH, memory)


# ─── Neue Materialkategorien aus dem manuellen Formular ──────────────────────
# Nur fuer "Manuell erfassen" gedacht (siehe app.py /api/check_category) - die
# normale KI-Extraktion bleibt bewusst auf MATERIAL_CATEGORIES beschraenkt
# (siehe Kategorie-Anweisung in _build_system_instruction). Schlaegt ein Nutzer
# hier eine neue Kategorie vor, entscheidet ein LLM-Aufruf zuerst, ob nicht
# doch eine bestehende Kategorie inhaltlich passt (inkl. Tippfehler-Korrektur),
# bevor eine wirklich neue Kategorie dauerhaft registriert wird.
_CUSTOM_CATEGORIES_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "custom_categories.json"
)
_custom_categories_lock = threading.Lock()


def _load_custom_categories() -> dict:
    if not os.path.exists(_CUSTOM_CATEGORIES_PATH):
        return {}
    try:
        with open(_CUSTOM_CATEGORIES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_custom_categories(categories: dict) -> None:
    _atomic_write_json(_CUSTOM_CATEGORIES_PATH, categories)


_UMLAUT_MAP = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_SLUG_INVALID_RE = re.compile(r"[^a-z0-9]+")


def _slugify_category(label: str) -> str:
    """'Textilfasern & Vliese' -> 'textilfasern_vliese' (ASCII-sicherer Key)."""
    slug = label.strip().lower().translate(_UMLAUT_MAP)
    slug = _SLUG_INVALID_RE.sub("_", slug).strip("_")
    return slug or "sonstige_kategorie"


def check_or_register_category(material_label: str, proposed_label: str,
                                provider: str = "ollama", model: str = None) -> dict:
    """
    Fuer "Manuell erfassen": Nutzer schlaegt eine neue Kategorie vor. Ein
    LLM-Aufruf prueft zuerst, ob eine der bestehenden MATERIAL_CATEGORIES
    inhaltlich (nicht nur nach Schreibweise) tatsaechlich passt - inklusive
    Tippfehler-Korrektur des Vorschlags. Nur wenn wirklich keine passt, wird
    eine neue Kategorie registriert (persistiert in custom_categories.json,
    ab dann ueber /api/vocabularies auch als normale Dropdown-Option nutzbar).

    Rueckgabe: {"category": <key>, "label": <Anzeigename>, "is_new": bool}
    """
    provider = (provider or "ollama").lower()
    model_name = model or DEFAULT_MODELS.get(provider, DEFAULT_MODELS["ollama"])

    existing_lines = "\n".join(
        f'- {key}: {info["label"]} (Beispiele: {", ".join(info.get("examples", [])) or "-"})'
        for key, info in MATERIAL_CATEGORIES.items()
    )
    custom = _load_custom_categories()
    if custom:
        existing_lines += "\n" + "\n".join(
            f'- {key}: {info["label"]} (bereits frueher von Nutzern angelegt)'
            for key, info in custom.items()
        )

    prompt = f"""Du bist ein Klassifikations-Assistent fuer Materialkategorien in einem Kreislaufwirtschafts-System.

Bestehende, kontrollierte Kategorien:
{existing_lines}

Ein Nutzer hat folgendes Material erfasst: "{material_label}"
Er schlaegt dafuer folgende NEUE Kategorie vor: "{proposed_label}"

Aufgabe:
1. Pruefe zuerst ernsthaft, ob eine der BESTEHENDEN Kategorien oben inhaltlich tatsaechlich zu diesem Material passt - auch wenn der Nutzer eine andere Bezeichnung, ein Synonym oder einen Tippfehler verwendet hat.
2. Falls ja: gib deren Key zurueck.
3. Falls nein (das Material passt wirklich zu keiner bestehenden Kategorie): korrigiere ggf. Tippfehler im Vorschlag und gib eine kurze, saubere deutsche Kategorie-Bezeichnung zurueck.

Antworte NUR mit validem JSON in genau diesem Format, ohne weiteren Text:
{{"matched_existing_key": "<key oder null>", "new_category_label": "<Bezeichnung oder null>"}}
Genau eines der beiden Felder hat einen Wert, das andere ist null."""

    url = f"{OLLAMA_HOST.rstrip('/')}/api/chat"
    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": prompt}],
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.0},
    }
    if _needs_thinking_disabled(model_name):
        payload["think"] = False
    response = requests.post(url, json=payload, timeout=int(os.getenv("OLLAMA_TIMEOUT", "300")))
    response.raise_for_status()
    content = response.json().get("message", {}).get("content", "")
    parsed = json.loads(content)

    matched_key = (parsed.get("matched_existing_key") or "").strip()
    all_known = {**MATERIAL_CATEGORIES, **custom}
    if matched_key and matched_key in all_known:
        return {"category": matched_key, "label": all_known[matched_key]["label"], "is_new": False}

    new_label = (parsed.get("new_category_label") or proposed_label).strip()
    new_key = _slugify_category(new_label)

    # Der slugifizierte Key kann zufaellig mit einer bestehenden Kategorie
    # kollidieren (z. B. "Textile" -> "textile", obwohl "textile" schon eine
    # kuratierte Kategorie ist) - dann gilt das als Treffer auf die
    # bestehende, NICHT als neue Kategorie mit irrefuehrend anderem Label.
    if new_key in MATERIAL_CATEGORIES:
        return {"category": new_key, "label": MATERIAL_CATEGORIES[new_key]["label"], "is_new": False}

    with _custom_categories_lock:
        custom = _load_custom_categories()
        if new_key in custom:
            custom[new_key]["times_seen"] = custom[new_key].get("times_seen", 1) + 1
            custom[new_key].setdefault("material_examples", [])
            if material_label not in custom[new_key]["material_examples"]:
                custom[new_key]["material_examples"].append(material_label)
        else:
            custom[new_key] = {
                "label": new_label,
                "material_examples": [material_label],
                "first_seen": datetime.now(timezone.utc).isoformat(),
                "times_seen": 1,
            }
        _save_custom_categories(custom)
    return {"category": new_key, "label": new_label, "is_new": True}


# Wert-Strings wie "120 %", "50 mg/kg", "0,3%" → Zahl + (optional) Einheits-Text
_VALUE_NUM_UNIT_RE = re.compile(r'^\s*([+-]?\d+(?:[.,]\d+)?)\s*(.*)$')


def _coerce_value_unit(item: dict) -> None:
    """
    Splittet einen maskierten Wert-String wie "120 %" in value=120.0 + unit_ucum="%".
    Qualitative Strings (z. B. "trocken", "farblos") beginnen nicht mit einer Ziffer
    und bleiben unverändert. Wirkt in-place auf ein property/constraint/quantity-Dict.
    """
    val = item.get("value")
    if not isinstance(val, str):
        return
    m = _VALUE_NUM_UNIT_RE.match(val)
    if not m:
        return  # qualitativer String – unangetastet lassen
    item["value"] = float(m.group(1).replace(",", "."))
    unit_txt = m.group(2).strip()
    if unit_txt and not item.get("unit_ucum"):
        ucum = UNIT_ALIASES_DE.get(unit_txt.lower())
        if ucum:
            item["unit_ucum"] = ucum


# ─── Grounding-Check: Halluzinationsfilter für numerische Werte ──────────────
# Jede Zahl im LLM-Ergebnis muss im Eingabetext belegbar sein (als Ziffernfolge
# oder als Zahlwort). Nicht belegbare Werte werden verworfen – die Validierung
# meldet dann fehlende Pflichtangaben (Fehlercode statt stiller Halluzination).

_NUMBER_WORDS_DE: dict[str, float] = {
    "null": 0, "ein": 1, "eine": 1, "eins": 1, "zwei": 2, "drei": 3, "vier": 4,
    "fünf": 5, "sechs": 6, "sieben": 7, "acht": 8, "neun": 9, "zehn": 10,
    "elf": 11, "zwölf": 12, "dreizehn": 13, "vierzehn": 14, "fünfzehn": 15,
    "sechzehn": 16, "siebzehn": 17, "achtzehn": 18, "neunzehn": 19,
    "zwanzig": 20, "dreißig": 30, "vierzig": 40, "fünfzig": 50,
    "sechzig": 60, "siebzig": 70, "achtzig": 80, "neunzig": 90,
    "hundert": 100, "tausend": 1000,
    "halb": 0.5, "halbe": 0.5, "halber": 0.5, "halben": 0.5,
    "viertel": 0.25, "dreiviertel": 0.75,
    "anderthalb": 1.5, "eineinhalb": 1.5, "zweieinhalb": 2.5,
}

_DIGIT_TOKEN_RE = re.compile(r'\d+(?:[.,]\d+)*')


def _collect_grounded_numbers(text: str) -> set[float]:
    """Sammelt alle Zahlenwerte, die im Text vorkommen (Ziffern + Zahlwörter)."""
    grounded: set[float] = set()

    for m in _DIGIT_TOKEN_RE.finditer(text):
        tok = m.group(0)
        # Deutsche Konvention: Punkt = Tausender, Komma = Dezimal
        try:
            grounded.add(float(tok.replace(".", "").replace(",", ".")))
        except ValueError:
            pass
        # Englische Konvention: Punkt = Dezimal
        try:
            grounded.add(float(tok.replace(",", "")))
        except ValueError:
            pass
        # Wörtliche Lesart "1.500" → 1.5 (falls der Parser sie so liefert)
        try:
            grounded.add(float(tok.replace(",", ".")))
        except ValueError:
            pass

    words = re.findall(r'[a-zäöüß]+', text.lower())
    for i, w in enumerate(words):
        if w in _NUMBER_WORDS_DE:
            grounded.add(_NUMBER_WORDS_DE[w])
    # "X komma Y" → Dezimalzahl aus Zahlwörtern ("zwei komma fünf" → 2.5)
    for i, w in enumerate(words):
        if w == "komma" and 0 < i < len(words) - 1:
            ganz = _NUMBER_WORDS_DE.get(words[i - 1])
            frac = _NUMBER_WORDS_DE.get(words[i + 1])
            if ganz is not None and frac is not None and frac < 10:
                grounded.add(ganz + frac / 10)
    return grounded


def _is_grounded(value, grounded: set[float]) -> bool:
    if not isinstance(value, (int, float)):
        return True  # qualitative Strings werden nicht geprüft
    return any(abs(float(value) - g) < 1e-9 for g in grounded)


# UCUM-Code → alle Text-Aliase, über die er im Eingabetext belegbar wäre
_UCUM_TO_ALIASES: dict[str, list[str]] = {}
for _alias, _ucum in UNIT_ALIASES_DE.items():
    _UCUM_TO_ALIASES.setdefault(_ucum, []).append(_alias)


def _unit_is_grounded(unit_ucum, text_lower: str) -> bool:
    """
    Prüft, ob eine Einheit im Eingabetext belegbar ist (als Alias, z. B.
    't' via 'Tonne', '%' via 'Prozent', 'Cel' via '°C'). Fängt Einheiten-
    Halluzination ab, die der reine Zahlen-Check nicht sieht (0,5 kg statt 0,5 t).
    """
    if not unit_ucum:
        return True
    for alias in _UCUM_TO_ALIASES.get(unit_ucum, []):
        if alias.isalpha():
            if re.search(rf'(?<![a-zäöüß]){re.escape(alias)}(?![a-zäöüß])', text_lower):
                return True
        elif alias in text_lower:
            return True
    return False


def _filter_ungrounded(record: dict, text: str) -> list[str]:
    """
    Entfernt numerische Werte, die nicht im Eingabetext belegbar sind.
    Gibt eine Liste menschenlesbarer Meldungen über Entferntes zurück.
    """
    grounded = _collect_grounded_numbers(text)
    text_lower = text.lower()
    dropped: list[str] = []

    qty = record.get("quantity")
    if isinstance(qty, dict):
        if not _is_grounded(qty.get("value"), grounded):
            dropped.append(
                f"quantity.value={qty.get('value')} nicht im Text belegbar → quantity verworfen"
            )
            del record["quantity"]
        elif not _unit_is_grounded(qty.get("unit_ucum"), text_lower):
            dropped.append(
                f"quantity.unit_ucum='{qty.get('unit_ucum')}' nicht im Text belegbar → quantity verworfen"
            )
            del record["quantity"]

    for key in ("properties", "constraints"):
        items = record.get(key)
        if not isinstance(items, list):
            continue
        kept = []
        for item in items:
            if isinstance(item, dict):
                bad = [
                    f"{f}={item[f]}" for f in ("value", "min", "max")
                    if f in item and not _is_grounded(item.get(f), grounded)
                ]
                if not bad and not _unit_is_grounded(item.get("unit_ucum"), text_lower):
                    bad = [f"unit_ucum='{item.get('unit_ucum')}'"]
                if bad:
                    dropped.append(
                        f"{key}[{item.get('property_key')}]: {', '.join(bad)} "
                        f"nicht im Text belegbar → Eintrag verworfen"
                    )
                    continue
            kept.append(item)
        if kept:
            record[key] = kept
        elif key in record:
            del record[key]

    return dropped


def _strip_none_values(obj):
    """
    Entfernt rekursiv alle Felder mit Wert None aus dict/list-Strukturen.
    Das CMRS-JSON-Schema erlaubt fuer optionale Felder (z. B. context.
    intended_use) entweder den korrekten Typ ODER Abwesenheit des Feldes,
    aber NICHT explizit null - manche LLMs (z. B. Qwen) geben nicht
    genannte optionale Felder trotzdem als "feld": null zurueck, was sonst
    einen unechten Schema-Fehler (E110) erzeugt, obwohl das Feld im Text
    schlicht nicht vorkommt.
    """
    if isinstance(obj, dict):
        return {k: _strip_none_values(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [_strip_none_values(v) for v in obj]
    return obj


def _ground_canonical_name(record: dict, text: str) -> None:
    """
    Verhindert, dass material.normalized.canonical_name frei vom LLM erfunden
    wird - zweistufig:

    1) Kontrolliertes Vokabular hat Vorrang: Laeuft dieselbe deterministische
       KNOWN_MATERIALS-Fuzzy-Matching-Logik wie der Regex-Parser
       (mapper.extract_material_label) über den Originaltext. Gibt es einen
       Treffer (Score >= 0.72), wird der LLM-Vorschlag durch diesen
       kontrollierten, normbelegten Namen ERSETZT. So liefern Regex-Pfad und
       LLM-Pfad fuer dasselbe Material immer denselben canonical_name.

    2) Fuer Materialien AUSSERHALB des kontrollierten Vokabulars: Gedaechtnis-
       Cache (_CANONICAL_MEMORY_PATH) statt bei jedem Aufruf neu frei raten
       zu lassen. Der Cache wird per Fuzzy-Matching durchsucht (derselbe
       SequenceMatcher-Ansatz/Schwellwert 0.72 wie bei KNOWN_MATERIALS), damit
       auch leicht abweichende Formulierungen ("Restmaterial" vs.
       "Restmaterialien") denselben canonical_name bekommen - wichtig fuers
       spaetere Matching/Ketten-Bilden. Prinzip "erster Treffer gewinnt":
       Cache-Eintraege werden in Einfuege-Reihenfolge durchsucht, der erste
       Eintrag ueber dem Schwellwert wird verwendet.
       WICHTIG: Das ist kein kuratiertes, normbelegtes Vokabular - nur ein
       automatisches Konsistenz-Gedaechtnis ohne manuelle Pruefung. Ein
       einmal falscher LLM-Vorschlag bleibt dadurch konsistent falsch statt
       zufaellig falsch, und kann per Fuzzy-Matching auch aehnliche, aber
       eigentlich andere Materialien "anziehen" (siehe Risikohinweis in der
       Doku/Chat-Historie).
    """
    material = record.get("material")
    if not isinstance(material, dict):
        return

    _, grounded_canonical = extract_material_label(text)
    if grounded_canonical is not None:
        material.setdefault("normalized", {})["canonical_name"] = grounded_canonical
        return  # kontrolliertes Vokabular hat Vorrang, Cache wird nicht gebraucht

    label_raw = material.get("label_raw")
    if not label_raw or not isinstance(label_raw, str):
        return
    cache_key = label_raw.strip().lower()
    if not cache_key:
        return

    from difflib import SequenceMatcher
    FUZZY_THRESHOLD = 0.72

    with _canonical_memory_lock:
        memory = _load_canonical_memory()

        # Erster Treffer gewinnt: Cache in Einfuege-Reihenfolge durchsuchen
        matched_key = None
        if cache_key in memory:
            matched_key = cache_key  # exakter Treffer zuerst pruefen
        else:
            for existing_key in memory:
                score = SequenceMatcher(None, cache_key, existing_key).ratio()
                if score >= FUZZY_THRESHOLD:
                    matched_key = existing_key
                    break  # erster Treffer gewinnt, keine Suche nach dem besten

        if matched_key is not None:
            cached = memory[matched_key]
            # Bereits frueher gesehen (exakt oder fuzzy-aehnlich) -> denselben
            # Namen wiederverwenden, unabhaengig davon, was das LLM diesmal
            # vorschlaegt.
            material.setdefault("normalized", {})["canonical_name"] = cached["canonical_name"]
            cached["times_seen"] = cached.get("times_seen", 1) + 1
            cached["last_seen"] = datetime.now(timezone.utc).isoformat()
            cached.setdefault("matched_variants", [])
            if cache_key != matched_key and cache_key not in cached["matched_variants"]:
                cached["matched_variants"].append(cache_key)
            _save_canonical_memory(memory)
        else:
            # Neuer, ungegroundeter Fall -> LLM-Vorschlag uebernehmen und merken
            llm_guess = material.get("normalized", {}).get("canonical_name")
            if llm_guess:
                memory[cache_key] = {
                    "label_raw_original": label_raw,
                    "canonical_name": llm_guess,
                    "first_seen": datetime.now(timezone.utc).isoformat(),
                    "times_seen": 1,
                }
                _save_canonical_memory(memory)


def _dedupe_synonyms(record: dict) -> None:
    """
    Entfernt Synonyme, die identisch mit label_raw oder canonical_name sind.
    Der Prompt verbietet das dem Modell zwar explizit, aber Qwen 2.5 haelt sich
    in der Praxis nicht zuverlaessig daran (beobachtet in ca. der Haelfte der
    Faelle) - deshalb hier zusaetzlich eine deterministische Bereinigung, statt
    sich allein auf die Prompt-Regel zu verlassen.
    """
    material = record.get("material")
    if not isinstance(material, dict):
        return
    normalized = material.get("normalized")
    if not isinstance(normalized, dict):
        return
    synonyms = normalized.get("synonyms")
    if not isinstance(synonyms, list):
        return
    exclude = {
        (material.get("label_raw") or "").strip().lower(),
        (normalized.get("canonical_name") or "").strip().lower(),
    }
    exclude.discard("")
    deduped = [s for s in synonyms if isinstance(s, str) and s.strip().lower() not in exclude]
    if deduped:
        normalized["synonyms"] = deduped
    else:
        normalized.pop("synonyms", None)


def _normalize_llm_record(record: dict, text: str) -> dict:
    """
    Säubert das LLM-Ergebnis, bevor es validiert wird: maskierte Zahl/Einheit-
    Strings ("120 %") werden in numerischen value + unit_ucum aufgetrennt, damit
    die Plausibilitätsregeln (R13/R14/R15) wieder greifen können. Explizite
    null-Werte fuer optionale Felder werden entfernt (siehe _strip_none_values).
    canonical_name wird gegen das kontrollierte Vokabular geerdet (siehe
    _ground_canonical_name), damit das LLM es nicht frei erfinden kann.
    """
    for key in ("properties", "constraints"):
        for item in record.get(key) or []:
            if isinstance(item, dict):
                _coerce_value_unit(item)
    qty = record.get("quantity")
    if isinstance(qty, dict):
        _coerce_value_unit(qty)
    _ground_canonical_name(record, text)
    _dedupe_synonyms(record)
    record = _strip_none_values(record)
    return record

# --- Konfiguration ---
# Gemini (Cloud) – google-genai SDK (Nachfolger des deprecated google.generativeai)
API_KEY = os.getenv("GEMINI_API_KEY")
_GENAI_CLIENT = genai.Client(api_key=API_KEY) if API_KEY else None

# Ollama (lokal/offline)
# OLLAMA_HOST kann als reine Bind-Adresse (z.B. "0.0.0.0") gesetzt sein — dann http://localhost:11434 verwenden
_raw_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
if not _raw_host.startswith("http"):
    OLLAMA_HOST = "http://localhost:11434"
else:
    OLLAMA_HOST = _raw_host

# Standard-Modelle je Anbieter
DEFAULT_MODELS = {
    "gemini": "gemini-2.0-flash",
    # Die drei fuer die Evaluation ausgewaehlten lokalen Modelle
    # (siehe docs/Auswahl_Lokale_LLMs.docx)
    "ollama": "qwen2.5:7b",            # H1: kompakt, mehrsprachig, JSON-optimiert
    "ollama_llama31": "llama3.1:8b",   # H2: staerkste deutsche Sprachkompetenz
    "ollama_qwen3": "qwen3:14b",       # H3: neuere Generation, doppelte Parameterzahl
    # Weitere lokal vorhandene Modelle (nicht Teil der Evaluationsauswahl)
    "ollama_gemma": "gemma3:4b",
    "ollama_gemma4": "gemma4:26b",
}

# Anzeigenamen fürs Frontend-Badge
PROVIDER_LABELS = {
    "gemini": "Gemini",
    "ollama": "Qwen 2.5 7B (Ollama)",
    "ollama_llama31": "Llama 3.1 8B (Ollama)",
    "ollama_qwen3": "Qwen 3 14B (Ollama)",
    "ollama_gemma": "Gemma 3 (Ollama)",
    "ollama_gemma4": "Gemma 4 (Ollama)",
}

# Modelle mit standardmaessig aktivem "Thinking"-Modus. Fuer die reine
# Extraktionsaufgabe ist dieser nachteilig: Das Modell verbraucht das
# Token-Budget (num_predict) fuer interne Denkketten, bevor die eigentliche
# JSON-Ausgabe beginnt - im Extremfall bricht die Antwort davor ab
# (done_reason="length" bei leerem content). Ollama erlaubt das Abschalten
# ueber den API-Parameter "think": false.
_THINKING_MODELS = ("qwen3",)


def _needs_thinking_disabled(model_name: str) -> bool:
    """Prueft, ob fuer dieses Modell think=False gesetzt werden muss."""
    name = (model_name or "").lower()
    return any(name.startswith(prefix) for prefix in _THINKING_MODELS)


def _build_system_instruction(schema: str) -> str:
    """Erzeugt die System-Instruction inkl. eingebettetem JSON-Schema."""
    category_list = ", ".join(MATERIAL_CATEGORIES.keys())
    return f"""
Du bist ein Datenextraktions-Assistent für Materialkreisläufe.
Deine Aufgabe ist es, einen Freitext in ein striktes JSON-Format zu übersetzen, das dem folgenden JSON-Schema (CMRS v1.1.0) entspricht.
Das Schema definiert Property-Keys und Einheiten (UCUM) als Enums. Halte dich strikt daran.

MATERIALKATEGORIEN (material.category):
- Wähle GENAU einen dieser Werte: {category_list}
- Erfinde NIEMALS eine neue Kategorie außerhalb dieser Liste, auch wenn keine perfekt passt – wähle dann die naheliegendste (im Zweifel "other").
- (Im manuellen Erfassungsformular können Nutzer zusätzliche Kategorien anlegen lassen – das gilt NICHT für dich, du bleibst auf obige Liste beschränkt.)

Hier ist das JSON-Schema:
{schema}

Erzeuge NUR valides JSON als Ausgabe, ohne Markdown-Blöcke (kein ```json ... ```) und ohne zusätzlichen Text.
WICHTIG:
- 'type' muss entweder 'offer' oder 'demand' sein.
- 'id' erzeuge eine UUID oder nutze eine fiktive ID, z.B. 'LLM-001'.
- Setze 'provenance.source' auf 'llm_fallback'.
- Setze 'provenance.cmrs_version' auf '1.1.0'.
- Setze 'provenance.created_at' auf das aktuelle ISO-Datum.
- Achte auf die korrekten Einheiten (kg, t, %, L, etc.) aus der UCUMWhitelist.

HALLUZINATIONSSCHUTZ – Zahlen und Einheiten:
- Erfinde NIEMALS numerische Werte oder Einheiten, die nicht explizit im Eingabetext stehen.
- Qualitative Eigenschaften (z. B. "trocken", "sauber", "farblos", "geruchslos") haben keinen Zahlenwert im Text.
  → Verwende dann: "op": "equals", "value": "<deutsches Adjektiv aus dem Text>", KEIN "unit_ucum".
  → Beispiel für "muss trocken sein": {{"property_key": "moisture_content", "op": "equals", "value": "trocken"}}
- Füge "unit_ucum" NUR hinzu, wenn im Text eine explizite Mengenangabe mit Einheit steht (z. B. "< 5 %", "max. 2 kg").
- Füge "intended_use" in context NUR hinzu, wenn der Text einen Verwendungszweck explizit nennt (nicht aus dem Materialnamen ableiten).

KEINE SELBST-ZENSUR BEI UNPLAUSIBLEN WERTEN:
- Melde JEDE im Text explizit genannte Eigenschaft/Menge als property/constraint, AUCH WENN der Wert dir unplausibel, physikalisch unmöglich oder widersprüchlich erscheint
  (z. B. "Reinheit beträgt 120 %", "Temperatur -500 °C", eine Spanne mit min > max).
- Du bist NUR fürs wortgetreue Extrahieren zuständig, NICHT fürs Bewerten der Plausibilität. Ein nachgelagerter Validator prüft Plausibilität automatisch anhand von Regeln.
- Lasse eine explizit genannte Eigenschaft NIEMALS weg, nur weil ihr Wert "komisch" oder ungültig wirkt. Weglassen ist genauso falsch wie Erfinden.

SPRACHE VON material.normalized.canonical_name:
- "canonical_name" auf DEUTSCH angeben (gleiche Sprache wie label_raw), NICHT auf Englisch.
- Hinweis: Falls das Material einem bekannten Eintrag im kontrollierten Vokabular entspricht,
  wird dieser Wert nach der Extraktion ohnehin serverseitig durch den deterministischen,
  kontrollierten Namen ersetzt (siehe _ground_canonical_name) – deine Angabe ist nur die
  Fallback-Schätzung für Materialien AUSSERHALB des kontrollierten Vokabulars.

SYNONYME (material.normalized.synonyms) – AUSNAHME von der Text-Beleg-Pflicht:
- Anders als bei allen anderen optionalen Feldern darfst du hier auch aus eigenem Fachwissen ergänzen, nicht nur wörtlich aus dem Text übernehmen: Liste gebräuchliche alternative Bezeichnungen für das erkannte Material (deutsche Fachbegriffe, gängige Marktbezeichnungen, übliche Schreibvarianten) – unabhängig davon, ob sie im Text vorkommen.
- Nur fachlich korrekte, tatsächlich gebräuchliche Synonyme angeben, keine erfundenen oder unüblichen Begriffe.
- Kein Synonym angeben, das mit label_raw oder canonical_name identisch ist.
- Fällt dir kein sinnvolles Synonym ein, lass das Feld weg statt ein leeres Array zu setzen.

OPTIONALE METADATEN – nur bei ausdrücklicher Nennung setzen, sonst FELD KOMPLETT WEGLASSEN (Synonyme sind hiervon ausgenommen, siehe oben):
- "quantity.basis": NUR wenn die Bezugsbasis genannt ist – z. B. "Trockenmasse"/"atro"/"wasserfrei" → "dry_basis", "wie besehen"/"as is" → "as_is". Steht nichts dergleichen im Text: Feld weglassen (NICHT "dry_basis" raten).
- "quantity.availability" / "quantity.frequency": NUR bei ausdrücklichen Zeit-/Wiederholungsangaben – "pro Quartal" → frequency "quarterly" + availability "recurring"; "laufend"/"regelmäßig" → "recurring"; "einmalig" → "one_time". Ohne solche Angabe: beide Felder weglassen.
- Alle weiteren optionalen Metadaten (z. B. "grade", "packaging"): NUR wenn wörtlich im Text. Im Zweifel das Feld WEGLASSEN statt zu raten.

KEINE UMRECHNUNGEN:
- Übernimm Zahlen und Einheiten IMMER wörtlich aus dem Text. Rechne NIEMALS um.
  "eine halbe Tonne" → value 0.5, unit_ucum "t" (NICHT 500 kg, NICHT 500 t).
  "fünfzehn Tonnen" → value 15, unit_ucum "t".
- Zahlwörter werden in Ziffern übersetzt, aber die Einheit bleibt die im Text genannte.

BEREICHSANGABEN (op = "range"):
- Bei einer Spanne "A-B <Einheit>" (z. B. "8-2 mm"): setze min = A (die ZUERST genannte Zahl) und max = B (die ZWEITE Zahl), exakt in der genannten Reihenfolge.
- Vertausche oder korrigiere die Reihenfolge NIEMALS, auch wenn dadurch min > max entsteht. Solche widersprüchlichen Eingaben müssen unverändert übernommen werden, damit die Validierung sie erkennen kann.
- Übernimm die im Text genannte Einheit immer als "unit_ucum" (z. B. "mm").
- WICHTIG bei Partikel-/Korngröße: "particle_size_max" erlaubt NUR op="max" (einzelner Grenzwert wie "max. 5 mm"), niemals op="range". Für eine allgemeine Größenspanne (z. B. "Korngröße 2-8 mm") verwende stattdessen "particle_size_range". Verwende "particle_size_d50" NUR, wenn der Text ausdrücklich "d50" oder einen Medianwert der Partikelgrößenverteilung nennt - NICHT als Ausweichlösung für eine gewöhnliche Größenspanne.
"""


def _extract_gemini(text: str, system_instruction: str, model_name: str,
                    user_suffix: str = "") -> dict:
    """Extraktion über die Google Gemini / Gemma Cloud-API (google-genai SDK)."""
    if not _GENAI_CLIENT:
        raise ValueError("GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt.")

    response = _GENAI_CLIENT.models.generate_content(
        model=model_name,
        contents=f"Text zur Extraktion: {text}{user_suffix}",
        config=genai_types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            # temperature 0: deterministische Extraktion (keine kreative Varianz)
            temperature=0.0,
        ),
    )
    return json.loads(response.text)


def _extract_ollama(text: str, system_instruction: str, model_name: str,
                    user_suffix: str = "") -> dict:
    """Extraktion über einen lokalen Ollama-Server (offline, kostenlos)."""
    url = f"{OLLAMA_HOST.rstrip('/')}/api/chat"
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Text zur Extraktion: {text}{user_suffix}"},
        ],
        "format": "json",       # erzwingt valides JSON
        "stream": False,
        "options": {
            "temperature": 0.0,
            # Das CMRS-Schema (~3-4k Tokens) steckt im System-Prompt. Mit dem Default
            # num_ctx=4096 bleibt zu wenig Platz fuer die Ausgabe -> abgeschnittenes JSON.
            "num_ctx": 8192,
            "num_predict": 2048,
        },
    }
    # Thinking-Modus deaktivieren, wo er standardmaessig aktiv ist (z. B. Qwen 3):
    # sonst verbraucht die interne Denkkette das Token-Budget vor der JSON-Ausgabe.
    if _needs_thinking_disabled(model_name):
        payload["think"] = False
    try:
        # Hoeheres Timeout: der erste Aufruf laedt das Modell in den RAM (CPU-Inferenz)
        response = requests.post(url, json=payload, timeout=int(os.getenv("OLLAMA_TIMEOUT", "300")))
        response.raise_for_status()
    except requests.exceptions.ConnectionError as e:
        raise ConnectionError(
            f"Ollama-Server unter {OLLAMA_HOST} nicht erreichbar. "
            f"Läuft 'ollama serve' und ist das Modell '{model_name}' gepullt? ({e})"
        )

    data = response.json()
    content = data.get("message", {}).get("content", "")
    if not content:
        raise ValueError(f"Leere Antwort von Ollama: {data}")
    return json.loads(content)


def extract_via_llm(
    text: str,
    provider: str = "gemini",
    model: str = None,
    schema_path: str = "cmrs-v1.1.0.schema.json",
    user_suffix: str = "",
) -> dict:
    """
    Nimmt einen Freitext und extrahiert die CMRS-Daten mittels eines wählbaren LLM.

    provider: "gemini" (Cloud) oder "ollama" (lokal/offline).
    model:    optionaler Modellname; sonst Standard je Anbieter.
    """
    provider = (provider or "gemini").lower()
    if provider not in DEFAULT_MODELS:
        raise ValueError(
            f"Unbekannter Anbieter '{provider}'. Erlaubt: {list(DEFAULT_MODELS)}"
        )
    model_name = model or DEFAULT_MODELS[provider]

    # Schema laden, um es dem LLM als Referenz zu geben
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = f.read()
    system_instruction = _build_system_instruction(schema)

    try:
        if provider == "gemini":
            result_json = _extract_gemini(text, system_instruction, model_name, user_suffix)
        else:  # ollama / ollama_gemma
            result_json = _extract_ollama(text, system_instruction, model_name, user_suffix)

        # Sicherstellen, dass die ID eindeutig ist
        if "id" not in result_json or result_json["id"] == "LLM-001":
            result_json["id"] = f"LLM-{uuid.uuid4().hex[:8]}"

        # Provenance überschreiben, um sicher zu gehen
        result_json["provenance"] = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "llm_fallback",
            "cmrs_version": "1.1.0",
        }

        # Maskierte Wert-Strings ("120 %") auftrennen, damit die Validierung
        # die Plausibilitätsregeln anwenden kann. _normalize_llm_record gibt
        # (wegen _strip_none_values) ein NEUES dict zurueck - Rueckgabewert
        # muss uebernommen werden, sonst bleiben z. B. explizite null-Werte
        # fuer optionale Felder erhalten und erzeugen einen unechten E110.
        result_json = _normalize_llm_record(result_json, text)

        # Grounding-Check: halluzinierte Zahlen (nicht im Eingabetext belegbar)
        # verwerfen – die Validierung meldet dann fehlende Angaben statt dass
        # ein plausibel aussehender, falscher Record entsteht.
        for msg in _filter_ungrounded(result_json, text):
            print(f"[GROUNDING] {provider}/{model_name}: {msg}")

        return result_json
    except Exception as e:
        print(f"Fehler bei der LLM-Extraktion ({provider}/{model_name}): {e}")
        # Werfe die Exception weiter, damit die aufrufende Pipeline (app.py/main.py)
        # sauber den originalen Regex-Record behält und nicht mit Dummy-Daten arbeitet.
        raise e


def extract_via_llm_validated(
    text: str,
    provider: str = "gemini",
    model: str = None,
    max_repairs: int = 1,
):
    """
    Extraktion mit Repair-Loop: Hat das LLM-Ergebnis Validierungsfehler, wird
    genau einmal erneut angefragt – mit den konkreten Fehlercodes/-meldungen als
    Feedback im Prompt. Zurückgegeben wird das Ergebnis mit den wenigsten
    Fehlern: (record, validation_result, attempts).
    """
    from validator import validate_cmrs  # lokaler Import vermeidet Zyklen

    record = extract_via_llm(text, provider=provider, model=model)
    result = validate_cmrs(record)
    attempts = 1

    while result.errors and attempts <= max_repairs:
        feedback = "\n".join(
            f"- {i.code} ({i.path}): {i.message}" for i in result.errors[:10]
        )
        suffix = (
            "\n\nDEIN VORHERIGER VERSUCH HATTE VALIDIERUNGSFEHLER. "
            "Korrigiere GENAU diese Punkte und gib das vollständige JSON erneut aus. "
            "Erfinde dabei KEINE neuen Werte:\n" + feedback
        )
        try:
            record2 = extract_via_llm(text, provider=provider, model=model, user_suffix=suffix)
            result2 = validate_cmrs(record2)
            attempts += 1
            if len(result2.errors) < len(result.errors):
                record, result = record2, result2
            if not result.errors:
                break
        except Exception as e:
            print(f"[REPAIR-LOOP] Retry fehlgeschlagen: {e}")
            break
        if attempts > max_repairs:
            break

    return record, result, attempts


if __name__ == "__main__":
    # Test
    sample = "Ich habe hier etwa 500 kilo von dem Zeug, was mal Joghurtbecher war. Steht in München."
    for prov in ("gemini", "ollama"):
        print(f"\n--- Provider: {prov} ---")
        try:
            res = extract_via_llm(sample, provider=prov)
            print(json.dumps(res, indent=2, ensure_ascii=False))
        except Exception as e:
            print(e)
