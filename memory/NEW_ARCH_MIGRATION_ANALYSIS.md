# MegaRadio — React Native New Architecture Migration Analysis

**Date:** May 26, 2026  
**Current setup:** RN 0.81.5, Expo SDK ~54.0.34, `newArchEnabled: false`  
**Goal:** Investigate feasibility of migrating to New Architecture (Fabric + TurboModules + Bridgeless) without breaking existing iOS/Android/CarPlay/WatchOS/TV functionality.

---

## TL;DR

> **DON'T MIGRATE YET.** 1 hard blocker + 2 soft blockers + 3 risk-rich legacy bridges. Re-evaluate Q3 2026 when `react-native-google-cast v5` and `@g4rb4g3/react-native-carplay` v3 ship.

| Verdict | Reason |
|---------|--------|
| 🟥 **Block** | `react-native-google-cast` v4.x has NO Fabric support; v5 rewrite is still in-flight (no public release). Migrating would break the Cast button on every screen. |
| 🟧 **Risk** | `@g4rb4g3/react-native-carplay` 2.7.x has no public Fabric support (only fork `@0xtun4/react-native-carplay` advertises it — switching forks is a separate ~2-day port). |
| 🟧 **Risk** | `react-native-track-player` v4.1.2 (current) is legacy-arch; v5 supports New Arch but is a **major** version with API breaking changes (event listener signature, useTrackPlayerEvents hook, queue API). Estimated ~1-day migration of `/app/frontend/src/services/TrackPlayer*`. |
| 🟧 **Risk** | `react-airplay` is a thin Obj-C bridge — checks needed for Fabric paint regressions (no Fabric support announced on npm). |
| 🟩 OK | All other deps (Firebase, Reanimated 3, Screens 4, MMKV, Nitro, IAP, Gesture Handler, SafeArea, SVG, WebView, AsyncStorage, NetInfo, Google Mobile Ads, Google Sign-In) have official New Arch support in the installed versions. |

---

## Why is the legacy warning being printed?

```
The app is running using the Legacy Architecture. The Legacy Architecture
is deprecated and will be removed in a future version of React Native.
```

**Source:** `react-native/Libraries/Utilities/registerCallableModule.js` — emitted by RN 0.80+ when `RCT_NEW_ARCH_ENABLED=0` (our case).

**Impact today:** ⚠️ **Cosmetic only.** App runs fine. The legacy architecture is *deprecated*, but not *removed* — RN team's timeline says full removal earliest RN 0.83 / Q4 2026. We have at least 6-9 months runway.

---

## Per-Dependency Status (sorted by risk)

### 🟥 BLOCKER

