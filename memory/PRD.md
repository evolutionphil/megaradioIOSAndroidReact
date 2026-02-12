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
- **SVG Icons:** react-native-svg
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
- [x] **Unified Search Functionality** (Feb 12, 2026)
  - Search across radios, genres, AND profiles simultaneously
  - Filter chips: All, Radios, Genres, Profiles
  - Fixed subtitle bug (was showing single char, now shows full genre)
  - "No results" UI with image and message
- [x] Platform-aware BlurView component (web + native)
- [x] Station playback with expo-av
- [x] **Custom Tab Bar Design** (Feb 12, 2026)
  - 4 tabs: Discover, Favorites, Profile, Records
  - Custom SVG icons matching Figma design
  - Dark theme (#1B1C1E background)
- [x] **Sticky Mini Player** (Feb 12, 2026)
  - Positioned above navigation bar
  - Chevron up icon, logo, station name, genre
  - Play/Pause and Favorite buttons
  - Black background (#000000)

### In Progress (P1)
- [ ] Migrate to react-native-track-player for background audio
- [ ] Full-screen Player UI
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
- `GET /api/genres/discoverable` - Discoverable genres (used in swiper and search)
- `GET /api/stations?search={query}` - Search stations
- `GET /api/discover/top100` - Top 100 stations
- `GET /api/public-profiles` - Public user profiles for search and Favorites From Users
- `GET /api/community-favorites` - Community favorite stations

## Recent Changes (Feb 12, 2026)
1. **Discoverable Genres Swiper (Birleştirildi):**
   - Genre banner ve discoverable API tek bir yatay swiper olarak birleştirildi
   - `/api/genres/discoverable` endpoint'inden tüm genre'ları çekiyor
   - Her genre için farklı gradient renkleri
   - Unsplash fallback görselleri ile
   - "Favorites From Users" bölümünün hemen üzerinde konumlandı

2. **Grid Spacing Fix (Recently Played & Radios Near You):**
   - All rows now use `justifyContent: 'space-between'` for consistent spacing
   - Empty placeholder views added for incomplete rows
   
3. **All Stations Logo Fix:**
   - Logos now fill the entire card space

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
