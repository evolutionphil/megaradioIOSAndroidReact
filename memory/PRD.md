# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. Backend API at `https://themegaradio.com`.

## Tech Stack
- React Native with Expo SDK 54
- TypeScript
- Expo Router
- Zustand (State Management)
- React Query (Data Fetching)
- **expo-av** for audio playback (works in Expo Go)

## Core Features

### Implemented
- [x] Home Screen with multiple sections
- [x] 3-Column Grid Layout
- [x] Unified Search Functionality
- [x] Custom Tab Bar Design
- [x] Sticky Mini Player
- [x] **expo-av Audio Playback** (Expo Go compatible)
- [x] Full-Screen Player UI
  - Header: chevron down, HD badge, station name, car icon, menu
  - Artwork: 190x190px with live indicator bar
  - Now playing: animated dots, station name, artist
  - Spotify & YouTube buttons (Ionicons)
  - Main controls: timer, prev, play/pause, next, heart
  - Secondary controls: share, lock, broadcast, REC button
  - Recently Played section
  - Similar Radios section (from API)

### Recent Changes (Feb 12, 2026)
1. **Audio Playback Fixed**: Switched to expo-av for Expo Go compatibility
2. **Stop Previous Station**: Now stops current playback before playing new station
3. **Full-Screen Player**: No tab bar visible, proper modal presentation
4. **Grid Layout**: 3-column grid with proper spacing (GRID_ITEM_WIDTH calculated)
5. **REC Button**: Custom styled with outer ring and inner dot
6. **Similar Radios API**: Now fetches from `/api/stations/similar/{id}`
7. **React Query Optimization**: Added staleTime to prevent refetching

### Known Issues (Web Preview Only)
- Grid item Image sizing incorrect on web (works on native)
- CORS blocking images from themegaradio.com

## Key Files
- `/app/frontend/app/player.tsx` - Full-screen player
- `/app/frontend/src/hooks/useAudioPlayer.ts` - expo-av audio hook
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks

## Audio Playback
Uses **expo-av** which works in:
- ✅ Expo Go app
- ✅ Web browser
- ✅ Development builds

## API Endpoints
- `GET /api/stations/popular` - Popular stations
- `GET /api/stations/similar/{id}` - Similar stations
- `POST /api/resolve-stream` - Resolve stream URL

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
February 12, 2026
