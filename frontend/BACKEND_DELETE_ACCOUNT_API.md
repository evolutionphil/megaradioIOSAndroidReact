# Backend Developer: Delete Account API Gereksinimi

## Apple Policy Zorunluluğu (Guideline 5.1.1)
Apple, hesap oluşturma özelliği olan tüm uygulamaların **hesap silme** özelliği sunmasını zorunlu kılıyor. Bu endpoint olmadan uygulama **REJECT** edilecektir.

## Gerekli API Endpoint

### `DELETE /api/user/delete-account`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (Başarılı):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Response (Hata):**
```json
{
  "success": false,
  "message": "Could not delete account"
}
```

## Backend'de Yapılması Gerekenler

1. **Kullanıcı verisini sil veya anonimleştir:**
   - Kullanıcı profili (ad, email, avatar)
   - Favori istasyonlar
   - Dinleme geçmişi
   - Takipçi/Takip edilen ilişkileri
   - Push notification token'ları
   - Bildirimler

2. **Aktif abonelikleri iptal et:**
   - Apple/Google tarafındaki subscription'ları iptal etmek kullanıcının sorumluluğu (bu konuda kullanıcıya bilgi verilecek)
   - Backend'deki premium flag'leri temizle

3. **GDPR Uyumluluk:**
   - 30 gün içinde tüm kişisel verileri sil (Apple ve GDPR gereksinimi)
   - Anonim istatistik verisi tutulabilir

4. **Rate Limiting:**
   - Bu endpoint'e rate limiting ekle (brute-force koruması)

## Mevcut API Yapısı Referans
- Base URL: `https://themegaradio.com`
- Auth header: `Authorization: Bearer <jwt_token>`
- Mevcut DELETE endpoint örneği: `DELETE /api/user/favorites/:stationId`

## Frontend Tarafı
Frontend'de "Delete Account" butonu ve onay modalı zaten eklendi:
- `frontend/app/(tabs)/profile.tsx` → "Delete Account" butonu
- Kullanıcıdan "delete" yazmasını istiyor (yanlışlıkla silme koruması)
- API çağrısı: `api.delete('/api/user/delete-account')`

## Test
Endpoint hazır olduğunda test etmek için:
```bash
curl -X DELETE https://themegaradio.com/api/user/delete-account \
  -H "Authorization: Bearer <test_user_token>" \
  -H "Content-Type: application/json"
```
