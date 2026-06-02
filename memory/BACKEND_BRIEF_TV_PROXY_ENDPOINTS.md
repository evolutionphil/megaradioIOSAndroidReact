# Backend Brief — Missing TV proxy/resolve endpoints on production (api.themegaradio.com)

Date: 2026-06-02

## Finding (verified via curl)
The packaged TV app (Tizen .wgt / webOS .ipk / Apple TV) hits the PRODUCTION API
host `https://api.themegaradio.com`. Three endpoints the TV web code references
DO NOT EXIST there (Express-style `Cannot GET …` → 404):

| Endpoint | Production status | Used for |
|---|---|---|
| `GET /api/tv-icon-proxy?url=` | **404 (missing)** | upgrade legacy `http://` station favicons → https |
| `GET /api/stream-proxy?url=`  | **404 (missing)** | proxy http audio on https pages |
| `GET /api/stream-resolve?url=`| **404 (missing)** | follow redirects / resolve playlists |

(These DO exist on the Emergent FastAPI preview backend — that's why it works in
the web preview but not on a real TV.)

`GET /api/stations` works (200) — the catalog API itself is fine.

## Frontend mitigation already shipped (OTA, no backend dependency)
- **Images**: on packaged TV (`file://`) the app now loads `http://` favicons
  DIRECTLY (CSP `img-src http:` allows it, no mixed-content under file://), instead
  of routing through the dead production proxy. `src/lib/imageUtils.ts`.
- **Audio**: on TV the app now resolves `.pls` / `.m3u` playlists client-side
  (fetch + parse first stream URL) before handing avplay a direct URL, because
  avplay/webOS audio can't parse playlist files and the backend resolver is
  unreachable. `src/contexts/GlobalPlayerContext.tsx` + Tizen `config.xml`
  `connect-src http: https:`.

## Optional backend improvement (nice-to-have, not required anymore)
If you want a server-side fallback instead of client-side resolution, port these 3
endpoints from the Emergent FastAPI backend (`/app/backend/server.py`,
`tv_icon_proxy` / `stream_proxy` / `stream_resolve`) to the Node `api.themegaradio.com`
service. The icon-proxy should additionally PARSE `.pls`/`.m3u` and return the
direct stream URL for true playlist resolution (the current FastAPI resolve only
follows HTTP redirects).
