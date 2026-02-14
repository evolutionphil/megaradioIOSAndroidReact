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

### Auth UI Screens (IMPLEMENTED)
- `/app/frontend/app/auth-options.tsx` - Main auth selection (Apple, Facebook, Google, Mail, Continue without login)
- `/app/frontend/app/login.tsx` - Email/password login form with error toast
- `/app/frontend/app/signup.tsx` - Registration form with name/email/password
- `/app/frontend/app/forgot-password.tsx` - Password reset request
- `/app/frontend/app/(tabs)/profile.tsx` - Guest state with Sign In/Create Account buttons

### Implementation Files
- `authStore.ts` - Token storage with SecureStore/localStorage
- `authService.ts` - Mobile auth API methods (unified for web and native)
- `api.ts` - Auto-attaches Bearer token to all requests
- Token persists across app restarts

## API Integrations

### Countries API
```
GET /api/countries?format=rich
Response: [{ name, nativeName, code, flag, flagUrl, stationCount }]
```

### Users API
```
GET /api/user/followers/:userId
GET /api/user/following/:userId
POST /api/user/follow/:userId (requires auth)
DELETE /api/user/unfollow/:userId (requires auth)
```

### Favorites API
```
GET /api/user/favorites (requires auth - Bearer token)
POST /api/user/favorites/:stationId (requires auth)
DELETE /api/user/favorites/:stationId (requires auth)
```

### Recently Played API
```
GET /api/recently-played (with auth returns user's history)
POST /api/recently-played { stationId } (records a play)
```

### Languages API
```
GET /api/translations/:lang
```

## Key Files
- `/app/frontend/src/store/authStore.ts` - Auth state & token persistence
- `/app/frontend/src/store/favoritesStore.ts` - Hybrid favorites (API + local)
- `/app/frontend/src/store/recentlyPlayedStore.ts` - Recently played with API sync
- `/app/frontend/src/store/playerStore.ts` - Player state, auto-adds to recently played
- `/app/frontend/src/services/authService.ts` - Auth API methods (unified mobile login for all platforms)
- `/app/frontend/src/services/socialAuthService.ts` - Social OAuth (Google/Apple/Facebook)
- `/app/frontend/src/services/statsService.ts` - Listening statistics tracking
- `/app/frontend/src/services/api.ts` - Auto Bearer token
- `/app/frontend/app/(tabs)/profile.tsx` - Profile with guest state
- `/app/frontend/app/(tabs)/favorites.tsx` - Favorites list
- `/app/frontend/app/(tabs)/records.tsx` - Recently played history
- `/app/frontend/app/auth-options.tsx` - Login options screen
- `/app/frontend/app/login.tsx` - Email login screen
- `/app/frontend/app/followers.tsx` - Followers list with avatars
- `/app/frontend/app/follows.tsx` - Following list with avatars

## Completed Tasks

### February 2026 - Session 12 (Latest)
- [x] **CRITICAL FIX: Auth Token for All Platforms** - Changed authService.ts to use mobile login endpoint for ALL platforms (web + native). This returns real JWT tokens that work with authenticated API endpoints
- [x] **FIX: Favorites Loading** - Fixed favoritesStore.ts to use `/api/user/favorites` endpoint with Bearer token auth. Favorites now load correctly (39 stations for test user)
- [x] **FIX: Followers/Following Avatars** - Updated followers.tsx and follows.tsx to properly handle avatar URLs with getAvatarUrl() helper
- [x] **FEATURE: Recently Played API Sync** - Enhanced recentlyPlayedStore.ts to sync with API. When a station plays, it's added to recently played and synced to server
- [x] **INTEGRATION: Player + Recently Played** - playerStore.ts now automatically calls recentlyPlayedStore.addStation() when a station starts playing

### February 2026 - Session 11
- [x] Social Sign-In Integration - Created socialAuthService.ts with Google/Apple/Facebook OAuth support
- [x] Statistics Page - Integrated real stats tracking via statsService.ts
- [x] BUG FIX: Email Login - Fixed CORS issue with web login

### February 2026 - Session 10
- [x] Onboarding screens UI fix
- [x] Ubuntu font integration throughout the app
- [x] Full screen login/signup screens
- [x] Onboarding slide/fade animations
- [x] User Profile: Follow/Unfollow functionality
- [x] Car Mode bug fixed

### Previous Sessions
- [x] Favorites page redesign with hybrid API/local storage
- [x] Languages page creation
- [x] Clickable followers/follows stats on profile
- [x] Country flags from /api/countries?format=rich
- [x] Connected followers.tsx and follows.tsx to real API

## Pending Tasks

### P1 (Important)
- [ ] i18n integration using selected language
- [ ] Avatar upload - Use POST /api/auth/avatar endpoint with expo-image-picker

### P2 (Nice to have)
- [ ] Skeleton loaders
- [ ] Glow Effect visual fix (needs user feedback for specifics)
- [ ] Animated equalizer enhancement
- [ ] Sleep timer bug (needs reproduction steps)
- [ ] Vector icons web rendering fix

## Known Issues
- Social OAuth requires development build for native (Google/Apple/Facebook Sign-In won't work in Expo Go)
- TouchableOpacity click handlers may not work in Playwright automation (React Native Web limitation)
- Glow Effect and Sleep Timer bugs are blocked pending user feedback

## Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: gey14853@outlook.com / Muhammed5858

## Test Reports
- `/app/test_reports/iteration_8.json` - Profile features test (partial pass, identified auth token issue - NOW FIXED)
- `/app/test_reports/iteration_7.json` - Auth UI complete test (100% pass rate)

## Notes
- Mobile auth endpoints are deployed and working
- API returns 401 for invalid credentials (correct behavior)
- All auth screens follow Figma design specifications
- Web now uses mobile login endpoint to get real JWT tokens

## Typography (Ubuntu Font Family)
- **Ubuntu-Regular**: General body text, input fields
- **Ubuntu-Medium**: Subtitles, hints, secondary text
- **Ubuntu-Bold**: Headlines, buttons, titles
- **Ubuntu-BoldItalic**: Special emphasis (splash screen)

Font files: `/app/frontend/assets/fonts/`

## Last Updated
February 2026 - Session 12
