# Backend API Gereksinimi: Genres Country Filtering

## Mevcut Durum

### `/api/genres` Endpoint
- **Sorun**: `country` veya `countrycode` parametresi gönderilse bile, tüm genreler (10,825) dönüyor
- **Beklenen**: Sadece seçili ülkede istasyonu olan genreler dönmeli

### `/api/genres/precomputed` Endpoint
- **Durum**: `country=TR` ile çalışıyor ama sadece 12 genre dönüyor
- **Sorun**: Bu sayı çok düşük - Türkiye'de muhtemelen çok daha fazla genre var
- **Örnek**: TR için Pop (55), Classical (32), Rock (19)... toplam sadece 12 genre

---

## Gerekli Değişiklikler

### 1. `/api/genres` Endpoint'ine Country Filtering Eklenmeli

**İstek:**
```
GET /api/genres?country=TR&limit=30&page=1
```

**Beklenen Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Pop",
      "slug": "pop",
      "stationCount": 55  // TR'deki Pop istasyon sayısı
    },
    {
      "_id": "...",
      "name": "Rock",
      "slug": "rock", 
      "stationCount": 19
    }
    // ... sadece TR'de istasyonu olan genreler
  ],
  "total": 150,  // TR'deki toplam genre sayısı
  "page": 1,
  "limit": 30
}
```

**Mantık:**
1. Belirtilen ülkede (`country=TR`) en az 1 istasyonu olan genreleri filtrele
2. Her genre için o ülkedeki istasyon sayısını (`stationCount`) hesapla
3. Pagination destekle (`page`, `limit`)
4. İstasyon sayısına göre sırala (en çok istasyonu olan genre önce)

---

### 2. `/api/genres/precomputed` Endpoint'i Geliştirilmeli

**Mevcut Sorunlar:**
- Sadece 12 genre dönüyor (çok az)
- Muhtemelen sadece "top" genreler precomputed edilmiş

**Öneriler:**
- En az 5+ istasyonu olan TÜM genreleri precompute et
- Veya threshold'u düşür (örn: en az 1 istasyon)
- Cache TTL: 7 gün (genreler nadiren değişiyor)

---

### 3. Cache Stratejisi

**Backend Cache:**
- Genre listesi ülke bazında cache'lenmeli
- TTL: 7 gün (haftalık güncelleme yeterli)
- Cache key örneği: `genres:country:TR`

**Response Header'ları:**
```
Cache-Control: public, max-age=604800  // 7 gün
X-Cache-Status: HIT veya MISS
```

---

## Örnek SQL/MongoDB Query

### MongoDB Aggregation (Önerilen)
```javascript
db.stations.aggregate([
  // 1. Sadece belirtilen ülkedeki istasyonları filtrele
  { $match: { countryCode: "TR", status: "active" } },
  
  // 2. Genres dizisini aç (her istasyonun birden fazla genre'si olabilir)
  { $unwind: "$genres" },
  
  // 3. Genre'ye göre grupla ve sayısını hesapla
  { $group: {
      _id: "$genres",
      stationCount: { $sum: 1 }
  }},
  
  // 4. Genre detaylarını lookup ile getir
  { $lookup: {
      from: "genres",
      localField: "_id",
      foreignField: "slug",  // veya name
      as: "genreInfo"
  }},
  
  // 5. İstasyon sayısına göre sırala
  { $sort: { stationCount: -1 } },
  
  // 6. Pagination
  { $skip: (page - 1) * limit },
  { $limit: limit }
])
```

---

## Test Senaryoları

1. **TR seçildiğinde**: Sadece Türkiye'de istasyonu olan genreler gelmeli
2. **AT seçildiğinde**: Sadece Avusturya'da istasyonu olan genreler gelmeli
3. **Country seçilmediğinde**: Tüm genreler gelebilir (global)
4. **Pagination**: page=2, limit=30 ile 31-60. genreler gelmeli
5. **StationCount**: Her genre için o ülkedeki istasyon sayısı doğru olmalı

---

## Öncelik: YÜKSEK

Bu özellik kullanıcı deneyimi için kritik:
- Kullanıcı Türkiye seçtiğinde, Türkiye'de olmayan genreleri görmemeli
- 10,000+ genre yüklemek mobil uygulamada performans sorunu yaratıyor
- Cache kullanımı API yükünü azaltacak

---

## İletişim

Sorularınız için: [MegaRadio Mobile App Development Team]
