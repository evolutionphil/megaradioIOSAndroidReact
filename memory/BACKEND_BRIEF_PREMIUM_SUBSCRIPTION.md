# Backend & Web Developer Brief — Premium Subscription (Account Linking via Stripe)

> **Audience:** Backend + Web Frontend developer (same person)
> **Owner of this doc:** TV/Desktop team (Emergent)
> **TV side is DONE** — page `/premium-upgrade`, hook `useSubscriptionLink.ts`,
> QR code generation, polling, expired/error states, focus navigation. The TV
> app will work the moment your endpoints are live.
>
> Read this entire doc. It contains the exact API contract the TV calls expect.

---

## 0) Why this approach (TL;DR)

Samsung Tizen and LG WebOS **forbid** in-app credit card forms and any
third-party payment SDK that isn't their own checkout (Samsung Checkout 30%,
LG IAP). To avoid those commissions and the certification overhead, we use
the **Account-Linking pattern** (same one Spotify / Netflix / YouTube use):

1. TV shows a QR code + a 6-digit PIN
2. User scans the QR with their phone (or types the URL manually)
3. Browser opens `https://www.themegaradio.com/activate?code=XXXXXX`
4. User signs in (or signs up), Stripe Checkout completes, webhook fires
5. Backend marks the PIN as `activated` and attaches the new subscription to
   the user's account
6. TV polls `/code/:code/status`, sees `activated`, refreshes auth → UI flips
   to premium

Net effect: **0% platform fee, ~3% Stripe fee, store-policy-compliant.**

---

## 1) API contract (THE SOURCE OF TRUTH)

Base host: `https://api.themegaradio.com`

All endpoints must include:
- `Access-Control-Allow-Origin: *` (or echo the request `Origin`)
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

Same CORS profile as `/api/auth/tv/code` — copy it.

### 1.1 `POST /api/subscription/tv/code`

Generates a fresh PIN tied to the requesting device. **Public** (no auth) —
the user isn't logged in on the TV yet.

**Request body**
```json
{
  "deviceId": "tv-abc123def456",
  "source":   "tv"
}
```

**Response 200**
```json
{
  "success": true,
  "code": "482917",
  "activationUrl": "https://www.themegaradio.com/activate?code=482917",
  "expiresIn": 600,
  "expiresAt": "2026-02-19T16:50:00Z"
}
```

**Rules**
- `code` = 6-digit numeric, unique among non-expired codes
- TTL: 10 minutes (`expiresIn: 600`)
- One active code per `deviceId` — if the device requests again, you may
  invalidate the previous code (recommended) or return the same one
- DO NOT include any PII in the response

**Errors**
- 429 Too Many Requests → if same `deviceId` requests > 5 codes / hour
- 500 → bubble up `{ "success": false, "error": "internal_error" }`

---

### 1.2 `GET /api/subscription/tv/code/:code/status?deviceId=tv-abc123`

Polled by the TV every 3 seconds. **Public**, no auth (the TV identifies
itself via `deviceId` query param).

**Response 200 — still waiting**
```json
{ "status": "pending" }
```

**Response 200 — activated**
```json
{
  "status": "activated",
  "subscription": {
    "tier": "premium",
    "plan": "annual",
    "validUntil": "2027-02-19T00:00:00Z"
  },
  "user": {
    "id": "usr_5f8a...",
    "email": "user@example.com",
    "token": "eyJhbGc..."
  }
}
```

The `user.token` is **the same JWT** your existing `/api/auth/tv/code/:code/status`
endpoint returns. Once the TV receives this, it stores the token (already
plumbed via `useAuth().refresh()`) and the user is auto-logged-in on the TV
without ever entering credentials — they only entered them on their phone.

**Response 200 — expired**
```json
{ "status": "expired" }
```

**Response 404**
- Code doesn't exist OR was generated for a different `deviceId`
- TV treats this as "pending" and keeps polling until expiry

