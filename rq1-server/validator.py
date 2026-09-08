"""
D5 + D6 – Semantische Validierung (SHACL-Äquivalent) + Error-Codes
=====================================================================
Implementiert alle 30 SHACL-Regeln aus CMRS v1.1 Spezifikation
als Python-Validation-Engine (kein RDF-Triple-Store nötig).

Fehler-Code-System:
  E1xx  Struktur/Typ
  E2xx  Units/Vokabulare
  E3xx  Domänenlogik
  E4xx  Plausibilität
  W5xx  Empfehlungen (Warnings)
"""

from __future__ import annotations
import os
import re
import json
from dataclasses import dataclass
from typing import Any, Optional

from controlled_vocabularies import (
    UCUM_WHITELIST, PROPERTY_CATALOG, MATERIAL_CATEGORIES,
    OPERATORS, COMPLIANCE_REGIMES, QUANTITY_UNITS,
)

# ─── Dynamisch registrierte Kategorien aus "Manuell erfassen" ────────────────
# Ueber /api/check_category KI-geprueft neu angelegte Kategorien (siehe
# llm_fallback.check_or_register_category) gelten hier zusaetzlich zu den
# fest kuratierten MATERIAL_CATEGORIES als zulaessig. Frisch von Platte
# gelesen statt importiert, um keine Modulabhaengigkeit zu llm_fallback.py
# einzugehen.
_CUSTOM_CATEGORIES_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "custom_categories.json"
)


def _known_category_keys() -> set[str]:
    keys = set(MATERIAL_CATEGORIES.keys())
    if os.path.exists(_CUSTOM_CATEGORIES_PATH):
        try:
            with open(_CUSTOM_CATEGORIES_PATH, "r", encoding="utf-8") as f:
                keys |= set(json.load(f).keys())
        except (json.JSONDecodeError, OSError):
            pass
    return keys

# ─── Stufe 1: JSON-Schema-Validierung (D2, Draft 2020-12) ────────────────────
# Fehler dieser Stufe erhalten den Code E110 (Struktur/Typ laut JSON Schema).

_SCHEMA_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "cmrs-v1.1.0.schema.json"
)
_JSON_SCHEMA: Optional[dict] = None
_SCHEMA_VALIDATOR = None


def _get_schema_validator():
    """Lädt das CMRS-JSON-Schema einmalig und baut einen Draft-2020-12-Validator."""
    global _JSON_SCHEMA, _SCHEMA_VALIDATOR
    if _SCHEMA_VALIDATOR is None:
        from jsonschema import Draft202012Validator
        with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
            _JSON_SCHEMA = json.load(f)
        Draft202012Validator.check_schema(_JSON_SCHEMA)
        _SCHEMA_VALIDATOR = Draft202012Validator(_JSON_SCHEMA)
    return _SCHEMA_VALIDATOR


# ─── Ergebnis-Typen ──────────────────────────────────────────────────────────

@dataclass
class ValidationIssue:
    code: str
    severity: str          # "error" | "warning"
    rule: str              # z. B. "R01"
    message: str
    path: str = ""         # JSON-Pfad des betroffenen Feldes

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "severity": self.severity,
            "rule": self.rule,
            "path": self.path,
            "message": self.message,
        }


@dataclass
class ValidationResult:
    valid: bool
    errors: list[ValidationIssue]
    warnings: list[ValidationIssue]

    @property
    def all_issues(self) -> list[ValidationIssue]:
        return self.errors + self.warnings

    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [i.to_dict() for i in self.errors],
            "warnings": [i.to_dict() for i in self.warnings],
        }

    def summary(self) -> str:
        status = "PASS" if self.valid else "FAIL"
        codes = [i.code for i in self.errors]
        warn_codes = [i.code for i in self.warnings]
        parts = [status]
        if codes:
            parts.append(f"Errors: {';'.join(codes)}")
        if warn_codes:
            parts.append(f"Warnings: {';'.join(warn_codes)}")
        return " | ".join(parts)


# ─── Validator ────────────────────────────────────────────────────────────────

