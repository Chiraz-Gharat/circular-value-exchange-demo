"""
D4 – Mapping Specification CMRS v1.1
======================================
Deterministische Pipeline: Freitext → strukturiertes CMRSRecord (JSON).

Pipeline-Phasen:
  A) Segmentierung
  B) Candidate Extraction
  C) Normalisierung
  D) Slot Filling
  E) Evidence-Erzeugung
  F) Validierung (→ validator.py)
"""

from __future__ import annotations
import re
import uuid
import json
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional, Union

from controlled_vocabularies import (
    OFFER_KEYWORDS, DEMAND_KEYWORDS,
    PROPERTY_ALIASES_DE, UNIT_ALIASES_DE,
    QUANTITY_UNITS, UCUM_WHITELIST,
    MATERIAL_CATEGORIES,
    KNOWN_MATERIALS,
)


# ─── Dataclasses für interne Verarbeitung ────────────────────────────────────

@dataclass
class EvidenceItem:
    quote: str
    start: int
    end: int
    confidence: Optional[float] = None

    def to_dict(self) -> dict:
        d = {"quote": self.quote, "start": self.start, "end": self.end}
        if self.confidence is not None:
            d["confidence"] = self.confidence
        return d


@dataclass
class ExtractedSlot:
    property_key: str
    value: Union[float, str]
    unit_ucum: Optional[str]
    op: Optional[str]       # for constraints
    evidence: list[EvidenceItem] = field(default_factory=list)
    method: Optional[str] = None
    standard_ref: Optional[str] = None
    range_max: Optional[float] = None   # Obergrenze bei op="range" (value = min)


@dataclass
class ParsedInput:
    text: str
    language: str
    record_type: Optional[str] = None          # offer | demand
    material_label: Optional[str] = None
    material_canonical_name: Optional[str] = None  # B5: aus KNOWN_MATERIALS-Match
    material_category: Optional[str] = None
    material_synonyms: list[str] = field(default_factory=list)
    location: Optional[str] = None
    market_region: list[str] = field(default_factory=list)
    intended_use: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_basis: Optional[str] = None
    quantity_availability: Optional[str] = None
    quantity_frequency: Optional[str] = None
    quantity_evidence: list[EvidenceItem] = field(default_factory=list)  # B4
    slots: list[ExtractedSlot] = field(default_factory=list)
    standards: list[str] = field(default_factory=list)
    safety_compliance: list[str] = field(default_factory=list)
    low_code: Optional[str] = None


# ─── Kategorie-Normalisierung auf CMRS-Schema-Enum ───────────────────────────
# Der interne Matcher erkennt feinere Kategorien; diese Tabelle bildet sie auf
# die vom Schema erlaubten Werte ab.
_CMRS_VALID_CATEGORIES: frozenset[str] = frozenset({
    "polymer", "metal", "solvent", "biomass",
    "waste_stream", "by_product", "article", "other",
})
_CATEGORY_TO_CMRS: dict[str, str] = {
    "paper":              "waste_stream",
    "rubber":             "polymer",
    "glass":              "other",
    "textile":            "other",
    "construction_waste": "waste_stream",
    "food_waste":         "biomass",
}


# ─── Phase A: Segmentierung ──────────────────────────────────────────────────

def detect_record_type(text: str) -> str:
    """Erkennt ob Angebot oder Nachfrage anhand Keywords."""
    lower = text.lower()
    for kw in DEMAND_KEYWORDS:
        if kw in lower:
            return "demand"
    for kw in OFFER_KEYWORDS:
        if kw in lower:
            return "offer"
    return "offer"  # Fallback: Offer (expliziter als demand-Guess)


# ─── Phase B: Candidate Extraction ──────────────────────────────────────────

# Regex: Zahl (deutsches Format: Tausenderpunkt und Komma-Dezimaltrenner,
# z. B. "1.500", "1.500,50", "0,3", "500")
_NUMBER_RE = r'(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)'

# Einheiten: längere/zusammengesetzte Patterns ZUERST, dann einfache
# (Regex alternation ist links-nach-rechts: "g" würde "g/10min" frühzeitig stoppen)
_UNIT_RE = (
    r'(g\/\(?10[\s.]?[Mm]in\)?'   # MFI: g/10min, g/(10 min) – vor "g"
    r'|kg\/m[3³]\b'                # Dichte: kg/m3 – vor "kg"
    r'|mg\/kg'                     # Konzentration: mg/kg – vor "mg" und "kg"
    r'|MJ\/kg|kJ\/kg'              # Energie – vor "kg"
    r'|kg\b|[Kk]ilogramm\b'
    r'|t\b|[Tt]onne[n]?\b'
    r'|g\b|[Gg]ramm\b'
    r'|[Ll]iter\b|[Ll]\b'
    r'|m3\b|[Kk]ubikmeter\b'
    r'|%|[Pp]rozent\b'
    r'|°[Cc]|[Cc]el\b|[Cc]elsius\b'
    r'|mm\b|[Mm]illimeter\b'
    r'|µm|um\b|[Mm]ikrometer\b'
    r'|MPa\b|[Mm]egapascal\b)'
)

# Operatoren: Symbole, Abkürzungen (mit Punkt), Vollform, Adjektivendungen, Phrasen
_OP_RE = (
    r'(>=|<=|>|<|='
    r'|max\.?|min\.?|mind\.'
    r'|maximal(?:e[rnms]?)?'
    r'|minimal(?:e[rnms]?)?'
    r'|mindestens|wenigstens|zumindest'
    r'|höchstens|nicht\s+mehr\s+als|bis\s+zu|unter\b|kleiner\s+als'
    r'|zwischen|genau'
    r'|ca\.?|etwa\b|ungefähr\b)'
)

# Trennzeichen zwischen Property-Keyword und Operator/Wert:
# erlaubt " max", ": max", " von max", " beträgt max", " liegt bei max"
_KW_SEP_RE = r'(?:\s+(?:von|beträgt|liegt\s+bei|ist)\s+|\s*:\s*|\s+)'

# Mengen-Pattern: "<Zahl> <Einheit>"
QUANTITY_PATTERN = re.compile(
    rf'{_NUMBER_RE}\s*{_UNIT_RE}',
    re.IGNORECASE
)

