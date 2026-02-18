# MegaRadio - Push Notification Backend Gereksinimleri

## 📱 Genel Bakış

MegaRadio mobil uygulaması Expo Push Notifications kullanıyor. Frontend implementasyonu tamamlandı. Backend'de aşağıdaki endpoint'lerin oluşturulması gerekiyor.

---

## 1️⃣ Push Token Kayıt Endpoint'i

### `POST /api/user/push-token`

Kullanıcı cihazının push token'ını kaydetmek için kullanılır.

#### Request Headers
```
X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw
Authorization: Bearer <jwt_token>  (opsiyonel - giriş yapmış kullanıcılar için)
Content-Type: application/json
```

#### Request Body
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "userId": "user_id_here",        // null olabilir (guest kullanıcılar için)
  "platform": "ios",               // "ios" | "android"
  "deviceName": "iPhone 15 Pro"    // Cihaz adı (opsiyonel)
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Push token saved successfully"
}
```

#### Response (Error - 400)
```json
{
  "success": false,
  "error": "Invalid token format"
}
```

### MongoDB Schema Önerisi
```javascript
// push_tokens collection
{
  _id: ObjectId,
  token: String,           // Unique index
  userId: ObjectId | null, // Reference to users collection (null for guests)
  platform: String,        // "ios" | "android"
  deviceName: String,
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean,       // Token geçerli mi?
  lastUsedAt: Date         // Son bildirim gönderilme zamanı
}
```

---

## 2️⃣ Notification Gönderme (Backend → Expo)

Expo Push API kullanarak bildirim gönderme:

### Expo Push API Endpoint
```
POST https://exp.host/--/api/v2/push/send
```

### Request Headers
```
Accept: application/json
Accept-encoding: gzip, deflate
Content-Type: application/json
```

### Tek Bildirim Gönderme
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "🎵 Power FM Canlı!",
  "body": "Favori radyonuz şu an yayında. Dinlemek için tıklayın!",
  "data": {
    "screen": "player",
    "stationId": "station_123"
  },
  "channelId": "radio"
}
```

### Toplu Bildirim Gönderme (Batch - Max 100)
```json
[
  {
    "to": "ExponentPushToken[token1]",
    "title": "Yeni Radyo Eklendi!",
    "body": "Türkiye'den 5 yeni radyo istasyonu eklendi.",
    "data": { "screen": "genres", "genreSlug": "pop" }
  },
  {
    "to": "ExponentPushToken[token2]",
    "title": "Yeni Radyo Eklendi!",
    "body": "Türkiye'den 5 yeni radyo istasyonu eklendi.",
    "data": { "screen": "genres", "genreSlug": "pop" }
  }
]
```

### Notification Data Seçenekleri

| Field | Type | Açıklama |
|-------|------|----------|
| `screen` | string | Navigasyon hedefi: `player`, `genre`, `user-profile`, `notifications` |
| `stationId` | string | Player'a yönlendirme için radyo ID'si |
| `genreSlug` | string | Genre sayfasına yönlendirme için slug |
| `userId` | string | Kullanıcı profiline yönlendirme için ID |
| `url` | string | Deep link URL'i (örn: `megaradio://station/123`) |

### Android Notification Channels

| channelId | Kullanım | Öncelik |
|-----------|----------|---------|
| `default` | Genel bildirimler | MAX |
| `radio` | Radyo güncellemeleri | HIGH |
| `new-stations` | Yeni istasyonlar | DEFAULT |
| `favorites` | Favori güncellemeleri | HIGH |

---

## 3️⃣ Örnek Bildirim Senaryoları

### Senaryo 1: Favori Radyo Canlı Yayında
```javascript
// Backend: Favori radyo aktif olduğunda
const notification = {
  to: userPushToken,
  sound: "default",
  title: "🎵 Power FM Canlı Yayında!",
  body: "Favori radyonuz şu an yayında. Dinlemek için tıklayın!",
  data: {
    screen: "player",
    stationId: "power_fm_id"
  },
  channelId: "favorites"
};
```

