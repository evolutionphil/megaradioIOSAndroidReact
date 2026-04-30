# Radio Mega — TV App Design Specification

**Version:** 1.0  
**Target Platforms (this spec):** Apple TV (tvOS / SwiftUI) and Android TV (Kotlin / Jetpack Compose for TV)  
**Source of Truth:** This document mirrors the existing Samsung Tizen / LG webOS web app pixel for pixel.

> Build the same product, same look, same flows. All numbers in this spec are **device-pixel exact** for a 1920×1080 reference frame. On Apple TV / Android TV, translate this 1920×1080 design into the platform's native point/dp system (typical TV target is 1920×1080 px = full HD safe zone; on 4K TVs the system upscales 1080p-designed screens to 2160p). Use a single design unit `dp = px / 1` and let the platform's native scaler handle UHD.

Companion screenshots are in `design-spec/screenshots/`.

---

## 1. Brand Identity

| Asset | Value |
|---|---|
| Product name | **Radio Mega** (also "Mega Radio") |
| Wordmark | "**mega**radio" — `mega` in pink **bold**, `radio` in white **regular** |
| Logo SVG | A handwritten pink "M-with-musical-tail" mark to the left of the wordmark |
| Logo size on app screens | 156 × 50 px (logo block top-left at `48,55`) |
| App background | Solid `#0E0E0E` (almost-black) |
| Brand pink (primary) | `#FF4199` |
| Brand pink dim variants | `rgba(255, 65, 153, 0.3)` (button bg), `rgba(255, 65, 153, 0.5)` (button border), `rgba(255, 65, 153, 0.25)` (focus bg) |

The logo SVG ships in the repo at `tv-app/images/logo.png` (already authored as SVG-in-PNG) plus an `icon.png` (PNG fallback). On Apple TV / Android TV, render the wordmark using the same Ubuntu font + the brand mark as a vector asset (PDF on tvOS, VectorDrawable on Android TV).

---

## 2. Reference Frame & Safe Area

- **Design canvas:** **1920 × 1080 px**, fixed.
- **Background:** `#0E0E0E` everywhere (never pure black).
- **Origin:** top-left = `(0, 0)`. All coordinates in this spec are absolute from `(0, 0)`.
- **TV safe area:** Native frameworks already enforce a safe area; do not insert extra padding. Major UI elements respect a **48 px** left/right margin and **48–64 px** top/bottom margin organically.
- **Overscroll:** none. Pages are fixed; only inner sections scroll (vertical for Discover/Genres, horizontal for "Popular Stations" rows).

---

## 3. Color System

All colors are absolute (no light/dark theme switch — the app is dark only). Use these exact hex/rgba values.

### 3.1 Surface

| Token | Hex / RGBA | Use |
|---|---|---|
| `surface/base` | `#0E0E0E` | App background |
| `surface/card-bg` | `#1F1F1F` (≈ `rgba(31,31,31,1)`) | Card / list-item background |
| `surface/card-bg-soft` | `rgba(31, 31, 31, 0.85)` | Cards over hero images |
| `surface/divider` | `rgba(255, 255, 255, 0.08)` | Hairline divider |
| `surface/scrim` | `rgba(0, 0, 0, 0.75)` | Modal scrim |
| `surface/modal` | `#1A1A2E` | Modal background |

### 3.2 Brand & Focus

| Token | Value | Use |
|---|---|---|
| `brand/pink` | `#FF4199` | Primary brand, focus glow, active state |
| `brand/pink/30` | `rgba(255, 65, 153, 0.30)` | Filled pink button background |
| `brand/pink/50` | `rgba(255, 65, 153, 0.50)` | Filled pink button border / focus border |
| `brand/pink/25` | `rgba(255, 65, 153, 0.25)` | Sidebar focus tile background |
| `brand/pink/20` | `rgba(255, 65, 153, 0.20)` | Sidebar **active** tile background (when not focused) |
| `focus/glow` | `0 0 16px rgba(255, 65, 153, 0.50)` | Focus shadow (sidebar, modals) |
| `focus/glow-strong` | `0 0 24px rgba(255, 65, 153, 0.65)` | Card focus shadow |

### 3.3 Text

| Token | Value | Use |
|---|---|---|
| `text/primary` | `#FFFFFF` | All headlines, primary text |
| `text/secondary` | `rgba(255, 255, 255, 0.85)` | Sub-labels |
| `text/tertiary` | `rgba(255, 255, 255, 0.60)` | Captions, station counts |
| `text/quaternary` | `rgba(255, 255, 255, 0.40)` | Placeholder text |
| `text/dim` | `rgba(255, 255, 255, 0.25)` | Ambient mode text |
| `text/now-playing` | `#FF4199` | "Now playing" metadata (song title) |

### 3.4 Status / Functional

| Token | Value | Use |
|---|---|---|
| `status/error` | `#FF4832` | Stream error banner (also pink accent in some places) |
| `status/error-bg` | `rgba(255, 65, 153, 0.15)` | Error banner background (pink-themed for brand consistency) |
| `status/success` | `#27AE60` | Help — Green (Play/Pause) |
| `accent/red` | `#E74C3C` | Help — Red (Add to Favorites) |
| `accent/yellow` | `#F1C40F` | Help — Yellow (Open Search) |
| `accent/blue` | `#3498DB` | Help — Blue (Change Country) |
| `accent/cyan` | `#01D7FB` | Search input focus (TV CSS) |

