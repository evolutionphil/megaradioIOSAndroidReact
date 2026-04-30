const IMAGE_API_BASE = 'https://api.themegaradio.com';

export function resolveStationImageUrl(favicon: string | undefined | null): string | null {
  if (!favicon || favicon === 'null' || favicon.trim() === '') return null;

  if (favicon.startsWith('http')) return favicon;

  return IMAGE_API_BASE + '/api/image/' + encodeURIComponent(favicon);
}
