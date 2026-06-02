# Backend Brief — TV station logos: use S3 (`logoAssets`) + re-process failed ones

Date: 2026-06-02

## What the frontend now does (fixed this session)
The TV/web app previously rendered the raw external `favicon` field (often
`http://…/favicon.ico`, expired-cert, 404 → missing logos on TV). It now PREFERS
the backend's own S3-processed logo when available:

```
station.logoAssets.status === 'completed'  →  use logoAssets.webp256 (or .original)
otherwise                                  →  fall back to station.favicon
```

`logoAssets.webp256` is already `https://megaradio-station-logos.s3.eu-north-1.amazonaws.com/...logo-256.webp`
— S3, https, optimized → NO proxy needed.

## Coverage measured (sample of 100 each, live)
| Set | S3 `completed` | `failed` | no `logoAssets` |
|---|---|---|---|
| Türkiye | 78% | 20% | 2% |
| Global | 75% | 16% | 9% |
| USA | 79% | 12% | 9% |

So ~75–79% of logos now come from S3 reliably. 

## BACKEND ACTION — re-process the `failed` ones
The remaining missing logos are stations where the S3 logo job FAILED, e.g.:
- `HTTP 503 / 404 / 410 / 402 / 403 - Access denied` (upstream favicon gone/blocked)
- `certificate has expired`
- `Outbound URL rejected by SSRF guard: port-not-allowed` (favicon on a non-standard
  port, e.g. `:8000`) and `private-ip-resolved` (raw-IP stations)

Requests for the backend team:
1. **Retry** the `failed` logoAssets jobs (many upstreams are intermittently up).
2. For `403 / cert-expired / 404`, fetch the logo from an **alternate source**
   (station homepage `<link rel=icon>`, Clearbit/`favicon` service, or manual upload).
3. Consider **relaxing the SSRF guard** for the logo fetcher specifically so
   non-standard-port favicons (`:8000`, etc.) and raw-IP stations can be processed
   (these are common for Turkish stations).
4. Confirm: is `logoAssets` returned on ALL list/search/genre endpoints (incl. with
   `?tv=1`)? It is present on `/api/stations` today — please keep it on every
   station-returning endpoint so the app can always prefer S3.

Once failed jobs are re-processed, ~100% of logos come from S3 and the legacy
favicon path (and any proxy) becomes unnecessary.

---

# (Earlier) Missing TV proxy/resolve endpoints on production (api.themegaradio.com)

The packaged TV app hits `https://api.themegaradio.com`. These do NOT exist there
(404), they only exist on the Emergent FastAPI preview backend:
`GET /api/tv-icon-proxy`, `GET /api/stream-proxy`, `GET /api/stream-resolve`.
With the S3-logo fix above, `tv-icon-proxy` is largely unnecessary. `stream-resolve`
is now handled client-side on TV for `.pls`/`.m3u` playlists.

