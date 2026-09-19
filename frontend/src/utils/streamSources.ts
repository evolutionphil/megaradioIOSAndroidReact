/** Keep the actually played URL at index zero: failover starts at index one. */
export function buildStreamCandidates(primary: unknown, ...backups: unknown[]): string[] {
  return [...new Set([primary, ...backups].flat().filter(
    (url): url is string => typeof url === 'string' && url.trim().length > 0
  ).map(url => url.trim()))];
}

/** API records use camelCase, while older favorites use snake_case. */
export function getStationStreamUrl(station: {
  streamUrl?: string; urlResolved?: string; url_resolved?: string; url?: string;
}): string {
  return buildStreamCandidates(station.streamUrl, station.urlResolved,
    station.url_resolved, station.url)[0] || '';
}

export function isPlaylistStream(url: string | undefined): boolean {
  // Signed/parameterized playlists still need resolution.
  return typeof url === 'string' && /\.(pls|m3u8?|asx)(?:[?#]|$)/i.test(url);
}