# Property-Pattern: "keyword [connector] op zahl einheit"
# _KW_SEP_RE erlaubt: " max", ": max", " von max", " betr\u00e4gt max", " liegt bei max"
PROPERTY_PATTERN = re.compile(
    rf'([A-Za-z\u00C0-\u00FF\u00e4\u00f6\u00fc\u00df\u00c4\u00d6\u00dc/\-]+(?:\s[A-Za-z\u00C0-\u00FF\u00e4\u00f6\u00fc\u00df]+)*?){_KW_SEP_RE}{_OP_RE}\s*{_NUMBER_RE}\s*{_UNIT_RE}',
    re.IGNORECASE
)
# Fallback ohne expliziten Operator (z. B. "Reinheit 95%" oder "Feuchte: 0,3%")
PROPERTY_PATTERN_NO_OP = re.compile(
    rf'([A-Za-z\u00C0-\u00FF\u00e4\u00f6\u00fc\u00df/\-]+){_KW_SEP_RE}{_NUMBER_RE}\s*{_UNIT_RE}',
    re.IGNORECASE
)
# Adjektiv-Operator VOR dem Keyword (z. B. "maximale Feuchte: 0,3 %")
PROPERTY_PATTERN_ADJ_OP = re.compile(
    rf'(max\.?|min\.?|mind\.|maximal(?:e[rnms]?)?|minimal(?:e[rnms]?)?|mindestens|h\u00f6chstens)\s+'
    rf'([A-Za-z\u00C0-\u00FF\u00e4\u00f6\u00fc\u00df\u00c4\u00d6\u00dc/\-]+)'
    rf'(?:\s*:\s*|\s+)'
    rf'{_NUMBER_RE}\s*{_UNIT_RE}',
    re.IGNORECASE
)

# Range-Pattern: "<keyword> zwischen <Zahl> und <Zahl> <Einheit>"
RANGE_PATTERN = re.compile(
    rf'([A-Za-zÀ-ÿ/\-]+)\s+(?:zwischen\s+)?{_NUMBER_RE}\s*[-–]\s*{_NUMBER_RE}\s*{_UNIT_RE}',
    re.IGNORECASE
)

# Property-Keys, deren Katalog-Eintrag op="range" NICHT erlaubt, auf ein
# Range-faehiges Gegenstueck ausweichen (siehe PROPERTY_CATALOG in
# controlled_vocabularies.py: particle_size_max erlaubt nur op="max").
_RANGE_KEY_REMAP: dict[str, str] = {
    "particle_size_max": "particle_size_range",
}

# Standort-Pattern (erweitert: ort, werk, lager, herkunft, depot)
LOCATION_PATTERN = re.compile(
    r'(?:standort|location|lager|depot|ort|werk|in|aus|region|herkunft)[:\s]+([A-Za-zÀ-ÿ/\-\s]+?)(?:[,.]|$)',
    re.IGNORECASE
)
LOCATION_PATTERN_PLAIN = re.compile(
    r',\s*([A-Z][a-züäöÜÄÖß][a-zA-Züäöß\-/]+(?:/[A-Za-züäöÜÄÖß]+)?)\s*[.,]?\s*$',
)

# Normen-Pattern
STANDARD_PATTERN = re.compile(
    r'\b(ISO|DIN|EN|ASTM|IEC)\s*[\-]?\s*([A-Z0-9\-]+)',
    re.IGNORECASE
)

# LoW/EWC-Code-Pattern (Format: "12 01 05" oder "12 01 05*")
LOW_CODE_PATTERN = re.compile(r'\b(\d{2}\s\d{2}\s\d{2}\*?)\b')

# ─── Pattern fuer bisher nicht extrahierte Schema-Felder ─────────────────────

# quantity.basis: Bezugsbasis der Mengenangabe (Schema-Enum)
BASIS_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b(?:atro|absolut\s+trocken|wasserfrei|trockenmasse|trockensubstanz|'
                r'trocken\s*gerechnet|dry\s*basis)\b', re.I), "dry_basis"),
    (re.compile(r'\b(?:lutro|feuchtmasse|feucht\s*gerechnet|wet\s*basis|'
                r'waldfrisch|erntefrisch)\b', re.I), "wet_basis"),
    (re.compile(r'\b(?:wie\s+besehen|as\s*is|besichtigt\s+wie\s+gesehen|'
                r'im\s+Ist-Zustand|ist-zustand)\b', re.I), "as_is"),
]

# quantity.availability: einmalig vs. wiederkehrend (Schema-Enum)
AVAILABILITY_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b(?:einmalig|einmalige[rnms]?\s+(?:Menge|Posten|Partie|Charge)|'
                r'Restposten|einmal\s+verf[üu]gbar|one[\s-]*time)\b', re.I), "one_time"),
    (re.compile(r'\b(?:laufend|regelm[äa][ßs]ig|fortlaufend|kontinuierlich|'
                r'wiederkehrend|st[äa]ndig\s+verf[üu]gbar|dauerhaft\s+verf[üu]gbar|'
                r'recurring|pro\s+(?:Woche|Monat|Quartal|Jahr|Tag)|'
                r'w[öo]chentlich|monatlich|quartalsweise|j[äa]hrlich|t[äa]glich)\b', re.I), "recurring"),
]

# quantity.frequency: Freitext-Frequenz, nur bei availability=recurring sinnvoll
FREQUENCY_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b(?:t[äa]glich|pro\s+Tag|je\s+Tag|daily)\b', re.I), "daily"),
    (re.compile(r'\b(?:w[öo]chentlich|pro\s+Woche|je\s+Woche|weekly)\b', re.I), "weekly"),
    (re.compile(r'\b(?:monatlich|pro\s+Monat|je\s+Monat|monthly)\b', re.I), "monthly"),
    (re.compile(r'\b(?:quartalsweise|pro\s+Quartal|je\s+Quartal|quarterly)\b', re.I), "quarterly"),
    (re.compile(r'\b(?:j[äa]hrlich|pro\s+Jahr|je\s+Jahr|yearly|annually)\b', re.I), "yearly"),
]

# context.market_region: Markt-/Rechtsraum (nur explizit genannte Regionen)
MARKET_REGION_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b(?:EU|Europ[äa]ische\s+Union|EU-weit|europaweit|innerhalb\s+der\s+EU)\b'), "EU"),
    (re.compile(r'\b(?:DACH|D-A-CH|Deutschland[,/\s]+[ÖO]sterreich[,/\s]+Schweiz)\b', re.I), "DACH"),
    (re.compile(r'\b(?:EWR|Europ[äa]ischer\s+Wirtschaftsraum)\b', re.I), "EWR"),
    (re.compile(r'\b(?:weltweit|international|global|worldwide)\b', re.I), "global"),
]

# safety_compliance[].regime: Regulatorische Regime (Schema-Enum)
COMPLIANCE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bREACH\b', re.I), "REACH"),
    (re.compile(r'\bSCIP\b', re.I), "SCIP"),
    (re.compile(r'\bRoHS\b', re.I), "RoHS"),
    (re.compile(r'\bCLP\b', re.I), "CLP"),
    (re.compile(r'\bWEEE\b|\bElektroaltger[äa]te\b', re.I), "WEEE"),
    (re.compile(r'\bWFD\b|\bAbfallrahmenrichtlinie\b', re.I), "WFD"),
]

