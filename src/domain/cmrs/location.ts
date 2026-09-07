import { regionHints,regions } from '../../config/vocabularies.ts';

export function detectCmrsLocation(rawText: string) {
  const lower = rawText.toLowerCase();
  const directRegion = regions.find((region) => lower.includes(region.toLowerCase()));
  if (directRegion) return { location: directRegion, region: directRegion };

  const city = Object.keys(regionHints).find((hint) => lower.includes(hint));
  if (city) {
    return {
      location: city[0].toUpperCase() + city.slice(1),
      region: regionHints[city],
    };
  }

  return { location: "", region: "" };
}
