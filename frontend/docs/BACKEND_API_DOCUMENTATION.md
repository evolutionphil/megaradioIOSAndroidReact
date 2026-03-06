# MegaRadio Backend API Documentation
## Frontend Kullanım ve Cache Stratejisi

Bu doküman, MegaRadio mobil uygulamasının backend API'lerini nasıl kullandığını detaylı olarak açıklar.

**Son Güncelleme:** Aralık 2025  
**Build:** 61

---

## İçindekiler

1. [Genel API Yapılandırması](#1-genel-api-yapılandırması)
2. [Cache Stratejisi](#2-cache-stratejisi)
3. [Station Endpoints](#3-station-endpoints)
4. [Genre Endpoints](#4-genre-endpoints)
5. [User/Auth Endpoints](#5-userauth-endpoints)
6. [Recently Played](#6-recently-played)
7. [Device Token (Silent Push)](#7-device-token-silent-push)
8. [Diğer Endpoints](#8-diğer-endpoints)
9. [Kritik Notlar](#9-kritik-notlar)

---

## 1. Genel API Yapılandırması

### Base URL
```
https://themegaradio.com
```

### Headers
```http
X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw
Content-Type: application/json
Authorization: Bearer {token}  # Auth gerektiren endpoint'ler için
```

### TV Parameter
**TÜM API isteklerine otomatik olarak `tv=1` parametresi eklenir.**

Bu, frontend'deki global interceptor tarafından yapılır:
```javascript
// api.ts - Request Interceptor
config.params = { ...config.params, tv: 1 };
```

Bu parametre, TV/CarPlay/Android Auto için optimize edilmiş veri döndürür:
- Gereksiz alanlar filtrelenir
- Response boyutu küçülür
- Mobil için optimize edilmiş format

---

## 2. Cache Stratejisi

### React Query Cache TTL (Time-To-Live)

| Veri Tipi | staleTime | Açıklama |
|-----------|-----------|----------|
| **Statik Veriler** | | |
| Genres (tümü) | 24 saat | Nadiren değişir |
| Countries | 24 saat | Nadiren değişir |
| Translations | 24 saat | Nadiren değişir |
| **Yarı-Statik Veriler** | | |
| Station Detail | 30 dk | Tek istasyon bilgisi |
| Genre Stations | 1 saat | Genre içindeki istasyonlar |
| Similar Stations | 30 dk | Benzer istasyonlar |
| **Dinamik Listeler** | | |
| Stations List | 10 dk | İstasyon listesi |
| Popular Stations | 10 dk | Popüler istasyonlar |
| Trending | 5 dk | Trend olanlar |
| Top 100 | 10 dk | En iyi 100 |
| **Kullanıcı Verileri** | | |
| Recently Played | 30 sn | Son dinlenenler |
| Favorites | 1 dk | Favoriler |
| User Profile | 2 dk | Profil bilgisi |

### Cache-First Pattern
```
1. İstek geldiğinde önce CACHE kontrol edilir
2. Cache varsa → HEMEN döndür
3. Arka planda API'den YENİ veri çek
4. Yeni veri geldiğinde cache güncelle
```

### Native Cache (iOS/Android)
CarPlay ve Android Auto için ayrıca native cache kullanılır:
- **iOS:** `UserDefaults` 
- **Android:** `SharedPreferences`
- Bu sayede uygulama kapalıyken bile CarPlay/Android Auto veri gösterebilir

---

## 3. Station Endpoints

### 3.1 GET /api/stations
**Amaç:** İstasyon listesi getir (filtrelenebilir)

**Kullanım Yerleri:**
- All Stations sayfası
- Genre detay sayfası (country filtreli)
- Homepage (country filtreli)

**Parametreler:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `country` | string | ❌ | **İNGİLİZCE** ülke adı (örn: "Austria", "Turkey") |
| `genre` | string | ❌ | Genre slug (örn: "pop", "rock") |
| `limit` | number | ❌ | Sonuç limiti (default: 50) |
| `page` | number | ❌ | Sayfa numarası |
| `sort` | string | ❌ | Sıralama: votes, clickCount, name, createdAt |
| `order` | string | ❌ | asc veya desc |
| `tv` | number | ✅ | Her zaman 1 gönderilir |

**Örnek İstek:**
```http
GET /api/stations?country=Austria&limit=50&tv=1
```

**Örnek Yanıt:**
```json
{
  "stations": [
    {
      "_id": "abc123",
      "name": "Hitradio Ö3",
      "url": "https://stream.example.com/live",
      "urlResolved": "https://resolved.example.com/live",
      "favicon": "https://example.com/logo.png",
      "country": "Austria",
      "countrycode": "AT",
      "tags": "pop,hits,music",
      "votes": 1234,
      "clickCount": 5678
    }
  ],
  "totalCount": 150
}
```

**⚠️ KRİTİK:**
- `country` parametresi **İNGİLİZCE** olmalı: "Austria" ✅, "Österreich" ❌
- Native isimler (Türkçe, Almanca) kabul EDİLMİYOR

---

### 3.2 GET /api/stations/popular
**Amaç:** Popüler istasyonlar getir

**Kullanım Yerleri:**
- Homepage "Popular Stations" bölümü
- CarPlay/Android Auto ana ekran
- TV init ön yükleme

**Parametreler:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `country` | string | ❌ | **İNGİLİZCE** ülke adı |
| `limit` | number | ❌ | Sonuç limiti (default: 12) |
| `tv` | number | ✅ | Her zaman 1 |

**Örnek İstek:**
```http
GET /api/stations/popular?country=Turkey&limit=12&tv=1
```

**Cache Stratejisi:**
- React Query: 10 dakika staleTime
- Native Cache: 7 gün (CarPlay/Android Auto için)

---

### 3.3 GET /api/station/{identifier}
**Amaç:** Tek istasyon detayı getir

**Kullanım Yerleri:**
- Player sayfası
- Deep link ile açılan istasyon
- Share link preview

**Parametreler:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `identifier` | string | ✅ | İstasyon ID veya slug |
| `tv` | number | ✅ | Her zaman 1 |

**Örnek İstek:**
```http
GET /api/station/hitradio-o3?tv=1
```

---

### 3.4 GET /api/stations/similar/{stationId}
**Amaç:** Benzer istasyonlar getir

**Kullanım Yerleri:**
- Player sayfası alt kısmı

**Parametreler:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `stationId` | string | ✅ | Referans istasyon ID |
| `limit` | number | ❌ | Sonuç limiti |

---

### 3.5 POST /api/stations/{id}/click
**Amaç:** İstasyon tıklama/oynatma kaydı

**Kullanım Yerleri:**
- Play butonuna basıldığında
- CarPlay/Android Auto'dan oynatma

**Body:** Yok

---

### 3.6 GET /api/now-playing/{stationId}
**Amaç:** İstasyonun şu an çaldığı şarkı bilgisi

**Kullanım Yerleri:**
- Player sayfası
- Lock screen metadata
- CarPlay Now Playing

**Örnek Yanıt:**
```json
{
  "title": "Shape of You",
  "artist": "Ed Sheeran",
  "album": "÷",
  "artwork": "https://example.com/cover.jpg"
}
```

---

## 4. Genre Endpoints

### 4.1 GET /api/genres/precomputed
**Amaç:** Ön hesaplanmış genre listesi (station count ile)

**Kullanım Yerleri:**
- Homepage genre listesi
- CarPlay/Android Auto genre menüsü
- Genre seçim ekranı

**Parametreler:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `countrycode` | string | ❌ | **ISO KODU** (örn: "AT", "TR", "DE") |
| `limit` | number | ❌ | Genre sayısı limiti (default: 40) |
| `tv` | number | ✅ | Her zaman 1 |

**Örnek İstek:**
```http
GET /api/genres/precomputed?countrycode=AT&limit=40&tv=1
```

**Örnek Yanıt:**
```json
{
  "data": [
    {
      "name": "Pop",
      "slug": "pop",
      "stationCount": 245
    },
    {
      "name": "Rock",
      "slug": "rock", 
      "stationCount": 189
    }
  ]
}
```

**⚠️ KRİTİK:**
- `countrycode` parametresi **ISO KODU** olmalı: "AT" ✅, "Austria" ❌
- `/api/stations` ile FARKLI format!

---

### 4.2 GET /api/genres/{slug}/stations
**Amaç:** Belirli genre'deki istasyonlar

**Kullanım Yerleri:**
- Genre detay sayfası
- CarPlay genre içi liste

**Parametreler:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `slug` | string | ✅ | Genre slug (örn: "pop", "hip-hop") |
| `country` | string | ❌ | **İNGİLİZCE** ülke adı |
| `limit` | number | ❌ | Sonuç limiti |
| `page` | number | ❌ | Sayfa |
| `tv` | number | ✅ | Her zaman 1 |

**Örnek İstek:**
```http
GET /api/genres/pop/stations?country=Austria&limit=50&tv=1
```

---

### 4.3 GET /api/genres/discoverable
**Amaç:** Keşfedilebilir (öne çıkan) genre'ler

**Kullanım Yerleri:**
- Homepage "Discover" bölümü

**Örnek Yanıt:**
```json
{
  "genres": [
    {
      "name": "Pop",
      "slug": "pop",
      "icon": "music-note",
      "description": "En popüler müzikler"
    }
  ]
}
```

---

## 5. User/Auth Endpoints

### 5.1 POST /api/auth/signup
**Amaç:** Yeni kullanıcı kaydı

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

---

### 5.2 POST /api/auth/login
**Amaç:** Kullanıcı girişi

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Yanıt:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### 5.3 GET /api/user/favorites
**Amaç:** Kullanıcının favori istasyonları

**Headers:** `Authorization: Bearer {token}` gerekli

**Yanıt:**
```json
{
  "favorites": [
    {
      "_id": "station123",
      "name": "Radio XYZ",
      "favicon": "https://..."
    }
  ]
}
```

---

### 5.4 POST /api/user/favorites
**Amaç:** Favorilere istasyon ekle

**Headers:** `Authorization: Bearer {token}` gerekli

**Body:**
```json
{
  "stationId": "station123"
}
```

---

### 5.5 DELETE /api/user/favorites/{stationId}
**Amaç:** Favorilerden istasyon kaldır

**Headers:** `Authorization: Bearer {token}` gerekli

---

## 6. Recently Played

### 6.1 GET /api/recently-played
**Amaç:** Kullanıcının son dinlediği istasyonlar

**Headers:** `Authorization: Bearer {token}` gerekli

**Yanıt:**
```json
[
  {
    "_id": "station123",
    "name": "Radio XYZ",
    "playedAt": "2025-03-06T12:00:00Z"
  }
]
```

---

### 6.2 POST /api/recently-played
**Amaç:** Son dinlenenlere istasyon ekle

**Headers:** `Authorization: Bearer {token}` gerekli

**Body:**
```json
{
  "stationId": "station123"
}
```

**Frontend Davranışı:**
1. İstasyon oynatıldığında LOCAL STORAGE'a kaydedilir
2. ASYNC olarak backend'e POST edilir
3. Kullanıcı giriş yapmamışsa sadece local storage kullanılır

---

## 7. Device Token (Push Notifications)

### 7.1 POST /api/user/push-token
**Amaç:** Push notification için device token kaydet

**Kullanım:** Uygulama açıldığında ve login sonrası

**Headers:** `Authorization: Bearer {token}` (opsiyonel - user association için)

**Body:**
```json
{
  "token": "apns_device_token_here",
  "platform": "ios",
  "deviceName": "iPhone 15 Pro",
  "country": "Turkey",
  "language": "tr",
  "tokenType": "apns"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `token` | string | ✅ | APNs (iOS) veya FCM (Android) token |
| `platform` | string | ✅ | "ios" veya "android" |
| `deviceName` | string | ❌ | Cihaz adı |
| `country` | string | ❌ | Ülke (İngilizce veya native) |
| `language` | string | ❌ | Dil kodu (tr, en, de) |
| `tokenType` | string | ❌ | "apns" (iOS) veya "fcm" (Android) |

**NOT:** `userId` body'de GÖNDERİLMEZ - Authorization header'dan otomatik çıkarılır.

---

### 7.2 DELETE /api/user/push-token
**Amaç:** Device token'ı sil (logout'ta)

**Headers:** `Authorization: Bearer {token}` gerekli

**Body:**
```json
{
  "token": "apns_device_token_here",
  "platform": "ios"
}
```

**⚠️ NOT:** Bu endpoint **DELETE** method kullanır, POST değil!
```

---

## 8. Diğer Endpoints

### 8.1 GET /api/tv/init ⚠️ BACKEND'DE OLUŞTURULMASI GEREKİYOR
**Amaç:** TV/CarPlay başlangıç verileri (tek istekle çoklu veri)

**Durum:** Frontend bu endpoint'i kullanıyor ancak backend'de henüz MEVCUT DEĞİL!

**Kullanım:** Uygulama açılışında ön yükleme - performans için kritik

**Parametreler:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `country` | string | İngilizce ülke adı |
| `lang` | string | Dil kodu (tr, en, de) |

**Beklenen Yanıt:**
```json
{
  "popularStations": [...],  // 21 popüler istasyon (slim format)
  "genres": [...],           // 13 genre (name, slug, stationCount)
  "countries": [...],        // 219 ülke listesi
  "translations": {...},     // Çeviri key-value'ları
  "responseTime": 123,       // API response süresi (ms)
  "cacheAge": 0              // Cache yaşı (saniye)
}
```

**⚠️ Backend developer'ın bu endpoint'i oluşturması ÖNERİLİR.**
Bu endpoint tek istekle birden fazla veri döndürür ve uygulama açılış süresini önemli ölçüde kısaltır.
```

---

### 8.2 GET /api/stream/resolve
**Amaç:** Playlist URL'ini gerçek stream URL'ine çevir

**Kullanım:** .pls, .m3u, .asx dosyaları için

**Parametreler:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `url` | string | Playlist URL'i |

**Yanıt:**
```json
{
  "candidates": [
    "https://stream1.example.com/live",
    "https://stream2.example.com/backup"
  ]
}
```

---

### 8.3 GET /api/translations/{lang}
**Amaç:** Çeviri key'leri getir

**Parametreler:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `lang` | string | Dil kodu: tr, en, de, etc. |

---

### 8.4 GET /api/community-favorites
**Amaç:** Topluluk favorileri (en çok favorilenen istasyonlar)

**Parametreler:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `limit` | number | Sonuç limiti |

---

### 8.5 GET /api/recommendations/diverse
**Amaç:** Çeşitli öneriler (genre karışık)

**Kullanım:** Homepage "Discover" bölümü

---

## 9. Kritik Notlar

### Country Parametre Formatları

⚠️ **FARKLI ENDPOINT'LER FARKLI FORMAT BEKLİYOR!**

| Endpoint | Parametre | Format | Örnek |
|----------|-----------|--------|-------|
| `/api/stations` | `country` | İngilizce isim | `Austria`, `Turkey` |
| `/api/stations/popular` | `country` | İngilizce isim | `Austria`, `Turkey` |
| `/api/genres/{slug}/stations` | `country` | İngilizce isim | `Austria`, `Turkey` |
| `/api/genres/precomputed` | `countrycode` | ISO kodu | `AT`, `TR`, `DE` |

### Frontend Country Mapping

Frontend'de `locationStore` şu değerleri tutar:
```javascript
{
  country: "Österreich",      // Native isim (kullanıcıya gösterilir)
  countryCode: "AT",          // ISO kodu
  countryEnglish: "Austria"   // İngilizce isim (API için)
}
```

**ÖNERİ:** Backend'de tüm endpoint'ler için country normalization yapılması:
- "Austria", "Österreich", "Avusturya", "AT" → hepsi aynı sonucu döndürmeli

### Rate Limiting

Önerilen rate limit'ler:
- Normal endpoint'ler: 100 istek/dakika
- Search: 30 istek/dakika
- Auth: 10 istek/dakika

### Error Response Format

Tutarlı hata formatı önerisi:
```json
{
  "error": true,
  "message": "Açıklayıcı hata mesajı",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

## Özet Tablo

| Endpoint | Method | Auth | Cache | Durum |
|----------|--------|------|-------|-------|
| `/api/stations` | GET | ❌ | 10 dk | ✅ Çalışıyor |
| `/api/stations/popular` | GET | ❌ | 10 dk | ✅ Çalışıyor |
| `/api/station/{id}` | GET | ❌ | 30 dk | ✅ Çalışıyor |
| `/api/genres/precomputed` | GET | ❌ | 24 sa | ✅ Çalışıyor |
| `/api/genres/{slug}/stations` | GET | ❌ | 1 sa | ✅ Çalışıyor |
| `/api/genres/discoverable` | GET | ❌ | 24 sa | ✅ Çalışıyor |
| `/api/user/favorites` | GET/POST/DELETE | ✅ | 1 dk | ✅ Çalışıyor |
| `/api/recently-played` | GET/POST | ✅ | 30 sn | ✅ Çalışıyor |
| `/api/user/push-token` | POST/DELETE | ✅ | - | ✅ Çalışıyor |
| `/api/auth/login` | POST | ❌ | - | ✅ Çalışıyor |
| `/api/auth/signup` | POST | ❌ | - | ✅ Çalışıyor |
| `/api/tv/init` | GET | ❌ | 24 sa | ⚠️ OLUŞTURULMALI |
| `/api/stream/resolve` | GET | ❌ | - | ✅ Çalışıyor |
| `/api/translations/{lang}` | GET | ❌ | 24 sa | ✅ Çalışıyor |

---

## Headers Özeti

| Header | Değer | Açıklama |
|--------|-------|----------|
| `X-API-Key` | `mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw` | TÜM isteklerde zorunlu |
| `X-Device-Type` | `mobile` | Login'de token almak için gerekli |
| `Authorization` | `Bearer {token}` | Auth gerektiren endpoint'ler için |
| `Content-Type` | `application/json` | POST/PUT/DELETE istekleri için |

---

**Doküman Sonu**
