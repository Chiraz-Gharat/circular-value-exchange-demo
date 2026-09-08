"""
D3 – Kontrollierte Vokabulare CMRS v1.1
========================================
Units (UCUM Whitelist), Operatoren, Materialkategorien, Property-Katalog,
Compliance-Regimes – aus RQ1_CMRS_Spezifikationspaket_v1_1.docx.
"""

from typing import Optional

# ─── UCUM Whitelist (aus Spezifikation, Kapitel 4.1) ──────────────────────────
UCUM_WHITELIST: dict[str, str] = {
    "kg":        "Kilogramm (Masse)",
    "t":         "Tonne (Masse)",
    "g":         "Gramm (Masse)",
    "L":         "Liter (Volumen)",
    "m3":        "Kubikmeter (Volumen)",
    "%":         "Prozent (Anteil)",
    "Cel":       "Grad Celsius (Temperatur)",
    "mm":        "Millimeter (Länge/Partikel)",
    "um":        "Mikrometer (Länge/Partikel)",
    "mg/kg":     "Milligramm pro Kilogramm (Konzentration)",
    "MPa":       "Megapascal (Spannung)",
    "kJ/kg":     "Kilojoule pro Kilogramm (Energie)",
    "MJ/kg":     "Megajoule pro Kilogramm (Energie)",
    "g/(10.min)": "Gramm pro 10 Minuten (MFI/MFR)",
    "kg/m3":     "Kilogramm pro Kubikmeter (Dichte)",
}

# Mengen-Units (für R17: Demand-Mengen-Constraint)
QUANTITY_UNITS = {"kg", "t", "g", "L", "m3"}

# ─── Operatoren ───────────────────────────────────────────────────────────────
OPERATORS: dict[str, str] = {
    "min":    "mindestens (value erforderlich)",
    "max":    "höchstens (value erforderlich)",
    "range":  "zwischen (min und max erforderlich; min <= max)",
    "equals": "genau (value erforderlich)",
}

# ─── Materialkategorien (aus Spezifikation, Kapitel 4.3) ──────────────────────
MATERIAL_CATEGORIES: dict[str, dict] = {
    "polymer":            {"label": "Kunststoffe/Rezyklate",  "examples": ["PP-Regranulat", "PS", "PET-Flakes"]},
    "metal":              {"label": "Metalle/Schrott/Späne",  "examples": ["Aluminiumspäne", "Kupferschrott"]},
    "solvent":            {"label": "Lösemittel/chem. Ströme","examples": ["Ethanol", "Lösemittelgemisch"]},
    "biomass":            {"label": "Biomasse/Reststoffe",    "examples": ["Holzhackschnitzel", "Holzreste"]},
    "glass":              {"label": "Glas/Altglas",           "examples": ["Glasscherben", "Altglas"]},
    "paper":              {"label": "Papier/Pappe/Karton",    "examples": ["Altpapier", "Wellpappe"]},
    "rubber":             {"label": "Gummi/Elastomere",       "examples": ["Gummigranulat", "Altreifen"]},
    "textile":            {"label": "Textilien/Fasern",       "examples": ["Alttextilien", "Vlies"]},
    "construction_waste": {"label": "Baurestmassen",          "examples": ["Beton", "Bauschutt"]},
    "food_waste":         {"label": "Biologische Abfälle",    "examples": ["Speisereste", "Grünschnitt"]},
    "waste_stream":       {"label": "Abfallstrom (kodierbar)","examples": ["Lösemittelabfall", "Schleifschlamm"]},
    "by_product":         {"label": "Nebenprodukt",           "examples": ["Gips aus Prozess", "Prozessstaub"]},
    "article":            {"label": "Erzeugnis/Produkt",      "examples": ["Bauteil", "Verpackung"]},
    "other":              {"label": "Sonstiges",              "examples": []},
}

