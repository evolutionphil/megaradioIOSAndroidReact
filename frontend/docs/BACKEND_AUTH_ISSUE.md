# Backend Developer için Acil: Apple ve Google Auth Sorunları

## Sorun Özeti

Mobile uygulamamızda Apple ve Google ile giriş yapılmaya çalışıldığında aşağıdaki hatalar alınıyor:

1. **Apple Sign-In**: "Backend authentication failed"
2. **Google Sign-In**: "No authentication code received from google"

Bu özellikler **daha önce çalışıyordu** - yakın zamanda bozulmuş olabilir.

## Teknik Analiz

### API Endpoint Testi

```bash
# Google Auth Endpoint Testi
curl -X POST "https://themegaradio.com/api/auth/google" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw" \
  -d '{"idToken": "test"}'

# Sonuç: HTML sayfası dönüyor (Web app'in ana sayfası)
# Beklenen: JSON response ({"success": false, "error": "Invalid token"} gibi)
```

```bash
# Apple Auth Endpoint Testi
curl -X POST "https://themegaradio.com/api/auth/apple" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw" \
  -d '{"identityToken": "test", "authorizationCode": "test"}'

# Sonuç: HTML sayfası dönüyor (Web app'in ana sayfası)
# Beklenen: JSON response
```

### Sorun

**API endpoint'leri (`/api/auth/google` ve `/api/auth/apple`) JSON yanıt yerine HTML sayfası döndürüyor.**

Bu durumun olası nedenleri:

1. **API route'ları kaldırılmış veya değiştirilmiş olabilir**
2. **Backend deploy'unda bir sorun olmuş olabilir**
3. **Web uygulaması tüm `/api/auth/*` isteklerini yakalıyor olabilir**
4. **Nginx veya reverse proxy konfigürasyonu değişmiş olabilir**

## Frontend Kodları (Referans)

### Mobile App - socialAuthService.ts

```typescript
// Google Sign-In
async signInWithGoogle() {
  const { idToken, user } = await GoogleSignin.signIn();
  const response = await api.post('/api/auth/google', {
    idToken,
    email: user.email,
    name: user.name,
    googleId: user.id,
    platform: 'mobile'
  });
  return response.data;
}

// Apple Sign-In  
async signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({...});
  const response = await api.post('/api/auth/apple', {
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    fullName: credential.fullName,
    email: credential.email,
    user: credential.user,
    platform: 'mobile'
  });
  return response.data;
}
```

## Kontrol Edilmesi Gerekenler

1. **Backend API route'ları**:
   - `/api/auth/google` endpoint'i var mı?
   - `/api/auth/apple` endpoint'i var mı?
   - Bu endpoint'ler doğru HTTP metodunu (POST) destekliyor mu?

2. **Nginx/Reverse Proxy konfigürasyonu**:
   - `/api/auth/*` route'ları backend'e yönlendiriliyor mu?
   - Yoksa web app'e mi yönlendiriliyor?

3. **Backend deployment**:
   - Son deployment'ta auth modülü dahil edildi mi?
   - Environment variable'lar (Google Client ID, Apple credentials) doğru mu?

4. **CORS ayarları**:
   - Mobile app'ten gelen istekler için CORS izinleri var mı?

## Beklenen API Yanıtları

### Başarılı Giriş
```json
{
  "success": true,
  "user": {
    "_id": "...",
    "email": "...",
    "name": "..."
  },
  "token": "jwt_token_here"
}
```

### Hatalı Token
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

## Öncelik

🔴 **YÜKSEK** - Kullanıcılar giriş yapamıyor, bu kritik bir fonksiyon.

---

Hazırlayan: MegaRadio Mobile Team
Tarih: 10 Aralık 2026
