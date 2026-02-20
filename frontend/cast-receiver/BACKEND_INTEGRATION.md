# MegaRadio Backend - Chromecast Cast Receiver Entegrasyonu

## 📋 Genel Bakış

MegaRadio mobil uygulamasına Google Cast (Chromecast) desteği eklendi. Kullanıcılar artık radyo istasyonlarını Chromecast destekli TV'lere cast edebilecek. Bunun çalışması için backend'de bazı ayarlamalar yapılması gerekiyor.

---

## 🔧 Yapılması Gereken Değişiklikler

### 1. CORS Headers Eklenmesi (KRİTİK)

Chromecast cihazları stream URL'lerine doğrudan erişir. Bu yüzden stream endpoint'lerinde CORS headers olmalı.

**Eklenecek Headers:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type, Range, Accept-Encoding
Access-Control-Expose-Headers: Content-Length, Content-Range, Content-Type
```

**Hangi Endpoint'lere Eklenmeli:**
- `/api/stations/{id}` - İstasyon bilgisi
- `/api/stations/{id}/stream` - Eğer proxy stream varsa
- Tüm stream URL'leri (eğer kendi sunucunuzdan geçiyorsa)

**Python/FastAPI Örneği:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Chromecast için gerekli
    allow_credentials=False,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Range", "Content-Type"],
)
```

**Node.js/Express Örneği:**
```javascript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Accept-Encoding');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
    next();
});
```

---

### 2. Cast Receiver Dosyasını Host Etme

`cast-receiver/index.html` dosyası HTTPS üzerinden erişilebilir olmalı.

**Adımlar:**

1. `cast-receiver/index.html` dosyasını sunucuya yükleyin
2. URL: `https://themegaradio.com/cast-receiver/index.html`
3. HTTPS zorunlu (HTTP çalışmaz)

**Nginx Örnek Konfigürasyon:**
```nginx
location /cast-receiver/ {
    alias /var/www/megaradio/cast-receiver/;
    
    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    
    # Cache headers (receiver değişmediği sürece cache'lenebilir)
    add_header Cache-Control "public, max-age=3600";
    
    # Content type
    types {
        text/html html;
    }
}
```

**Apache Örnek (.htaccess):**
```apache
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
</IfModule>
```

---

### 3. Stream URL'lerinin Formatı

Chromecast şu formatları destekler:

| Format | Content-Type | Destekleniyor |
|--------|-------------|---------------|
| MP3 | audio/mpeg | ✅ Evet |
| AAC | audio/aac | ✅ Evet |
| HLS | application/x-mpegURL | ✅ Evet |
| Icecast/Shoutcast | audio/mpeg | ✅ Evet |
| OGG | audio/ogg | ⚠️ Kısmi |

**Önemli:** Stream URL'leri dönerken `Content-Type` header'ı doğru olmalı.

**Örnek Stream Response Headers:**
```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Accept-Ranges: bytes
Access-Control-Allow-Origin: *
Connection: keep-alive
```

---

### 4. Stream Proxy (Opsiyonel ama Önerilen)

Bazı radyo istasyonları CORS desteklemiyor. Bu durumda kendi sunucunuzdan proxy yapabilirsiniz.

**Proxy Endpoint Örneği (Python/FastAPI):**

```python
import httpx
from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse

@app.get("/api/stream-proxy/{station_id}")
async def stream_proxy(station_id: str):
    # İstasyon bilgisini al
    station = await get_station(station_id)
    stream_url = station.url_resolved or station.url
    
    async def stream_generator():
        async with httpx.AsyncClient() as client:
            async with client.stream("GET", stream_url) as response:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    yield chunk
    
    # Content-Type'ı orijinal stream'den al
    async with httpx.AsyncClient() as client:
        head_response = await client.head(stream_url)
        content_type = head_response.headers.get("content-type", "audio/mpeg")
    
    return StreamingResponse(
        stream_generator(),
        media_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

**Node.js/Express Örneği:**

```javascript
const axios = require('axios');

app.get('/api/stream-proxy/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const station = await getStation(stationId);
    const streamUrl = station.url_resolved || station.url;
    
    // CORS headers
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    // Stream'i pipe et
    const response = await axios({
        method: 'get',
        url: streamUrl,
        responseType: 'stream'
    });
    
    response.data.pipe(res);
});
```

---

### 5. Metadata Endpoint (Opsiyonel)

Chromecast'te şarkı bilgisi göstermek için metadata endpoint'i kullanılabilir.

**Endpoint:** `GET /api/stations/{station_id}/now-playing`

**Response Örneği:**
```json
{
    "station_id": "12345",
    "title": "Şarkı Adı",
    "artist": "Sanatçı Adı",
    "album_art": "https://themegaradio.com/artwork/12345.jpg",
    "updated_at": "2025-02-20T12:00:00Z"
}
```

Bu endpoint'i mobil uygulama periyodik olarak çağırıp Chromecast'e metadata güncellemesi gönderebilir.

---

## 📊 Test Checklist

Backend değişiklikleri yapıldıktan sonra şunları test edin:

- [ ] Cast receiver URL'si tarayıcıda açılıyor mu?
  ```
  https://themegaradio.com/cast-receiver/index.html
  ```

- [ ] CORS headers doğru mu?
  ```bash
  curl -I -X OPTIONS https://themegaradio.com/cast-receiver/index.html
  # Access-Control-Allow-Origin: * görülmeli
  ```

- [ ] Stream URL'leri Chromecast'ten erişilebilir mi?
  ```bash
  curl -I "https://themegaradio.com/api/stream-proxy/12345"
  # Content-Type ve CORS headers görülmeli
  ```

---

## 🚀 Google Cast Console Kaydı

Backend hazır olduktan sonra:

1. https://cast.google.com/publish adresine gidin
2. Google hesabınızla giriş yapın
3. "Add New Application" → "Custom Receiver" seçin
4. Şu bilgileri girin:
   - **Name:** MegaRadio
   - **Receiver Application URL:** `https://themegaradio.com/cast-receiver/index.html`
5. Kaydet → **Application ID** alacaksınız

**Application ID'yi mobil geliştiriciye iletin** - app.json'da güncellenecek.

---

## ⚠️ Sık Karşılaşılan Sorunlar

### "No Cast destinations found"
- WiFi ağı Chromecast discovery'yi engelliyor olabilir
- mDNS/Bonjour portları açık olmalı (UDP 5353)

### "Failed to load media"
- Stream URL'si CORS desteklemiyor
- Content-Type header'ı yanlış
- Stream URL'si HTTP iken HTTPS gerekiyor

### "Receiver not loading"
- Receiver URL'si HTTPS olmalı
- Application ID doğru olmalı
- Google Cast Console'da receiver published olmalı

---

## 📞 İletişim

Sorularınız için:
- Mobil geliştirici ile koordineli çalışın
- Application ID aldıktan sonra mobil tarafta güncelleme yapılacak
- Test için Chromecast cihazı gerekli

---

**Son Güncelleme:** Şubat 2025