# ─── Property-Katalog (aus Spezifikation, Kapitel 4.4) ────────────────────────
# Format: key -> {definition, units, ops, categories}
PROPERTY_CATALOG: dict[str, dict] = {
    # Allgemein
    "purity":                  {"de": "Reinheit",               "units": ["%"],           "ops": ["min","max","range"],  "cats": ["polymer","metal","solvent"]},
    "moisture_content":        {"de": "Feuchte/Wassergehalt",   "units": ["%"],           "ops": ["min","max","range"],  "cats": ["polymer","biomass"]},
    "foreign_matter_content":  {"de": "Fremdstoffanteil",       "units": ["%"],           "ops": ["max"],               "cats": ["polymer","metal","biomass"]},
    "contamination_rate":      {"de": "Gesamtverunreinigung",   "units": ["%"],           "ops": ["max"],               "cats": ["polymer","metal"]},
    "color_description":       {"de": "Farbe (Text)",           "units": [],              "ops": ["equals"],            "cats": ["polymer"]},
    "odor_description":        {"de": "Geruch (Text)",          "units": [],              "ops": ["equals"],            "cats": ["biomass","solvent"]},
    # Polymer spezifisch
    "melt_flow_index":         {"de": "Schmelzflussindex (MFI/MFR)", "units": ["g/(10.min)"], "ops": ["range","equals"], "cats": ["polymer"]},
    "density":                 {"de": "Dichte",                 "units": ["kg/m3"],       "ops": ["range","equals"],    "cats": ["polymer"]},
    "ash_content":             {"de": "Aschegehalt",            "units": ["%"],           "ops": ["max","range"],       "cats": ["polymer","biomass"]},
    "tensile_strength":        {"de": "Zugfestigkeit",          "units": ["MPa"],         "ops": ["min","range"],       "cats": ["polymer"]},
    "elongation_at_break":     {"de": "Bruchdehnung",           "units": ["%"],           "ops": ["min","range"],       "cats": ["polymer"]},
    "impact_strength":         {"de": "Schlagzähigkeit",        "units": [],              "ops": ["min","range"],       "cats": ["polymer"]},
    "recycled_content":        {"de": "Rezyklatanteil",         "units": ["%"],           "ops": ["min","range"],       "cats": ["polymer"]},
    "bio_based_content":       {"de": "Biobasierter Anteil",    "units": ["%"],           "ops": ["min","range"],       "cats": ["polymer","biomass"]},
    # Metall spezifisch
    "oil_content":             {"de": "Öl-/Schmierstoffanteil", "units": ["%"],           "ops": ["max"],               "cats": ["metal"]},
    "chlorine_content":        {"de": "Chlorgehalt",            "units": ["mg/kg"],       "ops": ["max","range"],       "cats": ["polymer","metal"]},
    "sulfur_content":          {"de": "Schwefelgehalt",         "units": ["mg/kg"],       "ops": ["max","range"],       "cats": ["metal"]},
    "iron_content":            {"de": "Eisenanteil (Fe)",       "units": ["%"],           "ops": ["min","range"],       "cats": ["metal"]},
    "aluminum_content":        {"de": "Aluminiumanteil (Al)",   "units": ["%"],           "ops": ["min","range"],       "cats": ["metal"]},
    "copper_content":          {"de": "Kupferanteil (Cu)",      "units": ["%"],           "ops": ["min","range"],       "cats": ["metal"]},
    "zinc_content":            {"de": "Zinkanteil (Zn)",        "units": ["%"],           "ops": ["max","range"],       "cats": ["metal"]},
    "nickel_content":          {"de": "Nickelanteil (Ni)",      "units": ["%"],           "ops": ["max","range"],       "cats": ["metal"]},
    # Schwermetalle (alle Kategorien)
    "lead_content":            {"de": "Blei (Pb)",              "units": ["mg/kg"],       "ops": ["max"],               "cats": ["all"]},
    "cadmium_content":         {"de": "Cadmium (Cd)",           "units": ["mg/kg"],       "ops": ["max"],               "cats": ["all"]},
    "mercury_content":         {"de": "Quecksilber (Hg)",       "units": ["mg/kg"],       "ops": ["max"],               "cats": ["all"]},
    "chromium_content":        {"de": "Chrom (Cr)",             "units": ["mg/kg"],       "ops": ["max"],               "cats": ["all"]},
    "arsenic_content":         {"de": "Arsen (As)",             "units": ["mg/kg"],       "ops": ["max"],               "cats": ["all"]},
    # Partikel / Schüttgut
    "particle_size_max":       {"de": "max. Partikelgröße",     "units": ["mm"],          "ops": ["max"],               "cats": ["polymer","biomass","metal"]},
    "particle_size_range":     {"de": "Partikelgröße (Spanne, allgemein)", "units": ["mm","um"], "ops": ["range"],       "cats": ["polymer","biomass","metal"]},
    "particle_size_d50":       {"de": "Partikelgröße d50 (Median der Verteilung)", "units": ["mm","um"], "ops": ["range","equals"], "cats": ["polymer","biomass"]},
    "bulk_density":            {"de": "Schüttdichte",           "units": ["kg/m3"],       "ops": ["range"],             "cats": ["polymer","biomass","metal"]},
    # Lösemittel
    "solvent_fraction":        {"de": "Lösemittelanteil",       "units": ["%"],           "ops": ["min","range"],       "cats": ["solvent"]},
    "water_content":           {"de": "Wasseranteil",           "units": ["%"],           "ops": ["max"],               "cats": ["solvent"]},
    "flash_point":             {"de": "Flammpunkt",             "units": ["Cel"],         "ops": ["min"],               "cats": ["solvent"]},
    "boiling_point_min":       {"de": "Siedepunkt (min)",       "units": ["Cel"],         "ops": ["min"],               "cats": ["solvent"]},
    "boiling_point_max":       {"de": "Siedepunkt (max)",       "units": ["Cel"],         "ops": ["max"],               "cats": ["solvent"]},
    "voc_content":             {"de": "VOC-Gehalt",             "units": ["%"],           "ops": ["max"],               "cats": ["solvent"]},
    # Biomasse
    "calorific_value_lhv":     {"de": "Heizwert (LHV)",         "units": ["MJ/kg","kJ/kg"], "ops": ["min","range"],    "cats": ["biomass"]},
    "biomass_type":            {"de": "Biomasse-Typ",           "units": [],              "ops": ["equals"],            "cats": ["biomass"]},
    "resin_content":           {"de": "Harzanteil",             "units": ["%"],           "ops": ["max","range"],       "cats": ["biomass"]},
    "ash_melting_behavior":    {"de": "Ascheschmelzverhalten",  "units": [],              "ops": ["equals"],            "cats": ["biomass"]},
    # Speziell für Demand-Mengen-Constraints
    "quantity":                {"de": "Menge",                  "units": ["kg","t","g","L","m3"], "ops": ["min","max","range","equals"], "cats": ["all"]},
}