# context.intended_use: Verwendungszweck (nur bei expliziter Nennung)
INTENDED_USE_PATTERN = re.compile(
    r'\b(?:f[üu]r|zur|zum|geeignet\s+f[üu]r|Verwendung(?:szweck)?[:\s]+|Einsatz(?:zweck)?[:\s]+)\s*'
    r'(Spritzguss|Extrusion|Blasformen|Tiefziehen|Folienherstellung|Rohrherstellung|'
    r'Compoundierung|Rezyklierung|Verbrennung|energetische\s+Verwertung|'
    r'stoffliche\s+Verwertung|Weiterverarbeitung)\b', re.I
)

# Messmethoden (properties[].method) - typische Verfahren aus der Materialpruefung
METHOD_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bKarl[\s-]*Fischer\b', re.I), "Karl-Fischer"),
    (re.compile(r'\bICP[\s-]*(?:OES|MS)\b', re.I), "ICP"),
    (re.compile(r'\bSiebanalyse\b', re.I), "Siebanalyse"),
    (re.compile(r'\bLaserbeugung\b', re.I), "Laserbeugung"),
    (re.compile(r'\bDarrmethode\b|\bDarr[\s-]*Verfahren\b', re.I), "Darrmethode"),
    (re.compile(r'\bGravimetrie\b|\bgravimetrisch\b', re.I), "Gravimetrie"),
    (re.compile(r'\bTitration\b', re.I), "Titration"),
]

# Material-Kategorien Dictionary (Pattern → category)
# Reihenfolge: spezifischere Kategorien zuerst
MATERIAL_CATEGORY_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Kunststoffe/Polymere
    (re.compile(
        r'\b(PP|PE\b|PET|PS\b|PVC|ABS|PA\b|PC\b|HDPE|LDPE|LLDPE|PMMA|POM|SAN|EVA|PU\b|TPE|TPU|TPV|'
        r'polymer|plastik|kunststoff|thermoplast|duroplast|elastomer\b|'
        r'granulat|regranulat|regrind|rezyklat|flakes|mahlgut|pellet[s]?|'
        r'pp.granulat|pe.granulat|pet.flakes|ps.granulat|pvc.granulat)\b', re.I), "polymer"),
    # Metalle
    (re.compile(
        r'\b(aluminium|aluminum|alu\b|aluminiumsp.{0,3}ne|aluminiumsch.{0,5}tt|'
        r'stahl|edelstahl|stahlschrott|stahlsp.{0,3}ne|'
        r'eisen|eisenschrott|'
        r'kupfer|kupferschrott|kupferkabel|'
        r'messing|bronze|zink|zinkschrott|'
        r'nickel|chrom|titan|kobalt|mangan|wolfram|'
        r'blei|zinn|'
        r'metall|metallschrott|nichteisenmetall|ne.metall|'
        r'sp.{0,3}ne|metallsp.{0,3}ne|drehsp.{0,3}ne|'
        r'schrott|chips\b|schnitte|dreh.{0,5}le)\b', re.I), "metal"),
    # Lösemittel/Chemikalien
    (re.compile(
        r'\b(ethanol|methanol|isopropanol|ipa\b|propanol|butanol|'
        r'aceton|mek\b|methylethylketon|'
        r'toluol|xylol|benzol|'
        r'hexan|heptan|oktan|'
        r'ethylacetat|butylacetat|'
        r'dichlormethan|chloroform|'
        r'lösemittel|lösungsmittel|solvent|'
        r'säure|lauge|natronlauge|salzsäure|schwefelsäure|'
        r'lösemittelgemisch|lösemittelrückstand)\b', re.I), "solvent"),
    # Biomasse
    (re.compile(
        r'\b(holz|wood\b|holzhackschnitzel|hackschnitzel|'
        r'pellets\b|holzpellets|'
        r'sägespäne|sägemehl|holzmehl|holzstaub|'
        r'rinde|baumrinde|holzrinde|'
        r'stroh|halmgut|'
        r'biomasse|biomass\b|'
        r'bagasse|'
        r'torf|'
        r'holzreste|holzabfall|altholz)\b', re.I), "biomass"),
    # Glas
    (re.compile(
        r'\b(glas\b|altglas|glasscherben|glasbruch|glasabfall|glasreste|'
        r'floatglas|hohlglas|behälterglas|flachglas|fensterglas|'
        r'glasfaser[n]?|glaswolle|'
        r'kristallglas|borosilikatglas)\b', re.I), "glass"),
    # Papier/Pappe
    (re.compile(
        r'\b(papier|altpapier|altpapiere|'
        r'pappe|pappkarton|wellpappe|karton|'
        r'zeitungspapier|büropapier|druckpapier|'
        r'papierstaub|papierreste|papierausschuss|'
        r'papier.?gemisch|mischpapier)\b', re.I), "paper"),
    # Gummi/Elastomere
    (re.compile(
        r'\b(gummi\b|gummiabfall|gummireste|gummigranulat|gummikrümel|'
        r'kautschuk|naturkautschuk|'
        r'elastomer[e]?\b|'
        r'reifen|altreifen|reifenabfall|reifengranulat|'
        r'vulkanisat|'
        r'latex|neopren|sbr\b|epdm\b|nbr\b)\b', re.I), "rubber"),
    # Textilien
    (re.compile(
        r'\b(textil[e]?|alttextil[ien]*|textilabfall|'
        r'gewebe|vlies|vliesmaterial|'
        r'faser[n]?|kunstfaser[n]?|naturfaser[n]?|'
        r'wolle|baumwolle|'
        r'polyesterfaser|nylonfaser|'
        r'kleidung|altkleider|secondhand)\b', re.I), "textile"),
    # Baurestmassen
    (re.compile(
        r'\b(bauschutt|baurestmasse[n]?|abbruchmaterial|'
        r'beton|betonbruch|betonschutt|'
        r'ziegel|backsteinbruch|mauerwerkschutt|'
        r'asphalt|asphaltgranulat|'
        r'mineralwolle|steinwolle|glaswolle\b|dämmstoff|'
        r'gips|gipskarton|gipsabfall|'
        r'putz|mörtel|'
        r'kies|sand\b|schotter|splitt)\b', re.I), "construction_waste"),
    # Biologische Abfälle
    (re.compile(
        r'\b(lebensmittelabfall|speisereste|küchenabfall|'
        r'bioabfall|bio.?müll|'
        r'grünschnitt|grasschnitt|rasenschnitt|'
        r'kompost|'
        r'schlachtabfall|fleischabfall|'
        r'molke|schlempe|treber|'
        r'fettreste|speiseöl|altfett)\b', re.I), "food_waste"),
    # Abfallströme (allgemein, nach spezifischeren Kategorien)
    (re.compile(
        r'\b(abfall|waste\b|entsorgung|'
        r'ewc\b|low\b|avv\b|'
        r'schlamm|klärschlamm|sludge\b|'
        r'staub|filterstaub|dust\b|'
        r'asche|verbrennungsasche|flugasche|'
        r'prozessrückstand|produktionsabfall)\b', re.I), "waste_stream"),
    # Nebenprodukte
    (re.compile(
        r'\b(nebenprodukt|nebenprodukte|'
        r'by.?product\b|'
        r'prozessabfall|reststoff|reststoffe|produktionsrest|'
        r'co.?produkt)\b', re.I), "by_product"),
    # Erzeugnisse/Artikel
    (re.compile(
        r'\b(bauteil|bauteile|'
        r'produkt\b|artikel\b|'
        r'verpackung|verpackungsmaterial|'
        r'packaging\b|part\b|component\b)\b', re.I), "article"),
]