### 3.5 Gradients

```text
RadioPlaying background:
  radial-gradient(181.15% 96.19% at 5.26% 9.31%,
    #0E0E0E 0%, #3F1660 29.6%, #0E0E0E 100%)

Ambient mode background (dynamic from station artwork):
  linear-gradient(135deg, #020204 0%, <bgDark1> 30%, <bgDark2> 50%, <bgDark3> 70%, #030306 100%)

Sleep / hero overlay:
  linear-gradient(135deg, #1A1A2E 0%, #252538 100%)

Country / Search dark card:
  linear-gradient(135deg, #2A2A3E 0%, #35354E 100%)
```

---

## 4. Typography

**Family:** Ubuntu (Google Fonts) — weights 300, 400, 500, 700.  
On Apple TV: register `Ubuntu` via `Info.plist > UIAppFonts`. On Android TV: bundle `ubuntu_*.ttf` in `res/font/`.  
Fallback chain: `Ubuntu, Helvetica, Arial, sans-serif`.

| Style | Size | Weight | Color | Usage |
|---|---|---|---|---|
| Display / Splash | 64 px | 200 (Light) | `text/dim` (in ambient clock) | Ambient clock |
| H1 — Page title | 32 px | 700 (Bold) | `text/primary` | "Popular Genres", "Settings", etc. |
| H1 — Modal title | 32 px | 700 | `text/primary` | "Remote Control Colors" |
| H2 — Section title | 28 px | 700 | `text/primary` | "Popular Stations", "Your Favorites" |
| H3 — Card title | 24 px | 500–700 | `text/primary` | Genre name, settings option |
| Body — Primary | 22 px | 500 | `text/primary` | Modal copy, button label |
| Body — Now Playing song | 34 px | 500 | `rgba(255,255,255,0.9)` | Ambient mode track |
| Body — Now Playing artist | 22 px | 300 | `text/now-playing` | Ambient mode artist |
| Body — Secondary | 18 px | 400 | `text/tertiary` | Sub-text under settings |
| Sidebar label | 16 px | 500 | `text/primary` | Sidebar item labels |
| Caption | 15 px | 400 | `text/dim` | Ambient mode caption |
| Letter spacing (caps captions) | `2–6 px` | — | — | Uppercase labels |

**Numbering on Login code:** 64 px, weight 700, color `brand/pink`.

---

## 5. Spacing System

Use **multiples of 4 px**. Common values: `4, 8, 12, 16, 20, 24, 28, 32, 36, 48, 56, 64, 74`.

| Token | px |
|---|---|
| `space/xs` | 4 |
| `space/sm` | 8 |
| `space/md` | 16 |
| `space/lg` | 24 |
| `space/xl` | 32 |
| `space/2xl` | 48 |
| `space/3xl` | 64 |
| `space/page-margin-x` | 48 (sidebar gutter) → content starts at **220 px** |
| `space/page-margin-top` | 64 (header hidden) or 242 (header shown) |
| `space/section-gap` | 48–64 px between major sections |

**Border radius:** `10 px` (sidebar tiles, station cards), `12 px` (buttons, search input), `20 px` (modal, large card), `24 px` (RadioPlaying artwork frame), `50%` (avatars, color dots).

---

## 6. Layout — Global Frame

Every page follows the same skeleton (except Splash, Onboarding Guides, Login, RadioPlaying full-screen, and any "modal" page).

```
┌────────────────────────────────────────────────────────────────┐ 0,0
│ Logo (48,55) — 156×50                                          │
│                                                                │
│ ┌──────────────┐                                               │
│ │  SIDEBAR     │       MAIN CONTENT AREA                       │
│ │  (48,170)    │       (~220 → 1920, 64 → 1080)               │
│ │  120×760     │                                               │
│ │              │                                               │
│ │  6 nav tiles │                                               │
│ │  +1 Help tile│                                               │
│ │              │                                               │
│ └──────────────┘                                               │
│                                                                │
│ ┌──────────────────────────── Global Player Bar ─────────────┐ │
│ │ 1920 × 96 (auto-hides on RadioPlaying)                     │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘ 1920,1080
```

### 6.1 Auto-hide Header

On Discover/Genres/Search/Favorites/Settings pages a hero/header strip can occupy the top **242 px**. When it auto-hides (after a few seconds idle on Discover) the content area expands to start at `top: 64 px` and is `1016 px` tall instead of `838 px`.

---

## 7. Sidebar (Persistent Left Nav)

**Frame:** `position: fixed; left: 48 px; top: 170 px; width: 120 px; height: 760 px; z-index: 60`.

### 7.1 Items (top → bottom, indices 0–5; Help is 6 but tracked by a separate boolean)

| Index | Page | Icon SVG | Label key | English |
|---|---|---|---|---|
| 0 | `/discover-no-user` | `images/radio-icon.svg` | `nav_discover` | Discover |
| 1 | `/genres` | `images/music-icon.svg` | `nav_genres` | Genres / Radio Genres |
| 2 | `/search` | `images/search-icon.svg` | `nav_search` | Search |
| 3 | `/favorites` | `images/heart-icon.svg` | `nav_favorites` | Favorites |
| 4 | `/country-select` | `images/globe-icon.svg` | `nav_country` | Country |
| 5 | `/settings` | `images/settings-icon.svg` | `nav_settings` | Settings |
| 6 | (modal) | inline SVG `?` | `nav_help` | Help |

