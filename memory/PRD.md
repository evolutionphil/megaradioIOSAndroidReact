# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. Backend API at `https://themegaradio.com`. UI must be pixel-perfect implementation of Figma designs.

## Tech Stack
- React Native with Expo SDK 54
- TypeScript
- Expo Router
- Zustand (State Management)
- React Query (Data Fetching)
- expo-av for audio playback
- Custom carousel with PanResponder for Car Mode

## Core Features

### Implemented
- [x] Home Screen with multiple sections (Genres, Popular, Recently Played, Radios Near You, Favorites From Users)
- [x] 3-Column Grid Layout
- [x] Unified Search Functionality
- [x] Custom Tab Bar Design (Discover, Favorites, Profile, Records)
- [x] Sticky Mini Player
- [x] expo-av Audio Playback (Expo Go compatible, singleton AudioManager)
- [x] Full-Screen Player UI (fullScreenModal presentation)
- [x] Car Mode Screen with Custom Carousel
- [x] Now Playing API with ICY Metadata
- [x] API Key Integration (X-API-Key header on all requests)
- [x] Simulated Glow Effect (multi-layer View components for iOS blur simulation)

### Session 4 Bug Fixes (Feb 2026)
1. **Audio Race Condition Fix (P0)**: Added `_playId` monotonic counter to `AudioManager.play()`.
   - Each play() call increments `_playId` and checks it at two points: after stopping old sound, and after creating new sound.
   - If a newer play() was called in the meantime, stale calls bail out and clean up orphaned sounds.
   - Eliminates the multiple simultaneous streams bug.

2. **Car Mode Frozen Station List (P0)**: Replaced `useMemo` with `useState` + `useRef` in `CarModeScreen.tsx`.
   - Station list is frozen when Car Mode opens (`stationsInitRef` flag).
   - Prevents re-ordering when playing a new station triggers similar-stations refetch.
   - `displayedStation` computed from `stations[carouselIndex]` instead of global `currentStation`.

3. **Player SafeArea Fix (P1)**: Replaced `SafeAreaView` with `useSafeAreaInsets()` in `player.tsx`.
   - Applied `paddingTop: insets.top` to container View.
   - Fixes content being hidden behind iOS status bar in fullScreenModal presentation.

4. **Glow Effect Enlarged (P2)**: Increased glow container from 450px to 650px.
   - 8 layered circles with opacity 0.04 to 0.17.
   - Applied to both Home (`index.tsx`) and Discover (`discover.tsx`) screens.

## Key Files
- `/app/frontend/src/hooks/useAudioPlayer.ts` - Audio singleton with race condition fix
- `/app/frontend/src/components/CarModeScreen.tsx` - Car Mode with frozen station list
- `/app/frontend/app/player.tsx` - Player with useSafeAreaInsets
- `/app/frontend/app/(tabs)/index.tsx` - Home screen with enlarged glow
- `/app/frontend/app/(tabs)/discover.tsx` - Discover with enlarged glow
- `/app/frontend/src/services/api.ts` - Global Axios with X-API-Key
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/backend/server.py` - Now Playing API with ICY metadata

## API Endpoints
- `GET /api/stations/popular` - Popular stations (themegaradio.com)
- `GET /api/stations/similar/{id}` - Similar stations
- `POST /api/resolve-stream` - Resolve stream URL
- `GET /api/now-playing/{station_id}` - Real ICY metadata from stream
- **Note**: All endpoints require `X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw` header

## Pending Tasks (P1)
- [ ] Authentication flow (Login/Signup)
- [ ] Favorites feature

## Pending Tasks (P2)
- [ ] Country flag badge on station logos
- [ ] Radios Near You (expo-location)
- [ ] Profile screen
- [ ] Skeleton loaders
- [ ] i18n (i18next)

## Known Issues
- Web preview has CORS blocking (themegaradio.com doesn't allow preview domain). Not an issue on Expo Go.
- expo-av deprecation warning (SDK 54 will remove it)
- Recently Played blocked on auth implementation

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
February 2026 - Session 4