#### `react-native-google-cast` `^4.9.1`
- **Status:** NO New Arch support in 4.x. Maintainer (Cast SDK) said it would ship in the **v5 rewrite**.
- **v5 progress:** Open GitHub tracker (#546) shows ongoing work, no public alpha as of May 2026.
- **What breaks:** `<GoogleCast.CastButton />` is rendered via legacy ViewManager. Under Fabric → either crashes (`Invariant Violation: requireNativeComponent`) or renders zero-size invisible. Used on every `RadioPlayingScreen.tsx` and `GlobalPlayer.tsx`.
- **Workaround if migration is critical:** Conditionally hide Cast UI behind `Platform.constants.reactNativeVersion.major >= 0 && newArch === false` flag — defeats the purpose.

### 🟧 SIGNIFICANT RISK

#### `react-native-track-player` `^4.1.2`
- **Status (v4.x):** Legacy arch only.
- **v5 rewrite:** Built on New Architecture, full TurboModule support announced on rntp.dev.
- **Migration cost:** v4→v5 has **breaking API changes**:
  - `TrackPlayer.addEventListener(Event.PlaybackState, cb)` → new callback shape (state is now an object not a string)
  - `useTrackPlayerEvents` hook signature changed
  - Queue API revamped (`add()` now takes options object)
- **Files affected (grep'd):**
  - `/app/frontend/src/services/TrackPlayer.ts` (~150 lines)
  - `/app/frontend/src/contexts/AudioContext.tsx` (~600 lines, all play/pause/state logic)
  - `service.js` (background audio service registration)
- **Estimated effort:** 1 full day with regression testing.

#### `@g4rb4g3/react-native-carplay` `^2.7.22`
- **Status:** No explicit New Arch support in 2.x. README does not mention Fabric/TurboModules.
- **Alternative fork:** `@0xtun4/react-native-carplay` advertises "Full support for Fabric and TurboModules" on npm.
- **Migration cost:** Switching forks requires updating `nativeBridge.ts`, the CarPlay templates folder, and verifying `RNCarPlay.connect()` API parity. Plus our just-fixed `CarPlaySceneDelegate.swift` would need to be re-verified against the new fork's signatures.
- **Estimated effort:** 2 days including manual CarPlay simulator validation.

#### `react-airplay` `^1.2.0`
- **Status:** Tiny Obj-C bridge. No Fabric/TurboModule support announced. Maintainer activity is low.
- **What it provides:** `<AirplayButton />` + `useAirplayConnectivity()` hook.
- **Risk under Fabric:** ViewManager-based AirplayButton may render zero-size or crash.
- **Mitigation:** Fork & add Codegen spec ourselves (~half day) OR drop AirplayButton in favor of system Now-Playing controls (degraded UX).

### 🟩 NO ISSUES (verified)

| Package | Installed | New Arch Status |
|---------|-----------|-----------------|
| `react-native-reanimated` | `^3.16.0` | ✅ Full Fabric/TurboModule since v3.10 |
| `react-native-screens` | `~4.16.0` | ✅ Full New Arch in v4 |
| `react-native-gesture-handler` | `~2.28.0` | ✅ Full New Arch since 2.16 |
| `react-native-safe-area-context` | `~5.6.0` | ✅ Full New Arch in v5 |
| `react-native-svg` | `15.12.1` | ✅ Full Fabric since 15.0 |
| `react-native-webview` | `13.15.0` | ✅ Full New Arch in 13.10+ |
| `react-native-mmkv` | `^4.2.0` | ✅ Built ON Nitro (TurboModule by design) |
| `react-native-nitro-modules` | `^0.35.2` | ✅ Self-explanatory — TurboModule framework |
| `react-native-iap` | `^14.7.19` | ✅ v14 uses Nitro (TurboModule) |
| `@react-native-async-storage/async-storage` | `^2.2.0` | ✅ v2 is TurboModule |
| `@react-native-community/netinfo` | `11.4.1` | ✅ v11 is Fabric-ready |
| `@react-native-firebase/*` | `^23.8.8` | ✅ v22+ have full New Arch (with deprecation warnings on namespaced API — separate cleanup) |
| `react-native-google-mobile-ads` | `14.2.0` | ✅ v14 is Fabric-ready |
| `@react-native-google-signin/google-signin` | `^16.1.2` | ✅ v16 is TurboModule |

---

## Recommended Path

### NOW (within this sprint)
1. **Do not migrate.** Block on `react-native-google-cast v5`.
2. Add CI banner: when running build, print "Legacy Arch — review NEW_ARCH_MIGRATION_ANALYSIS.md every 30 days".
3. Keep `newArchEnabled: false` in `app.json`, `Podfile.properties.json`, `gradle.properties`.

### MONITOR (monthly)
- `react-native-google-cast/issues/546` — watch for v5 release.
- `doublesymmetry/react-native-track-player` releases — wait for v5 stable.
- `@g4rb4g3/react-native-carplay` README — watch for Fabric announcement, or test `@0xtun4/react-native-carplay` parity.

### MIGRATE (when blockers clear)
Suggested order to minimize regression surface:
1. Pre-flight: Enable `RCT_NEW_ARCH_ENABLED=1` in a **branch only**, `expo prebuild --clean`, see what breaks.
2. Upgrade `react-native-track-player` v4 → v5; fix all `Event.*` callbacks & `useTrackPlayerEvents` consumers.
3. Upgrade `react-native-google-cast` v4 → v5.
4. Either upgrade `@g4rb4g3/react-native-carplay` to a Fabric-supporting fork, OR port to `@0xtun4/react-native-carplay`.
5. Patch or fork `react-airplay` for Fabric.
6. Re-run **full QA on iPhone + CarPlay + WatchOS + Android + Android TV**.
7. Re-run `yarn ios:setup` (scene delegate registration is independent of New Arch — should keep working).
8. Flip `newArchEnabled: true`, ship to TestFlight first.

### KNOWN PITFALL FROM CURRENT CODEBASE
Our `PhoneSceneDelegate` + `AppDelegate` wiring uses the **UIScene lifecycle** which is *already* the standard for both architectures. So the scene fix we just landed will keep working under New Arch — no extra changes needed there.

---

## Estimated Migration Effort
| Phase | Effort |
|-------|--------|
| Dependency upgrades | 1-2 days |
| TrackPlayer v5 API rewrite | 1 day |
| CarPlay fork port (if needed) | 2 days |
| AirPlay fork (worst case) | 0.5 day |
| Full QA across 5 platforms | 2 days |
| **Total** | **6-8 working days** |

---

## Decision Owner

Re-read this doc before changing `newArchEnabled`. Update the "MONITOR" section dates each time you check.

_Last reviewed: May 26, 2026_
