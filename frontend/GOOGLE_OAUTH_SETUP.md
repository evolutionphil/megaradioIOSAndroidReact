# Google OAuth Android Yapılandırma Rehberi

## Sorun
Android'de Google Login çalışmıyor: "Access blocked - Authorization error"

## Neden?
Google Cloud Console'da Android uygulaması için SHA-1 fingerprint yapılandırılmamış.

## Çözüm Adımları

### 1. EAS Build SHA-1 Fingerprint'i Alın

```bash
# EAS credentials'ı görüntüleyin
cd frontend
npx eas credentials

# Android -> production -> Keystore seçin
# SHA-1 fingerprint'i kopyalayın
```

Veya EAS Dashboard'dan:
1. https://expo.dev adresine gidin
2. Projenizi seçin
3. Credentials > Android > Keystore
4. SHA-1 fingerprint'i kopyalayın

### 2. Google Cloud Console'da OAuth Client Oluşturun

1. https://console.cloud.google.com adresine gidin
2. Projenizi seçin: `mega-bb8c0`
3. APIs & Services > Credentials
4. "Create Credentials" > "OAuth client ID"
5. Application type: **Android**
6. Name: `MegaRadio Android`
7. Package name: `com.visiongo.megaradio`
8. SHA-1 certificate fingerprint: [EAS'dan aldığınız SHA-1]
9. Create

### 3. google-services.json Güncelleme

1. Firebase Console'a gidin: https://console.firebase.google.com
2. Project Settings > Your apps > Android app
3. SHA certificate fingerprints > Add fingerprint
4. EAS SHA-1 fingerprint'i ekleyin
5. google-services.json'u indirin
6. `/app/frontend/google-services.json` dosyasını değiştirin

### 4. OAuth Consent Screen Kontrolü

1. Google Cloud Console > APIs & Services > OAuth consent screen
2. Publishing status: "In production" olmalı (test modunda sadece belirli kullanıcılar girebilir)
3. Veya test kullanıcıları ekleyin

### 5. Build Alın

```bash
npx eas build --platform android --profile preview --clear-cache
```

## Mevcut Client ID'ler

- iOS: `246210957471-18662dh38h9tmlk7nppdk15ucbha4emk.apps.googleusercontent.com`
- Android: `246210957471-4dmnb95bcduaocr8toiphv3guq9a8htl.apps.googleusercontent.com`

## Debug Modu SHA-1 (Yerel geliştirme için)

Eğer debug build kullanıyorsanız, debug keystore SHA-1'i de eklemeniz gerekir:

```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Önemli Notlar

1. **Production ve Development için farklı SHA-1** kullanılır
2. EAS Build her seferinde aynı keystore kullanır (farklı SHA-1 üretmez)
3. OAuth Consent Screen "In production" değilse, sadece test kullanıcıları giriş yapabilir
4. Package name (`com.visiongo.megaradio`) tam olarak eşleşmeli
