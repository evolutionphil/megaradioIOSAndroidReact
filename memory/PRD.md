# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo, TypeScript, Expo Router, React Query, Zustand
- **Audio**: expo-audio (migrated from expo-av)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens

## Core Features (Implemented)
1. **Radio Streaming**: In-app audio playback with expo-audio
2. **Tab Navigation**: Discover | Genres | Favorites | Profile
3. **Local Caching**: TV init data cached with stale-while-revalidate pattern
4. **Guest User Support**: Settings and profile accessible without login
5. **Favorites**: Add/remove favorites (syncs on login)
6. **Genres**: Browse all genres with station counts
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

### Bug Fixes (December 2025 - Latest Session)
1. **Guest Language Navigation** - Fixed path from `/language` to `/languages` in profile.tsx
2. **Genre Country Filtering** - Fixed to use country name instead of countryCode for API filtering
3. **MiniPlayer Button Events** - Restructured to avoid nested TouchableOpacity issues causing uncaught errors on Expo Go
4. **GenreCard Text Alignment** - Fixed subtitle alignment with `alignItems: 'flex-start'`
5. **Stale Favorites on Logout** - Logout now clears AsyncStorage favorites for clean guest state
6. **MiniPlayer Play/Pause Error** - Fixed by removing nested TouchableOpacity structure

### Previous Bug Fixes (February 2025)
1. **Popular Stations Empty**: Fixed React Query cache key mismatch
2. **Genres Tab Limited**: Changed from usePrecomputedGenres to useGenres hook
3. **Profile UI Broken**: Added missing StyleSheet properties
4. **Favorites Sorting**: Fixed toLowerCase comparison for A-Z/Z-A sorting

## Key Files
- `frontend/src/services/tvInitService.ts` - Local caching implementation
- `frontend/src/hooks/useQueries.ts` - Data fetching hooks
- `frontend/app/(tabs)/genres.tsx` - Genres tab screen
- `frontend/app/(tabs)/profile.tsx` - Profile screen (guest language nav fixed)
- `frontend/app/genre-detail.tsx` - Genre stations with country filtering
- `frontend/src/components/MiniPlayer.tsx` - Mini player controls
- `frontend/src/components/GenreCard.tsx` - Genre card UI
- `frontend/src/store/authStore.ts` - Auth state with logout cleanup
- `frontend/src/store/favoritesStore.ts` - Favorites state management

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: gey14853@outlook.com / Muhammed5858

## Backlog

### P1 - High Priority
1. **API Performance Test** - Measure and report caching performance improvement
2. **Sleep Timer Fix** - Investigate and fix sleep timer functionality

### P2 - Medium Priority
1. **Glow Effect and Static Equalizer** - UI improvements for player screen
2. **Social Sign-In Finalization** - Complete OAuth integration
3. **Post-login Navigation Behavior** - Verify on Expo Go

## API Performance
- **API Response Time**: ~370-450ms per request
- **Response Size**: ~65KB (compressed)
- **Local Cache**: 24hr TTL, stale-while-revalidate pattern
- **Performance Gain**: ~99% faster app startup with cache

## User Language
Turkish (Türkçe)

## Test Reports
- `/app/test_reports/iteration_0.json` - Previous testing session
- `/app/test_reports/iteration_21.json` - Latest bug fixes verification (all 6 bugs PASSED)
