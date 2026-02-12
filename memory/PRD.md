# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The primary requirement is pixel-perfect implementation of Figma designs. Backend API available at `https://themegaradio.com`.

## Tech Stack
- **Framework:** React Native with Expo SDK
- **Language:** TypeScript
- **Navigation:** Expo Router
- **State Management:** Zustand
- **Data Fetching:** React Query with Axios
- **Audio:** expo-av (migrating to react-native-track-player)
- **Styling:** React Native StyleSheet with Flexbox

## Core Features

### Implemented (P0)
- [x] Home Screen with multiple sections
  - Premium Banner
  - Genres (horizontal scroll)
  - Popular Stations (list view)
  - Recently Played (3-column grid)
  - Radios Near You (3-column grid)
  - Jazz Banner
  - Favorites From Users
  - All Stations (3-column grid)
- [x] 3-Column Grid Layout (responsive, works on 375px+)
- [x] Search Functionality with debounce
- [x] Platform-aware BlurView component (web + native)
- [x] Station playback with expo-av

### In Progress (P1)
- [ ] Migrate to react-native-track-player for background audio
- [ ] Full-screen Player UI
- [ ] Authentication Flow (Login/Signup)

### Backlog (P2)
- [ ] Favorites Feature
- [ ] expo-location integration for nearby stations
- [ ] Internationalization (i18n)
- [ ] Profile Screen
- [ ] Skeleton loaders

## Known Issues

### Resolved
1. **Grid Layout (P0):** Fixed - 3 columns now display correctly on all screen sizes
2. **Search (P2):** Fixed - Debounce working, results displaying properly
3. **BlurView (P1):** Fixed - Platform-aware implementation created

### Open
1. **CORS Images (P2):** "Discoverable Genres" images blocked on web preview (backend CORS policy issue)

## Key Files

### Main Components
- `/app/frontend/app/(tabs)/index.tsx` - Home Screen (heavily modified)
- `/app/frontend/app/search.tsx` - Search Screen
- `/app/frontend/src/components/common/BlurView.tsx` - Platform-aware blur component

### Services
- `/app/frontend/src/services/stationService.ts` - Station API service
- `/app/frontend/src/services/api.ts` - Axios instance

### Hooks
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/frontend/src/hooks/useAudioPlayer.ts` - Audio playback hook

## API Endpoints Used
- `GET /api/stations/popular` - Popular stations
- `GET /api/genres` - Genres list
- `GET /api/genres/discoverable` - Discoverable genres
- `GET /api/stations?search={query}` - Search stations
- `GET /api/discover/top100` - Top 100 stations

## Technical Notes

### Grid Layout Strategy
- Uses `useWindowDimensions()` for dynamic width calculation
- Fallback to `Dimensions.get('window').width` for SSR
- Fixed 100px item width for consistent 3-column layout
- Row-based rendering to avoid flexWrap issues in React Native Web

### BlurView Implementation
- Web: CSS filter blur
- Native: expo-blur component
- Platform detection via `Platform.OS`

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect UI matching Figma designs
- Screen alignment: 15px padding on left and right (Jazz Banner reference)

## Last Updated
February 12, 2026