def normalize_number(s: str) -> float:
    """
    Normalisiert deutsches Zahlenformat → float.
    Deutsche Konvention (DIN 5008): Punkt = Tausendertrenner, Komma = Dezimal.
      "1.500"    → 1500.0     "1.500,50" → 1500.5
      "0,3"      → 0.3        "500"      → 500.0
    Ein Punkt gefolgt von genau 3 Ziffern wird als Tausenderpunkt gelesen
    (deutscher Eingabekontext); andere Punkt-Formate ("1.5") als Dezimalpunkt.
    """
    s = s.strip()
    if re.fullmatch(r'\d{1,3}(?:\.\d{3})+(?:,\d+)?', s):
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    return float(s)


def normalize_unit(raw: str) -> Optional[str]:
    """Normalisiert Einheit → UCUM-Code."""
    return UNIT_ALIASES_DE.get(raw.strip().lower())


def normalize_operator(raw: str) -> str:
    """Normalisiert Operator-Texte → min|max|range|equals."""
    s = raw.strip().lower().rstrip(".")
    if s in ("min", "mind", "mindestens", "wenigstens", "zumindest", ">=", ">",
             "minimal", "minimale", "minimaler", "minimales", "minimalen", "minimalem"):
        return "min"
    if s in ("max", "maximal", "höchstens", "nicht mehr als", "bis zu", "unter", "kleiner als", "<=", "<",
             "maximale", "maximaler", "maximales", "maximalen", "maximalem"):
        return "max"
    if s in ("zwischen",):
        return "range"
    if s in ("genau", "=", "equals", "ca", "etwa", "ungefähr"):
        return "equals"
    return "min"  # Fallback


def resolve_property_key(raw: str) -> Optional[str]:
    """Löst Property-Keyword → kontrollierten Key auf."""
    cleaned = raw.strip().lower().rstrip(":")
    return PROPERTY_ALIASES_DE.get(cleaned)


def detect_material_category(text: str) -> str:
    """Erkennt Materialkategorie anhand Pattern-Matching."""
    for pattern, category in MATERIAL_CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "other"


# Wörter, die nach einem Materialnamen NICHT als Beschreiber einbezogen werden
_LABEL_STOP_WORDS: frozenset[str] = frozenset({
    # Einheiten (Abkürzungen + ausgeschrieben)
    "kg", "t", "g", "l", "m3", "mm", "um", "mpa", "mj", "kj",
    "tonne", "tonnen", "kilogramm", "gramm", "liter", "kubikmeter", "prozent",
    # Präpositionen / Konjunktionen
    "und", "oder", "mit", "für", "aus", "von", "bei", "ab", "am", "im",
    "an", "zu", "in", "auf", "über", "unter", "vor", "nach", "seit",
    "die", "der", "das", "ein", "eine", "einen", "einem", "einer",
    # Frequenz-/Verteilungswörter ("... pro Monat", "... je Woche")
    "pro", "je", "per",
    # Kontext-Verben / Füllwörter
    "ist", "sind", "hat", "haben", "wird", "werden",
    "ca", "etwa", "ungefähr", "bitte", "inkl", "exkl",
    # Standort-Signalwörter
    "standort", "lager", "werk", "region", "herkunft", "depot",
    # Operatoren (inkl. Abkürzungen und alle Adjektiv-Inflektionen)
    "max", "min", "mind", "mindestens", "maximal", "höchstens",
    "maximale", "maximaler", "maximales", "maximalen", "maximalem",
    "minimale", "minimaler", "minimales", "minimalen", "minimalem",
    "minimale", "minimal",
})

# Vorberechnete Kleinbuchstaben-Version für schnellen Vergleich
_KNOWN_MATERIALS_LOWER: list[str] = [m.lower() for m in KNOWN_MATERIALS]
# Wort-Tokens je Material (vorberechnet)
_KNOWN_MATERIALS_WORDS: list[list[str]] = [
    re.findall(r'[A-Za-zÀ-ÿäöüÄÖÜß][A-Za-zÀ-ÿäöüÄÖÜß0-9\-]*', m)
    for m in KNOWN_MATERIALS
]


