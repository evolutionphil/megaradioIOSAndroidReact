# 📱 MegaRadio iOS (React Native) — Performance Report & Optimization Plan
Date: 2026 (session continuation)
Scope: `/app/frontend` (Expo RN app, iOS focus). No functional or design changes.

## Method
Static analysis of the codebase: file sizes, render patterns, list virtualization,
context/memoization, logging, image loading, babel/engine config.

---

## 🔴 Findings (by impact)

### P0-1 — Global AudioContext `value` NOT memoized  (BIGGEST WIN)
`src/providers/AudioProvider.tsx:1593` created a **new `value` object on every
render**. `AudioProvider` wraps the whole app and holds many `useState`/`useEffect`/
Track-Player hooks that fire frequently (playback state, metadata, watch commands…).
Every such render produced a new context object → **all 14 `useContext(AudioContext)`
consumers re-rendered**, even when their consumed values were unchanged.
→ Fix: `useMemo(value, [stable fns + currentStation, playbackState, streamUrl, isPlaying])`.

### P0-2 — Remote `sendLog('AUDIO_PROVIDER_RENDERING')` on EVERY render
Same file, in the render body. A telemetry/log call fired on every single render of
the global provider → wasted JS cycles + network. → Removed.

### P0-3 — 768 `console.log/warn/info` shipped to production
No `babel-plugin-transform-remove-console`. On iOS **release** builds these run on the
JS thread and bridge, adding measurable jank (especially inside playback/render loops).
→ Fix: strip console.* in production only (dev keeps them).

### P1-1 — Only 2 `React.memo` in the whole app
List item rows re-render with their parent. FlatList item components (station rows,
user rows, genre items) should be `React.memo` so scrolling/refetch doesn't re-render
every visible row. → Memoize hot list-item components.

### P1-2 — Large FlatLists missing virtualization tuning
`favorites`, `users`, `all-stations` etc. use FlatList without
`removeClippedSubviews / initialNumToRender / maxToRenderPerBatch / windowSize`.
→ Add conservative tuning props (safe defaults).

### P2-1 — All images use RN `<Image>` (0 files use `expo-image`)
No disk/memory cache → station logos re-download on every appearance, more memory
churn on iOS. `expo-image` gives caching + lower memory. → RECOMMENDATION (larger,
riskier migration — done incrementally via the shared logo components only if desired).

### P2-2 — Very large screen files (player 1330, profile 1206, index 1151, AudioProvider 1615)
Not a direct perf bug but increases re-render surface & maintenance risk.
→ Backlog: split into smaller memoized subcomponents.

### Config
- Hermes: default for RN 0.81 (good). `newArchEnabled: false` — leave as-is (risky to flip).

---

## ✅ Applied in this pass (no behavior/design change)
1. `AudioProvider` context `value` wrapped in `useMemo` (P0-1).
2. Removed per-render `sendLog('AUDIO_PROVIDER_RENDERING')` (P0-2).
3. Production-only `transform-remove-console` babel plugin (P0-3).
4. `React.memo` on hot list-item components + FlatList tuning props (P1-1/P1-2).

## 📋 Backlog (opt-in, larger)
- Migrate shared station-logo rendering to `expo-image` for caching (P2-1).
- Split player.tsx / profile.tsx / AudioProvider.tsx into memoized subcomponents (P2-2).
- Add `getItemLayout` to fixed-height lists for instant scroll.
