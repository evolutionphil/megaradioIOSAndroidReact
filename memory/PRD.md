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
- react-native-reanimated-carousel for Car Mode swiper

## Core Features

### Implemented
- [x] Home Screen with multiple sections (Genres, Popular, Recently Played, Radios Near You, Favorites From Users)
- [x] 3-Column Grid Layout
- [x] Unified Search Functionality
- [x] Custom Tab Bar Design (Discover, Favorites, Profile, Records)
- [x] Sticky Mini Player
- [x] expo-av Audio Playback (Expo Go compatible, singleton AudioManager)
- [x] Full-Screen Player UI (fullScreenModal presentation)
  - Header: chevron down, HD badge, station name, car icon, menu
  - Artwork: 190x190px with live indicator bar
  - Now playing: animated dots, station name, genre/country info
  - Spotify & YouTube buttons
  - Main controls: timer, prev, play/pause, next, heart
  - Secondary controls: share, headset, broadcast, REC button
  - Recently Played section (Ubuntu-Bold font)
  - Similar Radios section (from API)
- [x] Car Mode Screen with Swiper UI
  - react-native-reanimated-carousel with custom scale/opacity animations
  - Center card 150px with purple glow shadow
  - Adjacent cards 126px, far cards 96px (via scale interpolation)
  - Auto-play on swipe (onSnapToItem)
  - Prev/Pause/Next control buttons (100x100, #282828)
  - Volume mute + slider controls
  - REC button
  - Close button, Car Mode title (Ubuntu-Bold)
- [x] Now Playing API with ICY Metadata
  - Backend fetches actual song title from radio stream ICY metadata
  - Fallback to genre/station info if ICY unavailable
  - Parses StreamTitle='Artist - Song' format

### Recent Changes (Feb 12, 2026 - Session 2)
1. **Car Mode Swiper**: Complete rewrite using react-native-reanimated-carousel v4
2. **Double-Click Bug Fix**: Extracted GridItem outside PlayerScreen to prevent unmount/remount
3. **Fullscreen Player**: Changed presentation from 'modal' to 'fullScreenModal'
4. **Now Playing API**: Rewrote with real ICY metadata extraction from radio streams
5. **Route Cleanup**: Removed non-existent station/[id] route from _layout.tsx

### Known Issues
- expo-av deprecation warning (SDK 54 will remove it)
- shadow* style props deprecation (use boxShadow)
- Authentication not yet implemented (Recently Played shows popular stations as fallback)

## Key Files
- `/app/frontend/app/player.tsx` - Full-screen player with extracted GridItem
- `/app/frontend/src/components/CarModeScreen.tsx` - Car Mode with reanimated carousel
- `/app/frontend/src/hooks/useAudioPlayer.ts` - expo-av with singleton AudioManager
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/frontend/app/_layout.tsx` - Root layout with fullScreenModal player
- `/app/backend/server.py` - Now Playing API with ICY metadata

## API Endpoints
- `GET /api/stations/popular` - Popular stations (themegaradio.com)
- `GET /api/stations/similar/{id}` - Similar stations
- `POST /api/resolve-stream` - Resolve stream URL
- `GET /api/now-playing/{station_id}` - Real ICY metadata from stream

## Pending Tasks (P2)
- [ ] Country flag badge on station logos
- [ ] Authentication flow (Login/Signup)
- [ ] Favorites feature
- [ ] Radios Near You (expo-location)
- [ ] Profile screen
- [ ] Skeleton loaders
- [ ] i18n (i18next)

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
February 12, 2026 - Session 2
