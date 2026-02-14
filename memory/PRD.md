# MegaRadio - Mobile Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. Backend API at `https://themegaradio.com`. UI must be pixel-perfect implementation of Figma designs.

## Tech Stack
- React Native with Expo SDK 54
- TypeScript
- Expo Router
- Zustand (State Management)
- React Query (Data Fetching with backend-recommended caching)
- expo-av for audio playback
- expo-secure-store for token storage

## Caching Strategy (Feb 14, 2026)
Based on backend developer recommendations:

| Data Type | staleTime | gcTime |
|-----------|-----------|--------|
| GENRES_ALL | 24 hours | 48 hours |
| COUNTRIES | 24 hours | 48 hours |
| STATION_DETAIL | 30 minutes | 1 hour |
| GENRE_STATIONS | 1 hour | 2 hours |
| STATIONS_LIST | 10 minutes | 20 minutes |
| POPULAR_STATIONS | 10 minutes | 20 minutes |
| TRENDING | 5 minutes | 10 minutes |
| RECENTLY_PLAYED | 30 seconds | 1 minute |
| FAVORITES | 1 minute | 2 minutes |
| USER_PROFILE | 2 minutes | 4 minutes |
| FOLLOWERS/FOLLOWING | 2 minutes | 4 minutes |
| SEARCH | 2 minutes | 4 minutes |

### Preload System (Feb 14, 2026)
- `/app/frontend/src/services/preloadService.ts` - Async preloading service
- Preloads first 6 user profiles from "Favorites From Users" section immediately
- Remaining users are loaded in background without blocking UI
- Cache stored both in-memory and React Query cache

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

## Known Issues

### Backend Performance Issue (Feb 14, 2026)
- `/api/users/{userId}/favorites` endpoint returns full station data with multi-language descriptions
- Thomas Wagner's 100 favorites take ~29 seconds to load
- **Recommendation**: Backend should implement pagination and lighter response payload

## Completed Features

### Sort Bottom Sheet (Feb 14, 2026)
- Created `/app/frontend/src/components/SortBottomSheet.tsx`
- Implemented for both `all-stations.tsx` and `genre-detail.tsx`
- Features:
  - Radio button sorting options: Popular, Newest first, Oldest first, A-Z, Z-A
  - Grid/List view toggle at bottom
  - Pink/magenta themed radio buttons per Figma design
  - Slide-up animation

### Discover Page Genre Navigation Update (Feb 14, 2026)
- Removed inline filtering behavior on Discover page
- All genre interactions now navigate directly to dedicated pages:
  - Genre chips (horizontal bar) → `/genre-detail?slug=xxx&name=xxx`
  - Browse Genres cards → `/genre-detail?slug=xxx&name=xxx`
  - "All" chip → `/all-stations`
  - "See All" button → `/genres`
- Discover page now shows "Top Stations" (general popular stations, not filtered)

### Pages Implemented
- `/app/frontend/app/genres.tsx` - List all genres
- `/app/frontend/app/all-stations.tsx` - All stations with search, sort, grid/list views
- `/app/frontend/app/genre-detail.tsx` - Stations by genre with sort and view options

### Navigation
- "See All" on Discover page → `/genres`
- Genre item click → `/genre-detail?slug=xxx&name=xxx`
- "See More" on Home page Top Stations → `/all-stations`
- Genre chips on Discover → `/genre-detail?slug=xxx&name=xxx`
- "All" chip on Discover → `/all-stations`

## In Progress / Pending Issues

### COMPLETED (Dec 2025)
- ✅ Login navigation bug - Fixed with setTimeout delay on router.replace
- ✅ Search URI error - Fixed with proper URL validation and try-catch
- ✅ Missing station images on genre-detail - Fixed with getLogoUrl helper
- ✅ Grid/List view persistence - Implemented with AsyncStorage
- ✅ UI text/icon alignment on Genres page - Fixed alignment styles
- ✅ Sort By functionality - Fixed API integration with useMemo for proper query key updates
- ✅ Performance Optimization - Added React Query caching (staleTime, gcTime, refetchOnWindowFocus)

### COMPLETED (Feb 14, 2026)
- ✅ Backend Caching Recommendations Implementation - Updated React Query cache TTL values per backend developer recommendations:
  - GENRES_ALL: 24 hours (static data)
  - STATION_DETAIL: 30 minutes
  - STATIONS_LIST: 10 minutes
  - POPULAR_STATIONS: 10 minutes
  - GENRE_STATIONS: 1 hour
  - TRENDING: 5 minutes
  - RECENTLY_PLAYED: 30 seconds
  - FAVORITES: 1 minute
  - USER_PROFILE/FOLLOWERS/FOLLOWING: 2 minutes
  - SEARCH: 2 minutes
  - COMMUNITY_FAVORITES/PUBLIC_PROFILES: 5 minutes
- ✅ Added getStation service method for single station fetching

### P1: Recently Played Sync
- Implementation exists in `recentlyPlayedStore.ts`
- POST `/api/recently-played` called on station play
- GET `/api/recently-played` called on app load
- **Note:** Sync requires user authentication. Guest users only get local storage.

### P2: Follow/Unfollow Button on Profile
- Implemented on user-profile.tsx with follow/unfollow API calls

### P2: Visual Bugs
- Glow Effect incorrect
- Static Equalizer 
- Vector icon rendering on web
- Avatar not displaying on web preview (CORS issue)

### P2: Social Logins
- Google/Apple/Facebook login scaffolded but requires dev build

### P2: Sleep Timer
- Needs user feedback on specific issue

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
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks with backend-recommended caching TTLs
- `/app/frontend/src/services/stationService.ts` - Station service with API calls
- `/app/frontend/src/components/SortBottomSheet.tsx` - Sort bottom sheet component
- `/app/frontend/app/_layout.tsx` - Root layout with QueryClient configuration
- `/app/frontend/app/all-stations.tsx` - All stations page with view mode persistence
- `/app/frontend/app/genre-detail.tsx` - Genre detail page with view mode persistence
- `/app/frontend/app/search.tsx` - Search with improved image URL validation
- `/app/frontend/app/login.tsx` - Login with proper navigation handling
- `/app/frontend/src/components/StationCard.tsx` - Station card with getLogoUrl helper
- `/app/frontend/src/store/recentlyPlayedStore.ts` - Recently played state
- `/app/frontend/src/store/playerStore.ts` - Audio player state
- `/app/frontend/app/genres.tsx` - Genres list page with UI alignment fixes

## Test Credentials
- Email: gey14853@outlook.com
- Password: Muhammed5858
- API Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw
