# Backend & Web Developer Brief — TV Login QR Code

> **Audience:** Backend + Web Frontend developer
> **Owner of this doc:** TV/Desktop team (Emergent)
> **Date:** Feb 2026
> **TV side is DONE** — `Login.tsx` now renders a QR code next to the 6-digit
> PIN. The QR encodes `https://www.themegaradio.com/tv?code=<6DIGITS>`.

---

## TL;DR — What we need from you

We want **one-tap login** for users who are already signed in on the website.
The TV already polls the activation endpoint, so the only missing piece is
the **web side**:

1. The page **`https://www.themegaradio.com/tv`** must read `?code=XXXXXX`
   from the query string and **auto-fill** the 6-digit PIN form.
2. If the visitor is **already logged in** on the web, immediately
   call your existing "activate this PIN for my account" endpoint with that
   code. Done — no manual typing.
3. If the visitor is **not** logged in, redirect them to the login page,
   then come back to `/tv?code=XXXXXX` and continue step 2 automatically.

That's it. No API contract changes required. The TV is already polling
`/api/auth/tv/code/:code/status?deviceId=…` every 3 s and will pick up the
activation within ~3 seconds of the web side firing the activate call.

---

## How it ties together (sequence)

```
TV                              Backend                      Web (phone)
 │  POST /api/auth/tv/code         │                              │
 ├──────────────────────────────► │ ───► returns { code: 451239 } │
 │                                 │                              │
 │  Renders QR for:                │                              │
 │  www.themegaradio.com/tv?code=451239                           │
 │  + plain text "451239"          │                              │
 │                                 │                              │
 │                                 │       (User scans QR)        │
 │                                 │   GET /tv?code=451239 ◄──────┤
 │                                 │                              │
 │                                 │   Web checks: signed in?     │
 │                                 │      YES → POST              │
 │                                 │      /api/auth/tv/code/451239/activate
 │                                 │      with current JWT        │
 │                                 │                              │
 │  Polls /code/451239/status      │                              │
 │  every 3s → status="verified"   │                              │
 │  + user + token                 │                              │
 │ ◄───────────────────────────── │                              │
 │  Auto-logs in, navigates to     │                              │
 │  /discover-no-user              │                              │
```

---

## Concrete tasks for the web team

### Task 1: Accept `?code=XXXXXX` on `/tv`

Existing page (where users currently type the 6 digits manually):

```ts
// Pseudocode for the /tv page on themegaradio.com
useEffect(() => {
  const url = new URL(window.location.href);
  const codeFromQR = url.searchParams.get('code');
  if (codeFromQR && /^\d{6}$/.test(codeFromQR)) {
    setEnteredCode(codeFromQR);     // pre-fill the form
    if (isUserSignedIn) {
      activateTvCode(codeFromQR);   // immediate
    }
  }
}, []);
```

### Task 2: If not signed in, persist the code through the auth round-trip

```ts
if (!isUserSignedIn && codeFromQR) {
  // Send user to login, then return to /tv?code=XXXXXX
  router.push(`/login?next=${encodeURIComponent('/tv?code=' + codeFromQR)}`);
}
```

After login, the `next` param brings them back; the `useEffect` above runs
again and activates.

### Task 3: (Optional, recommended) Loading + success states on `/tv?code=…`

When a QR-scanned user lands on `/tv?code=…&autoActivate=1` (or the code is
present and they're signed in), the screen should show:

* "Connecting your TV…" spinner
* On success: "TV connected ✓  You can put your phone away now."

Otherwise users may close the tab before the TV finishes polling and get
confused.

---

## API contract — no backend changes needed

You already have these endpoints from the old login flow:

* `POST /api/auth/tv/code` — TV calls this, returns `{ code, expiresAt }`
* `POST /api/auth/tv/code/:code/activate` — web calls this when the signed-in
  user clicks "Activate" (or auto on QR scan)
* `GET  /api/auth/tv/code/:code/status?deviceId=…` — TV polls; on
  `verified|activated` you return the user's JWT + profile

If those work today (they do — they power the manual "type the 6 digits"
flow), this brief requires **zero** backend code changes.

---

## i18n keys to add (translations API)

The TV uses these new keys; fallbacks are in English but please add proper
translations to your `/api/translations/{lang}` endpoint:

| key                    | EN fallback                                            |
| ---------------------- | ------------------------------------------------------ |
| `tv_login_qr_or_code`  | Scan the QR code with your phone, or enter this code manually: |
| `tv_login_scan_qr`     | Scan with your phone                                   |
| `or`                   | OR                                                     |

---

## Quick test plan

1. On a desktop, open `https://www.themegaradio.com/tv?code=123456`
   while signed in → backend should mark code `123456` activated.
2. Open the same URL while signed out → site bounces to `/login`, then
   back to `/tv?code=123456`, then activates.
3. Open it with an **invalid / expired** code → show error UI, don't break.
4. On the TV emulator: press Login → scan the QR → within ~5 s the TV
   should drop the login screen and land on Discover, already authenticated.

If step 4 works end-to-end, ship it.
