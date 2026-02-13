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
- [x] Car Mode Screen with Custom Carousel
- [x] Now Playing API with ICY Metadata
- [x] API Key Integration (X-API-Key header on all requests)
- [x] Sleep Timer with countdown functionality + ON badge + Sleep Counter Modal
- [x] Share Modal with native sharing
- [x] Radio Error Modal for stream failures
- [x] Client-side Recently Played (AsyncStorage)
- [x] Statistics Screen (Figma design - Total Listening, Radio Station count, Music Played)
- [x] Play at Login Screen (Last Played, Random, Favorite, Off options)
- [x] Country Picker with flag emojis and search
- [x] Location-based content (GPS-based station discovery)
- [x] **Followers Screen** - List followers with Remove button
- [x] **Follows Screen** - List following users with Unfollow button
- [x] **User Profile Screen** - View other user's profile with favorite stations
- [x] **Share User Modal** - Facebook, Instagram, Twitter, WhatsApp, Copy Link
- [x] **Logout Modal** - Centered confirmation dialog with Cancel/Ok buttons

### Session 5 Bug Fixes (Dec 2025)
1. **Popular Stations Logo Fix (P0)**: Fixed logo URLs not loading for popular stations.
   - Now using `getLogoUrl()` helper consistently across all station renders
   - Handles relative URLs by prepending `https://themegaradio.com`
   - Falls back to FALLBACK_LOGO when no image available

2. **API Country Parameter Consistency (P0)**: Fixed stations not loading after country change.
   - Created country mapping in `locationStore.ts` for English vs Native names
   - `/api/stations/popular` uses English names (e.g., "Turkey")
   - `/api/stations` uses native names (e.g., "Türkiye")
   - Store now tracks both `country` (native) and `countryEnglish`

3. **Car Mode Initial Station Fix (P0)**: Fixed carousel starting on wrong station.
   - Added `initialIndexSetRef` to ensure index is only set once when CarMode opens
   - Stations list is frozen on open to prevent re-ordering

4. **GlowEffect Improvement (P1)**: Rewrote SVG RadialGradient for softer blur.
   - Changed from Rect to Circle element
   - Added 8 gradient stops (0%, 15%, 30%, 45%, 60%, 75%, 90%, 100%)
   - Opacity smoothly fades to 0 at edges

5. **Statistics Page (NEW)**: Created `/app/frontend/app/statistics.tsx`
   - Cards: Total Listening (hours/minutes), Total Radio Station, Music Played
   - Pink wave graph using SVG Path with LinearGradient
   - Dark theme matching Figma (#121212 background, #1E1E1E cards)

6. **Play at Login Page (NEW)**: Created `/app/frontend/app/play-at-login.tsx`
   - Options: Last Played, Random, Favorite, Off
   - Pink radio buttons (#FF4081) matching Figma
   - Persists selection to AsyncStorage

7. **Country Picker Enhanced**: Extended FLAG_MAP with 100+ countries
   - Supports both English and native country names
   - Search functionality working
   - Flag emojis display correctly

## Key Files
- `/app/frontend/src/store/locationStore.ts` - Country handling with English/Native mapping
- `/app/frontend/app/statistics.tsx` - Statistics screen (Figma design)
- `/app/frontend/app/play-at-login.tsx` - Play at Login screen (Figma design)
- `/app/frontend/app/(tabs)/profile.tsx` - Profile with navigation to sub-screens
- `/app/frontend/src/components/GlowEffect.tsx` - SVG-based soft glow effect
- `/app/frontend/src/components/CarModeScreen.tsx` - Car Mode with frozen station list
- `/app/frontend/app/player.tsx` - Player with animated equalizer
- `/app/frontend/app/(tabs)/index.tsx` - Home screen with fixed popular stations

## API Endpoints
- `GET /api/stations/popular?country=Turkey` - Popular stations (English country name)
- `GET /api/stations?country=Türkiye` - All stations (Native country name)
- `GET /api/stations/nearby?lat=X&lng=Y` - Nearby stations
- `GET /api/countries` - List of all countries
- **Note**: All endpoints require `X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw` header

## Pending Tasks (P1)
- [ ] Authentication flow (Login/Signup)
- [ ] Favorites feature (API integration)
- [ ] Profile background colors (Figma match)

## Pending Tasks (P2)
- [ ] Animated equalizer enhancement (more bars)
- [ ] Sleep timer resume playback fix
- [ ] Skeleton loaders for loading states
- [ ] i18n (i18next) integration

## Known Issues
- Country search requires native name for some countries (e.g., "Tür" for Turkey)
- Web preview has CORS blocking (use Expo Go for testing)

## User Preferences
- Language: Turkish
- Priority: Pixel-perfect Figma design

## Last Updated
December 2025 - Session 5
