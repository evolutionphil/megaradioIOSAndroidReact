# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. Backend API at `https://themegaradio.com`.

## Tech Stack
- React Native with Expo SDK 54
- TypeScript
- Expo Router
- Zustand (State Management)
- React Query (Data Fetching)
- expo-av for audio playback

## Core Features

### Implemented
- [x] Home Screen with multiple sections
- [x] 3-Column Grid Layout
- [x] Unified Search Functionality
- [x] Custom Tab Bar Design
- [x] Sticky Mini Player
- [x] expo-av Audio Playback (Expo Go compatible)
- [x] Full-Screen Player UI
  - Header: chevron down, HD badge, station name, car icon, menu
  - Artwork: 190x190px with live indicator bar
  - Now playing: animated dots, station name, genre/country info
  - Spotify & YouTube buttons
  - Main controls: timer, prev, play/pause, next, heart (Ionicons)
  - Secondary controls: share, headset, broadcast, REC button
  - Recently Played section (Ubuntu-Bold font)
  - Similar Radios section (from API)

### Recent Changes (Feb 12, 2026)
1. **Audio Global Sound**: Uses global variable to ensure only one audio plays at a time
2. **Stop Before Play**: Always stops current playback before starting new station
3. **Query Optimization**: Added refetchOnWindowFocus: false to prevent flickering
4. **REC Button**: Custom styled with outer ring and inner dot
5. **Grid Layout**: 3 columns with proper spacing
6. **Ubuntu Font**: Loaded for section titles

### Known Issues
- **Now Playing API not available**: Backend doesn't provide now playing metadata
- **Grid item sizing on web**: Works correctly on native

## Key Files
- `/app/frontend/app/player.tsx` - Full-screen player
- `/app/frontend/src/hooks/useAudioPlayer.ts` - expo-av with global sound
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/frontend/assets/fonts/Ubuntu-Bold.ttf` - Custom font

## API Endpoints
- `GET /api/stations/popular` - Popular stations
- `GET /api/stations/similar/{id}` - Similar stations
- `POST /api/resolve-stream` - Resolve stream URL

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
February 12, 2026
