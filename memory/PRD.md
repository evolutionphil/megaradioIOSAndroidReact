# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The primary requirement is pixel-perfect implementation of Figma designs. Backend API available at `https://themegaradio.com`.

## Tech Stack
- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **Navigation:** Expo Router
- **State Management:** Zustand
- **Data Fetching:** React Query with Axios
- **Audio:** react-native-track-player (native) + expo-av fallback (web)
- **SVG Icons:** react-native-svg
- **Styling:** React Native StyleSheet with Flexbox

## Core Features

### Implemented (P0)
- [x] Home Screen with multiple sections
  - Discoverable Genres Swiper (horizontal carousel)
  - Genres (horizontal scroll)
  - Popular Stations (list view)
  - Recently Played (3-column grid)
  - Radios Near You (3-column grid)
  - Favorites From Users (Real API data)
  - All Stations (3-column grid)
- [x] 3-Column Grid Layout (responsive, works on 375px+)
- [x] **Unified Search Functionality**
  - Search across radios, genres, AND profiles simultaneously
  - Filter chips: All, Radios, Genres, Profiles
  - "No results" UI with image and message
- [x] Platform-aware BlurView component (web + native)
- [x] **Custom Tab Bar Design**
  - 4 tabs: Discover, Favorites, Profile, Records
  - Custom PNG icons
  - Dark theme (#1B1C1E background)
- [x] **Sticky Mini Player**
  - Positioned above navigation bar
  - Chevron up icon, logo, station name, genre
  - Play/Pause and Favorite buttons
  - Black background (#000000)
- [x] **react-native-track-player Integration** (Feb 12, 2026)
  - Background audio playback support
  - Lock screen and notification controls (native)
  - Playback service for remote events
  - Web fallback using expo-av
  - iOS background audio mode configured

### In Progress (P1)
- [ ] Full-screen Player UI improvements
- [ ] Authentication Flow (Login/Signup)

### Backlog (P2)
- [ ] Favorites Feature (add/remove stations)
- [ ] expo-location integration for nearby stations
- [ ] Internationalization (i18n)
- [ ] Profile Screen content
- [ ] Records Screen content (listening history)
- [ ] Skeleton loaders

## API Endpoints Used
- `GET /api/stations/popular` - Popular stations
- `GET /api/genres` - Genres list
- `GET /api/genres/discoverable` - Discoverable genres
- `GET /api/stations?search={query}` - Search stations
- `GET /api/discover/top100` - Top 100 stations
- `GET /api/public-profiles` - Public user profiles
- `GET /api/community-favorites` - Community favorite stations

## Recent Changes (Feb 12, 2026)
1. **react-native-track-player Integration:**
   - Installed react-native-track-player v4.1.2
   - Created `/src/services/trackPlayerService.ts` with playback service
   - Created `/src/hooks/useTrackPlayer.ts` for player state management
   - Updated `app.json` with iOS background audio mode (UIBackgroundModes: ["audio"])
   - Set newArchEnabled: false for compatibility
   - Web uses expo-av fallback, native uses TrackPlayer
   - MiniPlayer updated with TrackPlayer controls

2. **BlurView Improvements:**
   - Updated `/src/components/common/BlurView.tsx`
   - Added `experimentalBlurMethod="dimezisBlurView"` for better native blur
   - Added GlowView component for native glow effects
   - Web uses backdrop-filter for better performance

## Key Files
- `/app/frontend/index.ts` - Entry point with TrackPlayer registration
- `/app/frontend/src/services/trackPlayerService.ts` - Playback service
- `/app/frontend/src/hooks/useTrackPlayer.ts` - TrackPlayer hook
- `/app/frontend/src/hooks/useAudioPlayer.ts` - Web fallback hook
- `/app/frontend/src/components/MiniPlayer.tsx` - Mini player UI
- `/app/frontend/src/components/common/BlurView.tsx` - Platform blur component
- `/app/frontend/app.json` - App configuration with background audio

## Known Issues
- **CORS on Web Preview:** Images from `themegaradio.com` blocked due to ORB. Web-only issue.
- **TrackPlayer requires Development Build:** Won't work in Expo Go app, needs EAS Build.

## Development Build Required
react-native-track-player requires a custom development build:
```bash
npx expo install expo-dev-client
eas build --platform ios --profile development
eas build --platform android --profile development
```

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect UI matching Figma designs

## Last Updated
February 12, 2026