def extract_material_label(text: str) -> tuple[str, Optional[str]]:
    """
    Findet das Material per Fuzzy-Matching gegen KNOWN_MATERIALS (difflib).
    Gibt (label_raw, canonical_name) zurück; canonical_name ist None wenn kein
    KNOWN_MATERIALS-Treffer über dem Threshold gefunden wurde.
    """
    from difflib import SequenceMatcher

    words = re.findall(r'[A-Za-zÀ-ÿäöüÄÖÜß][A-Za-zÀ-ÿäöüÄÖÜß0-9\-]*', text)
    if not words:
        return text[:80], None

    best_label: Optional[str] = None
    best_canonical: Optional[str] = None
    best_score: float = 0.0
    best_pos: int = len(words)
    best_end: int = 0
    THRESHOLD = 0.72

    for mat_orig, mat_words, mat_lower in zip(
        KNOWN_MATERIALS, _KNOWN_MATERIALS_WORDS, _KNOWN_MATERIALS_LOWER
    ):
        n = len(mat_words)
        if n > len(words):
            continue
        for i in range(len(words) - n + 1):
            window = " ".join(words[i : i + n])
            score = SequenceMatcher(None, window.lower(), mat_lower).ratio()
            if score > best_score or (score == best_score and i < best_pos):
                best_score = score
                best_label = window
                best_canonical = mat_orig
                best_end = i + n
                best_pos = i

    if best_score >= THRESHOLD and best_label:
        if best_end < len(words):
            nw = words[best_end]
            nw_lower = nw.lower()
            nw_is_material = any(
                SequenceMatcher(None, nw_lower, m).ratio() >= 0.85
                for m in _KNOWN_MATERIALS_LOWER
            )
            if (not nw_is_material
                    and nw_lower not in _LABEL_STOP_WORDS
                    and nw_lower not in PROPERTY_ALIASES_DE
                    and not re.match(r'^\d', nw)):
                best_label += " " + nw
        return best_label[:80], best_canonical

    # Fallback: strukturbasiert (erstes Segment bis Komma/Klammer)
    cleaned = re.sub(
        r'^(?:ich\s+|wir\s+)?(?:biete(?:\s+an)?|bieten(?:\s+an)?|suche[n]?|'
        r'verkaufe[n]?|kaufe[n]?|benötige[n]?|haben|brauchen|verfügbar|angebot|'
        r'abzugeben|liefern|zu\s+verkaufen|zu\s+vergeben|gesuch)[:\s]*',
        "", text, flags=re.I,
    ).strip()
    cleaned = re.sub(
        r'^\d[\d.,]*\s*(?:kg|t\b|g\b|[Ll]\b|m3|tonnen?\b|kilogramm\b|liter\b)\s+',
        "", cleaned, flags=re.I,
    ).strip()
    m = re.match(r'^([^,(]+)', cleaned)
    return (m.group(1).strip() if m else cleaned.strip())[:80], None


def _extract_by_proximity(
    text: str,
    used_spans: set[tuple[int, int]],
    pi: "ParsedInput",
    qty_extracted: bool,
) -> bool:
    """
    Strukturfreier Fallback: findet alle (Zahl, Einheit)-Paare im Text und
    sucht im selben Satz-Segment nach dem nächsten Property-Keyword und Operator.
    Verarbeitet nur Spans, die von den sequenziellen Patterns noch nicht erfasst wurden.
    Gibt den aktualisierten qty_extracted-Status zurück.
    """
    _NU_PAT = re.compile(rf'{_NUMBER_RE}\s*{_UNIT_RE}', re.IGNORECASE)
    _OP_PAT = re.compile(rf'{_OP_RE}', re.IGNORECASE)

    # Keywords nach Länge absteigend sortieren → längere (spezifischere) zuerst
    sorted_kws = sorted(PROPERTY_ALIASES_DE.items(), key=lambda x: len(x[0]), reverse=True)

    for m in _NU_PAT.finditer(text):
        if any(s <= m.start() and m.end() <= e for s, e in used_spans):
            continue

        unit = normalize_unit(m.group(2))
        if unit is None:
            continue
        try:
            value = normalize_number(m.group(1))
        except ValueError:
            continue

        # Kontext auf das nächste Satz-Segment (Komma/Semikolon/Punkt) begrenzen
        seg_start = max(
            text.rfind(',', 0, m.start()),
            text.rfind(';', 0, m.start()),
            text.rfind('.', 0, m.start()),
            0,
        )
        seg_end_candidates = [text.find(c, m.end()) for c in (',', ';', '.') if text.find(c, m.end()) != -1]
        seg_end = min(seg_end_candidates) if seg_end_candidates else len(text)

        before = text[seg_start:m.start()]
        after  = text[m.end():seg_end]
        context = before + after

        # Operator: bevorzuge unmittelbar vor der Zahl, dann unmittelbar danach
        op = None
        op_m = _OP_PAT.search(before)
        if op_m:
            op = normalize_operator(op_m.group(1))
        if not op:
            op_m = re.match(rf'\s*{_OP_RE}', after, re.IGNORECASE)
            if op_m:
                op = normalize_operator(op_m.group(1))

        # Property-Keyword im Kontext-Segment suchen (längste Übereinstimmung gewinnt)
        prop_key = None
        for kw, key in sorted_kws:
            pat = r'(?<![a-zA-ZäöüÄÖÜß])' + re.escape(kw) + r'(?![a-zA-ZäöüÄÖÜß])'
            if re.search(pat, context, re.IGNORECASE):
                prop_key = key
                break

        evidence = [EvidenceItem(quote=m.group(0), start=m.start(), end=m.end())]

        if prop_key and unit not in QUANTITY_UNITS:
            # method bleibt None: "proximity" war ein interner Debug-Marker fuer
            # den Fallback-Durchlauf und ist KEINE Messmethode im Sinne des
            # Schemas (dort z. B. "Karl-Fischer"). Echte Messmethoden werden
            # separat ueber METHOD_PATTERNS erkannt.
            pi.slots.append(ExtractedSlot(
                property_key=prop_key,
                value=value,
                unit_ucum=unit,
                op=op or "equals",
                evidence=evidence,
            ))
            used_spans.add((m.start(), m.end()))
        elif unit in QUANTITY_UNITS and not qty_extracted:
            pi.quantity_value = value
            pi.quantity_unit = unit
            pi.quantity_evidence = evidence
            qty_extracted = True
            used_spans.add((m.start(), m.end()))

    return qty_extracted


# ─── Zahlwort-Normalisierung (Vorverarbeitung) ───────────────────────────────

# Einfache Zahlwörter → Wert
_SIMPLE_NUM_WORDS: dict[str, str] = {
    "null": "0", "ein": "1", "eine": "1", "eins": "1", "zwei": "2", "drei": "3", "vier": "4",
    "fünf": "5", "sechs": "6", "sieben": "7", "acht": "8", "neun": "9",
    "zehn": "10", "elf": "11", "zwölf": "12", "dreizehn": "13",
    "vierzehn": "14", "fünfzehn": "15", "sechzehn": "16", "siebzehn": "17",
    "achtzehn": "18", "neunzehn": "19", "zwanzig": "20", "dreißig": "30",
    "vierzig": "40", "fünfzig": "50", "sechzig": "60", "siebzig": "70",
    "achtzig": "80", "neunzig": "90", "hundert": "100", "tausend": "1000",
}
_UNITS_WORDS = {"ein": 1, "zwei": 2, "drei": 3, "vier": 4, "fünf": 5,
                "sechs": 6, "sieben": 7, "acht": 8, "neun": 9}
_TENS_WORDS = {"zwanzig": 20, "dreißig": 30, "vierzig": 40, "fünfzig": 50,
               "sechzig": 60, "siebzig": 70, "achtzig": 80, "neunzig": 90}

_COMPOUND_NUM_RE = re.compile(
    r'\b(' + "|".join(_UNITS_WORDS) + r')und(' + "|".join(_TENS_WORDS) + r')\b',
    re.IGNORECASE,
)


