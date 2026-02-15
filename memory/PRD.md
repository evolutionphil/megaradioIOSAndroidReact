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

#### Session 2 Fixes (Current):
1. **isAnimating Error in Onboarding** - FIXED: Removed unused `isAnimating` variable reference
2. **Guest Favorites in Player Page** - FIXED: Player.tsx now uses favoritesStore instead of redirecting to login
3. **Genre Sorting** - FIXED: Genres now sorted by station count (most stations first)
4. **Genres Local Caching** - FIXED: Added AsyncStorage caching for genres (24hr TTL)
5. **Audio Player Play Error (Expo Go)** - IN PROGRESS: 
   - Root cause: `expo-audio` native module lifecycle issue in Expo Go
   - Added pendingPlay state with useEffect to wait for player ready state
   - This is a known Expo Go limitation - may require development build for full fix

## Key Files
- `frontend/app/onboarding.tsx` - Fixed isAnimating reference
- `frontend/app/player.tsx` - Fixed guest favorites support
- `frontend/app/(tabs)/genres.tsx` - Added sorting and local caching
- `frontend/src/hooks/useAudioPlayer.ts` - Audio playback with pending play fix
- `frontend/src/components/MiniPlayer.tsx` - Mini player controls
- `frontend/src/store/favoritesStore.ts` - Favorites state management

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: gey14853@outlook.com / Muhammed5858

## Known Issues

### Critical - Expo Go Audio Playback
**Error**: `FunctionCallException: Calling the 'play' function has failed - NativeSharedObjectNotFoundException`

**Cause**: When changing audio source in expo-audio, the hook creates a new player instance but the old reference becomes invalid. Expo Go has stricter native module loading than development builds.

**Workarounds Applied**:
1. Added pendingPlay state to wait for player ready
2. Use useEffect to trigger play when new player is ready
3. Added retry logic with increasing delays

**Recommended Solution**: Build a development build instead of using Expo Go:
```bash
eas build --profile development --platform android
```

## Backlog

### P1 - High Priority
1. **Audio Playback on Expo Go** - May require development build
2. **API Performance Test** - Measure caching performance improvement
3. **Sleep Timer Fix** - Investigate and fix sleep timer functionality

### P2 - Medium Priority
1. **Glow Effect and Static Equalizer** - UI improvements for player screen
2. **Social Sign-In Finalization** - Complete OAuth integration
3. **Post-login Navigation Behavior** - Verify on Expo Go

## Test Reports
- `/app/test_reports/iteration_0.json` - Previous testing session
- `/app/test_reports/iteration_21.json` - Bug fixes verification

## User Language
Turkish (Türkçe)
