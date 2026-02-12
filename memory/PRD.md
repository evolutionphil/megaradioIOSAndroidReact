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
  - **Discoverable Genres Swiper** (horizontal carousel, replaced Premium Banner)
  - Genres (horizontal scroll)
  - Popular Stations (list view)
  - Recently Played (3-column grid, 100px items)
  - Radios Near You (3-column grid, 100px items)
  - Jazz Banner
  - **Favorites From Users (Real API data, 345x60 cards, border-radius: 10px)**
  - **All Stations (3-column grid, logos fill cards fully)**
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
- `GET /api/genres/discoverable` - Discoverable genres (used in swiper)
- `GET /api/stations?search={query}` - Search stations
- `GET /api/discover/top100` - Top 100 stations
- `GET /api/public-profiles` - Public user profiles for Favorites From Users
- `GET /api/community-favorites` - Community favorite stations

## Recent Changes (Feb 12, 2026)
1. **Grid Spacing Fix (Recently Played & Radios Near You):**
   - All rows now use `justifyContent: 'space-between'` for consistent spacing
   - Empty placeholder views added for incomplete rows to maintain alignment
   
2. **Genre Images with Unsplash Fallbacks:**
   - Added fallback images from Unsplash for genre banners and swiper
   - Fixes CORS issue with themegaradio.com images in web preview
   - Slug-based mapping for folk-music, jazz, rock, pop, classical, electronic

3. **Discoverable Genre Banner:**
   - Banner now dynamically uses `/api/genres/discoverable` data
   - Shows first genre from API with name and image
   - Image sourced from Unsplash fallback

4. **Discoverable Genres Swiper:**
   - Replaced static "MegaRadio Premium" banner with horizontal swiper
   - Uses data from `/api/genres/discoverable` endpoint
   - Colorful gradient backgrounds for each genre
   - Shows genre name, station count, and image
   
5. **All Stations Logo Fix:**
   - Logos now fill the entire card space (width: 100%, height: 100%)
   - Changed `resizeMode` from "contain" to "cover"

## Key Files
- `/app/frontend/app/(tabs)/index.tsx` - Home Screen (updated with swiper)
- `/app/frontend/src/services/stationService.ts` - API services
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks

## Known Issues
- **CORS on Web Preview:** Genre images from `themegaradio.com` are blocked due to ORB (Opaque Response Blocking). This is a web-only issue and won't affect native builds.

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect UI matching Figma designs

## Last Updated
February 12, 2026
