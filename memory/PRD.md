# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using React Native with Expo. The app should provide pixel-perfect UI implementation of Figma designs with robust radio streaming capabilities.

## Tech Stack
- **Frontend**: Expo SDK 54, TypeScript, Expo Router, React Query, Zustand
- **Audio**: react-native-track-player v4.1.2 (Control Center/Lock Screen support)
- **CarPlay/Android Auto**: @g4rb4g3/react-native-carplay v2.7.22
- **Storage**: AsyncStorage for local caching
- **API**: MegaRadio API (https://themegaradio.com)
- **Auth**: API Key + JWT tokens + Google/Apple Sign-In
- **Build**: EAS Build with Legacy Architecture (New Arch disabled for stability)
- **Notifications**: expo-notifications, expo-device

## Latest Session - February 19, 2025

### ✅ CarPlay & Android Auto Entegrasyonu Tamamlandı
**Yeni Dosyalar:**
- `frontend/src/services/carPlayService.ts` - CarPlay/Android Auto template yönetimi
- `frontend/src/components/CarPlayHandler.tsx` - CarPlay başlatıcı component

**CarPlay Templates:**
1. **Tab Bar** (Ana navigasyon)
   - Keşfet (Popüler istasyonlar)
   - Favoriler
   - Son Çalınanlar
   - Türler

2. **List Template** (İstasyon listesi)
   - İstasyon adı, ülke, logo
   - Tıklayınca çalma başlar

3. **Now Playing Template** (Çalan radyo)
   - MPNowPlayingInfoCenter ile entegre
   - Play/Pause kontrolleri

**iOS Yapılandırması (app.json):**
```json
"entitlements": {
  "com.apple.developer.carplay-audio": true
}
```

### ✅ react-native-track-player TAM Migration
- `AudioProvider.tsx` tamamen yeniden yazıldı
- iOS Control Center & Lock Screen tam destek
- Background audio ve interruption handling
- Metadata her 30 saniyede güncelleniyor

### ✅ Splash Screen Düzeltildi
- `splash-full.png` kullanarak tam ekran arka plan
- Sol tarafta siyah boşluk sorunu çözüldü

## Key Files
- `frontend/src/services/carPlayService.ts` - **YENİ** CarPlay service
- `frontend/src/components/CarPlayHandler.tsx` - **YENİ** CarPlay initializer
- `frontend/src/providers/AudioProvider.tsx` - Track Player entegrasyonu
- `frontend/service.js` - Track Player playback service
- `frontend/app/_layout.tsx` - CarPlayHandler eklendi

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

## ⚠️ ÖNEMLİ: Apple CarPlay Entitlement
CarPlay'in çalışması için Apple'dan `com.apple.developer.carplay-audio` entitlement onayı gerekli.
- Başvuru yapıldı ✅
- Onay bekleniyor ⏳

## CarPlay/Android Auto Davranışı
1. Araca bağlandığında → CarPlay/Android Auto otomatik başlar
2. Tab Bar görünür: Keşfet | Favoriler | Son Çalınanlar | Türler
3. İstasyon seçildiğinde → Çalma başlar, Now Playing gösterilir
4. Play/Pause → Lock screen ve araba ekranından kontrol

## Backlog (Öncelik Sırası)
- **P0**: Development build oluştur ve CarPlay test et
- **P0**: Apple CarPlay entitlement onayı bekleniyor
- **P2**: Sleep Timer geliştirmeleri
- **P2**: UI animasyonları (Glow Effect)
- **P3**: Genre station count backend sorunu

## User Language
Turkish (Türkçe)