def _translate_number_words(text: str) -> str:
    """
    Übersetzt deutsche Zahlwörter in Ziffern, damit die numerischen Patterns
    greifen. Abgedeckt: 0–20, Zehner, hundert/tausend, zusammengesetzte
    Zahlen ("fünfundzwanzig"), Brüche ("eine halbe" → 0,5; "anderthalb" → 1,5)
    und Wort-Dezimale ("zwei Komma fünf" → 2,5).
    """
    # Brüche zuerst (bevor "ein"/"zwei" ersetzt werden)
    text = re.sub(r'\b(?:eine?[nr]?\s+)?halbe[nr]?\s+', '0,5 ', text, flags=re.I)
    text = re.sub(r'\banderthalb\b|\beineinhalb\b', '1,5', text, flags=re.I)
    text = re.sub(r'\bzweieinhalb\b', '2,5', text, flags=re.I)
    text = re.sub(r'\b(?:eine?[nr]?\s+)?viertel\s+', '0,25 ', text, flags=re.I)

    # Zusammengesetzte Zahlen: "fünfundzwanzig" → 25
    def _compound(m: re.Match) -> str:
        return str(_UNITS_WORDS[m.group(1).lower()] + _TENS_WORDS[m.group(2).lower()])
    text = _COMPOUND_NUM_RE.sub(_compound, text)

    # Einfache Zahlwörter (längere zuerst, damit "fünfzehn" vor "fünf" greift)
    for word in sorted(_SIMPLE_NUM_WORDS, key=len, reverse=True):
        text = re.sub(rf'\b{word}\b', _SIMPLE_NUM_WORDS[word], text, flags=re.IGNORECASE)

    # Wort-Dezimale: "2 Komma 5" → "2,5" (nach der Zahlwort-Ersetzung)
    text = re.sub(r'\b(\d+)\s+[Kk]omma\s+(\d+)\b', r'\1,\2', text)
    return text


# ─── Phase C: Normalisierung ──────────────────────────────────────────────────

