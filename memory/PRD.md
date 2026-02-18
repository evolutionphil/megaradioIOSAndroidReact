# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: expo-audio (migrated from expo-av)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens
- **Build**: EAS Build with Legacy Architecture (New Arch disabled for stability)
- **Notifications**: expo-notifications, expo-device

## Core Features (Implemented)
1. **Radio Streaming**: In-app audio playback with expo-audio + Lock Screen/Control Center integration
2. **Tab Navigation**: Discover | Genres | Favorites | Profile
3. **Local Caching**: TV init data and genres cached with stale-while-revalidate pattern
4. **Guest User Support**: Settings, profile, and favorites accessible without login
5. **Favorites**: Add/remove favorites (syncs on login, works for guests too)
6. **Genres**: Browse all genres sorted by station count with country filtering
7. **Popular Stations**: Shows popular stations from user's country
8. **TV Cast**: Cast radio to TV app (Samsung/LG Smart TVs)
9. **Client-Side Sorting**: A-Z, Z-A, Popular, Newest, Oldest sorting for all station lists
10. **Push Notifications**: Full implementation with device token registration and navigation handling
11. **Play at Login**: Auto-play station on app startup based on user settings
12. **Statistics Tracking**: Track listening duration per station
13. **Deep Linking**: megaradio:// scheme for sharing stations
14. **Swipe to Dismiss**: Player screen can be dismissed by swiping down

## Implementation Status

### Latest Session - December 2025 (Current)

#### Push Notifications (P0) - ✅ COMPLETED
**Implementation**:
- Added `expo-notifications` and `expo-device` packages
- Created `NotificationHandler.tsx` component for handling all notification logic
- Updated `pushNotificationService.ts` with:
  - Token registration with Expo Push Token API
  - Android notification channels (default, radio, new-stations, favorites)
  - Navigation handling when notification is tapped
  - Foreground notification handling
  - Cold start notification handling
- Integrated into `_layout.tsx` for app-wide notification support

**Files Created/Modified**:
- `frontend/src/components/NotificationHandler.tsx` - NEW
- `frontend/src/services/pushNotificationService.ts` - UPDATED
- `frontend/app/_layout.tsx` - UPDATED
- `frontend/app.json` - UPDATED (notification plugin config)

#### Backend API Verification - ✅ CONFIRMED WORKING
**Status**: All previously blocked backend features are now working:
- **Genre Filtering**: `?country=TR` parameter works correctly
- **Static Pages API**: `/api/app/pages` returns About, Terms, Privacy content
- **App Info API**: `/api/app/info` returns app metadata
- **Google Auth Endpoint**: Endpoint is responding (requires valid token)

### Previous Sessions Summary

#### A-Z Sorting Bug Fix (P0) - ✅ FIXED
- Implemented client-side sorting with Turkish locale support

#### iOS Build Stabilization - ✅ FIXED
- Disabled Expo New Architecture
- Downgraded react-native-reanimated v4 to v3
- Fixed lock screen metadata

#### Advanced Sharing & Deep Linking - ✅ IMPLEMENTED
- Station sharing with deep links (megaradio://)
- Copy link functionality
- Native share sheet integration

#### Swipe to Dismiss Player - ✅ IMPLEMENTED
- PanResponder-based gesture handling

## Key Files
- `frontend/app/_layout.tsx` - Root layout with global MiniPlayer and NotificationHandler
- `frontend/src/components/NotificationHandler.tsx` - Push notification handling
- `frontend/src/services/pushNotificationService.ts` - Push notification service
- `frontend/app/all-stations.tsx` - All stations with client-side sorting
- `frontend/app/genre-detail.tsx` - Genre detail with client-side sorting
- `frontend/app/player.tsx` - Player with swipe to dismiss
- `frontend/src/components/PlayerOptionsSheet.tsx` - Share/favorite options
- `frontend/src/providers/AudioProvider.tsx` - Audio playback and lock screen
- `frontend/src/store/playerStore.ts` - Sleep timer logic

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: user@emergent.properties / string

## Known Issues

### Requires Testing on Physical Device
1. **Push Notifications** - Works only on physical iOS/Android devices (not simulators)
2. **Social Logins (Google & Apple)** - Needs proper OAuth configuration

### Backend Requirements
1. **Push Token Endpoint** - Backend needs `POST /api/user/push-token` endpoint to store device tokens
2. **Discoverable Genres Images** - Backend needs to return images (P1)

## Backlog

### P1 - High Priority
1. **Local Genre Caching** - Add AsyncStorage caching for genre list
2. **Android App Store Build** - Create production build for Android
3. **Test Push Notifications** - Full end-to-end test with backend

### P2 - Medium Priority
1. **Sleep Timer Enhancement** - Add more timer presets
2. **Glow Effect Enhancement** - Animated glow based on audio

## Build Notes
- **Architecture**: Legacy (New Arch disabled via `newArchEnabled: false` in app.json)
- **Reanimated**: v3 (v4 caused crashes)
- **EAS Build**: Use `eas build --platform ios` for production builds
- **Push Notifications**: Requires EAS build (Expo Go doesn't support all features)

## User Language
Turkish (Türkçe)
