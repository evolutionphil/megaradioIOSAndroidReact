# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: expo-audio (migrated from expo-av)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens

## Core Features (Implemented)
1. **Radio Streaming**: In-app audio playback with expo-audio
2. **Tab Navigation**: Discover | Genres | Favorites | Profile
3. **Local Caching**: TV init data and genres cached with stale-while-revalidate pattern
4. **Guest User Support**: Settings, profile, and favorites accessible without login
5. **Favorites**: Add/remove favorites (syncs on login, works for guests too)
6. **Genres**: Browse all genres sorted by station count
7. **Popular Stations**: Shows popular stations from user's country
8. **TV Cast**: Cast radio to TV app (Samsung/LG Smart TVs)

## Implementation Status

### Latest Session - February 2026

#### Critical Bug Fixes (P0) - VERIFIED
1. **Audio Playback System Rewritten** - ✅ FIXED
   - Single player instance with `replace()` method
   - Play/Pause now uses actual `status.playing` as source of truth
   - Next/Previous stops current audio before playing new station
   - Race condition prevention with `globalPlayId`

2. **TV Cast Modal Error Handling** - ✅ FIXED
   - Improved error parsing (raw text -> JSON with fallback)
   - Better error messages for Turkish users

#### UI Bug Fixes (P1) - VERIFIED
3. **Discoverable Genres Text Alignment** - ✅ FIXED
   - Text container positioned bottom-right
   - Genre name and subtitle left-aligned within container

4. **iOS Login Screen Logo Centering** - ✅ FIXED
   - Removed `position: 'absolute'`
   - Using flex layout with `alignItems: 'center'`

### Previous Session Fixes (December 2025)
- [x] Migrated from expo-av to expo-audio
- [x] Genre country filtering
- [x] MiniPlayer button events
- [x] Guest favorites support
- [x] Full-screen auth flow
- [x] Onboarding image preloading

## Key Files
- `frontend/src/hooks/useAudioPlayer.ts` - Audio playback (REWRITTEN)
- `frontend/src/components/CastModal.tsx` - TV Cast modal (IMPROVED)
- `frontend/app/(tabs)/index.tsx` - Home screen with discoverable genres
- `frontend/app/auth-options.tsx` - Login screen (FIXED)
- `frontend/app/player.tsx` - Player with controls

## Audio Playback Technical Note
**Previous Issue**: Multiple audio streams playing simultaneously, Play/Pause not working
**Root Cause**: Old implementation may have created multiple player instances
**Solution Applied**: Single useExpoAudioPlayer instance with:
- `replace()` method to change audio sources
- `player.pause()` before switching stations
- `status?.playing` as source of truth for togglePlayPause
- `globalPlayId` for race condition prevention

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`
- **Test User**: user@emergent.properties / string

## Known Server Issues (Not App Bugs)
- Discoverable genre images failing to load from themegaradio.com - app correctly falls back to gradient backgrounds

## Backlog

### P1 - High Priority
1. **Real Device Audio Testing** - Test audio playback on Expo Go (iOS/Android)
2. **Sleep Timer Fix** - Investigate and fix sleep timer functionality

### P2 - Medium Priority
1. **Local Genre Caching** - Add AsyncStorage caching for genre list
2. **Glow Effect and Static Equalizer** - UI improvements for player screen
3. **Social Sign-In Finalization** - Complete OAuth integration

## Test Reports
- `/app/test_reports/iteration_23.json` - Latest fixes verification (100% success)
- `/app/test_reports/iteration_22.json` - Previous testing session

## User Language
Turkish (Türkçe)
