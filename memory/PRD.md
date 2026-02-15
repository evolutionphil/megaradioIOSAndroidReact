# MegaRadio - Mobile Radio Streaming App

## Project Overview
A production-ready mobile radio streaming application built with React Native + Expo. The app connects to the MegaRadio backend API at `https://themegaradio.com`.

## Tech Stack
- **Frontend**: React Native, Expo, TypeScript
- **State Management**: Zustand, React Query v5
- **Audio**: expo-audio (migrated from deprecated expo-av)
- **Navigation**: Expo Router
- **Animations**: react-native-reanimated
- **Internationalization**: i18next, react-i18next

## API Configuration
- **Base URL**: `https://themegaradio.com`
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Performance Optimization**: All API requests include `?tv=1` parameter which reduces response size by ~85%

## Core Features
1. **Radio Streaming**: Play/pause/stop radio stations with background audio support
2. **Favorites**: Add/remove stations from favorites with optimistic UI updates
3. **Recently Played**: Track and display recently played stations
4. **Search**: Search stations, genres, and user profiles
5. **User Authentication**: Email/password and social login (Apple, Google, Facebook)
6. **Profile Management**: View/edit profile, follow/unfollow users
7. **Internationalization**: Multi-language support with Turkish as primary

## Implemented Features (December 2025)

### Session 16 - Bug Fixes & New Features
- **Performance Fix**: Added `tv=1` parameter to all API requests via axios interceptor (~85% response size reduction)
- **Favorites Page Fix**: Restored Play button and Heart icon in station list items
- **Public Profiles Page**: New `/public-profiles` route displaying user profiles with pagination
- **Favorites Integration**: Added "Kullanıcılardan Favoriler" link in Favorites tab
- **Private Profile Toggle**: Functional toggle in Settings that updates `isPublicProfile` via API
- **Optimistic Updates**: Follow/unfollow buttons update UI immediately before API response
- **Login Improvements**: Better error handling with specific error messages
- **Continue Without Login**: Added button in login and auth-options pages
- **Turkish Translations**: Completed translations for auth-options, CarMode, and missing strings
- **iOS/Android Permissions**: Updated app.json with all required permissions for build

### Build Configuration (app.json)
- **iOS**: Background audio, location, photo library, camera, microphone permissions
- **Android**: Internet, network state, location, foreground service, wake lock, storage, camera, audio permissions
- **Plugins**: expo-router, expo-splash-screen, expo-location, expo-image-picker, expo-audio

### Session 17 - expo-av to expo-audio Migration (December 2025)
- **COMPLETED**: Migrated from deprecated expo-av to expo-audio
- **Files Changed**: 
  - `src/hooks/useAudioPlayer.ts` - Complete rewrite using expo-audio hooks
  - `app.json` - Changed plugin from expo-av to expo-audio
  - `package.json` - Removed expo-av, added expo-audio v1.1.1
- **API Changes**: Using useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync hooks instead of Audio.Sound class
- **Genre Detail Fix**: Added textAlign: 'center' and maxWidth to prevent text overflow
- **Login Redirect Fix**: Changed from router.replace('/') to router.replace('/(tabs)/discover') for Expo Go compatibility

### Session 18 - TV Init API Integration & UI Improvements (February 2026)
- **COMPLETED**: Integrated /api/tv/init endpoint for faster initial loading
- **COMPLETED**: Tab bar reorganization (Discover → Genres → Favorites → Profile)
- **COMPLETED**: Guest User Profile settings page with Language, Country options
- **COMPLETED**: Genre navigation fix - now goes directly to genre-detail page
- **COMPLETED**: Favorites List/Grid view toggle with 3-column grid
- **COMPLETED**: Discoverable genres banner text aligned to right side
- **Files Created**: 
  - `src/services/tvInitService.ts` - New service for TV init API
  - `app/(tabs)/genres.tsx` - New Genres tab page
- **Files Modified**:
  - `app/_layout.tsx` - Added TV init call on app startup
  - `app/(tabs)/_layout.tsx` - Tab bar reorganization
  - `app/(tabs)/profile.tsx` - Guest User settings UI
  - `app/(tabs)/favorites.tsx` - Grid view support
  - `app/(tabs)/index.tsx` - Genre navigation and banner styling
  - `src/hooks/useQueries.ts` - Cache integration for genres and stations

## File Structure
```
/app/frontend
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx         # Home/Discover page
│   │   ├── favorites.tsx     # Favorites with Public Profiles link
│   │   ├── discover.tsx      # Genre discovery
│   │   ├── profile.tsx       # User profile with Settings
│   │   └── records.tsx       # Recording feature
│   ├── _layout.tsx           # Root layout with Stack navigator
│   ├── login.tsx             # Email login
│   ├── signup.tsx            # Registration
│   ├── auth-options.tsx      # Social login options
│   ├── public-profiles.tsx   # NEW: Public profiles list
│   ├── user-profile.tsx      # Other user's profile view
│   └── ...
├── src/
│   ├── services/
│   │   ├── api.ts            # Axios instance with tv=1 interceptor
│   │   └── i18nService.ts    # i18next configuration with Turkish
│   ├── store/
│   │   ├── authStore.ts      # Authentication state
│   │   ├── playerStore.ts    # Audio player state
│   │   └── languageStore.ts  # Language preference
│   └── components/
│       └── CarModeScreen.tsx # Car mode interface
└── app.json                  # Expo configuration with permissions
```

## API Endpoints Used
- `GET /api/stations/popular` - Popular stations
- `GET /api/genres/discoverable` - Genre list
- `GET /api/public-profiles` - Public user profiles (pagination)
- `POST /api/auth/login` - Email login
- `PUT /api/auth/profile` - Update profile (isPublicProfile)
- `POST /api/user-engagement/follow/:userId` - Follow user
- `POST /api/user-engagement/unfollow/:userId` - Unfollow user

## Test Credentials
- **Email**: `gey14853@outlook.com`
- **Password**: `Muhammed5858`

## Pending/Future Tasks
1. Social Sign-In (requires development build for native auth)
2. Sleep Timer bug fix
3. Glow Effect and Static Equalizer UI bugs
4. Popular Stations slow loading optimization (add limit=4 parameter)

## Known Issues
- TypeScript strict mode warnings for Image component uri types
- Expo Router typed routes warnings for new pages

## User Language Preference
Turkish (Türkçe)