### 7.2 Tile Spec

- Tile box: **120 × 100 px**; `border-radius: 10 px`.
- Vertical pitch: **108 px** (tile + 8 px gap).
- Icon: 28 × 28 px, `margin-bottom: 6 px`, centered.
- Label: 16 px / 500 / white, single line, centered, `width: 104 px` with ellipsis.
- Inner padding: `14 px 8 px`.
- Transition: `background-color 0.2s, box-shadow 0.2s, opacity 0.2s`.

### 7.3 Visual States

| State | bg | shadow | opacity |
|---|---|---|---|
| Default | transparent | none | 0.85 |
| Active (current page) | `brand/pink/20` | none | 0.85 |
| Focused | `brand/pink/25` | `focus/glow` | 1.0 |
| Help focused | same as Focused | same | 1.0 |

### 7.4 Help (index 6)

Same tile styling. Icon: an inline circular `?` SVG (24 × 24 viewBox; circle radius 10, the curl `9.09 9 a3 3 0 0 1 5.83 1 c0 2 -3 3 -3 3`, dot at 12,17). Stroke: `#FFFFFF`, width 2, round caps.

---

## 8. Global Player Bar

A persistent bar pinned to the **bottom** of every page (auto-hidden on RadioPlaying & Splash & onboarding).

- Height: 96 px, background `rgba(20,20,20,0.95)` with top border `1px solid rgba(255,255,255,0.06)`.
- Layout (left → right, padding 16 px):
  1. Station artwork 64 × 64, radius 10 px.
  2. Station name 22 px / 500 / white.
  3. Now-playing track 18 px / 400 / `text/now-playing` (truncate with ellipsis after ~40 chars).
  4. (right) Play/Pause large icon button, 56 × 56 with circular focus glow.
- Metadata refresh: poll `/api/streams/<stationId>/now-playing` **every 30 s**.
- Truncation: long song names ellipsize after one line.

---

## 9. Pages — Detailed Specs

> For every page, see screenshot in `design-spec/screenshots/`.

### 9.1 Splash `/`
*Screenshot: see app — appears for ~1.5 s on cold start.*  
Centered Mega Radio logo on `#0E0E0E`. After the splash duration, route to onboarding (first run) or to `/discover-no-user`.

### 9.2 Onboarding Guides `/guide-1` … `/guide-4` — `screenshots/09-guide.jpg`

A four-screen tour overlaying a dimmed Discover background (opacity ~0.4 black overlay).

- Each screen: dark "tooltip" card pointing at one sidebar item with an arrow.
- Card: `bg #000000`, `border-radius 16 px`, padding `24 px 32 px`, max width 640 px.
- Pink dot (●) at the start of each line indicating "Press red button to access".
- Two-line text: function description + key hint.
- Indicators bottom center: 4 small pills, the active one pink-filled.
- Press OK / RIGHT to advance, BACK to skip.

### 9.3 Login `/login` — `screenshots/08-login.jpg`

Right-aligned, centered vertically on the right half:

- Mega Radio logo (top, ~120 px wide).
- Caption "Tv Login Visit" — 22 px / 400 / `text/tertiary`.
- URL **themegaradio.com/tv** — 48 px / 700 / `brand/pink`.
- Caption "Tv Login Enter Code".
- 6 digit boxes — each 100 × 110 px, `border: 1px solid rgba(255,65,153,0.4)`, `border-radius: 12px`, bg `rgba(255,65,153,0.06)`, digit text 64 px / 700 / `brand/pink`. Gap 12 px.
- Below: "Tv Login Code Expires 09:59" — counts down from 10:00.
- TV polls `POST /api/auth/tv/code` once on enter, then `GET /api/auth/tv/poll?code=…` every 3 s. On `200 + token`, save Bearer token, fetch user, route to Discover.

### 9.4 Discover `/discover-no-user` — `screenshots/01-discover.jpg`

Hero image (`hand-crowd-disco-1.png`) covers top-right ~60 % with a vertical gradient fading to `#0E0E0E`.

Content stack (vertical):
1. **(Optional) Recently Played** strip — title 28 px bold, 6 cards (160 × 160) horizontal.
2. **(Optional) For You** strip — same layout; only shows after 3+ plays.
3. **Popular Genres** title at `(294, 266)` — 32 px / 700.
4. **Popular Stations** title at `(294, 489)` — 28 px / 700.
5. Stations grid: **7 columns × N rows**, card 232 × 232 with 12 px gap between columns. First row at `top: 297 + offset`, row pitch 294 px.

**Auth bar (top-right):** small login pill at `(1694, 24)` — `padding 8 16`, radius 24, when logged in shows avatar (34 × 34, circular) + first name.

**Pagination:** load 100 stations per batch, infinite scroll prefetching next batch.

### 9.5 Genres `/genres` — `screenshots/02-genres.jpg`

Header: hero image dim, page title `Popular Genres` 32 px / 700 at `(220, 224)`.

**Popular Genres grid:** 4 columns × 2 rows, card width = `(content - 4*gap) / 4 ≈ 405 × 130`. Card content:
- Title (Genre name) 24 px / 700 white, top-left padding 24 px.
- Sub (`{count} Stations`) 20 px / 400 white-tertiary.
- Card bg: `rgba(31,31,31,0.85)`, radius 16 px.
- Focused: bg `rgba(31,31,31,0.95)`, **2px solid `brand/pink`**, `box-shadow: focus/glow`, slight scale 1.02.

