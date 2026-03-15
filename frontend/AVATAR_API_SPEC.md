# Avatar API Specification — Backend Developer Guide

## Gerekli Endpoint'ler

### 1. Avatar Upload
```
POST /api/user/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body (form-data):
  avatar: <file> (image/jpeg, image/png, image/webp - max 5MB)
```

**Response (200):**
```json
{
  "success": true,
  "avatar": "https://themegaradio.com/uploads/avatars/user_6933572f_1234567890.jpg"
}
```

**Response (400 - validation):**
```json
{
  "error": "Invalid file type. Allowed: jpeg, png, webp"
}
```

**Response (413 - too large):**
```json
{
  "error": "File too large. Maximum size: 5MB"
}
```

### 2. Avatar Delete
```
DELETE /api/user/avatar
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar removed"
}
```

## Login Response Guncelleme

`POST /api/auth/mobile/login` ve `POST /api/auth/login` response'larinda user objesine `avatar` alani eklenmeli:

```json
{
  "success": true,
  "token": "mrt_...",
  "user": {
    "_id": "...",
    "fullName": "Test User",
    "username": "testuser2026",
    "email": "testuser2026@megaradio.test",
    "role": "user",
    "avatar": "https://themegaradio.com/uploads/avatars/user_xxx.jpg"  // <-- YENi
  }
}
```

Ayni sekilde `GET /api/auth/me` response'unda da `avatar` alani olmali.

## Backend Implementation Notes

1. **Storage:** Avatar dosyalari S3, Cloudinary veya local disk'e kaydedilebilir
2. **Resize:** Upload sirasinda 400x400px'e resize yapilmali (bandwidth tasarrufu)
3. **Format:** WebP'ye convert edilirse boyut %60 kuculur
4. **Old avatar:** Yeni avatar yuklendiginde eski dosya silinmeli
5. **DB:** User collection'ina `avatar` field'i (String, URL) eklenmeli
6. **Validation:**
   - Sadece image/* MIME type
   - Max 5MB
   - Min 100x100px
7. **URL:** Tam URL dondurun (relative path degil). Ornek: `https://themegaradio.com/uploads/avatars/xxx.jpg`

## Test

```bash
# Upload
curl -X POST https://themegaradio.com/api/user/avatar \
  -H "Authorization: Bearer {token}" \
  -F "avatar=@/path/to/photo.jpg"

# Verify
curl https://themegaradio.com/api/auth/me \
  -H "Authorization: Bearer {token}"
# Response should include "avatar": "https://..."

# Delete
curl -X DELETE https://themegaradio.com/api/user/avatar \
  -H "Authorization: Bearer {token}"
```