### Senaryo 2: Yeni Radyo İstasyonu Eklendi
```javascript
const notification = {
  to: userPushToken,
  title: "🆕 Yeni Radyolar Eklendi!",
  body: "Türkiye'den 10 yeni Pop radyo istasyonu keşfedin.",
  data: {
    screen: "genre",
    genreSlug: "pop"
  },
  channelId: "new-stations"
};
```

### Senaryo 3: Takip Edilen Kullanıcı Aktivitesi
```javascript
const notification = {
  to: userPushToken,
  title: "👤 @ahmet yeni bir radyo ekledi",
  body: "Ahmet'in favori listesine Jazz FM eklendi.",
  data: {
    screen: "user-profile",
    userId: "ahmet_user_id"
  },
  channelId: "default"
};
```

---

## 4️⃣ Backend Service Örneği (Node.js)

```javascript
// services/pushNotificationService.js
const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

class PushNotificationService {
  
  // Tek kullanıcıya bildirim gönder
  async sendToUser(pushToken, title, body, data = {}) {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        channelId: data.channelId || 'default'
      };
      
      const response = await axios.post(EXPO_PUSH_URL, message, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }
  
  // Toplu bildirim gönder (max 100 per request)
  async sendBatch(messages) {
    try {
      // 100'lük gruplar halinde gönder
      const chunks = this.chunkArray(messages, 100);
      const results = [];
      
      for (const chunk of chunks) {
        const response = await axios.post(EXPO_PUSH_URL, chunk, {
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          }
        });
        results.push(...response.data.data);
      }
      
      return results;
    } catch (error) {
      console.error('Batch push error:', error);
      throw error;
    }
  }
  
  // Favori radyo canlı bildirimi
  async notifyFavoriteStationLive(userId, station) {
    const user = await User.findById(userId);
    if (!user?.pushToken) return;
    
    return this.sendToUser(
      user.pushToken,
      `🎵 ${station.name} Canlı Yayında!`,
      'Favori radyonuz şu an yayında. Dinlemek için tıklayın!',
      {
        screen: 'player',
        stationId: station._id,
        channelId: 'favorites'
      }
    );
  }
  
  // Yardımcı: Array'i parçalara böl
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = new PushNotificationService();
```

---

## 5️⃣ Error Handling

### Expo Push API Hata Kodları

| Status | Anlamı | Aksiyon |
|--------|--------|---------|
| `ok` | Başarılı | - |
| `DeviceNotRegistered` | Token geçersiz | Token'ı DB'den sil |
| `MessageTooBig` | Mesaj çok büyük | Mesajı kısalt |
| `MessageRateExceeded` | Rate limit aşıldı | Bekle ve tekrar dene |
| `InvalidCredentials` | Hatalı credentials | Expo hesabını kontrol et |

### Token Temizleme
```javascript
// Geçersiz token'ları temizle
async function cleanupInvalidTokens(results) {
  for (const result of results) {
    if (result.status === 'error' && result.details?.error === 'DeviceNotRegistered') {
      await PushToken.deleteOne({ token: result.token });
    }
  }
}
```

---

## 6️⃣ Test Etme

### cURL ile Test
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "sound": "default",
    "title": "Test Bildirimi",
    "body": "Bu bir test bildirimidir!",
    "data": { "screen": "player", "stationId": "test123" }
  }'
```

### Expo Push Tool (Web)
https://expo.dev/notifications

---

## 📋 Checklist

- [ ] `POST /api/user/push-token` endpoint'i oluştur
- [ ] `push_tokens` MongoDB collection'ı oluştur
- [ ] Token kayıt ve güncelleme logic'i ekle
- [ ] Batch notification gönderme servisi yaz
- [ ] Geçersiz token temizleme job'ı ekle
- [ ] Rate limiting ekle (kullanıcı başına max bildirim)
- [ ] Test bildirimi gönder

---

## 📞 İletişim

Frontend implementasyonu tamamlandı. Sorularınız için bana ulaşın.

**Token Formatı**: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxx]`
**Platform**: iOS ve Android destekleniyor
