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

### Completed (February 2025)
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
- [x] **Favorites Auto-load** - App loads favorites from AsyncStorage on startup for both guest and logged-in users

### Bug Fixes (February 2025)
1. **Popular Stations Empty**: Fixed React Query cache key mismatch between initializeApp and usePopularStations
2. **Genres Tab Limited**: Changed from usePrecomputedGenres to useGenres hook to fetch all genres
3. **Profile UI Broken**: Added missing StyleSheet properties (name, section, rowIcon, etc.)
4. **Favorites Sorting**: Fixed toLowerCase comparison for A-Z/Z-A sorting
5. **MiniPlayer Button Events**: Fixed event propagation issue where control buttons were triggering parent navigation

## Key Files
- `frontend/src/services/tvInitService.ts` - Local caching implementation
- `frontend/src/hooks/useQueries.ts` - Data fetching hooks
- `frontend/app/(tabs)/genres.tsx` - Genres tab screen
- `frontend/app/(tabs)/profile.tsx` - Profile screen
- `frontend/app/(tabs)/favorites.tsx` - Favorites screen
- `frontend/src/store/favoritesStore.ts` - Favorites state management

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: gey14853@outlook.com / Muhammed5858

## Backlog (P1-P2)
1. Guest Favorites with local storage and login sync
2. Sleep Timer fix
3. Glow Effect and Static Equalizer UI improvements
4. Social Sign-In finalization

## User Language
Turkish (Türkçe)