# ─── Compliance-Regimes ───────────────────────────────────────────────────────
COMPLIANCE_REGIMES: dict[str, str] = {
    "REACH": "EU-Chemikalienverordnung (EG) Nr. 1907/2006",
    "SCIP":  "Substances of Concern in Products (ECHA-Datenbank)",
    "RoHS":  "Restriction of Hazardous Substances Directive 2011/65/EU",
    "CLP":   "Classification, Labelling and Packaging Regulation (EG) Nr. 1272/2008",
    "WEEE":  "Waste Electrical and Electronic Equipment Directive 2012/19/EU",
    "WFD":   "Waste Framework Directive 2008/98/EC",
    "other": "Sonstiges Regulierungsregime",
}

# ─── Normative Quellen der Vokabulare (wissenschaftliche Belegbarkeit) ────────
# Jeder Baustein der kontrollierten Vokabulare ist auf eine zitierfähige,
# öffentlich abrufbare Primärquelle rückführbar:
VOCABULARY_SOURCES: dict[str, str] = {
    "units":       "UCUM – Unified Code for Units of Measure (Schadow & McDonald), "
                   "https://ucum.org / https://unitsofmeasure.org",
    "low_codes":   "Europäisches Abfallverzeichnis (List of Waste / EWC), "
                   "Entscheidung 2000/532/EG i. d. F. 2014/955/EU, EUR-Lex",
    "waste_law":   "Abfallrahmenrichtlinie 2008/98/EG (Waste Framework Directive), EUR-Lex",
    "compliance":  "REACH (EG) 1907/2006; CLP (EG) 1272/2008; RoHS 2011/65/EU; "
                   "WEEE 2012/19/EU – alle EUR-Lex",
    "recycled_plastics": "DIN SPEC 91446:2021 (Klassifizierung von Kunststoff-Rezyklaten "
                   "durch Datenqualitätslevels) und DIN EN 15347 (Charakterisierung von "
                   "Kunststoffabfällen)",
    "provenance":  "W3C PROV-DM (2013), W3C Recommendation - kostenlos: w3.org/TR/prov-dm/",
    "schema":      "JSON Schema Draft 2020-12 - kostenlos: json-schema.org",
    "unit_names_de": "Gesetz ueber Einheiten im Messwesen und die Zeitbestimmung (EinhZeitG) - "
                   "kostenlos: gesetze-im-internet.de/me_einhg/",
    "material_terms_polymer": "Wikipedia 'Kurzzeichen (Kunststoff)' (kostenlos, referenziert "
                   "ISO 1043-1) + ISO Online Browsing Platform zu ISO 472 (Begriffe kostenlos "
                   "einsehbar: iso.org/obp/ui)",
    "material_terms_metal_steel": "BDSV Europaeische Stahlschrottsortenliste - kostenlos als "
                   "PDF: bdsv.org",
    "material_terms_metal_aluminium": "EU Joint Research Centre JRC58527 'End-of-waste "
                   "Criteria for Aluminium and Aluminium Alloy Scrap' - kostenlos: "
                   "publications.jrc.ec.europa.eu",
    "material_terms_solvent": "GESTIS-Stoffdatenbank der DGUV - komplett kostenlos: "
                   "gestis.dguv.de",
    "material_terms_biomass": "FNR (Fachagentur Nachwachsende Rohstoffe, BMEL-Bundesbehoerde) "
                   "- kostenlose Broschueren: fnr.de",
    "material_terms_paper": "CEPI (Verband der europaeischen Papierindustrie) - kostenloses "
                   "Info-PDF zu EN 643: cepi.org",
    "no_norm_identified": "Fuer Glas-, Gummi-, Textil- und Bioabfall-Bezeichnungen sowie "
                   "Kupfer/Messing/Zink/Nickel-Schrottnamen wurde KEINE kostenlose normative "
                   "Sortenliste identifiziert; diese Begriffe folgen allgemeinem deutschen "
                   "Branchen-Sprachgebrauch ohne Norm-Zitat. Siehe MATERIAL_VOCABULARY_SOURCES "
                   "fuer die Aufschluesselung je Materialgruppe.",
}

