import { useEffect, useRef, useState } from 'react';
import { createMetadataClient } from '@radiolise/metadata-client';
import { Station, megaRadioApi } from '@/services/megaRadioApi';
import { formatNowPlaying, getMetadataStreamUrl } from '@/lib/nowPlaying';

const METADATA_WS_URL = (import.meta as any).env?.VITE_METADATA_WS ||
  'wss://backend.radiolise.com/api/data-service';

export function useNowPlayingMetadata(station: Station | null, isPlaying: boolean) {
  const [title, setTitle] = useState<string | null>(null);
  const previousId = useRef<string>();
  const id = station?._id;
  const source = getMetadataStreamUrl(station);

  useEffect(() => {
    if (previousId.current !== id) { previousId.current = id; setTitle(null); }
    if (!id) return;
    let cancelled = false;
    let icyAt = 0;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || Date.now() - icyAt < 65000) return;
      inFlight = true;
      try {
        const response = await megaRadioApi.getStationMetadata(id);
        const text = formatNowPlaying(response, station?.name);
        if (!cancelled && !icyAt && text) setTitle(text);
        else if (!cancelled && Date.now() - icyAt >= 65000 && text) setTitle(text);
      } finally { inFlight = false; }
    };
    // Like mobile: fast first display from the real API, ICY preferred thereafter.
    void poll();
    const timer = isPlaying ? setInterval(() => { void poll(); }, 60000) : undefined;
    const client = isPlaying && source && !/\.(pls|m3u)(?:[?#]|$)/i.test(source)
      ? createMetadataClient({ url: METADATA_WS_URL, reconnect: true, reconnectDelay: 3000 }) : undefined;
    const subscription = client?.subscribe(({ title: next, error }) => {
      if (cancelled || error || !next?.trim()) return; // Don't erase a valid API title on reconnect.
      icyAt = Date.now();
      setTitle(next.trim());
    });
    if (client) void client.trackStream(source).catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      subscription?.unsubscribe();
      client?.terminate();
    };
  }, [id, source, isPlaying]);
  return [title, setTitle] as const;
}