export interface CompanionCountry {
  name: string;
  /** Legacy bridge key: real API code when present, otherwise the full name. */
  code: string;
  flag: string;
  stationCount: number;
}

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Both the boot catalog and on-demand requests must use identical selectors. */
export function normalizeCompanionCountries(payload: unknown): CompanionCountry[] {
  const envelope = payload as { countries?: unknown } | null;
  const list = Array.isArray(payload) ? payload : envelope?.countries;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: CompanionCountry[] = [];
  for (const value of list) {
    if (!value || (typeof value !== 'object' && typeof value !== 'string')) continue;
    const row = typeof value === 'string' ? { name: value } : value;
    const name = text(row.name) || text(row.country);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const code = text(row.code) || text(row.countryCode) || text(row.countrycode) || text(row.iso_3166_1);
    result.push({ name, code: code || name, flag: text(row.flag),
      stationCount: Number.isFinite(row.stationCount) && row.stationCount > 0 ? row.stationCount : 0 });
  }
  return result;
}