# Messmethoden-Normen je Property-Key (standard_ref-Vorbelegung).
PROPERTY_STANDARDS: dict[str, str] = {
    "moisture_content":       "DIN EN ISO 15512 (Kunststoffe – Wassergehalt); "
                              "ISO 18134 (biogene Festbrennstoffe)",
    "melt_flow_index":        "DIN EN ISO 1133-1 (MFR/MVR)",
    "density":                "DIN EN ISO 1183-1 (Dichte von Kunststoffen)",
    "ash_content":            "DIN EN ISO 3451-1 (Kunststoffe – Asche); "
                              "ISO 18122 (biogene Festbrennstoffe)",
    "tensile_strength":       "DIN EN ISO 527-1/-2 (Zugeigenschaften)",
    "elongation_at_break":    "DIN EN ISO 527-1/-2 (Zugeigenschaften)",
    "impact_strength":        "DIN EN ISO 179-1 (Charpy-Schlagzähigkeit)",
    "recycled_content":       "DIN EN 15343 (Rückverfolgbarkeit und Rezyklatgehalt)",
    "bio_based_content":      "DIN EN 16785-1 / ASTM D6866 (biobasierter Anteil)",
    "chlorine_content":       "DIN EN 15408 (Sekundärbrennstoffe – Cl/S/N)",
    "sulfur_content":         "DIN EN 15408 (Sekundärbrennstoffe – Cl/S/N)",
    "iron_content":           "DIN EN ISO 11885 (ICP-OES Elementanalytik)",
    "aluminum_content":       "DIN EN ISO 11885 (ICP-OES Elementanalytik)",
    "copper_content":         "DIN EN ISO 11885 (ICP-OES Elementanalytik)",
    "zinc_content":           "DIN EN ISO 11885 (ICP-OES Elementanalytik)",
    "nickel_content":         "DIN EN ISO 11885 (ICP-OES Elementanalytik)",
    "lead_content":           "DIN EN ISO 17294-2 (ICP-MS); Grenzwert-Anker: RoHS 2011/65/EU",
    "cadmium_content":        "DIN EN ISO 17294-2 (ICP-MS); Grenzwert-Anker: RoHS 2011/65/EU",
    "mercury_content":        "DIN EN ISO 17294-2 (ICP-MS); Grenzwert-Anker: RoHS 2011/65/EU",
    "chromium_content":       "DIN EN ISO 17294-2 (ICP-MS)",
    "arsenic_content":        "DIN EN ISO 17294-2 (ICP-MS)",
    "particle_size_max":      "DIN 66165 (Siebanalyse) / ISO 13320 (Laserbeugung)",
    "particle_size_range":    "DIN 66165 (Siebanalyse) / ISO 13320 (Laserbeugung)",
    "particle_size_d50":      "ISO 13320 (Laserbeugung, d50)",
    "bulk_density":           "DIN EN ISO 60 (Kunststoffe – Schüttdichte); "
                              "ISO 17828 (biogene Festbrennstoffe)",
    "water_content":          "DIN 51777 / Karl-Fischer-Titration (ISO 760)",
    "flash_point":            "DIN EN ISO 2719 (Pensky-Martens, geschlossener Tiegel)",
    "boiling_point_min":      "ASTM D86 / DIN EN ISO 3405 (Destillationsbereich)",
    "boiling_point_max":      "ASTM D86 / DIN EN ISO 3405 (Destillationsbereich)",
    "voc_content":            "DIN EN ISO 11890 (VOC-Gehalt)",
    "calorific_value_lhv":    "DIN EN ISO 18125 (biogene Festbrennstoffe – Heizwert)",
}


def get_property_standard(key: str) -> Optional[str]:
    """Zitierfähige Messnorm-Referenz für einen Property-Key (falls definiert)."""
    return PROPERTY_STANDARDS.get(key)


# ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
def is_valid_ucum(code: str) -> bool:
    return code in UCUM_WHITELIST

def is_valid_property_key(key: str) -> bool:
    return key in PROPERTY_CATALOG

def is_valid_category(cat: str) -> bool:
    return cat in MATERIAL_CATEGORIES

def is_valid_operator(op: str) -> bool:
    return op in OPERATORS

