import type { ScoreWeights } from '../types/model.ts';
export const materialClasses = [
  "Biomasse",
  "Kunststoff",
  "Metall",
  "Glas",
  "Holz",
  "Textil",
  "Sonstige",
];

export const regions = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Hessen",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Sachsen",
  "Schleswig-Holstein",
];


export const weightLabels: Record<keyof ScoreWeights, string> = {
  economics: "Wirtschaftlichkeit",
  ecology: "Ökologie",
  feasibility: "Realisierbarkeit",
  deal: "Deal-Qualität",
};

export const weightDescriptions: Record<keyof ScoreWeights, string> = {
  economics: "Deckungsbeitrag, Erlös, Prozesskosten und Transportkosten",
  ecology: "CO2, Distanz und Ressourceneffizienz",
  feasibility: "Mengenfit, Qualitätsfit, Verfügbarkeit, Reinheitsreserve und Compliance",
  deal: "Preisattraktivität, Partnerverlässlichkeit, Abschlussindex und Deckungsbeitrag",
};

export const materialImages: Record<string, string> = {
  Biomasse: "/materials/biomasse.png",
  Kunststoff: "/materials/kunststoff.png",
  Metall: "/materials/metall.png",
  Glas: "/materials/glas.png",
  Textil: "/materials/textil.png",
  Holz: "/materials/biomasse.png",
  Sonstige: "/materials/kunststoff.png",
};

export const cmrsCategoryLabels: Record<string, string> = {
  polymer: "Kunststoffe/Rezyklate",
  metal: "Metalle/Schrott/Späne",
  solvent: "Lösemittel/chemische Ströme",
  biomass: "Biomasse/Reststoffe",
  glass: "Glas/Altglas",
  paper: "Papier/Pappe/Karton",
  rubber: "Gummi/Elastomere",
  textile: "Textilien/Fasern",
  construction_waste: "Baurestmassen",
  food_waste: "Biologische Abfälle",
  waste_stream: "Abfallstrom",
  by_product: "Nebenprodukt",
  article: "Erzeugnis/Produkt",
  other: "Sonstiges",
};

export const cmrsToMarketplaceClass: Record<string, string> = {
  polymer: "Kunststoff",
  metal: "Metall",
  biomass: "Biomasse",
  food_waste: "Biomasse",
  by_product: "Biomasse",
  glass: "Glas",
  textile: "Textil",
  paper: "Sonstige",
  rubber: "Sonstige",
  construction_waste: "Sonstige",
  solvent: "Sonstige",
  waste_stream: "Sonstige",
  article: "Sonstige",
  other: "Sonstige",
};

export const ucumUnits: Record<string, string> = {
  kg: "kg",
  kilogramm: "kg",
  g: "g",
  gramm: "g",
  t: "t",
  tonne: "t",
  tonnen: "t",
  l: "L",
  liter: "L",
  m3: "m3",
  "%": "%",
  prozent: "%",
};

export const regionHints: Record<string, string> = {
  berlin: "Berlin",
  brandenburg: "Brandenburg",
  stuttgart: "Baden-Württemberg",
  karlsruhe: "Baden-Württemberg",
  münchen: "Bayern",
  munich: "Bayern",
  nürnberg: "Bayern",
  frankfurt: "Hessen",
  kassel: "Hessen",
  dortmund: "Nordrhein-Westfalen",
  köln: "Nordrhein-Westfalen",
  cologne: "Nordrhein-Westfalen",
  düsseldorf: "Nordrhein-Westfalen",
  hannover: "Niedersachsen",
  wolfsburg: "Niedersachsen",
  dresden: "Sachsen",
  leipzig: "Sachsen",
  kiel: "Schleswig-Holstein",
  lübeck: "Schleswig-Holstein",
};

