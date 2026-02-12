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
  - Recently Played (3-column grid, 100px items)
  - Radios Near You (3-column grid, 100px items)
  - Jazz Banner
  - **Favorites From Users (Real API data, 345x60 cards, border-radius: 10px)**
  - **All Stations (3-column grid, 100x144 items)**
  - Discoverable Genres
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

## API Endpoints Used
- `GET /api/stations/popular` - Popular stations
- `GET /api/genres` - Genres list
- `GET /api/genres/discoverable` - Discoverable genres
- `GET /api/stations?search={query}` - Search stations
- `GET /api/discover/top100` - Top 100 stations
- `GET /api/public-profiles` - **NEW: Public user profiles for Favorites From Users**
- `GET /api/community-favorites` - Community favorite stations

## Recent Changes (Feb 12, 2026)
1. **Favorites From Users section:**
   - Connected to `/api/public-profiles` API
   - Card dimensions: width: 100% (345px with padding), height: 60px
   - border-radius: 10px
   - Shows real user data: name, profile photo, favorites count

2. **All Stations section:**
   - 3-column grid layout
   - Item dimensions: width: 100px, height: ~144px (100px image + text)
   - Row-based rendering for consistent layout

## Key Files
- `/app/frontend/app/(tabs)/index.tsx` - Home Screen
- `/app/frontend/src/services/stationService.ts` - API services (added `getPublicProfiles`)
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks (added `usePublicProfiles`)

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect UI matching Figma designs

## Last Updated
February 12, 2026
