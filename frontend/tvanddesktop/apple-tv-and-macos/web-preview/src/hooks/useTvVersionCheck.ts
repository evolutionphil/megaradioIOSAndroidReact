/**
 * Update Banner — TV / Desktop için "yeni sürüm var" bildirimi.
 *
 * Backend kontratı:
 *   GET https://api.themegaradio.com/api/tv/version
 *   Response 200:
 *   {
 *     "latest":     { "tizen": "1.0.3", "webos": "1.0.3", "ios": "5.4.3", ... },
 *     "minimum":    { "tizen": "1.0.0", "webos": "1.0.0", ... },  // optional — bunun altı force-update
 *     "releaseNotes": { "tr": "...", "en": "..." },                // optional
 *     "storeUrl": {
 *        "tizen": "https://www.samsung.com/...",
 *        "webos": "https://www.lgcontent.lge.com/...",
 *        "desktop": "https://github.com/.../releases/latest"
 *     }
 *   }
 *
 * Davranış:
 *   • Şu anki versiyon `latest`'in altındaysa → soft banner (kapatılabilir, 7 günde bir hatırlatır)
 *   • Şu anki versiyon `minimum`'un altındaysa → blocking modal (kapatılamaz)
 *   • Backend 404/timeout → sessizce devam (uygulamayı bloklamaz)
 */
import { useEffect, useState } from 'react';

type Platform = 'tizen' | 'webos' | 'ios' | 'tvos' | 'macos' | 'android' | 'androidtv' | 'desktop' | 'web';
type VersionResponse = {
  latest?: Partial<Record<Platform, string>>;
  minimum?: Partial<Record<Platform, string>>;
  releaseNotes?: { tr?: string; en?: string };
  storeUrl?: Partial<Record<Platform, string>>;
};

const VERSION_ENDPOINT = 'https://api.themegaradio.com/api/tv/version';
const DISMISS_KEY = 'mr_update_dismissed_at';
const SOFT_REMIND_DAYS = 7;

function detectPlatform(): Platform {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  if (ua.includes('tizen')) return 'tizen';
  if (ua.includes('web0s') || ua.includes('webos')) return 'webos';
  // Electron exposes window.megaRadioDesktop (see desktop/electron/preload.js)
  if (typeof window !== 'undefined' && (window as any).megaRadioDesktop?.isDesktop) return 'desktop';
  return 'web';
}

function getCurrentVersion(): string {
  // Build-time injected version (Vite define) OR fallback to "0.0.0" so any
  // backend response newer than that triggers the banner during dev.
  return (import.meta as any).env?.VITE_APP_VERSION || '0.0.0';
}

function cmpSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

type UpdateState =
  | { kind: 'none' }
  | { kind: 'soft'; latest: string; storeUrl?: string; notes?: string }
  | { kind: 'forced'; latest: string; minimum: string; storeUrl?: string; notes?: string };

export function useTvVersionCheck(): UpdateState {
  const [state, setState] = useState<UpdateState>({ kind: 'none' });

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(VERSION_ENDPOINT, { method: 'GET', cache: 'no-store' });
        if (!res.ok) return;
        const data: VersionResponse = await res.json();
        if (aborted) return;

        const platform = detectPlatform();
        const current = getCurrentVersion();
        const latest = data.latest?.[platform];
        const minimum = data.minimum?.[platform];
        const storeUrl = data.storeUrl?.[platform];
        const lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('tr')) ? 'tr' : 'en';
        const notes = data.releaseNotes?.[lang as 'tr' | 'en'];

        // Force update?
        if (minimum && cmpSemver(current, minimum) < 0) {
          setState({ kind: 'forced', latest: latest || minimum, minimum, storeUrl, notes });
          return;
        }
        // Soft update?
        if (latest && cmpSemver(current, latest) < 0) {
          // Respect 7-day dismiss cooldown for soft banner
          const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
          const ageDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
          if (ageDays < SOFT_REMIND_DAYS && dismissedAt > 0) return;
          setState({ kind: 'soft', latest, storeUrl, notes });
        }
      } catch {
        // network/parse error — fail silent
      }
    })();
    return () => { aborted = true; };
  }, []);

  return state;
}

export function dismissSoftUpdate() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}
