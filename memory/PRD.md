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
- [x] 3-Column Grid Layout
- [x] **Unified Search Functionality**
- [x] Platform-aware BlurView component
- [x] **Custom Tab Bar Design**
- [x] **Sticky Mini Player**
- [x] **react-native-track-player Integration** (Feb 12, 2026)
- [x] **Full-Screen Player UI** (Feb 12, 2026)
  - Header: chevron down, HD badge, station name, car icon, menu
  - Album artwork display
  - Now playing section with animated dots
  - Station name and genre display
  - Spotify & YouTube social buttons
  - Main controls: sleep timer, prev, play/pause, next, heart/favorite
  - Secondary controls: share, headset, radio, REC button
  - Recently Played section with station grid
  - Similar Radios section with station grid

### In Progress (P1)
- [ ] Grid item sizing fix for web preview
- [ ] Authentication Flow (Login/Signup)

### Backlog (P2)
- [ ] Favorites Feature
- [ ] expo-location integration
- [ ] Internationalization (i18n)
- [ ] Profile Screen content
- [ ] Records Screen content

## API Endpoints Used
- `GET /api/stations/popular` - Popular stations
- `GET /api/stations/similar/{id}` - Similar stations
- `GET /api/genres` - Genres list
- `GET /api/stations?search={query}` - Search stations

## Recent Changes (Feb 12, 2026)

### Full-Screen Player UI
- Created pixel-perfect player screen based on Figma design
- Components: Header, Artwork, Now Playing, Main Controls, Secondary Controls
- Data fetching: usePopularStations for Recently Played, useSimilarStations for Similar Radios
- Grid layout for station cards (3 columns)

### react-native-track-player Integration
- Playback service for background audio
- Lock screen and notification controls
- Web fallback using expo-av

### BlurView Improvements
- Added experimentalBlurMethod for better native blur
- GlowView component for native glow effects

## Key Files
- `/app/frontend/app/player.tsx` - Full-screen player UI
- `/app/frontend/src/services/trackPlayerService.ts` - Playback service
- `/app/frontend/src/hooks/useTrackPlayer.ts` - TrackPlayer hook
- `/app/frontend/src/components/MiniPlayer.tsx` - Mini player UI
- `/app/frontend/src/components/common/BlurView.tsx` - Blur component

## Known Issues
- **Grid items too large on web preview**: Image sizing in React Native for Web needs different handling. Works correctly on native.
- **CORS on Web Preview**: Images blocked due to ORB.
- **TrackPlayer requires Development Build**: Won't work in Expo Go.

## Development Build Required
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