**Security**
- Compare the `deviceId` query param to the one stored at code generation.
  Mismatch → return 404 (don't leak `expired` vs `wrong-device` info).
- Rate-limit per code: max 1 poll / second (TV polls every 3s, leaves a
  buffer for clock skew).

---

### 1.3 `GET /api/subscription/status` *(optional, but recommended)*

Returns the current user's subscription state. Used by the TV header to
show a "PREMIUM" badge and gate premium-only features (ad-free streams).

**Request**
```
GET /api/subscription/status
Authorization: Bearer <user JWT>
```

**Response 200**
```json
{
  "tier": "premium",
  "plan": "annual",
  "status": "active",
  "validUntil": "2027-02-19T00:00:00Z",
  "renewsAt": "2027-02-19T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

**Tier values**: `"free" | "premium"` only. Don't introduce more tiers
without telling us — UI is hardcoded for two.

**Status values**: `"active" | "past_due" | "canceled" | "trialing"`

---

### 1.4 Stripe webhook → mark code as activated

```
POST /api/webhooks/stripe
```

Standard Stripe `checkout.session.completed` handler. In the session
metadata you MUST stash the PIN that was active when checkout started:

```python
# When creating the Checkout Session on the web side:
session = stripe.checkout.Session.create(
    ...
    metadata={
        "megaradio_pin": code,           # e.g. "482917"
        "megaradio_device_id": device_id  # e.g. "tv-abc123def456"
    },
    success_url="https://www.themegaradio.com/activate/success?code=" + code,
    cancel_url="https://www.themegaradio.com/activate?code=" + code,
)
```

In the webhook:
```python
@app.post("/api/webhooks/stripe")
async def stripe_webhook(request):
    event = stripe.Webhook.construct_event(...)  # verify signature
    if event.type == "checkout.session.completed":
        sess = event.data.object
        pin = sess.metadata.get("megaradio_pin")
        device_id = sess.metadata.get("megaradio_device_id")
        user_id = sess.client_reference_id  # or however you map session→user

        # 1. Persist the subscription on the user
        await users.update_one(
            {"_id": user_id},
            {"$set": {
                "subscription.tier": "premium",
                "subscription.plan": sess.metadata.get("plan", "monthly"),
                "subscription.stripe_subscription_id": sess.subscription,
                "subscription.valid_until": valid_until_iso,
            }}
        )

        # 2. Mark the PIN as activated and bind it to user_id
        await tv_codes.update_one(
            {"code": pin, "device_id": device_id},
            {"$set": {
                "status": "activated",
                "user_id": user_id,
                "activated_at": datetime.utcnow(),
            }}
        )
```

The TV's next poll will pick it up.

---

## 2) Web frontend — `/activate` page

Hosted at `https://www.themegaradio.com/activate?code=XXXXXX`.

**Flow**:

1. Read `code` from URL query
2. Validate format (6 digits) — if not, show error
3. Show "Activate MegaRadio Premium" page with:
   - The code prefilled & visible
   - Plan selection (Monthly / Annual radios — your existing pricing page)
   - "Continue" button
4. On Continue:
   - If user not signed in → email/password modal (existing `/login` flow)
   - Once authenticated, call `POST /api/subscription/checkout` with body
     `{ code, plan, deviceId? }` (pull `deviceId` from URL too, optional —
     for analytics)
5. Backend creates Stripe Checkout Session (see § 1.4 metadata block) and
   returns `{ url }`. Web frontend does `window.location.href = url`.
6. After Stripe success → user lands on `/activate/success?code=XXXXXX`.
   Show "Done! Return to your TV." message.
7. Webhook (already covered) flips the PIN to activated → TV picks it up
   within 3s.

**Idempotency**: If the user revisits `/activate?code=XXXXXX` after
activation, fetch `/api/subscription/tv/code/:code/status`; if it returns
`activated`, show "Already activated" view, no checkout.

**Code expiry**: If status returns `expired` before checkout starts, show
"Code expired — open MegaRadio on your TV again to get a new code."

---

## 3) Database schema (Mongo)

Add a `tv_codes` collection (or extend the existing one if you have it for
`/api/auth/tv/code`):

```js
{
  _id: ObjectId,
  code: "482917",                    // 6-digit
  device_id: "tv-abc123def456",
  purpose: "subscription",            // or "login" — same collection both
  status: "pending" | "activated" | "expired",
  user_id: ObjectId | null,          // set when activated
  created_at: ISODate,
  expires_at: ISODate,                // created_at + 10 min
  activated_at: ISODate | null,
  source: "tv",
}
```

Indexes:
- `{ code: 1, device_id: 1 }` unique
- `{ expires_at: 1 }` TTL index → Mongo auto-deletes expired docs

User document additions:
```js
subscription: {
  tier: "free" | "premium",
  plan: "monthly" | "annual",
  status: "active" | "past_due" | "canceled" | "trialing",
  stripe_customer_id: "cus_...",
  stripe_subscription_id: "sub_...",
  valid_until: ISODate,
  cancel_at_period_end: Boolean,
}
```

---

## 4) Stripe products & pricing

Create products in Stripe Dashboard:

- **MegaRadio Premium Monthly** — Recurring, every 1 month
- **MegaRadio Premium Annual** — Recurring, every 1 year, with discount

Capture the Price IDs (`price_xxxxx`) in env vars:
```
STRIPE_PRICE_MONTHLY=price_1xxxxx
STRIPE_PRICE_ANNUAL=price_1yyyyy
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

In Checkout Session use `line_items: [{ price: STRIPE_PRICE_MONTHLY, quantity: 1 }]`.

---

## 5) Testing checklist

After you deploy, run this checklist before flagging the TV team:

- [ ] `curl -X POST https://api.themegaradio.com/api/subscription/tv/code -H "Content-Type: application/json" -d '{"deviceId":"test","source":"tv"}'` returns `{ success, code, activationUrl, expiresIn }`
- [ ] `curl https://api.themegaradio.com/api/subscription/tv/code/<code>/status?deviceId=test` returns `{ status: "pending" }`
- [ ] Open `https://www.themegaradio.com/activate?code=<code>` → completes Stripe checkout in TEST MODE
- [ ] Polling endpoint immediately flips to `activated` with `user.token`
- [ ] CORS preflight: `curl -X OPTIONS https://api.themegaradio.com/api/subscription/tv/code -H "Origin: https://music-premium-fix.preview.emergentagent.com" -H "Access-Control-Request-Method: POST" -i` shows `Access-Control-Allow-Origin: *`
- [ ] Hit `https://music-premium-fix.preview.emergentagent.com/api/tv-app/#/premium-upgrade` — should render QR code + 6-digit PIN within 1-2 seconds

---

## 6) Compliance / store policy notes

- **Samsung Tizen App Store**: Premium upsell on TV is OK as long as the
  TV itself **shows no payment field**. Our flow only shows QR + PIN ✅
- **LG Content Store**: Same restriction. Our flow complies ✅
- Add a **"Subscription Terms"** link on the activation web page (Stripe
  requires a clearly visible link to subscription terms before checkout)
- Add **"Cancel anytime, manage on themegaradio.com/account"** copy on the
  activation page (App Store reviewers look for this)

---

## 7) Open questions for TV team (none of these are blockers)

1. Should the TV show a "Restore subscription" entry in Settings that links
   to `themegaradio.com/account`? (Recommended — for users who paid on
   another device and want to confirm on this TV.) — yes/no?
2. Trial period? If yes, what duration & whose card on file? (Stripe
   handles trials natively — `subscription_data.trial_period_days`.)
3. Region pricing? Currently the TV opens a single QR. If you want
   geo-targeting (TR users see TRY pricing, DE users see EUR), wire
   `country` into the activation URL: `?code=XXXXXX&country=TR`.

---

## 8) Contact for questions

When in doubt about the contract, the TV side reads:
```
GET  /api/subscription/tv/code/:code/status?deviceId=...
POST /api/subscription/tv/code
```

Everything else is web/Stripe land. The TV team is hands-off after these
two endpoints respond per § 1.1 / § 1.2.
