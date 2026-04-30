# 📨 Notes for the MegaRadio Backend Developer

> **From**: Frontend team (Apple TV / macOS / Android TV / Desktop expansion)
> **For**: Backend team (api.themegaradio.com maintainer)
> **Priority**: P1 — needed before TV apps go live in App Store / Play Store

The TV apps are now feature-complete on the client. The frontend changes you need
to support on the backend are **non-breaking** — every existing iOS / Android / web
client keeps working unchanged. Please add the items below at your convenience.

---

## 1. ✅ Cross-platform IAP Receipt Validation Endpoint

The TV / Desktop apps reuse the **same product IDs** as the iOS / Android mobile apps:

| Product                          | Product ID (iOS + Android + tvOS + macOS) | Type            | Price     |
|----------------------------------|-------------------------------------------|-----------------|-----------|
| Premium — monthly                | `megaradio_premium_monthly1`              | Auto-renew sub  | €3.99/mo  |
| Premium — yearly                 | `megaradio_premium_yearly`                | Auto-renew sub  | €29.99/yr |
| Premium — lifetime               | `megaradio_premium_lifetime`              | Non-consumable  | €59.99    |
| Remove Ads — yearly              | `megaradio_remove_ads_yearly1`            | Auto-renew sub  | €29.99/yr |

### What we need

```http
POST /api/iap/validate
Content-Type: application/json

{
  "platform": "ios" | "android" | "tvos" | "macos",
  "productId": "megaradio_premium_yearly",
  "receipt": "<base64 receipt from StoreKit / Play Billing>",
  "userId": "<optional>"
}
```

Returns:
```json
{
  "valid": true,
  "expiresAt": 1735689600000,
  "originalTransactionId": "...",
  "isLifetime": false
}
```

The TV WebView shells will POST the receipt here right after a purchase; we use
the response to drive the `premium_state_v1` localStorage that flips Remove-Ads
flags throughout the UI.

**Why this matters**: Apple **requires** server-side receipt validation for
auto-renewing subs. If we skip it, App Review will reject the binary.

---

## 2. ✅ StackPath CDN 404 — Pal Station logo

URL `https://j5k7p3y4.stackpathcdn.com/.../pal-station.png` returns 404 in our logs.
Please update the `favicon` field for that station document in MongoDB to a
valid URL (re-host on your Cloudflare bucket, or proxy through your CDN).

```js
db.stations.updateOne(
  { name: /Pal/i },
  { $set: { favicon: "https://api.themegaradio.com/cdn/pal-station.png" } }
)
```

---

## 3. ⚠️ Missing `/api/stations/:id/metadata` endpoint

We're seeing repeated 404s on `GET /api/stations/68a8c45fbd66579311aad585/metadata`.
The TV app polls this every 30s for "Now playing" track names (artist + title).

If the endpoint isn't implemented yet, please add:
```http
GET /api/stations/:id/metadata
→ {"title": "Track Title", "artist": "Artist Name", "artwork": "<url>"}
```

If you can't extract metadata server-side, just return `{"title": null}` (HTTP 200)
so we don't keep retrying.

---

## 4. ✅ CORS — already correct ✨

We tested and `Access-Control-Allow-Origin: *` is set on every endpoint. No action
needed; just don't accidentally remove this when refactoring.

---

## 5. ℹ️ TV-specific: Background image hosting

The TV/Desktop hero/discover images are served from the **client bundle** —
no backend hosting required. You don't need to do anything.

---

## 6. ℹ️ TV-specific: Auth token endpoint reuse

The TV login flow uses your existing `/api/auth/tv/code` and `/api/auth/tv/poll`
endpoints. Working perfectly — no changes needed.

---

## TL;DR for backend dev

1. Add `POST /api/iap/validate` (P1 — required for App Store submission)
2. Fix Pal Station logo URL in MongoDB (P3 — cosmetic)
3. Implement or stub `/api/stations/:id/metadata` (P2 — improves UX)

Everything else just works.

— Frontend team, Apr 2026
