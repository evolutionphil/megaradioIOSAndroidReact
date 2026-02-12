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
  - Header: chevron down, HD badge, station name, car icon, menu
  - Artwork: 190x190px with live indicator bar
  - Now playing: animated dots, station name, genre/country info
  - Spotify & YouTube buttons
  - Main controls: timer, prev, play/pause, next, heart
  - Secondary controls: share, headset, broadcast, REC button
  - Recently Played section (Ubuntu-Bold font)
  - Similar Radios section (from API)
- [x] Car Mode Screen with Custom Carousel
  - Custom-built carousel with PanResponder + absolute positioning (pixel-perfect Figma match)
  - 5 overlapping cards: center 150px, adjacent 126px, far 96px (scaled to screen width)
  - Purple glow shadow on cards (iOS: shadowColor #7B61FF, web: boxShadow)
  - Z-ordering: center on top (zIndex: 10), adjacent behind (5), far (1)
  - Auto-play on swipe via PanResponder gesture detection
  - Animated equalizer bars (3 pink bars with height animation)
  - Large control buttons (100px): Previous, Pause/Play, Next
  - Volume: Mute button + Slider with pink (#FF4199) track
  - REC button with red dot indicator
  - Close button, Car Mode title (Ubuntu-Bold)
- [x] Now Playing API with ICY Metadata
  - Backend fetches actual song title from radio stream ICY metadata
  - Fallback to genre/station info if ICY unavailable
  - Parses StreamTitle='Artist - Song' format

### Session 3 Bug Fixes (Dec 2025)
1. **Audio Atomicity Fix (P0)**: Completely rewrote `AudioManager.play()` method
   - Now captures existing sound reference FIRST
   - Clears internal references to prevent race conditions
   - Calls stopAsync() and unloadAsync() on captured reference
   - Only then creates new sound
   - Verified: Console logs show "STOPPING existing stream → stopAsync completed → unloadAsync completed → Creating NEW sound"

2. **Car Mode Carousel Logo Fix (P0)**: Fixed `StationCarousel` component
   - Added `getStationAtPosition()` function to properly calculate station index for each carousel position
   - Changed keys from `pos-${posIdx}` to `carousel-pos-${posIdx}-station-${station._id}`
   - Verified: 3 different station logos now show (mangoradio.de, wdr.de, radioarabella.de)

3. **SafeAreaView Fix (P1)**: Already properly implemented
   - `player.tsx`: Line 363 - `<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>`
   - `CarModeScreen.tsx`: Line 303 - `<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>`

4. **Single-Click Play**: Verified working correctly

### Known Deprecation Warnings
- expo-av deprecation warning (SDK 54 will remove it) - consider expo-audio migration
- shadow* style props deprecation (use boxShadow)
- textShadow* style props deprecation
- props.pointerEvents deprecated (use style.pointerEvents)
- Image tintColor deprecated (use props.tintColor)

## Key Files
- `/app/frontend/app/player.tsx` - Full-screen player with extracted GridItem
- `/app/frontend/src/components/CarModeScreen.tsx` - Car Mode with custom PanResponder carousel
- `/app/frontend/src/hooks/useAudioPlayer.ts` - expo-av with singleton AudioManager (atomic playback)
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/frontend/app/_layout.tsx` - Root layout with fullScreenModal player
- `/app/backend/server.py` - Now Playing API with ICY metadata

## API Endpoints
- `GET /api/stations/popular` - Popular stations (themegaradio.com)
- `GET /api/stations/similar/{id}` - Similar stations
- `POST /api/resolve-stream` - Resolve stream URL
- `GET /api/now-playing/{station_id}` - Real ICY metadata from stream

## Pending Tasks (P1)
- [ ] Authentication flow (Login/Signup)
- [ ] Favorites feature

## Pending Tasks (P2)
- [ ] Country flag badge on station logos
- [ ] Radios Near You (expo-location)
- [ ] Profile screen
- [ ] Skeleton loaders
- [ ] i18n (i18next)

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
December 2025 - Session 3
