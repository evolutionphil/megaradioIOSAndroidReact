# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: react-native-track-player (Control Center/Lock Screen support) + expo-audio (fallback)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens + Google/Apple Sign-In
- **Build**: EAS Build with Legacy Architecture (New Arch disabled for stability)
- **Notifications**: expo-notifications, expo-device

## Latest Session - February 2025

### react-native-track-player Entegrasyonu ✅
**Amaç**: iOS Control Center ve Lock Screen'de düzgün çalışan media player

**Yapılan Değişiklikler**:
1. `react-native-track-player` paketi eklendi (v4.1.2)
2. `/frontend/service.js` - Playback service (remote events)
3. `/frontend/index.js` - Entry point with RNTP registration
4. `/frontend/src/services/trackPlayerService.ts` - RNTP wrapper service
5. `/frontend/src/services/audioServiceFactory.ts` - Service factory (RNTP/expo-audio)
6. `package.json` - Main entry updated, RNTP exclude added

**iOS Ayarları**:
- `iosCategory: 'playback'` - Diğer uygulamaları durdurur
- `iosCategoryOptions: []` - mixWithOthers YOK
- Background Modes: `audio`, `fetch`, `remote-notification`

### Splash Screen Yeniden Tasarlandı ✅
- Koyu gradient arka plan
- MegaRadio logo ortada
- 4 eliptik ses dalgası halkası
- Sol-alt köşede pembe noktalı desen

### Diğer Düzeltmeler ✅
- Google Sign-In: `responseType: Code` (PKCE flow)
- MiniPlayer: Non-tab sayfalarda `bottom: 0`
- Discoverable Genres: Sağa hizalı metin
- Popular Stations: Loading spinner eklendi

## Core Features
1. **Radio Streaming**: react-native-track-player ile iOS/Android native playback
2. **Control Center/Lock Screen**: Title, Artist, Artwork, Play/Pause kontrolleri
3. **Tab Navigation**: Discover | Genres | Favorites | Profile
4. **Guest User Support**: Login olmadan kullanım
5. **Push Notifications**: Expo Push ile bildirimler
6. **Deep Linking**: megaradio:// scheme

## Key Files
- `frontend/index.js` - Entry point with RNTP service registration
- `frontend/service.js` - Track Player playback service
- `frontend/src/services/trackPlayerService.ts` - RNTP API wrapper
- `frontend/src/providers/AudioProvider.tsx` - Audio context provider
- `frontend/src/components/AnimatedSplash.tsx` - Splash screen

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`

## Build Commands
```bash
# iOS Build
eas build --platform ios --profile production

# Android Build
eas build --platform android --profile production
```

## Beklenen Davranış (Yeni Build'de)
1. MegaRadio başladığında → YouTube/Spotify DURUR
2. Control Center'da → MegaRadio player görünür
3. Lock Screen'de → Artwork + Title + Artist görünür
4. Play/Pause butonları → Çalışır

## Backlog
- P1: Sleep Timer geliştirmeleri
- P2: UI animasyonları (Glow Effect)
- P2: Genre station count backend sorunu

## User Language
Turkish (Türkçe)