def is_valid_regime(regime: str) -> bool:
    return regime in COMPLIANCE_REGIMES

def get_property_info(key: str) -> Optional[dict]:
    return PROPERTY_CATALOG.get(key)

# ─── Deutsche Keyword-Aliases für Mapping ─────────────────────────────────────
# Quelle der Fachbegriffe: DIN EN ISO 472 (Kunststoffe - Fachwoerterverzeichnis,
# dreisprachig DE/EN/FR) fuer kunststoffspezifische Begriffe (z. B. Feuchte,
# Reinheit im Sinne der Materialpruefung). Fuer branchenuebergreifende
# Begriffe (z. B. Oelanteil bei Metallschrott) wurde KEINE einzelne
# normative Fachwoerterliste identifiziert - allgemeiner technischer
# deutscher Sprachgebrauch, kein Norm-Zitat vorhanden.
PROPERTY_ALIASES_DE: dict[str, str] = {
    "feuchte": "moisture_content",
    "feuchtigkeit": "moisture_content",
    "feuchtegehalt": "moisture_content",
    "wassergehalt": "moisture_content",
    "reinheit": "purity",
    "purity": "purity",
    "ölanteil": "oil_content",
    "oelanteil": "oil_content",
    "ölgehalt": "oil_content",
    "oelgehalt": "oil_content",
    "öl": "oil_content",
    "fremdstoffe": "foreign_matter_content",
    "fremdstoffanteil": "foreign_matter_content",
    "verunreinigung": "contamination_rate",
    "rost": "contamination_rate",
    "farbe": "color_description",
    "geruch": "odor_description",
    "mfi": "melt_flow_index",
    "mfr": "melt_flow_index",
    "schmelzflussindex": "melt_flow_index",
    "dichte": "density",
    "asche": "ash_content",
    "aschegehalt": "ash_content",
    "zugfestigkeit": "tensile_strength",
    "bruchdehnung": "elongation_at_break",
    "schlagzähigkeit": "impact_strength",
    "rezyklatanteil": "recycled_content",
    "recycled_content": "recycled_content",
    "biobasiert": "bio_based_content",
    "chlor": "chlorine_content",
    "chlorgehalt": "chlorine_content",
    "schwefel": "sulfur_content",
    "schwefelgehalt": "sulfur_content",
    "eisen": "iron_content",
    "fe": "iron_content",
    "aluminium": "aluminum_content",
    "al": "aluminum_content",
    "kupfer": "copper_content",
    "cu": "copper_content",
    "zink": "zinc_content",
    "zn": "zinc_content",
    "nickel": "nickel_content",
    "ni": "nickel_content",
    "blei": "lead_content",
    "pb": "lead_content",
    "cadmium": "cadmium_content",
    "cd": "cadmium_content",
    "quecksilber": "mercury_content",
    "hg": "mercury_content",
    "chrom": "chromium_content",
    "cr": "chromium_content",
    "arsen": "arsenic_content",
    "as": "arsenic_content",
    "partikelgröße": "particle_size_max",
    "partikel": "particle_size_max",
    "d50": "particle_size_d50",
    "schüttdichte": "bulk_density",
    "lösemittelanteil": "solvent_fraction",
    "wasser": "water_content",
    "flammpunkt": "flash_point",
    "flash point": "flash_point",
    "siedepunkt": "boiling_point_min",
    "voc": "voc_content",
    "heizwert": "calorific_value_lhv",
    "lhv": "calorific_value_lhv",
    "harz": "resin_content",
    "harzanteil": "resin_content",
    "ascheschmelzverhalten": "ash_melting_behavior",
    # Feuchte-Synonyme
    "restfeuchte":           "moisture_content",
    "wasseranteil":          "moisture_content",
    # Reinheit/Konzentration
    "reinheitsgrad":         "purity",
    "reingehalt":            "purity",
    "konzentration":         "purity",
    "gehalt":                "purity",
    # Verunreinigung/Fremdstoffe
    "schmutzanteil":         "contamination_rate",
    "verschmutzung":         "contamination_rate",
    "störstoffe":            "foreign_matter_content",
    "fremdkörper":           "foreign_matter_content",
    "fremdstoff":            "foreign_matter_content",
    # Öl/Fett
    "fettanteil":            "oil_content",
    "fett":                  "oil_content",
    "schmiermittelanteil":   "oil_content",
    "schmieröl":             "oil_content",
    # Partikelgröße
    "korngröße":             "particle_size_max",
    "körnigkeit":            "particle_size_max",
    "mahlgrad":              "particle_size_max",
    "siebgröße":             "particle_size_max",
    "stückgröße":            "particle_size_max",
    "schnittlänge":          "particle_size_max",
    "fragmentgröße":         "particle_size_max",
    "korndurchmesser":       "particle_size_max",
    "maximale korngröße":    "particle_size_max",
    # Schüttdichte
    "schüttgewicht":         "bulk_density",
    "raumgewicht":           "bulk_density",
    # Flammpunkt
    "zündpunkt":             "flash_point",
    "entzündungstemperatur": "flash_point",
    # MFI/Schmelzindex
    "schmelzindex":          "melt_flow_index",
    "fließrate":             "melt_flow_index",
    "melt flow":             "melt_flow_index",
    "melt flow index":       "melt_flow_index",
    "melt flow rate":        "melt_flow_index",
    "schmelzviskosität":     "melt_flow_index",
    # Asche
    "aschanteil":            "ash_content",
    "aschgehalt":            "ash_content",
    "glühverlust":           "ash_content",
    # Heizwert
    "brennwert":             "calorific_value_lhv",
    "energiegehalt":         "calorific_value_lhv",
    "unterer heizwert":      "calorific_value_lhv",
    "hhv":                   "calorific_value_lhv",
    # Dichte
    "rohdichte":             "density",
    "materialdichte":        "density",
    # Rezyklat
    "rezyklatgehalt":        "recycled_content",
    "rezyklat":              "recycled_content",
    "recyclinganteil":       "recycled_content",
    # Chlor/Schwefel
    "cl":                    "chlorine_content",
    "schwefelanteil":        "sulfur_content",
}

