# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. Backend API at `https://themegaradio.com`.

## Tech Stack
- React Native with Expo SDK 54
- TypeScript
- Expo Router
- Zustand (State Management)
- React Query (Data Fetching)
- react-native-track-player (native audio)

## Core Features

### Implemented
- [x] Home Screen with multiple sections
- [x] 3-Column Grid Layout
- [x] Unified Search Functionality
- [x] Custom Tab Bar Design
- [x] Sticky Mini Player
- [x] react-native-track-player Integration
- [x] Full-Screen Player UI
  - Header with blur effect (backdrop-filter: blur(25px))
  - Album artwork: 190x190px
  - Country flag badges
  - Divider line (1px solid #2D2D2D)
  - Main controls with Ionicons
  - Recently Played section
  - Similar Radios section (API: /api/stations/similar/{id})

### Recent Changes (Feb 12, 2026)
1. **Similar Radios API Integration**: Now fetches from `/api/stations/similar/{id}`
2. **Reduced Page Flickering**: Added staleTime (5 min) and retry limits to queries
3. **React.memo for Grid Items**: Prevents unnecessary re-renders
4. **useMemo for Station Lists**: Optimizes re-rendering
5. **Control Icons**: Using Ionicons (time-outline, play-skip-back, pause/play, play-skip-forward, heart-outline)

### Known Issues (Web Preview Only)
- Grid item Image sizing incorrect on web (works on native)
- CORS blocking images from themegaradio.com

## Key Files
- `/app/frontend/app/player.tsx` - Full-screen player
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/frontend/src/services/stationService.ts` - API services

## API Endpoints
- `GET /api/stations/popular` - Popular stations
- `GET /api/stations/similar/{id}` - Similar stations
- `GET /api/recently-played` - Recently played (requires auth)

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
February 12, 2026