def parse_free_text(text: str, language: str = "de") -> ParsedInput:
    """
    Hauptfunktion Phase A–E: Freitext → ParsedInput.
    Deterministische Rule-Based Pipeline.
    """
    text = _translate_number_words(text)

    pi = ParsedInput(text=text, language=language)

    # A) Record-Typ
    pi.record_type = detect_record_type(text)

    # B/C) Material
    pi.material_label, pi.material_canonical_name = extract_material_label(text)
    pi.material_category = detect_material_category(text)

    # B/C) Standort
    m = LOCATION_PATTERN.search(text)
    if m:
        pi.location = m.group(1).strip().rstrip(".,")
    else:
        m = LOCATION_PATTERN_PLAIN.search(text)
        if m:
            pi.location = m.group(1).strip()

    # B/C) LoW-Code
    m = LOW_CODE_PATTERN.search(text)
    if m:
        pi.low_code = m.group(1)

    # B/C) Normen
    for m in STANDARD_PATTERN.finditer(text):
        pi.standards.append(f"{m.group(1).upper()} {m.group(2).upper()}")

    # B/C) quantity.basis (Bezugsbasis der Mengenangabe)
    for pattern, basis in BASIS_PATTERNS:
        if pattern.search(text):
            pi.quantity_basis = basis
            break

    # B/C) quantity.availability + quantity.frequency
    for pattern, availability in AVAILABILITY_PATTERNS:
        if pattern.search(text):
            pi.quantity_availability = availability
            break
    if pi.quantity_availability == "recurring":
        for pattern, freq in FREQUENCY_PATTERNS:
            if pattern.search(text):
                pi.quantity_frequency = freq
                break

    # B/C) context.market_region (mehrere moeglich, Duplikate vermeiden)
    for pattern, region in MARKET_REGION_PATTERNS:
        if pattern.search(text) and region not in pi.market_region:
            pi.market_region.append(region)

    # B/C) context.intended_use
    m = INTENDED_USE_PATTERN.search(text)
    if m:
        pi.intended_use = m.group(1).strip()

    # B/C) safety_compliance[].regime (mehrere moeglich)
    for pattern, regime in COMPLIANCE_PATTERNS:
        if pattern.search(text) and regime not in pi.safety_compliance:
            pi.safety_compliance.append(regime)

    # B/C) material.normalized.synonyms: weitere KNOWN_MATERIALS-Eintraege, die
    # ebenfalls im Text vorkommen und nicht das gewaehlte Label sind. Nur
    # woertliche Treffer - keine erfundenen Synonyme.
    if pi.material_label:
        label_lower = pi.material_label.lower()
        for mat in KNOWN_MATERIALS:
            mat_lower = mat.lower()
            if mat_lower == label_lower or mat_lower == (pi.material_canonical_name or "").lower():
                continue
            pat = r'(?<![a-zA-ZäöüÄÖÜß])' + re.escape(mat_lower) + r'(?![a-zA-ZäöüÄÖÜß])'
            if re.search(pat, text, re.IGNORECASE) and mat not in pi.material_synonyms:
                pi.material_synonyms.append(mat)

    # B/C) Range-Properties
    used_spans: set[tuple[int, int]] = set()
    for m in RANGE_PATTERN.finditer(text):
        key_raw, v_min, v_max, unit_raw = m.group(1), m.group(2), m.group(3), m.group(4)
        prop_key = resolve_property_key(key_raw)
        # Manche Keyword-Alias-Ziele (z. B. "korngröße" -> particle_size_max)
        # erlauben laut Property-Katalog KEIN op="range" (nur "max"). Bei einer
        # erkannten Spanne (RANGE_PATTERN) auf das Range-faehige Gegenstueck
        # ausweichen, damit property_key/op zueinander passen (sonst E213).
        prop_key = _RANGE_KEY_REMAP.get(prop_key, prop_key)
        unit = normalize_unit(unit_raw)
        if prop_key and unit:
            try:
                slot = ExtractedSlot(
                    property_key=prop_key,
                    value=normalize_number(v_min),
                    unit_ucum=unit,
                    op="range",
                    evidence=[EvidenceItem(quote=m.group(0), start=m.start(), end=m.end())],
                    range_max=normalize_number(v_max),
                )
                pi.slots.append(slot)
                used_spans.add((m.start(), m.end()))
            except ValueError:
                pass

    # B/C) Quantity und Properties
    qty_extracted = False

    def process_prop_match(m, op_raw_idx=2, val_idx=3, unit_idx=4):
        """Verarbeitet einen PROPERTY_PATTERN-Match zu einem ExtractedSlot oder Quantity."""
        nonlocal qty_extracted
        key_raw  = m.group(1)
        op_raw   = m.group(op_raw_idx)
        val_raw  = m.group(val_idx)
        unit_raw = m.group(unit_idx)

        unit = normalize_unit(unit_raw)
        if unit is None:
            return

        try:
            value = normalize_number(val_raw)
        except ValueError:
            return

        op = normalize_operator(op_raw) if op_raw else "max"
        # Bereinige Keyword um trailing Leerzeichen und op-Reste
        key_clean = key_raw.strip()
        prop_key = resolve_property_key(key_clean)

        evidence = [EvidenceItem(quote=m.group(0), start=m.start(), end=m.end())]

        # Quantity erkennen: unit in Mengen-Units und kein Property-Key
        if unit in QUANTITY_UNITS and not prop_key and not qty_extracted:
            pi.quantity_value = value
            pi.quantity_unit = unit
            pi.quantity_evidence = evidence
            qty_extracted = True
            used_spans.add((m.start(), m.end()))
            return

        if prop_key:
            pi.slots.append(ExtractedSlot(
                property_key=prop_key,
                value=value,
                unit_ucum=unit,
                op=op,
                evidence=evidence
            ))
            used_spans.add((m.start(), m.end()))
        elif unit in QUANTITY_UNITS and not qty_extracted:
            pi.quantity_value = value
            pi.quantity_unit = unit
            pi.quantity_evidence = evidence
            qty_extracted = True
            used_spans.add((m.start(), m.end()))
        # Fallback: % + op ohne erkanntes Keyword → purity (häufigster Fall)
        elif unit == "%" and op_raw:
            pi.slots.append(ExtractedSlot(
                property_key="purity",
                value=value,
                unit_ucum=unit,
                op=op,
                evidence=evidence
            ))
            used_spans.add((m.start(), m.end()))

    # Adj-op VOR Keyword (z. B. "maximale Feuchte: 0,3 %")
    for m in PROPERTY_PATTERN_ADJ_OP.finditer(text):
        if any(s <= m.start() and m.end() <= e for s, e in used_spans):
            continue
        adj_op_raw = m.group(1)
        key_raw    = m.group(2)
        val_raw    = m.group(3)
        unit_raw   = m.group(4)
        unit = normalize_unit(unit_raw)
        if unit is None:
            continue
        try:
            value = normalize_number(val_raw)
        except ValueError:
            continue
        op = normalize_operator(adj_op_raw)
        prop_key = resolve_property_key(key_raw.strip())
        evidence = [EvidenceItem(quote=m.group(0), start=m.start(), end=m.end())]
        if prop_key:
            pi.slots.append(ExtractedSlot(
                property_key=prop_key, value=value, unit_ucum=unit, op=op,
                evidence=evidence
            ))
            used_spans.add((m.start(), m.end()))
        elif unit in QUANTITY_UNITS and not qty_extracted:
            pi.quantity_value = value
            pi.quantity_unit = unit
            pi.quantity_evidence = evidence
            qty_extracted = True
            used_spans.add((m.start(), m.end()))

    for m in PROPERTY_PATTERN.finditer(text):
        if any(s <= m.start() and m.end() <= e for s, e in used_spans):
            continue
        process_prop_match(m, op_raw_idx=2, val_idx=3, unit_idx=4)

    # Fallback: Pattern ohne expliziten Operator
    for m in PROPERTY_PATTERN_NO_OP.finditer(text):
        if any(s <= m.start() and m.end() <= e for s, e in used_spans):
            continue
        key_raw  = m.group(1)
        val_raw  = m.group(2)
        unit_raw = m.group(3)
        unit = normalize_unit(unit_raw)
        if unit is None:
            continue
        try:
            value = normalize_number(val_raw)
        except ValueError:
            continue
        prop_key = resolve_property_key(key_raw.strip())
        if prop_key:
            evidence = [EvidenceItem(quote=m.group(0), start=m.start(), end=m.end())]
            pi.slots.append(ExtractedSlot(
                property_key=prop_key, value=value, unit_ucum=unit, op="equals",
                evidence=evidence
            ))
            used_spans.add((m.start(), m.end()))
        elif unit in QUANTITY_UNITS and not qty_extracted:
            pi.quantity_value = value
            pi.quantity_unit = unit
            pi.quantity_evidence = [EvidenceItem(quote=m.group(0), start=m.start(), end=m.end())]
            qty_extracted = True
            used_spans.add((m.start(), m.end()))

    # Fallback: Quantity direkt via QUANTITY_PATTERN
    if not qty_extracted:
        for m in QUANTITY_PATTERN.finditer(text):
            unit = normalize_unit(m.group(2))
            if unit in QUANTITY_UNITS:
                try:
                    pi.quantity_value = normalize_number(m.group(1))
                    pi.quantity_unit = unit
                    pi.quantity_evidence = [EvidenceItem(
                        quote=m.group(0), start=m.start(), end=m.end()
                    )]
                    qty_extracted = True
                    break
                except ValueError:
                    pass

    # Letzter Fallback: strukturfreie Proximity-Extraktion für alle noch nicht
    # erfassten (Zahl, Einheit)-Paare im Text
    qty_extracted = _extract_by_proximity(text, used_spans, pi, qty_extracted)

    # E) Messmethode / Normreferenz je Slot: nur zuordnen, wenn sie im SELBEN
    # Satz-Segment stehen wie der Slot (sonst wuerde eine Norm am Satzende
    # faelschlich allen Eigenschaften zugeordnet).
    _assign_method_and_standard_ref(text, pi)

    return pi


def _assign_method_and_standard_ref(text: str, pi: "ParsedInput") -> None:
    """
    Ordnet properties/constraints[].method (Messverfahren) und .standard_ref
    (Normreferenz) zu - segmentweise anhand der Evidence-Offsets, damit eine
    Angabe nur die Eigenschaft im selben Satzteil betrifft.
    """
    for slot in pi.slots:
        if not slot.evidence:
            continue
        start = slot.evidence[0].start
        end = slot.evidence[0].end

        seg_start = max(
            text.rfind(',', 0, start), text.rfind(';', 0, start),
            text.rfind('.', 0, start), 0,
        )
        seg_end_candidates = [text.find(c, end) for c in (',', ';', '.') if text.find(c, end) != -1]
        seg_end = min(seg_end_candidates) if seg_end_candidates else len(text)
        segment = text[seg_start:seg_end]

        if slot.method is None:
            for pattern, method_name in METHOD_PATTERNS:
                if pattern.search(segment):
                    slot.method = method_name
                    break

        if slot.standard_ref is None:
            m = STANDARD_PATTERN.search(segment)
            if m:
                slot.standard_ref = f"{m.group(1).upper()} {m.group(2).upper()}"


