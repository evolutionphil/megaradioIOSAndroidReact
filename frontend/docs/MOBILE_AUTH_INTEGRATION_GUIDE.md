# MegaRadio Mobile - Google & Apple Sign-In Entegrasyon Rehberi

## Genel Bakış
Backend artık mobil uygulamalar için POST tabanlı Google ve Apple giriş endpoint'lerini destekliyor.

| Platform | Endpoint | Method | Durum |
|----------|----------|--------|-------|
| Mobil Google | /api/auth/google | POST | AKTİF |
| Mobil Apple | /api/auth/apple | POST | AKTİF |
| Web Google | /api/auth/google | GET | Mevcut (redirect flow) |

## 1. Google Sign-In (Mobil)

### Endpoint
`POST https://themegaradio.com/api/auth/google`

### Headers
```
Content-Type: application/json
X-Device-Type: mobile
```

### Request Body
```json
{
  "idToken": "GOOGLE_ID_TOKEN_FROM_SDK",
  "email": "user@gmail.com",
  "name": "Kullanici Adi",
  "googleId": "google_numeric_id",
  "platform": "mobile"
}
```

**Zorunlu alanlar:**
- `idToken` (string) — Google Sign-In SDK'dan alınan ID token

**Opsiyonel alanlar:**
- `email`, `name`, `googleId`, `platform`

### Başarılı Yanıt (200)
```json
{
  "success": true,
  "token": "mrt_a1b2c3d4e5f6...",
  "expiresIn": "90 days",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Sahin Yilmaz",
    "username": "user_1702234567890_abc123def",
    "email": "sahin@gmail.com",
    "role": "user",
    "avatar": "https://lh3.googleusercontent.com/..."
  }
}
```

## 2. Apple Sign-In (Mobil)

### Endpoint
`POST https://themegaradio.com/api/auth/apple`

### Headers
```
Content-Type: application/json
X-Device-Type: mobile
```

### Request Body
```json
{
  "identityToken": "APPLE_IDENTITY_TOKEN",
  "authorizationCode": "APPLE_AUTH_CODE",
  "fullName": { "givenName": "Sahin", "familyName": "Yilmaz" },
  "email": "sahin@icloud.com",
  "user": "apple_user_id_string",
  "platform": "mobile"
}
```

**Zorunlu alanlar:**
- `identityToken` (string) — Apple Sign-In SDK'dan alınan JWT token

### Başarılı Yanıt (200)
```json
{
  "success": true,
  "token": "mrt_a1b2c3d4e5f6...",
  "expiresIn": "90 days",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Sahin Yilmaz",
    "username": "user_1702234567890_abc123def",
    "email": "sahin@icloud.com",
    "role": "user",
    "avatar": null
  }
}
```

## 3. Token Kullanımı
```
Authorization: Bearer mrt_a1b2c3d4e5f6...
X-Device-Type: mobile
```

## 4. Test
```bash
# Google - geçersiz token (401 dönmeli)
curl -X POST "https://themegaradio.com/api/auth/google" \
  -H "Content-Type: application/json" \
  -H "X-Device-Type: mobile" \
  -d '{"idToken": "test_invalid"}'

# Apple - geçersiz token (401 dönmeli)
curl -X POST "https://themegaradio.com/api/auth/apple" \
  -H "Content-Type: application/json" \
  -H "X-Device-Type: mobile" \
  -d '{"identityToken": "test_invalid"}'
```
