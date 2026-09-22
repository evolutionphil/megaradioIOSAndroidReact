export function getMetadataStreamUrl(station: unknown): string | undefined {
  if (!station || typeof station !== 'object') return;
  const row = station as Record<string, unknown>;
  return [row.url_resolved, row.urlResolved, row.url, row.streamUrl]
    .find((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url.trim()))?.trim();
}

/** Production API is flat today; older mobile responses wrap these fields. */
export function formatNowPlaying(data: unknown, stationName = ''): string | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, any>;
  const metadata = value.metadata || value;
  const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';
  const artist = typeof metadata.artist === 'string' ? metadata.artist.trim() : '';
  if (!title || title === stationName || /^(live stream|now playing)$/i.test(title)) return null;
  return artist && artist !== title ? `${artist} - ${title}` : title;
}