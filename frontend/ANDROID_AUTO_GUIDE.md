# Android Auto Entegrasyonu - Detaylı Rehber

## Mevcut Durum

`react-native-track-player` **MediaBrowserService** içermiyor. Bu nedenle:
- ✅ Bluetooth/direksiyon kontrolleri çalışıyor (MediaSession)
- ✅ Lock screen kontrolleri çalışıyor
- ❌ Android Auto ekranında uygulama görünmüyor
- ❌ Android Auto'dan radyo seçimi yapılamıyor

## Neden?

Android Auto bir uygulamayı göstermek için:
1. `MediaBrowserServiceCompat` implement edilmeli
2. `onGetRoot()` ve `onLoadChildren()` metodları override edilmeli
3. AndroidManifest.xml'de doğru intent-filter olmalı

`react-native-track-player` sadece `MediaSessionCompat` sağlıyor (kontroller için yeterli) ama `MediaBrowserService` yok (browse için gerekli).

## Çözüm Seçenekleri

### Seçenek 1: Temel Android Auto Desteği (Native Kod)

Bu seçenek için Expo'dan eject yapmanız veya custom dev client kullanmanız gerekiyor.

```kotlin
// android/app/src/main/java/com/visiongo/megaradio/AutoMusicService.kt

package com.visiongo.megaradio

import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import androidx.media.MediaBrowserServiceCompat

class AutoMusicService : MediaBrowserServiceCompat() {

    override fun onCreate() {
        super.onCreate()
        // MediaSession zaten react-native-track-player tarafından oluşturuluyor
        // Burada sadece browse desteği ekliyoruz
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot? {
        // Android Auto'nun erişimine izin ver
        return BrowserRoot("root", null)
    }

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>
    ) {
        // Radyo kategorileri veya istasyonları döndür
        result.detach()
        
        val items = mutableListOf<MediaBrowserCompat.MediaItem>()
        
        // Örnek kategori
        val description = MediaDescriptionCompat.Builder()
            .setMediaId("favorites")
            .setTitle("Favoriler")
            .build()
        
        items.add(MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
        ))
        
        result.sendResult(items)
    }
}
```

AndroidManifest.xml'e eklenecek:
```xml
<service
    android:name=".AutoMusicService"
    android:exported="true">
    <intent-filter>
        <action android:name="android.media.browse.MediaBrowserService" />
    </intent-filter>
</service>

<meta-data
    android:name="com.google.android.gms.car.application"
    android:resource="@xml/automotive_app_desc" />
```

### Seçenek 2: Sadece Bluetooth Kontrolleri (Mevcut Durum)

Şu an çalışan özellikler:
- Araç stereonuzda play/pause/skip butonları
- Direksiyon kontrolleri
- Bildirim kontrolü

Bu birçok kullanım senaryosu için yeterlidir.

### Seçenek 3: Standalone Android Auto App

Ayrı bir native Android uygulaması oluşturup, React Native uygulamasıyla senkronize etmek.

## Önerilen Yol

1. **Şimdilik Bluetooth kontrolleri kullanın** - Bu çoğu araçta çalışır
2. **Gelecekte:** Android Auto tam desteği için Expo'dan eject yapıp native kod yazılabilir

## Tasarım Sorusu

Android Auto için ekran tasarımı konusunda:
- Android Auto'nun kendi UI'ı var - "Media template" kullanılıyor
- Özel tasarım yapılamıyor, sadece içerik (radyo listesi, kategoriler) sağlanıyor
- Google'ın Material Design for Cars kurallarına uyulmalı

## Referanslar

- [Android Auto Media App Guide](https://developer.android.com/training/cars/media)
- [MediaBrowserServiceCompat](https://developer.android.com/training/cars/media/create-media-browser)
- [react-native-track-player Android Auto Discussion](https://github.com/doublesymmetry/react-native-track-player/discussions/1984)
