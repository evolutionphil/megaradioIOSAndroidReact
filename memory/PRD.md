# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: expo-audio (migrated from expo-av)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens
- **Build**: EAS Build with Legacy Architecture (New Arch disabled for stability)

## Core Features (Implemented)
1. **Radio Streaming**: In-app audio playback with expo-audio + Lock Screen/Control Center integration
2. **Tab Navigation**: Discover | Genres | Favorites | Profile
3. **Local Caching**: TV init data and genres cached with stale-while-revalidate pattern
4. **Guest User Support**: Settings, profile, and favorites accessible without login
5. **Favorites**: Add/remove favorites (syncs on login, works for guests too)
6. **Genres**: Browse all genres sorted by station count
7. **Popular Stations**: Shows popular stations from user's country
8. **TV Cast**: Cast radio to TV app (Samsung/LG Smart TVs)
9. **Client-Side Sorting**: A-Z, Z-A, Popular, Newest, Oldest sorting for all station lists

## Implementation Status

### Latest Session - December 2025 (Current)

#### A-Z Sorting Bug Fix (P0) - ✅ FIXED
**Problem**: Sorting options (A-Z, Z-A, Popular, Newest, Oldest) were not working on any station list page.
**Root Cause**: Backend API doesn't reliably support `sort` and `order` query parameters.
**Solution**: Implemented client-side sorting in `all-stations.tsx` and `genre-detail.tsx`:
- Added `sortStations()` callback function with Turkish locale support (`'tr'`)
- Applied sorting to `filteredStations` useMemo after search filtering
- Removed unused API sort parameters since backend ignores them

**Files Modified**:
- `frontend/app/all-stations.tsx` - Added client-side sorting
- `frontend/app/genre-detail.tsx` - Added client-side sorting
- `frontend/src/hooks/useQueries.ts` - Cleaned up debug logs

### Previous Session - iOS Build Stabilization

#### Critical Bug Fixes (P0) - VERIFIED
1. **iOS Build Crash Fix** - ✅ FIXED
   - Disabled Expo New Architecture
   - Downgraded react-native-reanimated v4 to v3
   - Removed incompatible packages (react-native-worklets, @react-native-community/slider)

2. **Background Audio & Lock Screen** - ✅ FIXED
   - Integrated `updateLockScreenMetadata` API
   - Shows Now Playing info on iOS Lock Screen and Android Notification

3. **Global MiniPlayer** - ✅ FIXED
   - Moved from tabs layout to root layout for visibility on all screens

4. **Logo Fallback** - ✅ FIXED
   - Default logo displayed for stations without one

5. **Clickable Notification Icon** - ✅ FIXED
   - Added navigation handler to bell icon

## Key Files
- `frontend/app/all-stations.tsx` - All stations with client-side sorting
- `frontend/app/genre-detail.tsx` - Genre detail with client-side sorting
- `frontend/src/components/SortBottomSheet.tsx` - Sort modal UI
- `frontend/src/store/favoritesStore.ts` - Favorites with built-in sorting
- `frontend/src/hooks/useAudioPlayer.ts` - Audio playback
- `frontend/src/providers/AudioProvider.tsx` - Lock screen metadata
- `frontend/app/_layout.tsx` - Root layout with global MiniPlayer

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: user@emergent.properties / string

## Known Issues

### Blocked on User Action
1. **Social Logins (Google & Apple)** - P0
   - Google: User needs to configure Android OAuth Client in Google Cloud Console
   - Apple: User needs to set `APPLE_CLIENT_ID` and `APPLE_TEAM_ID` on backend

### Blocked on Backend
1. **Discoverable Genres Images** - P1 (backend not returning images)
2. **Genre Station Count Inconsistency** - P1 (backend data issue)

## Backlog

### P1 - High Priority
1. **Local Genre Caching** - Add AsyncStorage caching for genre list
2. **Android App Store Build** - Create production build for Android

### P2 - Medium Priority
1. **Sleep Timer Fix** - Investigate and fix sleep timer functionality
2. **Glow Effect and Static Equalizer** - UI animations for player screen

## Build Notes
- **Architecture**: Legacy (New Arch disabled via `newArchEnabled: false` in app.json)
- **Reanimated**: v3 (v4 caused crashes)
- **EAS Build**: Use `eas build --platform ios` for production builds

## User Language
Turkish (Türkçe)