export const canonicalMaterialRules: {
  pattern: RegExp;
  label: string;
  canonicalName: string;
  category: string;
}[] = [
  { pattern: /\bpp(?:[-\s]?regranulat|[-\s]?granulat|[-\s]?rezyklat)?\b/i, label: "PP-Regranulat", canonicalName: "PP", category: "polymer" },
  { pattern: /\bpet(?:[-\s]?flakes|[-\s]?rezyklat)?\b/i, label: "PET-Flakes", canonicalName: "PET", category: "polymer" },
  { pattern: /\bpe(?:[-\s]?granulat|[-\s]?rezyklat)?\b/i, label: "PE-Granulat", canonicalName: "PE", category: "polymer" },
  { pattern: /\baluminium(?:späne|spaene|schrott)?\b/i, label: "Aluminiumspäne", canonicalName: "Aluminium", category: "metal" },
  { pattern: /\bkupfer(?:schrott|kabel)?\b/i, label: "Kupferschrott", canonicalName: "Kupfer", category: "metal" },
  { pattern: /\baltglas|glasscherben|glasbruch\b/i, label: "Altglas", canonicalName: "Altglas", category: "glass" },
  { pattern: /\bhanffaser|hanfaser|naturfaser\b/i, label: "Hanfaser", canonicalName: "Hanfaser", category: "biomass" },
  { pattern: /\bstärkeschlamm|staerkeschlamm\b/i, label: "Stärkeschlamm", canonicalName: "Stärkeschlamm", category: "biomass" },
  { pattern: /\bapfeltrester\b/i, label: "Apfeltrester", canonicalName: "Apfeltrester", category: "food_waste" },
  { pattern: /\bbaumwolle|alttextil|textilfasern?\b/i, label: "Baumwolle", canonicalName: "Baumwolle", category: "textile" },
  { pattern: /\bholz(?:hackschnitzel|reste|späne|spaene)?\b/i, label: "Holzreste", canonicalName: "Holz", category: "biomass" },
  { pattern: /\bethanol|lösemittel|loesemittel|solvent\b/i, label: "Ethanol", canonicalName: "Ethanol", category: "solvent" },
];

export const cmrsPropertyExtractors: {
  propertyKey: string;
  label: string;
  pattern: RegExp;
  unit: string;
}[] = [
  { propertyKey: "purity", label: "Reinheit", pattern: /(?:reinheit|purity)\s*(?:min\.?|mind\.?|mindestens|max\.?|maximal)?\s*(\d+(?:[.,]\d+)?)\s*%/i, unit: "%" },
  { propertyKey: "moisture_content", label: "Feuchte/Wassergehalt", pattern: /(?:feuchte|feuchtigkeit|wassergehalt)\s*(?:max\.?|höchstens|unter|bis zu)?\s*(\d+(?:[.,]\d+)?)\s*%/i, unit: "%" },
  { propertyKey: "oil_content", label: "Öl-/Schmierstoffanteil", pattern: /(?:ölanteil|oelanteil|ölgehalt|oelgehalt)\s*(?:max\.?|höchstens|unter)?\s*(\d+(?:[.,]\d+)?)\s*%/i, unit: "%" },
  { propertyKey: "foreign_matter_content", label: "Fremdstoffanteil", pattern: /(?:fremdstoffe|fremdstoffanteil|verunreinigung)\s*(?:max\.?|höchstens|unter)?\s*(\d+(?:[.,]\d+)?)\s*%/i, unit: "%" },
  { propertyKey: "particle_size_max", label: "max. Partikelgröße", pattern: /(?:korngröße|korngroesse|partikelgröße|partikelgroesse)\s*(?:max\.?|bis zu)?\s*(\d+(?:[.,]\d+)?)\s*(mm|um|µm)/i, unit: "mm" },
  { propertyKey: "flash_point", label: "Flammpunkt", pattern: /(?:flammpunkt)\s*(?:>|>=|min\.?|mindestens)?\s*(\d+(?:[.,]\d+)?)\s*(?:°c|c|cel)/i, unit: "Cel" },
];

export const integrationReviewItems = [
  ["CMRS v1.1.0", "Record-Typ, Materialblock, Menge, Slots, Kontext und Herkunft werden sichtbar geführt."],
  ["Validierung", "E-/W-Codes aus der RQ1-Logik entscheiden über direkte Übernahme oder offene Prüfpunkte."],
  ["Nachweise", "Jeder erkannte Slot zeigt Textbeleg und Position. Der Ursprung bleibt bis zum Ranking sichtbar."],
  ["RQ2-Übergabe", "Gültige und prüfpflichtige Records werden kontrolliert zu Angebot oder Gesuch übertragen."],
];
