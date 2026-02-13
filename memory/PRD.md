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
- react-native-svg for UI effects

## Core Features (Implemented)

### Audio & Streaming
- [x] expo-av Audio Playback (Expo Go compatible, singleton AudioManager)
- [x] Full-Screen Player UI (fullScreenModal presentation)
- [x] Now Playing API with ICY Metadata
- [x] Sleep Timer with countdown functionality + ON badge + Sleep Counter Modal
- [x] Car Mode Screen with Custom Carousel

### UI/UX
- [x] Home Screen with multiple sections
- [x] 3-Column Grid Layout
- [x] Unified Search Functionality
- [x] Custom Tab Bar Design
- [x] Sticky Mini Player
- [x] Share Modal with native sharing
- [x] Radio Error Modal for stream failures

### Profile & Social
- [x] Followers Screen
- [x] Follows Screen  
- [x] User Profile Screen
- [x] Share User Modal
- [x] Logout Modal
- [x] Statistics Screen
- [x] Play at Login Screen

### Session 6 Updates (Dec 2025)
1. **Profile Page - Clickable Followers/Follows Stats**
2. **Languages Page**
3. **Favorites Page Redesign (Figma)**

### Session 7 Updates (Dec 2025)
1. **Country Flags from API** ✅
   - Updated to use `/api/countries?format=rich`
   - Returns objects with: `name`, `nativeName`, `code`, `flag` (emoji), `flagUrl`, `stationCount`
   - Removed hardcoded FLAG_MAP
   - Country picker now shows flag emoji + name + nativeName + stationCount

2. **Favorites API Integration (Hybrid)** ✅
   - **Authenticated users**: Fetches from `/api/user/favorites` API
   - **Guest users**: Uses local AsyncStorage
   - API endpoints updated:
     - `GET /api/user/favorites` - List favorites
     - `POST /api/user/favorites` - Add favorite
     - `DELETE /api/user/favorites/:stationId` - Remove favorite
     - `GET /api/user/favorites/check/:stationId` - Check if favorited
   - Social API endpoints updated:
     - `GET /api/users/:userId/followers` - Get followers
     - `GET /api/users/:userId/following` - Get following
     - `POST /api/user-engagement/follow/:userId` - Follow user
     - `POST /api/user-engagement/unfollow/:userId` - Unfollow user

## API Endpoints

### Countries (Updated)
```
GET /api/countries?format=rich
Response: [
  {
    "name": "Turkey",
    "nativeName": "Türkiye", 
    "code": "TR",
    "flag": "🇹🇷",
    "flagUrl": "https://flagcdn.com/w160/tr.png",
    "stationCount": 245
  },
  ...
]
```

### Favorites (Requires Auth)
```
GET /api/user/favorites
POST /api/user/favorites { stationId: "xxx" }
DELETE /api/user/favorites/:stationId
GET /api/user/favorites/check/:stationId
```

### Social (Public read, Auth for write)
```
GET /api/users/:userId/followers (API Key)
GET /api/users/:userId/following (API Key)
POST /api/user-engagement/follow/:userId (Session)
POST /api/user-engagement/unfollow/:userId (Session)
```

## Key Files Updated This Session
- `/app/frontend/app/(tabs)/profile.tsx` - Country picker with API flags
- `/app/frontend/src/store/favoritesStore.ts` - Hybrid API/local storage
- `/app/frontend/src/constants/api.ts` - Updated social endpoints

## Authentication Status
- **Current**: Session cookie-based (web only)
- **Planned**: Token-based auth for mobile apps
- **Impact**: Favorites API works for web, falls back to local storage for mobile until token auth is implemented

## Pending Tasks

### P0 (Critical)
- [ ] Token-based authentication for mobile (to enable Favorites API)
- [ ] Login/Signup screens

### P1 (Important)
- [ ] Connect Followers/Following to real API (currently mock data)
- [ ] i18n integration using selected language

### P2 (Nice to have)
- [ ] Skeleton loaders
- [ ] Animated equalizer enhancement
- [ ] Sleep timer resume fix

## Test Reports
- `/app/test_reports/iteration_5.json` - All features passed

## Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw` (X-API-Key header)

## Last Updated
December 2025 - Session 7