# Quelle der deutschen Einheitennamen: zugrundeliegende Norm DIN 1301-1 ist
# kostenpflichtig; rechtlich verankert und KOSTENLOS im Volltext einsehbar ueber
# das Gesetz ueber Einheiten im Messwesen und die Zeitbestimmung (EinhZeitG):
# https://www.gesetze-im-internet.de/me_einhg/BJNR007090969.html
# sowie die PTB-Broschuere "Die gesetzlichen Einheiten in Deutschland":
# https://www.ptb.de/cms/fileadmin/internet/presse_aktuelles/broschueren/intern_einheitensystem/Die_gesetzlichen_Einheiten.pdf
# UCUM-Zielcodes: siehe UCUM_WHITELIST oben (ucum.org, kostenlos).
UNIT_ALIASES_DE: dict[str, str] = {
    "kg": "kg",
    "kilogramm": "kg",
    "t": "t",
    "tonne": "t",
    "tonnen": "t",
    "g": "g",
    "gramm": "g",
    "l": "L",
    "liter": "L",
    "m3": "m3",
    "kubikmeter": "m3",
    "%": "%",
    "prozent": "%",
    "°c": "Cel",
    "grad": "Cel",
    "celsius": "Cel",
    "cel": "Cel",
    "mm": "mm",
    "millimeter": "mm",
    "µm": "um",
    "um": "um",
    "mikrometer": "um",
    "mg/kg": "mg/kg",
    "mpa": "MPa",
    "megapascal": "MPa",
    "mj/kg": "MJ/kg",
    "kj/kg": "kJ/kg",
    "kg/m3": "kg/m3",
    "kg/m³": "kg/m3",
    "g/10min": "g/(10.min)",
    "g/10 min": "g/(10.min)",
    "g/(10min)": "g/(10.min)",
    "g/(10 min)": "g/(10.min)",
    "g/(10.min)": "g/(10.min)",
}

OFFER_KEYWORDS = ["verfügbar", "bieten", "haben wir", "angebot", "verkaufe", "abzugeben", "liefern"]
DEMAND_KEYWORDS = [
    "suche", "benötige", "benötigen", "requirement", "gesucht", "kaufe",
    "nachfrage", "bedarf", "brauchen", "wir brauchen", "wird gesucht",
    "benötigt", "wird benötigt", "suchen wir",
]

