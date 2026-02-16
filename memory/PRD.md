# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: expo-audio (migrated from expo-av)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens

## Core Features (Implemented)
1. **Radio Streaming**: In-app audio playback with expo-audio
2. **Tab Navigation**: Discover | Genres | Favorites | Profile
3. **Local Caching**: TV init data and genres cached with stale-while-revalidate pattern
4. **Guest User Support**: Settings, profile, and favorites accessible without login
5. **Favorites**: Add/remove favorites (syncs on login, works for guests too)
6. **Genres**: Browse all genres sorted by station count
7. **Popular Stations**: Shows popular stations from user's country

## Implementation Status

### Completed (December 2025)
- [x] Migrated from expo-av to expo-audio
- [x] Integrated /api/tv/init endpoint for initial data loading
- [x] Implemented AsyncStorage caching for tv/init (24hr TTL, stale-while-revalidate)
- [x] Fixed Popular Stations display (was showing "No stations found")
- [x] Fixed Genres Tab (now shows all 27+ genres, not just 3 from tv/init)
- [x] Fixed Profile page UI for guest users
- [x] Added missing styles for Profile page components
- [x] Improved Favorites sorting logic (case-insensitive)
- [x] Added login sync for local favorites
- [x] **Guest Favorites** - Non-logged-in users can now add favorites via MiniPlayer heart icon
- [x] **Heart Icon Toggle** - MiniPlayer shows filled/outline heart based on favorite status
- [x] **Favorites Auto-load** - App loads favorites from AsyncStorage on startup
- [x] **Onboarding Animations Removed** - Instant transitions between steps

### Bug Fixes (Latest Session - December 2025)

#### Session 1 Fixes (Verified):
1. **Guest Language Navigation** - Fixed path from `/language` to `/languages` in profile.tsx
2. **Genre Country Filtering** - Fixed to use country name instead of countryCode for API filtering
3. **MiniPlayer Button Events** - Restructured to avoid nested TouchableOpacity issues
4. **GenreCard Text Alignment** - Fixed subtitle alignment with `alignItems: 'flex-start'`
5. **Stale Favorites on Logout** - Logout now clears AsyncStorage favorites
6. **MiniPlayer Play/Pause Error** - Fixed by removing nested TouchableOpacity structure

#### Session 2 Fixes (VERIFIED by Testing Agent - iteration_22):
1. **Audio Playback Crash Fix** - ✅ FIXED: Added 150ms delay + retry mechanism in useAudioPlayer.ts to prevent NativeSharedObjectNotFoundException
2. **Genre Sorting by Station Count** - ✅ FIXED: Home screen and genres page now sort by stationCount (most popular first)
3. **Guest Favorites in Player Page** - ✅ FIXED: Player.tsx uses favoritesStore.toggleFavorite without auth redirect
4. **Full-Screen Auth Pages** - ✅ FIXED: auth-options removed modal presentation, now opens as full-screen page

## Key Files
- `frontend/src/hooks/useAudioPlayer.ts` - Audio playback with pendingPlay pattern (150ms delay + retry)
- `frontend/app/(tabs)/index.tsx` - Home screen with sorted genres (line 143-148)
- `frontend/app/genres.tsx` - Genres page with sorted list (line 30-36)
- `frontend/app/player.tsx` - Player with guest favorites support (line 290-301)
- `frontend/app/_layout.tsx` - Navigation without modal for auth (line 219)
- `frontend/app/auth-options.tsx` - Full-screen auth options
- `frontend/src/store/favoritesStore.ts` - Favorites state management for guests + authenticated

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: gey14853@outlook.com / Muhammed5858

## Audio Playback Technical Note
**Issue**: NativeSharedObjectNotFoundException in Expo Go when calling play()
**Root Cause**: expo-audio native module lifecycle issue - play() called before native player fully initialized
**Solution Applied**: pendingPlay state pattern with 150ms delay + automatic retry (500ms) if native error occurs

## Backlog

### P1 - High Priority
1. **API Performance Test** - Measure caching performance improvement
2. **Sleep Timer Fix** - Investigate and fix sleep timer functionality

### P2 - Medium Priority
1. **Glow Effect and Static Equalizer** - UI improvements for player screen
2. **Social Sign-In Finalization** - Complete OAuth integration
3. **Local Genre Caching** - Add AsyncStorage caching for genre list

## Test Reports
- `/app/test_reports/iteration_22.json` - Latest bug fixes verification (100% success)
- `/app/test_reports/iteration_3.json` - Previous testing session

## User Language
Turkish (Türkçe)
