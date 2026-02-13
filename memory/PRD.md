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

### Mobile Token-Based Auth (NEW)
Token format: `mrt_` prefix + 64 character hex
Token validity: 90 days
Storage: SecureStore (iOS/Android) / localStorage (web)

**Endpoints:**
```
POST /api/auth/mobile/login
Body: { email, password, deviceType, deviceName }
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

### Implementation
- `authStore.ts` - Token storage with SecureStore/localStorage
- `authService.ts` - Mobile auth API methods
- `api.ts` - Auto-attaches Bearer token to all requests
- Token persists across app restarts

## API Integrations

### Countries API ✅
```
GET /api/countries?format=rich
Response: [{ name, nativeName, code, flag, flagUrl, stationCount }]
```

### Favorites API ✅ (Hybrid)
- **Authenticated**: API endpoints
- **Guest**: Local AsyncStorage

```
GET /api/user/favorites
POST /api/user/favorites { stationId }
DELETE /api/user/favorites/:stationId
GET /api/user/favorites/check/:stationId
```

### Social API ✅ (Connected)
```
GET /api/users/:userId/followers  (Public)
GET /api/users/:userId/following  (Public)
POST /api/user-engagement/follow/:userId (Auth)
POST /api/user-engagement/unfollow/:userId (Auth)
POST /api/user-engagement/remove-follower/:userId (Auth)
```

## Session 7 Updates (Dec 2025)

### 1. Country Flags from API ✅
- Updated Country Picker to use `?format=rich`
- Shows: flag emoji + name + nativeName + stationCount
- Removed hardcoded FLAG_MAP

### 2. Favorites API Integration ✅
- Hybrid approach: API for authenticated, AsyncStorage for guests
- Optimistic updates for fast UI
- Auto-sync when user logs in

### 3. Mobile Token Auth System ✅
- New `authStore.ts` with SecureStore support
- New `authService.ts` with mobile auth methods
- Updated `api.ts` to auto-attach Bearer token
- Cross-platform: native uses SecureStore, web uses localStorage

### 4. Followers/Following Real API ✅
- Updated `followers.tsx` - fetches from `/api/users/:userId/followers`
- Updated `follows.tsx` - fetches from `/api/users/:userId/following`
- Unfollow functionality with confirmation dialog
- Empty states for logged-out users

## Key Files Updated This Session
- `/app/frontend/src/store/authStore.ts` - Mobile token auth
- `/app/frontend/src/services/authService.ts` - Auth API methods
- `/app/frontend/src/services/api.ts` - Auto Bearer token
- `/app/frontend/app/(tabs)/profile.tsx` - Country flags API
- `/app/frontend/app/followers.tsx` - Real API
- `/app/frontend/app/follows.tsx` - Real API

## Pending Tasks

### P0 (Critical)
- [ ] Login/Signup screens (UI needs to be built)
- [ ] Google Sign-In integration for mobile

### P1 (Important)
- [ ] i18n integration using selected language
- [ ] Profile page real data (currently some mock data)

### P2 (Nice to have)
- [ ] Skeleton loaders
- [ ] Animated equalizer enhancement
- [ ] Sleep timer resume fix

## Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`

## Test Reports
- `/app/test_reports/iteration_5.json`

## Notes
- Mobile auth endpoints (`/api/auth/mobile/*`) need to be deployed on backend
- Session-based auth still works for web
- Token auth is ready but waiting for backend deployment

## Last Updated
December 2025 - Session 7
