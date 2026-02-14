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

### Mobile Token-Based Auth
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

### Auth UI Screens (IMPLEMENTED - December 2025)
- `/app/frontend/app/auth-options.tsx` - Main auth selection (Apple, Facebook, Google, Mail, Continue without login)
- `/app/frontend/app/login.tsx` - Email/password login form with error toast
- `/app/frontend/app/signup.tsx` - Registration form with name/email/password
- `/app/frontend/app/forgot-password.tsx` - Password reset request
- `/app/frontend/app/(tabs)/profile.tsx` - Guest state with Sign In/Create Account buttons

### Implementation Files
- `authStore.ts` - Token storage with SecureStore/localStorage
- `authService.ts` - Mobile auth API methods (mobileLogin, mobileRegister, mobileCheckAuth, mobileLogout)
- `api.ts` - Auto-attaches Bearer token to all requests
- Token persists across app restarts

## API Integrations

### Countries API ✅
```
GET /api/countries?format=rich
Response: [{ name, nativeName, code, flag, flagUrl, stationCount }]
```

### Users API ✅
```
GET /api/users/:userId/followers
GET /api/users/:userId/following
POST /api/user-engagement/follow/:userId (requires auth)
POST /api/user-engagement/unfollow/:userId (requires auth)
```

### Favorites API ✅
```
GET /api/user/favorites (requires auth)
POST /api/user/favorites/:stationId (requires auth)
DELETE /api/user/favorites/:stationId (requires auth)
```

### Languages API ✅
```
GET /api/translations/:lang
```

## Key Files
- `/app/frontend/src/store/authStore.ts` - Auth state & token persistence
- `/app/frontend/src/store/favoritesStore.ts` - Hybrid favorites (API + local)
- `/app/frontend/src/services/authService.ts` - Auth API methods
- `/app/frontend/src/services/socialAuthService.ts` - Social OAuth (Google/Apple/Facebook)
- `/app/frontend/src/services/statsService.ts` - Listening statistics tracking
- `/app/frontend/src/services/api.ts` - Auto Bearer token
- `/app/frontend/app/(tabs)/profile.tsx` - Profile with guest state
- `/app/frontend/app/auth-options.tsx` - Login options screen (with social buttons)
- `/app/frontend/app/login.tsx` - Email login screen
- `/app/frontend/app/signup.tsx` - Registration screen
- `/app/frontend/app/forgot-password.tsx` - Password reset screen
- `/app/frontend/app/statistics.tsx` - User listening stats (real data)
- `/app/frontend/app/play-at-login.tsx` - Play at login preference
- `/app/frontend/app/followers.tsx` - Real API
- `/app/frontend/app/follows.tsx` - Real API
- `/app/frontend/app/languages.tsx` - Languages list

## Completed Tasks

### February 2026 - Session 11 (Latest)
- [x] **P0: Social Sign-In Integration** - Created socialAuthService.ts with Google/Apple/Facebook OAuth support
- [x] Updated auth-options.tsx with social login handlers and loading states
- [x] API Investigation completed: Backend supports cross-platform auth via `/api/auth/google`, `/api/auth/apple`, `/api/auth/facebook`
- [x] **P1: Statistics Page** - Integrated real stats tracking via statsService.ts
- [x] Created statsService.ts for tracking listening time, unique stations, and history
- [x] Statistics page now shows real data: Total Listening, Music Played, Unique Stations

### February 2026 - Session 10
- [x] Onboarding screens UI fix - Full screen background images with linear gradient
- [x] Ubuntu font integration throughout the app (Regular, Medium, Bold, BoldItalic)
- [x] Onboarding title: Ubuntu Bold 36px (Enjoy, Anywhere, Free)
- [x] Onboarding subtitle: Ubuntu Medium 15px
- [x] Login/Signup screens updated with Ubuntu fonts
- [x] Full screen login/signup screens (not popup style)
- [x] Linear gradient on onboarding: transparent to black at 29.42%
- [x] Onboarding slide/fade animations added (react-native-reanimated)
- [x] User Profile: Follow/Unfollow functionality integrated with live API
- [x] User Profile: Real follower/following counts from API
- [x] Followers/Following screens: API-connected unfollow functionality
- [x] Car Mode bug fixed: Current station now always appears at center position
- [x] Car Mode: Station list initialization improved

### December 2025 - Session 9
- [x] Added MegaRadio logo with arc effect image to auth-options.tsx (user-provided image)
- [x] Updated mobileRegister to use web signup endpoint then auto-login
- [x] All 9 auth feature tests passed (100% success rate)
- [x] Login, Signup, Forgot Password screens fully functional
- [x] Error toast displays correctly on invalid login

### December 2025 - Session 8
- [x] Created auth-options.tsx (main login selection screen)
- [x] Redesigned login.tsx per Figma (email/password form with error toast)
- [x] Redesigned signup.tsx per Figma (name/email/password form)
- [x] Created forgot-password.tsx (password reset request)
- [x] Added guest state to profile.tsx with Sign In/Create Account buttons
- [x] Connected login to mobileLogin API endpoint
- [x] Connected signup to mobileRegister API endpoint
- [x] Fixed navigator SSR error in authStore.ts
- [x] Fixed typo in forgot-password.tsx
- [x] Updated icons from FontAwesome5 to Ionicons for web compatibility

### Previous Sessions
- [x] Favorites page redesign with hybrid API/local storage
- [x] Languages page creation
- [x] Clickable followers/follows stats on profile
- [x] Country flags from /api/countries?format=rich
- [x] Connected followers.tsx and follows.tsx to real API

## Pending Tasks

### P0 (Critical)
- [x] Google Sign-In integration - DONE (socialAuthService.ts)
- [x] Apple Sign-In integration - DONE (socialAuthService.ts)
- [x] Facebook Sign-In integration - DONE (socialAuthService.ts)

### P1 (Important)
- [x] Login/Signup screens (DONE)
- [x] Statistics page implementation (DONE)
- [ ] i18n integration using selected language
- [ ] Profile page - connect real followers/following count from API

### P2 (Nice to have)
- [x] Play at Login preference (DONE - already working)
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

## Test Reports
- `/app/test_reports/iteration_7.json` - Auth UI complete test (100% pass rate, all 9 features)
- `/app/test_reports/iteration_6.json` - Auth UI screens test (95% pass rate)

## Notes
- Mobile auth endpoints are deployed and working
- API returns 401 for invalid credentials (correct behavior)
- All auth screens follow Figma design specifications

## Typography (Ubuntu Font Family)
- **Ubuntu-Regular**: General body text, input fields
- **Ubuntu-Medium**: Subtitles, hints, secondary text
- **Ubuntu-Bold**: Headlines, buttons, titles
- **Ubuntu-BoldItalic**: Special emphasis (splash screen)

Font files: `/app/frontend/assets/fonts/`

## Last Updated
February 2026 - Session 10
