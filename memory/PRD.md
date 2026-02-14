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
- expo-secure-store for token storage

## Authentication System

### Mobile Token-Based Auth (All Platforms)
Token format: `mrt_` prefix + 64 character hex
Token validity: 90 days
Storage: SecureStore (iOS/Android) / localStorage (web)

**Endpoints:**
```
POST /api/auth/mobile/login
Body: { email, password, deviceType, deviceName }
Response: { success, token, user }

POST /api/auth/mobile/register
Body: { email, password, fullName, deviceType, deviceName }
Response: { success, token, user }

POST /api/auth/mobile/google  
Body: { googleId, email, fullName, avatar, deviceType }
Response: { success, token, user }

GET /api/auth/mobile/me
Header: Authorization: Bearer mrt_xxx
Response: { authenticated, user }

POST /api/auth/mobile/logout      → Single device
POST /api/auth/mobile/logout-all  → All devices
```

## Completed Features

### Sort Bottom Sheet (Feb 14, 2026)
- Created `/app/frontend/src/components/SortBottomSheet.tsx`
- Implemented for both `all-stations.tsx` and `genre-detail.tsx`
- Features:
  - Radio button sorting options: Popular, Newest first, Oldest first, A-Z, Z-A
  - Grid/List view toggle at bottom
  - Pink/magenta themed radio buttons per Figma design
  - Slide-up animation

### Pages Implemented
- `/app/frontend/app/genres.tsx` - List all genres
- `/app/frontend/app/all-stations.tsx` - All stations with search, sort, grid/list views
- `/app/frontend/app/genre-detail.tsx` - Stations by genre with sort and view options

### Navigation
- "See All" on Discover page → `/genres`
- Genre item click → `/genre-detail?slug=xxx&name=xxx`
- "See More" on Home page Top Stations → `/all-stations`

## In Progress / Pending Issues

### P1: Recently Played Sync
- Implementation exists in `recentlyPlayedStore.ts`
- POST `/api/recently-played` called on station play
- GET `/api/recently-played` called on app load
- **Note:** Sync requires user authentication. Guest users only get local storage.

### P2: Follow/Unfollow Button on Profile
- Not yet implemented on user-profile.tsx

### P2: Visual Bugs
- Glow Effect incorrect
- Static Equalizer 
- Vector icon rendering on web

## Backend API Reference

### Recently Played
```
POST /api/recently-played
Authorization: Bearer mrt_xxx
Body: { stationId: "68a8c47dbd66579311ab228c" }
Response: { success: true }

GET /api/recently-played
Authorization: Bearer mrt_xxx
Response: [Station[], max 12 items, newest first]
```

## Key Files
- `/app/frontend/src/components/SortBottomSheet.tsx` - New sort bottom sheet component
- `/app/frontend/app/all-stations.tsx` - All stations page
- `/app/frontend/app/genre-detail.tsx` - Genre detail page
- `/app/frontend/src/store/recentlyPlayedStore.ts` - Recently played state
- `/app/frontend/src/store/playerStore.ts` - Audio player state

## Test Credentials
- Email: gey14853@outlook.com
- Password: Muhammed5858
- API Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw
