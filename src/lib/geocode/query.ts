const COUNTRY_MARKERS = ["българия", "bulgaria"];

function trimPart(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Joins non-empty place / address / town and appends България when missing.
 * Returns "" when every field is blank — callers should skip Google in that case.
 */
export function buildGeocodeQuery(
  place?: string | null,
  address?: string | null,
  town?: string | null,
): string {
  const parts = [place, address, town].map(trimPart).filter(Boolean);
  if (parts.length === 0) return "";

  const query = parts.join(", ");
  const lower = query.toLowerCase();
  const hasCountry = COUNTRY_MARKERS.some((marker) => lower.includes(marker));
  return hasCountry ? query : `${query}, България`;
}

/**
 * Google reads "пл." as if it were "ул." and matches a same-named street in
 * another town, so spelling it out rescues those addresses. Only worth using as
 * a retry: expanding "ул." eagerly downgrades some exact addresses to the
 * street centerline. "с." is deliberately absent — it is also a middle initial,
 * and expanding it turns "Георги С. Раковски" into a different street entirely.
 */
const ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(^|[\s,(])пл\.\s*/gi, "$1площад "],
  [/(^|[\s,(])ул\.\s*/gi, "$1улица "],
  [/(^|[\s,(])бул\.\s*/gi, "$1булевард "],
  [/(^|[\s,(])ж\.к\.\s*/gi, "$1жилищен комплекс "],
  [/(^|[\s,(])кв\.\s*/gi, "$1квартал "],
];

export function expandAddressAbbreviations(query: string): string {
  const expanded = ABBREVIATIONS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    query,
  );
  return expanded.replace(/\s{2,}/g, " ").trim();
}