# ─── Normquellen der Materialnamen (KNOWN_MATERIALS) ─────────────────────────
# Jede Gruppe unten ist auf eine kostenlos abrufbare, extern pruefbare Quelle
# zurueckgefuehrt (keine bezahlpflichtigen DIN/ISO/EN-Volltexte verlinkt - dort
# stattdessen die zugrundeliegende Norm-Nummer plus eine frei zugaengliche
# Alternativquelle, die denselben Sachverhalt kostenlos dokumentiert).
# Wo keine belastbare/kostenlose Quelle identifiziert wurde, steht das explizit
# dabei (keine erfundene Quelle).
MATERIAL_VOCABULARY_SOURCES: dict[str, str] = {
    "polymer": "Kurzzeichen (PP/PE/PVC/PS/ABS/PA/PC/PMMA/POM) basieren auf ISO 1043-1 / "
               "DIN ISO 1629 / DIN EN ISO 18064 (kostenpflichtig); kostenlos dokumentiert "
               "in Wikipedia 'Kurzzeichen (Kunststoff)': "
               "https://de.wikipedia.org/wiki/Kurzzeichen_(Kunststoff) . "
               "Fachbegriffe (Feuchte, Reinheit...) kostenlos einsehbar (nicht herunterladbar) "
               "in der ISO Online Browsing Platform zu ISO 472: "
               "https://www.iso.org/obp/ui/#iso:std:iso:472:ed-4:v1:de",
    "metal_steel": "BDSV Europaeische Stahlschrottsortenliste - kostenlos als PDF: "
               "https://www.bdsv.org/fileadmin/service/gesetze_und_regelwerke/sortenliste_eu.pdf",
    "metal_aluminium": "Zugrundeliegende Norm DIN EN 13920 ist kostenpflichtig; kostenlose "
               "Alternativquelle mit denselben Schrott-Klassifizierungskriterien: "
               "EU Joint Research Centre, 'End-of-waste Criteria for Aluminium and "
               "Aluminium Alloy Scrap' (JRC58527): "
               "https://publications.jrc.ec.europa.eu/repository/bitstream/JRC58527/jrc58527.pdf",
    "metal_other": "Kein einzelnes normatives Sortenverzeichnis identifiziert (Kupfer/Messing/"
               "Zink/Nickel folgen keiner einheitlichen DIN/EN-Sortenliste wie Stahl/Aluminium); "
               "Branchenbezeichnungen gemaess allgemeinem Metallhandel-Sprachgebrauch.",
    "solvent": "GESTIS-Stoffdatenbank der DGUV - komplett kostenlos durchsuchbar: "
               "https://gestis.dguv.de/",
    "biomass": "Zugrundeliegende Norm ISO 17225 ist kostenpflichtig; kostenlose deutsche "
               "Quelle mit denselben Brennstoffklassen (Hackschnitzel, Pellets) von der "
               "Fachagentur Nachwachsende Rohstoffe (FNR, Bundesanstalt im Geschaeftsbereich "
               "des BMEL): "
               "https://www.fnr.de/fileadmin/allgemein/pdf/broschueren/broschuere_holzpellets_web.pdf",
    "paper":   "Zugrundeliegende Norm EN 643 ist kostenpflichtig; kostenlose Zusammenfassung "
               "vom Verband der europaeischen Papierindustrie (CEPI): "
               "https://www.cepi.org/wp-content/uploads/2021/03/Standard-EN-643-new.pdf",
    "glass":   "Kein spezifisches Sortenverzeichnis fuer Altglas-Bezeichnungen identifiziert; "
               "umgangssprachliche Branchenbegriffe.",
    "rubber":  "Kein spezifisches Sortenverzeichnis identifiziert; umgangssprachliche "
               "Branchenbegriffe (Altreifen-Klassifizierung existiert z. B. ueber ETRMA, "
               "aber nicht als kostenlos verifizierte Quelle uebernommen).",
    "textile": "Kein spezifisches Sortenverzeichnis identifiziert; umgangssprachliche "
               "Branchenbegriffe.",
    "construction_waste": "Europaeisches Abfallverzeichnis (LoW/EWC, Kapitel 17 Bau- und "
               "Abbruchabfaelle) als Kategorien-Anker - kostenlos: EUR-Lex, Entscheidung "
               "2000/532/EG. Einzelbegriffe (Bauschutt, Betonbruch) umgangssprachlich.",
    "food_waste": "Kein spezifisches Sortenverzeichnis identifiziert; umgangssprachliche "
               "Branchenbegriffe.",
    "waste_stream_general": "Europaeisches Abfallverzeichnis (LoW/EWC) als Kategorien-Anker "
               "fuer Klaerschlamm/Schleifschlamm/Filterstaub/Flugasche - kostenlos ueber EUR-Lex.",
}


