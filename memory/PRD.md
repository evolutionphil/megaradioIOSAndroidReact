# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: react-native-track-player v4.1.2 (Control Center/Lock Screen support)
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens + Google/Apple Sign-In
- **Build**: EAS Build with Legacy Architecture (New Arch disabled for stability)
- **Notifications**: expo-notifications, expo-device

## Latest Session - February 19, 2025

### ✅ react-native-track-player FULL Migration
**AudioProvider.tsx tamamen yeniden yazıldı:**
- `expo-audio` → `react-native-track-player` tam geçiş
- iOS Control Center ve Lock Screen tam destek
- Background audio session yönetimi
- Audio interruption handling (başka app açıldığında)
- `updateNowPlayingMetadata()` + `updateMetadataForTrack()` ile metadata güncelleme
- Her 30 saniyede bir şarkı bilgisi güncelleme

### ✅ Splash Screen Düzeltildi
- `splash-full.png` kullanarak tam ekran arka plan
- Logo ortada, dots/gradient alt kısımda
- Sol tarafta siyah boşluk sorunu çözüldü

### ✅ MiniPlayer Now Playing Gösterimi
- Şarkı bilgisi (song/title) artık mini player'da görünüyor

### ✅ service.js Güncellendi
- Remote events: Play, Pause, Stop, Next, Previous
- RemoteDuck handling (audio interruptions)
- Playback state logging

### ⏳ Bekleyen: CarPlay & Android Auto
**Apple CarPlay Entitlement başvurusu yapılacak**
- Paket: `@g4rb4g3/react-native-carplay`
- Templates: Now Playing, List, Tab Bar
- iOS entitlement gerekli: `com.apple.developer.carplay-audio`

## Key Files
- `frontend/src/providers/AudioProvider.tsx` - **TAM YENİDEN YAZILDI** (react-native-track-player)
- `frontend/service.js` - Track Player playback service
- `frontend/index.js` - Entry point with RNTP registration
- `frontend/src/components/AnimatedSplash.tsx` - Splash screen (splash-full.png)
- `frontend/src/components/MiniPlayer.tsx` - Now playing gösterimi eklendi

## API Credentials
- **API Key**: `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`

## Build Commands
```bash
# Development Build (TEST için ZORUNLU)
eas build --profile development --platform ios
eas build --profile development --platform android

# Production Build
eas build --platform ios --profile production
eas build --platform android --profile production
```

## ⚠️ ÖNEMLİ: Test Gereksinimleri
`react-native-track-player` **Expo Go'da ÇALIŞMAZ**.
Test için mutlaka Development Build gerekli!

## Beklenen Davranış (Development Build'de)
1. MegaRadio başladığında → Diğer audio DURUR
2. Control Center'da → MegaRadio player görünür
3. Lock Screen'de → Artwork + Title + Artist görünür
4. Play/Pause butonları → Çalışır
5. Now Playing metadata → Her 30 saniyede güncellenir

## Backlog (Öncelik Sırası)
- **P0**: Development build oluştur ve test et
- **P1**: CarPlay & Android Auto entegrasyonu
- **P2**: Sleep Timer geliştirmeleri
- **P2**: UI animasyonları (Glow Effect)
- **P3**: Genre station count backend sorunu

## User Language
Turkish (Türkçe)