class CMRSValidator:
    """
    Vollständige Implementierung aller 30 SHACL-Regeln aus CMRS v1.1.
    """

    def validate(self, record: dict, strict_mode: bool = False,
                 schema_check: bool = True) -> ValidationResult:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []

        def err(code, rule, path, msg):
            errors.append(ValidationIssue(code=code, severity="error", rule=rule, path=path, message=msg))

        def warn(code, rule, path, msg):
            warnings.append(ValidationIssue(code=code, severity="warning", rule=rule, path=path, message=msg))

        # ── Stufe 1: JSON Schema (D2) → E110 ────────────────────────────────
        if schema_check:
            try:
                sv = _get_schema_validator()
                for se in sorted(sv.iter_errors(record), key=lambda e: list(e.absolute_path)):
                    path = ".".join(str(p) for p in se.absolute_path) or "(root)"
                    err("E110", "R00", path, f"JSON-Schema-Verstoß: {se.message}")
            except Exception as e:  # Schema nicht ladbar → als Warnung melden
                warn("W110", "R00", "(schema)", f"JSON-Schema-Validierung nicht möglich: {e}")

        rtype = record.get("type")
        raw_text = (record.get("raw_input") or {}).get("text", "")

        # ── R01 E100: Pflichtfelder ──────────────────────────────────────────
        required_top = ["type", "id", "raw_input", "material", "context", "provenance"]
        for f in required_top:
            if not record.get(f):
                err("E100", "R01", f, f"Pflichtfeld '{f}' fehlt oder leer.")

        raw_input = record.get("raw_input") or {}
        if not raw_input.get("text"):
            err("E100", "R01", "raw_input.text", "raw_input.text ist ein Pflichtfeld.")
        if not raw_input.get("language"):
            err("E100", "R01", "raw_input.language", "raw_input.language ist ein Pflichtfeld.")

        material = record.get("material") or {}
        if not material.get("label_raw"):
            err("E100", "R01", "material.label_raw", "material.label_raw ist ein Pflichtfeld.")
        if not material.get("category"):
            err("E100", "R01", "material.category", "material.category ist ein Pflichtfeld.")

        context = record.get("context") or {}
        if not context.get("location"):
            err("E100", "R01", "context.location", "context.location ist ein Pflichtfeld.")

        prov = record.get("provenance") or {}
        for f in ["created_at", "source", "cmrs_version"]:
            if not prov.get(f):
                err("E100", "R01", f"provenance.{f}", f"provenance.{f} ist ein Pflichtfeld.")

        # ── R02 E101: type ∈ {offer, demand} ────────────────────────────────
        if rtype not in ("offer", "demand"):
            err("E101", "R02", "type", f"type='{rtype}' ungültig; muss 'offer' oder 'demand' sein.")

        # ── R03 E301: offer → quantity vorhanden ─────────────────────────────
        if rtype == "offer":
            qty = record.get("quantity")
            if not qty:
                err("E301", "R03", "quantity", "Offer erfordert quantity-Block.")
            else:
                if qty.get("value") is None:
                    err("E301", "R03", "quantity.value", "quantity.value fehlt.")
                if not qty.get("unit_ucum"):
                    err("E301", "R03", "quantity.unit_ucum", "quantity.unit_ucum fehlt.")

        # ── R04 E311: demand → constraints minCount=1 ─────────────────────
        if rtype == "demand":
            constraints = record.get("constraints") or []
            if len(constraints) == 0:
                err("E311", "R04", "constraints", "Demand erfordert mindestens 1 Constraint.")

        # ── R16 E330: offer → quantity.value > 0 ─────────────────────────
        qty = record.get("quantity") or {}
        if qty.get("value") is not None:
            if not isinstance(qty["value"], (int, float)) or qty["value"] <= 0:
                err("E330", "R16", "quantity.value", "quantity.value muss > 0 sein.")

        # ── R18 E240: material.category gültiger Enum-Wert ────────────────
        # Zusaetzlich zu MATERIAL_CATEGORIES auch KI-geprueft neu registrierte
        # Kategorien aus "Manuell erfassen" zulaessig (siehe _known_category_keys).
        cat = material.get("category")
        known_categories = _known_category_keys()
        if cat and cat not in known_categories:
            err("E240", "R18", "material.category", f"Ungültige Kategorie '{cat}'. Erlaubt: {sorted(known_categories)}.")

        # ── R06 E202: quantity.unit_ucum in UCUM-Whitelist ─────────────────
        qty_unit = qty.get("unit_ucum")
        if qty_unit and qty_unit not in UCUM_WHITELIST:
            err("E202", "R06", "quantity.unit_ucum", f"unit_ucum='{qty_unit}' nicht in UCUM-Whitelist.")

        # ── R05/R07/R08/R09–R15/R17 in Properties/Constraints ────────────
        for slot_type, slot_list_key in [("property", "properties"), ("constraint", "constraints")]:
            items = record.get(slot_list_key) or []
            for idx, item in enumerate(items):
                path_prefix = f"{slot_list_key}[{idx}]"

                # R07 E210: property_key im Katalog
                pk = item.get("property_key")
                if pk and pk not in PROPERTY_CATALOG:
                    err("E210", "R07", f"{path_prefix}.property_key", f"property_key='{pk}' nicht im Property-Katalog.")

                # R08 E211: op ∈ {min,max,range,equals}
                op = item.get("op")
                if op and op not in OPERATORS:
                    err("E211", "R08", f"{path_prefix}.op", f"op='{op}' ungültig.")

                # R09/R10/R05: Range-Konsistenz – gilt für constraints UND
                # properties (Offer-Ranges wie "Korngröße 2-4 mm").
                if op == "range":
                    if item.get("min") is None:
                        err("E320", "R09", f"{path_prefix}.min", "range erfordert 'min'.")
                    if item.get("max") is None:
                        err("E320", "R09", f"{path_prefix}.max", "range erfordert 'max'.")

                    # R10 E321: range → min <= max
                    if item.get("min") is not None and item.get("max") is not None:
                        if item["min"] > item["max"]:
                            err("E321", "R10", f"{path_prefix}", f"range: min={item['min']} > max={item['max']}.")

                    # R05 E201 (Range): numerische min/max erfordern unit_ucum.
                    # Schliesst die Luecke, dass R05 sonst nur 'value' prueft und ein
                    # Range ohne Einheit (z. B. aus dem LLM-Fallback) durchrutscht.
                    if ((isinstance(item.get("min"), (int, float))
                            or isinstance(item.get("max"), (int, float)))
                            and not item.get("unit_ucum")):
                        err("E201", "R05", f"{path_prefix}.unit_ucum",
                            "Range mit numerischem min/max erfordert unit_ucum.")

                if slot_type == "constraint":
                    # R11 E322: equals → value vorhanden
                    if op == "equals" and item.get("value") is None:
                        err("E322", "R11", f"{path_prefix}.value", "equals erfordert 'value'.")

                    # R12 E323: min/max → value vorhanden
                    if op in ("min", "max") and item.get("value") is None:
                        err("E323", "R12", f"{path_prefix}.value", f"op='{op}' erfordert 'value'.")

                # ── Katalog-Konsistenz (Spez. 4.4: zulässige Units/Ops/Kategorien) ──
                catalog_entry = PROPERTY_CATALOG.get(pk)
                if catalog_entry:
                    # E212: Einheit nicht zulässig für diesen Property-Key
                    allowed_units = catalog_entry.get("units") or []
                    item_unit = item.get("unit_ucum")
                    if item_unit and allowed_units and item_unit not in allowed_units:
                        err("E212", "R07b", f"{path_prefix}.unit_ucum",
                            f"unit_ucum='{item_unit}' nicht zulässig für '{pk}' (erlaubt: {allowed_units}).")
                    # E213: Operator nicht zulässig fuer diesen Property-Key.
                    # Zwei Faelle, in denen op eine harte quantitative Aussage
                    # ist (nicht nur ambiger Textbefund) und daher gegen den
                    # Katalog geprueft wird:
                    #   (a) Demand-Constraint mit numerischem value (min/max/equals)
                    #   (b) op="range" – gilt fuer Offer-Properties UND
                    #       Demand-Constraints gleichermassen (siehe R09/R10 oben)
                    check_op = (
                        (slot_type == "constraint" and isinstance(item.get("value"), (int, float)))
                        or op == "range"
                    )
                    if check_op:
                        allowed_ops = catalog_entry.get("ops") or []
                        if op and allowed_ops and op not in allowed_ops:
                            err("E213", "R08b", f"{path_prefix}.op",
                                f"op='{op}' nicht zulässig für '{pk}' (erlaubt: {allowed_ops}).")
                    # W532: Property-Key passt nicht zur Materialkategorie
                    allowed_cats = catalog_entry.get("cats") or []
                    if cat and allowed_cats and "all" not in allowed_cats and cat not in allowed_cats:
                        warn("W532", "R07c", f"{path_prefix}.property_key",
                             f"'{pk}' ist untypisch für Kategorie '{cat}' (typisch: {allowed_cats}).")

                # R05 E201: numerischer Wert → unit_ucum vorhanden
                val = item.get("value")
                if isinstance(val, (int, float)) and not item.get("unit_ucum"):
                    err("E201", "R05", f"{path_prefix}.unit_ucum", "Numerischer Wert erfordert unit_ucum.")

                # R06 E202: unit_ucum in Whitelist
                unit = item.get("unit_ucum")
                if unit and unit not in UCUM_WHITELIST:
                    err("E202", "R06", f"{path_prefix}.unit_ucum", f"unit_ucum='{unit}' nicht in UCUM-Whitelist.")

                # R13 E401: % → 0 <= value <= 100
                if unit == "%" and isinstance(val, (int, float)):
                    if not (0 <= val <= 100):
                        err("E401", "R13", f"{path_prefix}.value", f"Wert={val} außerhalb [0,100] für Einheit '%'.")

                # R14 E402: mg/kg → value >= 0
                if unit == "mg/kg" and isinstance(val, (int, float)):
                    if val < 0:
                        err("E402", "R14", f"{path_prefix}.value", f"Wert={val} < 0 für Einheit 'mg/kg'.")

                # R15 E403: Cel → value >= -273.15
                if unit == "Cel" and isinstance(val, (int, float)):
                    if val < -273.15:
                        err("E403", "R15", f"{path_prefix}.value", f"Temperatur={val}°C < absoluter Nullpunkt.")

                # R30 E430: value-Typ-Konsistenz
                #   (a) unit_ucum vorhanden → value muss numerisch sein
                #   (b) value ist ein String, der mit einer Zahl beginnt (z. B. "120 %")
                #       → maskierter Zahl/Einheit-Wert; muss als numerischer value +
                #         separates unit_ucum vorliegen (sonst umgeht er R13/R14/R15).
                #       Qualitative Strings ("trocken", "farblos") beginnen nie mit Ziffer.
                if val is not None and not isinstance(val, (int, float)):
                    if unit:
                        err("E430", "R30", f"{path_prefix}.value", "unit_ucum vorhanden → value muss numerisch sein.")
                    elif isinstance(val, str) and re.match(r'^\s*[+-]?\d', val):
                        err("E430", "R30", f"{path_prefix}.value",
                            f"value='{val}' maskiert Zahl/Einheit; value muss numerisch + unit_ucum getrennt sein.")

                # R17 E331: demand Mengen-Constraint muss Mengen-Unit haben
                if slot_type == "constraint" and pk == "quantity":
                    c_unit = item.get("unit_ucum")
                    if not c_unit or c_unit not in QUANTITY_UNITS:
                        err("E331", "R17", f"{path_prefix}.unit_ucum", f"Mengen-Constraint braucht Mengen-Unit, got '{c_unit}'.")

                # R19 W501: Evidence SHOULD vorhanden sein
                if not item.get("evidence"):
                    warn("W501", "R19", f"{path_prefix}.evidence", "Evidence (quote/offsets) fehlt.")

                # R20 E410: Offsets gültig
                for ev_idx, ev in enumerate(item.get("evidence") or []):
                    # R29 E420: entweder quote oder start+end
                    if not ev.get("quote") and (ev.get("start") is None or ev.get("end") is None):
                        err("E420", "R29", f"{path_prefix}.evidence[{ev_idx}]", "EvidenceItem: entweder quote oder start+end erforderlich.")
                    start = ev.get("start")
                    end   = ev.get("end")
                    if start is not None and end is not None:
                        text_len = len(raw_text)
                        if not (0 <= start < end <= text_len):
                            err("E410", "R20", f"{path_prefix}.evidence[{ev_idx}]",
                                f"Offsets start={start}, end={end} außerhalb [0,{text_len}].")

        # ── R21 W520: waste_stream → LoW-Code empfohlen ────────────────────
        if cat == "waste_stream":
            norm = material.get("normalized") or {}
            codes = norm.get("codes") or {}
            if not codes.get("low_code"):
                warn("W520", "R21", "material.normalized.codes.low_code", "Kategorie waste_stream: LoW/EWC-Code SHOULD angegeben werden.")

        # ── R22 E341: LoW-Code Format-Check ───────────────────────────────
        norm = material.get("normalized") or {}
        codes = norm.get("codes") or {}
        low = codes.get("low_code")
        if low:
            if not re.match(r'^\d{2}\s\d{2}\s\d{2}\*?$', low):
                err("E341", "R22", "material.normalized.codes.low_code", f"LoW-Code '{low}' entspricht nicht dem Pattern 'XX XX XX'.")

        # ── R23 W530: solvent → flash_point SHOULD angegeben ────────────
        if cat == "solvent":
            props = record.get("properties") or []
            cons  = record.get("constraints") or []
            has_fp = any(x.get("property_key") == "flash_point" for x in props + cons)
            if not has_fp:
                warn("W530", "R23", "properties/constraints[flash_point]", "Kategorie solvent: flash_point SHOULD angegeben werden.")

        # ── R24 W531: metal + "späne" → oil_content SHOULD angegeben ────
        if cat == "metal":
            label = (material.get("label_raw") or "").lower()
            if "späne" in label or "chips" in label or "drehspäne" in label:
                props = record.get("properties") or []
                cons  = record.get("constraints") or []
                has_oil = any(x.get("property_key") == "oil_content" for x in props + cons)
                if not has_oil:
                    warn("W531", "R24", "properties/constraints[oil_content]", "Metallspäne: oil_content SHOULD angegeben werden.")

        # ── R25 E250: strict_mode → keine unbekannten Top-Level Felder ──
        if strict_mode:
            allowed_top = {"type", "id", "raw_input", "material", "quantity", "properties",
                           "constraints", "standards", "safety_compliance", "context", "provenance"}
            for k in record:
                if k not in allowed_top:
                    err("E250", "R25", k, f"Unbekanntes Top-Level Feld '{k}' in strict_mode.")

        # ── R26 E260: standards[].name nicht leer ─────────────────────────
        for idx, std in enumerate(record.get("standards") or []):
            if not std.get("name"):
                err("E260", "R26", f"standards[{idx}].name", "standards[].name darf nicht leer sein.")

        # ── R27 E270: safety_compliance[].regime im Enum ─────────────────
        for idx, sc in enumerate(record.get("safety_compliance") or []):
            regime = sc.get("regime")
            if regime and regime not in COMPLIANCE_REGIMES:
                err("E270", "R27", f"safety_compliance[{idx}].regime", f"regime='{regime}' nicht im Regime-Enum.")

        # ── R28 W540: material.normalized SHOULD vorhanden ─────────────
        if not material.get("normalized"):
            warn("W540", "R28", "material.normalized", "material.normalized SHOULD vorhanden sein.")

        result = ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )
        return result


# ─── Convenience-Funktion ─────────────────────────────────────────────────────

def validate_cmrs(record: dict, strict_mode: bool = False) -> ValidationResult:
    """Validiert ein CMRSRecord-Dictionary. Gibt ValidationResult zurück."""
    return CMRSValidator().validate(record, strict_mode=strict_mode)


if __name__ == "__main__":
    import json, sys
    sys.path.insert(0, "..")

    # Demo: Gültiger Offer
    sample = {
        "type": "offer",
        "id": "OFF-001",
        "raw_input": {"text": "500 kg PP-Regranulat, Feuchte max 0,3 %, Berlin.", "language": "de"},
        "material": {"label_raw": "PP-Regranulat", "category": "polymer"},
        "quantity": {"value": 500, "unit_ucum": "kg"},
        "properties": [
            {"property_key": "moisture_content", "value": 0.3, "unit_ucum": "%",
             "evidence": [{"quote": "Feuchte max 0,3 %", "start": 20, "end": 37}]}
        ],
        "context": {"location": "Berlin"},
        "provenance": {"created_at": "2025-12-28T00:00:00Z", "source": "manual", "cmrs_version": "1.1.0"},
    }

    result = validate_cmrs(sample)
    print(f"Validation: {result.summary()}")
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