# ─── Bekannte Materialnamen (für Fuzzy-Label-Extraktion) ──────────────────────
# Kanon von Material-Bezeichnungen, gegen die der Eingabetext per
# Fuzzy-Matching verglichen wird. Längere/spezifischere Einträge bevorzugt.
# Quellen je Gruppe: siehe MATERIAL_VOCABULARY_SOURCES oben.
KNOWN_MATERIALS: list[str] = [
    # ── Kunststoffe / Polymere ── Quelle: DIN EN ISO 1043-1 (Kurzzeichen) ────
    "PP-Regranulat", "PP-Granulat", "PP-Regrind", "PP-Mahlgut", "PP-Flakes",
    "PP-Rezyklat", "Polypropylen-Granulat", "Polypropylen-Regranulat",
    "PE-Regranulat", "PE-Granulat", "PE-Regrind",
    "HDPE-Granulat", "HDPE-Regranulat", "HDPE-Flakes",
    "LDPE-Granulat", "LDPE-Regranulat", "LDPE-Folie",
    "PET-Flakes", "PET-Granulat", "PET-Regranulat", "PET-Regrind", "PET-Folie",
    "PS-Granulat", "PS-Regranulat", "PS-Mahlgut",
    "EPS-Granulat", "EPS-Mahlgut",
    "PVC-Granulat", "PVC-Regranulat", "PVC-Mahlgut",
    "ABS-Granulat", "ABS-Regranulat",
    "PA-Granulat", "PA6-Granulat", "PA66-Granulat", "Polyamid-Granulat",
    "PC-Granulat", "PC-Regranulat",
    "PMMA-Granulat",
    "POM-Granulat",
    "TPE-Granulat", "TPU-Granulat", "TPV-Granulat",
    "Kunststoffgranulat", "Kunststoffregranulat", "Kunststoffregrind",
    "Kunststoffflakes", "Kunststoffmahlgut", "Kunststoffrezyklat",
    "Kunststoffschrott", "Kunststoffabfall",
    # ── Metalle ── Quelle Stahl: BDSV Stahlschrottsortenliste; Quelle Aluminium: ──
    # DIN EN 13920; Kupfer/Messing/Zink/Nickel: keine Norm identifiziert (s. o.)
    "Aluminiumspäne", "Aluminiumschrott", "Aluminiumguss", "Aluminiumdruckguss",
    "Aluminiumprofile", "Aluminiumbleche",
    "Kupferschrott", "Kupferkabel", "Kupferdraht", "Kupferspäne",
    "Kupfergranulat",
    "Stahlschrott", "Stahlspäne", "Edelstahlschrott", "Edelstahlspäne",
    "Stahlbleche",
    "Eisenschrott", "Gusseisenschrott",
    "Messingschrott", "Messingspäne",
    "Zinkschrott", "Zinkdruckguss", "Zinkspäne",
    "Blei", "Bleischrott",
    "Titanschrott", "Titanspäne",
    "Nickelbasis-Schrott",
    "Metallschrott", "NE-Metallschrott", "Buntmetallschrott",
    "Drehspäne", "Frässpäne", "Schleifspäne",
    # ── Lösemittel / Chemikalien ── Quelle: GESTIS-Stoffdatenbank (DGUV) / CAS ──
    "Ethanol", "Ethylalkohol",
    "Methanol", "Methylalkohol",
    "Isopropanol", "Isopropylalkohol",
    "Propanol",
    "Butanol",
    "Aceton",
    "MEK", "Methylethylketon",
    "Toluol",
    "Xylol",
    "Ethylacetat",
    "Butylacetat",
    "Hexan",
    "Dichlormethan",
    "Lösemittelgemisch", "Lösemittelrückstand", "Lösemittelabfall",
    # ── Biomasse ── Quelle: ISO 17225 (Teile 1-7, feste Biobrennstoffe) ──────
    "Holzhackschnitzel", "Hackschnitzel",
    "Holzpellets", "Pellets",
    "Sägespäne", "Sägemehl", "Holzmehl", "Holzstaub",
    "Holzreste", "Altholz", "Holzabfall",
    "Rinde", "Baumrinde",
    "Stroh",
    "Biomasse",
    # ── Glas ── Keine Norm identifiziert (umgangssprachlich, s. o.) ─────────
    "Altglas", "Glasscherben", "Glasbruch", "Glasabfall",
    "Floatglas", "Hohlglas", "Behälterglas", "Flachglas",
    # ── Papier / Pappe ── Quelle: EN 643 (Europ. Altpapier-Standardsorten) ──
    "Altpapier", "Altpapier gemischt",
    "Wellpappe", "Karton", "Pappe",
    "Zeitungspapier", "Büropapier",
    "Papierstaub",
    # ── Gummi / Elastomere ── Keine Norm identifiziert (umgangssprachlich) ──
    "Gummigranulat", "Gummikrümel", "Reifengranulat",
    "Altreifen", "Kautschuk", "Naturkautschuk",
    # ── Textilien ── Keine Norm identifiziert (umgangssprachlich) ───────────
    "Alttextilien", "Textilfasern", "Vlies",
    "Baumwolle", "Wolle",
    # ── Baurestmassen ── Kategorien-Anker: LoW/EWC Kapitel 17 (s. o.) ────────
    "Betonbruch", "Betonschutt",
    "Bauschutt", "Baurestmassen",
    "Asphaltgranulat", "Asphalt",
    "Ziegelbruch",
    "Gipsabfall", "Gipskarton",
    # ── Biologische Abfälle ── Keine Norm identifiziert (umgangssprachlich) ─
    "Grünschnitt", "Grasschnitt",
    "Bioabfall", "Kompost",
    "Speisereste", "Lebensmittelabfall",
    # ── Allgemeine Abfallströme ── Kategorien-Anker: LoW/EWC (s. o.) ────────
    "Klärschlamm", "Schleifschlamm",
    "Filterstaub", "Flugasche",
]