# ─── Phase D: Slot Filling → CMRSRecord ─────────────────────────────────────

def build_cmrs_record(
    pi: ParsedInput,
    record_id: Optional[str] = None,
    source: str = "parser_v1",
) -> dict:
    """
    Baut ein CMRSRecord-Dictionary aus ParsedInput.
    Phase D + E (Evidence bereits in ParsedInput enthalten).
    """
    rec_id = record_id or str(uuid.uuid4())

    raw_category = pi.material_category or "other"
    category = _CATEGORY_TO_CMRS.get(raw_category, raw_category)
    if category not in _CMRS_VALID_CATEGORIES:
        category = "other"

    record: dict = {
        "type": pi.record_type or "offer",
        "id": rec_id,
        "raw_input": {
            "text": pi.text,
            "language": pi.language,
        },
        "material": {
            "label_raw": pi.material_label or pi.text[:50],
            "category": category,
        },
        "context": {
            "location": pi.location or "unknown",
        },
        "provenance": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "cmrs_version": "1.1.0",
        },
    }

    # context: optionale Zusatzfelder (nur wenn im Text erkannt)
    if pi.market_region:
        record["context"]["market_region"] = pi.market_region
    if pi.intended_use:
        record["context"]["intended_use"] = pi.intended_use

    # Quantity (Offer: Pflicht; Demand: optional als Constraint)
    if pi.quantity_value is not None and pi.quantity_unit:
        if pi.record_type == "offer":
            record["quantity"] = {
                "value": pi.quantity_value,
                "unit_ucum": pi.quantity_unit,
            }
            if pi.quantity_basis:
                record["quantity"]["basis"] = pi.quantity_basis
            if pi.quantity_availability:
                record["quantity"]["availability"] = pi.quantity_availability
            if pi.quantity_frequency:
                record["quantity"]["frequency"] = pi.quantity_frequency

    # material.normalized: canonical_name (B5) + LoW-Code + Synonyme
    if pi.material_canonical_name or pi.low_code or pi.material_synonyms:
        norm: dict = {}
        if pi.material_canonical_name:
            norm["canonical_name"] = pi.material_canonical_name
        if pi.low_code:
            norm.setdefault("codes", {})["low_code"] = pi.low_code
        if pi.material_synonyms:
            norm["synonyms"] = pi.material_synonyms
        record["material"]["normalized"] = norm

    # safety_compliance (Regime aus dem Text, z. B. REACH/RoHS)
    if pi.safety_compliance:
        record["safety_compliance"] = [{"regime": r} for r in pi.safety_compliance]

    # Normen
    if pi.standards:
        record["standards"] = [{"name": s} for s in pi.standards]

    # Slots → Properties (offer) oder Constraints (demand)
    if pi.record_type == "offer":
        props = []
        for slot in pi.slots:
            entry: dict = {
                "property_key": slot.property_key,
            }
            if slot.op == "range" and slot.range_max is not None:
                entry["min"] = slot.value
                entry["max"] = slot.range_max
            else:
                entry["value"] = slot.value
            if slot.op:
                entry["op"] = slot.op
            if slot.unit_ucum:
                entry["unit_ucum"] = slot.unit_ucum
            if slot.method:
                entry["method"] = slot.method
            if slot.standard_ref:
                entry["standard_ref"] = slot.standard_ref
            if slot.evidence:
                entry["evidence"] = [e.to_dict() for e in slot.evidence]
            props.append(entry)
        if props:
            record["properties"] = props

    else:  # demand
        constraints = []
        # Mengen-Constraint aus quantity
        if pi.quantity_value is not None and pi.quantity_unit:
            qty_c: dict = {
                "property_key": "quantity",
                "op": "min",
                "value": pi.quantity_value,
                "unit_ucum": pi.quantity_unit,
            }
            if pi.quantity_evidence:
                qty_c["evidence"] = [e.to_dict() for e in pi.quantity_evidence]
            constraints.append(qty_c)
        for slot in pi.slots:
            c: dict = {
                "property_key": slot.property_key,
                "op": slot.op or "max",
            }
            if slot.op == "range" and slot.range_max is not None:
                c["min"] = slot.value
                c["max"] = slot.range_max
            else:
                c["value"] = slot.value
            if slot.unit_ucum:
                c["unit_ucum"] = slot.unit_ucum
            if slot.standard_ref:
                c["standard_ref"] = slot.standard_ref
            if slot.evidence:
                c["evidence"] = [e.to_dict() for e in slot.evidence]
            constraints.append(c)
        if constraints:
            record["constraints"] = constraints

    return record


# ─── Öffentliche API ──────────────────────────────────────────────────────────

def resolve_canonical_name(label_raw: str) -> Optional[str]:
    """
    Leitet den kontrollierten canonical_name aus einer Materialbezeichnung ab -
    dieselbe Fuzzy-Matching-Logik gegen KNOWN_MATERIALS wie bei der Extraktion.

    Wird gebraucht, wenn ein Nutzer material.label_raw im Formular korrigiert:
    der zuvor ermittelte canonical_name gehoert dann evtl. zu einem ganz
    anderen Material und muss neu abgeleitet werden.

    Rueckgabe: kontrollierter Name bei Vokabular-Treffer, sonst None
    (dann gibt es keine belegbare Normalisierung fuer diese Bezeichnung).
    """
    if not label_raw or not isinstance(label_raw, str):
        return None
    _, canonical = extract_material_label(label_raw)
    return canonical


def map_free_text_to_cmrs(
    text: str,
    language: str = "de",
    record_id: Optional[str] = None,
    source: str = "parser_v1",
) -> dict:
    """
    Hauptfunktion: Freitext → CMRS v1.1 JSON-Dict.

    Gibt ein dict zurück, das direkt serialisiert werden kann.
    """
    pi = parse_free_text(text, language)
    return build_cmrs_record(pi, record_id=record_id, source=source)


if __name__ == "__main__":
    # Quick-Demo
    tests = [
        "500 kg PP-Regranulat, Feuchte max 0,3 %, Berlin.",
        "Aluminiumspäne, 2 t, Ölanteil max 1 %, Standort Dortmund.",
        "Suche PP-Granulat, mind. 300 kg, Feuchte max 0,5 %, Berlin/Brandenburg.",
        "Ethanol, 200 L, Reinheit min 90 %, Flammpunkt > 15°C, Köln.",
    ]
    for i, t in enumerate(tests, 1):
        rec = map_free_text_to_cmrs(t, record_id=f"TEST-{i:03d}")
        print(f"\n=== TEST-{i:03d} ===")
        print(json.dumps(rec, ensure_ascii=False, indent=2))