**All Genres grid:** Same 4-column, scrolling list; section title `All` 32 px / 700.

Custom navigation: DOWN/UP moves by **4 items (one row)**, LEFT/RIGHT moves by **1**.

### 9.6 GenreList `/genre-list/:genre` — `screenshots/07-genre-list.jpg`

Page title: `{Genre name} Radios` 32 px / 700.

Stations grid: **7 columns**, card 232 × 232, paginated 28 stations (4 rows × 7) per batch with infinite scroll. Loads next batch when within 600 px of bottom.

DOWN/UP moves by **7**, LEFT/RIGHT by **1**.  
Empty state: centered "No stations found." 28 px / 700 + caption "Try a different genre".

### 9.7 Search `/search` — `screenshots/03-search.jpg`

Two-column layout:

**Left column:**
- Page title `Search` at `(220, 65)` 32 px / 700.
- Big search input pill at `(220, 116)` — width ~700, height 64 px, `border-radius: 999 px`, bg `rgba(31,31,31,0.85)`, magnifier icon left, placeholder "Search…" 22 px / 400 / `text/quaternary`.
- Below: results list (cards similar to Genres' "All").

**Right column (Virtual Keyboard):** anchored top-right at `(960, 116)` (sidebar of letter keys).
- Key tile: 96 × 72 px, radius 12 px, bg `rgba(31,31,31,0.85)`, label 32 px / 500 white, focused bg `brand/pink`, focused glow.
- Layout: 3 columns × 9 rows of keys depending on language; bottom is a **SPACE** wide key (296 × 72) and a **language selector** dropdown (English ▾) showing flag + name.
- Below dropdown: hint chips "← Results", "OK Type".

### 9.8 Favorites `/favorites` — `screenshots/04-favorites.jpg`

Page title `Your Favorites` at `(220, 266)` 28 px / 700.

**Empty state (centered, right of sidebar):**
- Big circle (96 px) with pink heart icon centered.
- "No favorites yet" 28 px / 700 white.
- Pink-bordered button "Discover stations near you →" — padding `12 24`, radius 12, border `2px solid brand/pink`, label 22 px / 500 / `brand/pink`.

**Filled state:** Same 7-column grid as Discover Popular Stations.

### 9.9 Settings `/settings` — `screenshots/05-settings.jpg`

Two-column layout:

**Left column (categories list):** at `(220, 130)` — 6 rows, each ~520 × 70 px:
| # | Icon | Label | Sub-label (current value) |
|---|---|---|---|
| 0 | globe | Language | English |
| 1 | keyboard | Keyboard | English |
| 2 | play | Play at start | None |
| 3 | clock | Sleep Timer | Off |
| 4 | accessibility-person | Accessibility | None |
| 5 | user | Account | (logged in / out) |
| 6 | cast | Cast | Cast Not Connected |

Row layout: icon 28 × 28 left, then a column with label 24 px / 700 white + sub-label 18 px / 400 white-tertiary. Row gap 8 px. Focused row: pill bg `brand/pink` (full pink fill, not transparent), label and sub-label both white, `box-shadow: focus/glow`.

**Right column (selected category panel):** at `(820, 130)`. For `Language`: title `Language` 28 px / 700 with a 1 px white-divider, then a vertical list of language rows: flag icon 32 × 24 + name 24 px / 500. Currently selected row has a faint pink scrim background `brand/pink/20`.

### 9.10 Country Select `/country-select` — `screenshots/06-country.jpg`

Same layout grammar as Search (left list + right virtual keyboard).

**Left column:**
- Title "Select country" 32 px / 700 at `(220, 50)`.
- Search pill (same as Search) at `(220, 116)` width ~720 px, with right-aligned count badge "219" 18 px / 400 white-tertiary.
- Vertical list of country rows below, each 720 × 100 px, radius 16, bg `rgba(31,31,31,0.7)`, padded 24 px:
  - Flag 48 × 32 (or globe for "Global") left.
  - Country name 28 px / 500 white.
  - Focused: pink border 2 px + focus glow.

**Right column:** same virtual keyboard.

### 9.11 RadioPlaying `/radio-playing`

**Background:** the radial purple gradient defined in §3.5. Hides the global player bar.

Centered column:
- Station artwork at `(50%, 45%)` — 280 × 280 px, radius 24 px, white BG, image cover, animated soft glow ring around it (glow 350 × 350 with `pR` from artwork color).
- Equalizer bars (only when playing): row of 5 bars, each 4 × 40 px, 4 px gap, animated with `equalizer-1..5` keyframes (scaleY 0.3 → 1 in 0.6 s).
- Station name 34 px / 500 white at top:`(50%, 66%)`.
- Now-playing artist (pink) 22 px / 300 / `text/now-playing` 14 px below.
- Optional uppercase tag 18 px / 300, white-25, letter spacing 2 px.
- Bottom-right: ambient clock `HH:MM` 64 px / 200 / `text/dim`, letter-spacing 6 px.
- Bottom-center: caption "RADIO MEGA" 15 px / 300 / `rgba(255,255,255,0.12)`, letter-spacing 3 px, uppercase.
- Stream-error banner (when 3 retries fail): at `(660, 340)`, **600 × 400**, bg `status/error-bg`, radius 20, contains:
  - Pink ⚠ icon 48 px.
  - "Stream error" 28 px / 700 / `brand/pink`.
  - Retry button (focusable, focusIndex 100): 22 px / 500 / white, bg `brand/pink/30`, border `brand/pink/50`, padding `12 48`, radius 12.

### 9.12 Ambient Mode (within RadioPlaying)

Activates after 3 minutes of remote-idle while playing. Floating gradient orbs animate using `amb-drift-1..4`, `amb-glow-breathe`, two slow-spin rings (`amb-ring-1`/`amb-ring-2` at 90 s and 70 s). Clock pulse 4 s. Dismissed on any key.

OLED-safe: total screen luminance kept below 35 %, animations slow (20–44 s cycles).

---

## 10. Components — Reusable

### 10.1 Card / Station Tile

- Box 232 × 232 px, radius 10 px, bg `surface/card-bg-soft`.
- Inner: artwork 200 × 130 (top), padding 16 px; below: name 24 px / 500 white (1 line ellipsis).
- Default: opacity 0.85.
- Focused: 1.0 opacity, `2px solid brand/pink`, `focus/glow-strong`, scale 1.04, transition 0.18 s ease.

### 10.2 Genre Card

- Box ~405 × 130 px, radius 16 px, bg `rgba(31,31,31,0.85)`.
- Title 24 px / 700 white, padding 24 px. Sub-text "{n} Stations" 20 px / 400 white-tertiary, gap 8 px.
- Focused: same border + shadow as Card.

### 10.3 Pill Button (Filled, Pink)

- Padding `12 px 48 px`, radius 12 px.
- Label 22 px / 600 white.
- Bg `brand/pink/30`, border `2 px solid brand/pink/50`.
- Focused: `box-shadow: focus/glow-strong`, scale 1.03.
- Pressed: bg `brand/pink/50`.

### 10.4 Search Input Pill

- Width content-driven (typically 720 px), height 64 px, radius 999 px, bg `rgba(31,31,31,0.85)`, border `1 px solid rgba(255,255,255,0.05)`.
- Magnifier icon 24 × 24, 24 px from left, color `text/tertiary`.
- Text 22 px / 400 white. Placeholder `text/quaternary`.
- Focused: border `2 px solid brand/pink`, glow.

### 10.5 Virtual Keyboard

- Grid of 3 cols × 9 rows of letter keys (English layout shown).
- Key 96 × 72, radius 12, bg `rgba(31,31,31,0.85)`, label 32 px / 500 white centered, transition 0.15 s.
- Focused key: bg solid `brand/pink`, label white, glow.
- SPACE wide key: width 296 × 72.
- Language switcher row: flag (24 × 16) + name 22 px / 500 white inside a rounded card 296 × 64.
- Languages: en, tr, ar, ru, de, fr, es, ja, zh, ko, el, hi, th (13).
- Bottom-right corner shows two hint chips: `←` Results / `OK` Type — 18 px / 400 / white-tertiary.

### 10.6 Sidebar Tile

See §7.2.

### 10.7 Help Modal

- Scrim: full-screen `rgba(0,0,0,0.75)`, z-index 9999.
- Card: `min 520 × auto, max 640`, bg `#1A1A2E`, radius 20, border `2 px solid rgba(255,65,153,0.3)`, shadow `0 0 40px rgba(255,65,153,0.15)`. Padding `48 px 56 px`.
- Title: "Remote Control Colors" — 32 px / 700 white center, margin-bottom 32.
- 4 rows, each: a 36 × 36 colored circle with `0 0 12px <color>80` glow + label 24 px / 500 / `#E0E0E0`. Gap 20 px.
  | Row | Color | Label key |
  |---|---|---|
  | 1 | `#E74C3C` (Red) | `help_red` → "Add to Favorites" |
  | 2 | `#27AE60` (Green) | `help_green` → "Play / Pause" |
  | 3 | `#F1C40F` (Yellow) | `help_yellow` → "Open Search" |
  | 4 | `#3498DB` (Blue) | `help_blue` → "Change Country" |
- Close button: pill button (§10.3), label "Close". Focusable: NO. The modal closes by pressing OK / BACK / RETURN on the remote (the page handler dispatches this).

### 10.8 Network Disconnected Modal

- Same scrim + card structure.
- Title "No Internet Connection" — pink.
- Body 22 px / 400 white-secondary "Please reconnect to continue".
- Auto-dismisses when online again.

### 10.9 Sleep Timer Display (RadioPlaying)

Pink badge top-right of player area: `💤 MM:SS` 24 px / 500 / `brand/pink`, padding `8 16`, radius 999, bg `brand/pink/15`.

---

## 11. Animations

| Name | Duration | Easing | Use |
|---|---|---|---|
| `fade-in` | 1 s | ease | Modal/page mount |
| `fade-up` | 1 s | ease | List items appearing |
| `marquee` | var | linear | Long station name auto-scroll |
| `shimmer` | 8 s | infinite | Skeleton loader |
| `spin` | 1 s | linear | Loading spinner |
| Focus transition | 0.18–0.25 s | ease | Card/tile focus color, scale |
| Pulse glow | 1.6 s | ease-in-out | Pink play button when active |
| `amb-drift-1..4` | 26–44 s | ease-in-out | Ambient orbs |
| `amb-glow-breathe` | 6 s | ease-in-out | Ambient center glow |
| `amb-ring-spin` | 90 s | linear | Outer ambient ring |
| `amb-ring-spin-rev` | 70 s | linear | Inner ambient ring |
| `amb-text-pulse` | 4 s | ease-in-out | Ambient track text |
| `equalizer-1..5` | 0.6 s | ease-in-out | Per-bar EQ |

---

## 12. Remote Control Mapping

This app is **D-pad first**. Touch / mouse is incidental.

### 12.1 Universal keys (Apple TV Siri Remote / Android TV D-pad)

| Action | Apple TV | Android TV (KeyEvent) |
|---|---|---|
| UP | swipe up / arrow up | `KEYCODE_DPAD_UP` (19) |
| DOWN | swipe down / arrow down | `KEYCODE_DPAD_DOWN` (20) |
| LEFT | swipe left | `KEYCODE_DPAD_LEFT` (21) |
| RIGHT | swipe right | `KEYCODE_DPAD_RIGHT` (22) |
| OK / Select | Click center | `KEYCODE_DPAD_CENTER` (23) / `ENTER` (66) |
| BACK | Back / Menu | `KEYCODE_BACK` (4) / `KEYCODE_ESCAPE` (111) |
| Play/Pause | Play/Pause | `KEYCODE_MEDIA_PLAY_PAUSE` (85) |
| Channel up / Page up | n/a (use Long-press up) | `KEYCODE_PAGE_UP` (92) / `KEYCODE_CHANNEL_UP` (166) |
| Channel down / Page down | n/a (use Long-press down) | `KEYCODE_PAGE_DOWN` (93) / `KEYCODE_CHANNEL_DOWN` (167) |

### 12.2 Color buttons (Android TV; tvOS — ignore)

| Color | Function | KeyEvent |
|---|---|---|
| Red | Add current station to Favorites | `KEYCODE_PROG_RED` (183) |
| Green | Play / Pause | `KEYCODE_PROG_GREEN` (184) |
| Yellow | Open Search | `KEYCODE_PROG_YELLOW` (185) |
| Blue | Open Country select | `KEYCODE_PROG_BLUE` (186) |

These map to the existing Help modal labels. On Apple TV, surface these as on-screen buttons within RadioPlaying & Discover instead.

### 12.3 Page-specific

- **Page Up / Channel Up / Page Down / Channel Down:** jump to global player bar (Play/Pause focused).
- **Discover:** RIGHT from sidebar enters first station; LEFT from any station returns to sidebar at index 0.
- **Genres / GenreList:** see §9.5/§9.6 for grid step sizes.
- **Country Select:** typing letters on the keyboard scrolls the list to the first match.
- **RadioPlaying:** OK = Play/Pause; BACK = previous page (NavigationContext restores focus); LEFT/RIGHT = previous/next favorite station (if applicable); UP/DOWN = focus controls (Retry button when error, etc.).
- **Modal (Help, Network, Exit):** OK or BACK closes the modal (focus does not move into it).

### 12.4 Two-step Back

On the home page (`/discover-no-user`), pressing BACK once shows the Exit modal:
- Title: "Exit Radio Mega?"
- Buttons: "Exit" (calls platform exit API) and "Cancel".
On Android TV: call `finishAffinity()` on Exit. On Apple TV: call `exit(0)` (or send the user to the system home with the Menu button).

---

## 13. Platform-Specific Considerations

### 13.1 Apple TV / tvOS / SwiftUI

- Use a single `UIWindowScene` with `preferredFocusEnvironments`.
- Replace HTML focus glow with native `.focused()` modifier + `.focusEffectDisabled(false)` for the system default + apply `brand/pink` glow via `shadow(color: .pink.opacity(0.5), radius: 16)`.
- Use `.scaleEffect(focused ? 1.04 : 1.0)` for cards and `.animation(.easeInOut(duration: 0.18))`.
- Background audio: enable `Audio, AirPlay, and Picture in Picture` capability + activate `AVAudioSession.Category.playback`.
- HLS streams: native `AVPlayer`; non-HLS: still use `AVPlayer` (it handles MP3/AAC/Icecast over HTTPS).
- For HTTP streams, **must** use the `/api/stream-proxy` HTTPS proxy from `themegaradio.com` (App Transport Security blocks plain HTTP).
- TV codes: Use SwiftUI `TextField` only inside the Country/Search keyboard component built in SwiftUI; do not rely on iOS keyboard.
- Fonts: bundle `Ubuntu-Regular.ttf`, `Ubuntu-Medium.ttf`, `Ubuntu-Bold.ttf`, `Ubuntu-Light.ttf`.

### 13.2 Android TV / Jetpack Compose for TV

- Min SDK 21 (recommend 23+); target LATEST.
- Use `androidx.tv.material3` library (TV-specific components: `Surface`, `Card`, `ImmersiveList`).
- AndroidManifest: `<uses-feature android:name="android.software.leanback" android:required="true" />`, `<intent-filter><category android:name="android.intent.category.LEANBACK_LAUNCHER" /></intent-filter>`.
- Remote: handle `dispatchKeyEvent` at the activity level for color buttons (not exposed via Compose). Convert to in-app events.
- Audio: ExoPlayer (`androidx.media3:media3-exoplayer`) supports HLS, MP3, Icecast, AAC, Ogg out of the box. Acquire `WakeLock` (`PARTIAL_WAKE_LOCK`) while playing to prevent doze.
- Background play: foreground service + `MediaSession` for cast/lock-screen controls.
- Cleartext: enable `android:usesCleartextTraffic="true"` in manifest **only** for the proxy fallback domain, or always use `https://api.themegaradio.com/api/stream-proxy?url=…`.
- Fonts: place `ubuntu_*.ttf` under `res/font/` and reference via `FontFamily(Font(R.font.ubuntu_regular))`.
- Image loading: Coil (`io.coil-kt:coil-compose:2.x`) with built-in cross-fade.

### 13.3 Performance budgets (both platforms)

- Cold launch to splash: ≤ 1.0 s.
- Splash to Discover with cached data: ≤ 1.5 s.
- Memory steady state: ≤ 220 MB.
- Frame rate: 60 fps for navigation, 30 fps acceptable in ambient mode.
- Audio latency on play: ≤ 1.5 s with cached HLS / direct MP3.

---

## 14. API Contract

Base: `https://api.themegaradio.com`

> Add query param `?tv=1` from the TV apps so the backend skips response compression (Samsung/LG performance trick — keep doing it on Apple/Android for parity).

### 14.1 Stations
| Method | Path | Notes |
|---|---|---|
| GET | `/api/stations/popular?limit=100&offset=0&country=ISO` | Paged Discover list |
| GET | `/api/stations/genre/:slug?limit=28&offset=0&country=ISO` | GenreList paged |
| GET | `/api/stations/:id` | Single station |
| GET | `/api/stations/:id/now-playing` | Live metadata (poll every 30 s) |
| GET | `/api/stations/search?q=…&limit=28` | Search |

### 14.2 Genres / Countries / Languages
| Method | Path | Cache |
|---|---|---|
| GET | `/api/genres?country=ISO` | 7 days |
| GET | `/api/genres/popular?country=ISO` | 7 days |
| GET | `/api/countries` | 30 days |
| GET | `/api/translations/:lang` | 7 days |

### 14.3 Stream helpers (provided by `themegaradio.com`)
| Method | Path | Use |
|---|---|---|
| GET | `/api/stream-proxy?url=<encoded>` | Mixed-content HTTP→HTTPS proxy; resolves `.m3u`/`.pls` & follows redirects (5). Pipes audio with CORS. Timeout 15 s. **Pass-through for `.m3u8` HLS.** |
| GET | `/api/stream-check?url=<encoded>` | HEAD validate (`{ok, contentType, statusCode, isPlaylist, responseTime}`). Timeout 5 s. |
| GET | `/api/stream-resolve?url=<encoded>` | Resolve playlist + redirects. Returns final direct stream URL + `{isPlaylist, isHLS, redirectCount}`. |

### 14.4 Auth / Cast
| Method | Path | Use |
|---|---|---|
| POST | `/api/auth/tv/code` | Returns `{code, deviceId, expiresIn}` (10 min). |
| GET | `/api/auth/tv/poll?code=…` | Polls every 3 s. On approval: `{token, user}`. |
| GET | `/api/cast/poll` (`Authorization: Bearer …`) | Returns `{stationId}` to auto-cast. Poll every 5 s while authed. |

### 14.5 Favorites / History (when authed)
| Method | Path |
|---|---|
| GET | `/api/users/me/favorites` |
| POST | `/api/users/me/favorites/:stationId` |
| DELETE | `/api/users/me/favorites/:stationId` |
| GET | `/api/users/me/history?limit=6` |
| POST | `/api/users/me/history` `{stationId}` |

### 14.6 Frontend retry strategy

Try in this order on stream errors (max 3 attempts, exponential backoff 1 s → 2 s → 4 s):

1. `station.url_resolved` direct.
2. `station.url` direct.
3. `https://api.themegaradio.com/api/stream-proxy?url=` (force-proxied).

If the URL ends in `.m3u`/`.pls`, **first** call `/api/stream-resolve` and use the returned direct URL.

---

## 15. State / Storage (localStorage equivalents)

On Apple TV use `UserDefaults`; on Android TV use `SharedPreferences` (or DataStore).

| Key | Type | Default |
|---|---|---|
| `app_language` | string | system locale → fallback `en` |
| `selected_country` | string | `Global` |
| `auto_play_mode` | enum `last_played` \| `random` \| `favorite` \| `none` | `none` |
| `sleep_timer` | int (minutes) | 0 |
| `accessibility_high_contrast` | bool | false |
| `accessibility_large_text` | bool | false |
| `recently_played` | array (max 6) | [] |
| `recommendation_history` | array (max 50) | [] |
| `auth_token` | string \| null | null |
| `auth_user` | json \| null | null |
| `last_station_id` | string \| null | null |

---

## 16. Caching Strategy

| Data | TTL |
|---|---|
| Countries | 30 days |
| Genres / Station lists | 7 days |
| Popular stations / station details | 24 hours |
| Search results | 24 hours |
| Now-playing metadata | 30 s |

Use a single in-memory cache layer (e.g. `URLCache` on tvOS, OkHttp `Cache` on Android TV, sized 64 MB). Persist large lists (countries, genres) to disk.

Pagination: each `(endpoint, offset)` is its own cache key. Prefetch the next page when current page renders.

---

## 17. Localization

48 languages supported. Translation strings come from `/api/translations/:lang`.

Key conventions used in this app (sample):

```
nav_discover, nav_genres, nav_search, nav_favorites, nav_country, nav_settings, nav_help
help_title, help_red, help_green, help_yellow, help_blue
btn_close, btn_retry, btn_exit, btn_cancel, btn_login, btn_logout
splash_loading
discover_popular_genres, discover_popular_stations, discover_for_you, discover_recently_played
favorites_empty_title, favorites_empty_cta
settings_language, settings_keyboard, settings_play_at_start, settings_sleep_timer, settings_accessibility, settings_account, settings_cast
sleep_15min, sleep_30min, sleep_1hr, sleep_2hr, sleep_off
auto_last_played, auto_random, auto_favorite, auto_none
network_offline_title, network_offline_body
exit_title, exit_body
tv_login_visit, tv_login_enter_code, tv_login_code_expires
```

Always pass through the translation function `t(key, fallback)`. If a key is missing, fall back to the English string in this spec.

---

## 18. Accessibility

- High Contrast mode: bumps `text/secondary` to `1.0 alpha`, increases focus border thickness 2 → 3 px.
- Large Text mode: scale all font sizes by 1.15.
- Persist both flags in storage; expose toggles in Settings → Accessibility.
- All focusable elements must announce their label (Android TV: `contentDescription`; tvOS: `.accessibilityLabel`).
- Min focus target: 96 × 72 px (matches our smallest tile, the keyboard key).

---

## 19. Page Flow Diagram

```
Splash ──► (first run? ──► Guide1→Guide2→Guide3→Guide4 ──►) Discover
                                                              │
   ┌──────────── Sidebar ──────────────────────────────┐
   │ Discover  Genres  Search  Favorites  Country  Settings  Help │
   └─┬───────┬───────┬───────┬─────────┬────────┬────────┬─┘
     │       │       │       │         │        │        │
     ▼       ▼       ▼       ▼         ▼        ▼        ▼
   (grid) Genres  Search  Favorites  Country  Settings  Modal
            │     keyboard            keyboard  │
            ▼                                   ▼
        GenreList                          Account/Login
            │                                   │
            ▼                                   ▼
      RadioPlaying ◄────── Cast (background poll, auto-route)
            │
       Ambient (after 3 min idle)
```

Back button always returns to the previous focused element on the previous page (NavigationContext pattern: push focus state on navigation, restore on back).

---

## 20. QA Checklist (per platform)

- [ ] Cold start ≤ 1.5 s to Discover (with cached genres/countries).
- [ ] All 6 sidebar items focusable; Help focus reachable from index 5 (`DOWN`).
- [ ] Help modal opens on `OK` (Discover, Genres, Search, Favorites, Settings, Country).
- [ ] Help modal closes on second `OK` or `BACK`.
- [ ] Pink Help button doesn't lose focus when entering/leaving modal.
- [ ] All grids navigate with one full row step on `UP/DOWN` and one column step on `LEFT/RIGHT`.
- [ ] Stream auto-retries 3× with 1/2/4 s backoff before showing the pink error banner.
- [ ] Page Up / Page Down / Channel Up / Channel Down jump focus to the global player.
- [ ] Network disconnect modal appears on offline; auto-dismisses on reconnect.
- [ ] Audio pauses on app suspend, resumes on resume.
- [ ] Sleep timer auto-pauses when expired and clears badge.
- [ ] Ambient mode activates at 3 min idle (only while playing) and dismisses on any key.
- [ ] Settings → Language change persists and reloads localized strings live.
- [ ] Login: 6-digit code, 10:00 countdown, polls every 3 s, redirects on auth.
- [ ] Cast: while authed, polls every 5 s, auto-plays incoming station + routes to RadioPlaying.
- [ ] Sidebar logo visible top-left; never overlapped by hero.
- [ ] All text uses Ubuntu (not the system fallback).
- [ ] Dark background `#0E0E0E` everywhere — no leaks of pure `#000` or `#FFF`.

---

## 21. Asset Inventory

All required raster + vector assets live under `tv-app/images/`. Bundle these into the new platforms 1:1.

Critical:
- `logo.png` — wordmark + brand mark (~156 × 50).
- `icon.png` — app launcher icon (1024 × 1024 master).
- `radio-icon.svg`, `music-icon.svg`, `search-icon.svg`, `heart-icon.svg`, `globe-icon.svg`, `settings-icon.svg`.
- `hand-crowd-disco-1.png` — Discover/Favorites hero.
- `discover-background.png` — alternative hero on Discover.
- `fallback-station.png`, `fallback-favicon.svg` — when station artwork is missing.
- `cast-icon.svg`, `logout-icon.svg`, `arrow.svg`, `path-8.svg` (now-playing dot icon).
- `frame445.png` — splash/onboarding decorative frame.
- Country flags are loaded by ISO code from the API (URL `https://flagcdn.com/{iso}.svg` is a good public fallback).

---

## 22. Build & Deliverable Notes

- **Apple TV:** ship as a tvOS app (deployment target 16.0). Provide a 1920 × 1080 launch screen + scaled marketing assets. Use App Store Connect for submission. Ensure ATS is satisfied (proxy all HTTP audio).
- **Android TV:** ship as a Leanback APK / AAB. Banner asset 320 × 180. Submit via Play Console with TV declaration. Add `D-pad` test in pre-launch report.
- **Branding consistency:** keep the same string "Mega Radio" / "themegaradio.com/tv" across stores and marketing copy.

---

## End

If anything in this spec conflicts with the reference web build (`tv-app/`), the **web build wins** — refer to the corresponding `src/pages/*.tsx` file or take a fresh screenshot from `/#/<route>` and re-measure. This document is intentionally exhaustive so the Apple TV and Android TV teams can build without additional design reviews.
