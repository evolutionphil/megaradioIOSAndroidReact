# Backend Developer — Tüm Bekleyen İşler (Feb 25, 2026)

> **Audience:** themegaradio.com backend + web frontend developer
> **Konuyu kim hazırladı:** TV/Desktop ekibi
> **TL;DR:** Aşağıdaki 3 işten **#1 ve #2 aktif blocker**, **#3 zaten yapıldıysa onaylayın**

---

## #1 — `/tv` web sayfası: QR koddan auto-fill + auto-activate ⚠️ BLOCKER

### Sorun
TV uygulamasında Login ekranında bir QR kod gösteriyoruz. QR kodu telefonla taradıkları zaman şu URL'e gidiyorlar:

```
https://www.themegaradio.com/tv?code=672249
```

Şu an: kullanıcı bu sayfaya geldiğinde 6 haneli kodu **manuel olarak yazmak zorunda**. Otomatik dolmuyor.

Hedef: Kod URL'den okunup formu otomatik doldursun + kullanıcı zaten siteye loginse otomatik aktive etsin.

### Yapılması gerekenler (3 satır JS)

`/tv` sayfasında bu mantığı ekleyin:

```js
useEffect(() => {
  const url = new URL(window.location.href);
  const codeFromQR = url.searchParams.get('code');
  if (codeFromQR && /^\d{6}$/.test(codeFromQR)) {
    setEnteredCode(codeFromQR);                       // formu doldur
    if (isUserSignedIn) {
      activateTvCode(codeFromQR);                     // otomatik aktive et
    } else {
      router.push(`/login?next=${encodeURIComponent('/tv?code=' + codeFromQR)}`);
    }
  }
}, []);
```

`activateTvCode` zaten var (manuel kod yazma flow'undan). Yeni endpoint **GEREKMİYOR**.

### Önemli: "Code Expired" hatası
Kullanıcı QR'ı tarayıp `themegaradio.com/tv?code=XXX`'ye gittiğinde sayfa bazen **"Code expired"** diyor. TV tarafında code 5 dakika boyunca geçerli, problem web'de. İki olası sebep:

1. **MongoDB TTL index** çok kısa: `tv_codes` koleksiyonunda `expires_at` field'ının TTL index'i 5 dk olmalı, daha kısa olabilir.
2. **`deviceId` query param eksik**: validate endpoint'inizde `deviceId` zorunluysa, web sayfası QR'dan gelen code'a `deviceId` eklemeden POST atıyor olabilir.

Lütfen kontrol edin: TV `POST /api/auth/tv/code` çağırırken `device_id` gönderiyor, web tarafında `POST /tv/activate` (veya benzeri) çağrılırken aynı `device_id` zorunlu olmamalı — web tarafı `device_id`'yi bilmiyor, zaten DB'den lookup yapmalı.

### Yeni i18n key'leri
TV uygulaması bu yeni key'leri kullanıyor — `/api/translations/{lang}` response'una ekleyin:

| Key | EN | TR | DE |
|---|---|---|---|
| `tv_login_qr_or_code` | Scan the QR code with your phone, or enter this code manually: | QR kodu telefonunuzla tarayın veya bu kodu manuel girin: | Scannen Sie den QR-Code mit Ihrem Handy oder geben Sie diesen Code manuell ein: |
| `tv_login_scan_qr` | Scan with your phone | Telefonunuzla tarayın | Mit dem Handy scannen |
| `or` | OR | VEYA | ODER |

---

## #2 — Native IAP receipt validation (Apple TV / Android TV) ⚠️ BLOCKER

### Sorun
Apple TV (StoreKit 2) ve Android TV (Google Play Billing v7) için **native in-app purchase** entegre ettik. Satın alma tamamlandığında native shell'ler receipt'i sizin **mevcut** `POST /api/user/subscription` endpoint'ine gönderiyor. Bu endpoint zaten mobil iOS/Android için çalışıyor.

### Sizden ne istiyoruz
**Onaylayın**: `POST /api/user/subscription` endpoint'i şu body'leri kabul ediyor mu? Mobile iOS/Android ile aynı:

```jsonc
// Apple TV body
{
  "platform": "ios",                          // Apple TV de "ios" kullanıyor
  "productId": "megaradio_premium_yearly",
  "transactionId": "200000xxxxxx",
  "originalTransactionId": "200000xxxxxx",
  "isTrial": false,
  "receipt": "MIIT.../base64-receipt-data"    // StoreKit 2 JWS receipt
}

// Android TV body
{
  "platform": "android",
  "productId": "megaradio_premium_yearly",
  "transactionId": "GPA.xxxx-xxxx",
  "originalTransactionId": "GPA.xxxx-xxxx",
  "isTrial": false,
  "purchaseToken": "abcd...play-store-token"
}
```

Response:
```json
{
  "plan": "premium_yearly",                   // veya remove_ads / premium_monthly / premium_lifetime
  "isActive": true,
  "expiryDate": "2027-02-25T00:00:00Z"        // null = lifetime
}
```

Headers: `Authorization: Bearer <JWT>` — kullanıcı Account-Linking ile TV'de zaten login.

**Eğer bu endpoint mevcut ve aynı body'i kabul ediyorsa hiçbir şey yapmanıza gerek yok.**

Sadece doğrulamak istediğimiz: Apple App Store Server-to-Server notifications + Google Play Developer Notifications (renewals, refunds) için webhook'larınız aktif mi? Aboneliklerin renewal döneminde otomatik olarak `expiryDate` güncellensin.

---

## #3 — Web platform `themegaradio.com/activate` — Stripe Premium

### Sorun (TV ekibi tarafından kontrol)
Tizen / WebOS / Web / Electron platformlarında Premium upgrade için QR + Stripe Checkout kullanıyoruz:
- TV `POST /api/subscription/tv/code` → 6 haneli code dönüyor
- Kullanıcı `themegaradio.com/activate?code=ABCDEF` sayfasını telefonuyla tarıyor
- Stripe Checkout açılıyor
- Webhook → backend → `tv_codes` aktive ediyor
- TV polling: `GET /api/subscription/tv/code/:code/status?deviceId=...` → `verified` + JWT

**Bu flow zaten implement edildi mi? Kontrol edip onaylayın.**

Eğer henüz değilse detaylı brief: `/app/memory/BACKEND_BRIEF_PREMIUM_SUBSCRIPTION.md`

---

## Özet — Aksiyon Listesi

| # | İş | Aciliyet | Tahmini Süre |
|---|---|---|---|
| 1a | `/tv` sayfasına `?code=XXX` query param parser ekle | 🔴 BLOCKER | ~30 dk |
| 1b | "Code expired" hatasını debug et (TTL veya device_id) | 🔴 BLOCKER | ~1 saat |
| 1c | 3 yeni i18n key'i ekle | 🟡 P1 | ~10 dk |
| 2 | `POST /api/user/subscription` Apple TV + Android TV body'sini kabul ediyor mu onayla | 🟡 P1 | ~15 dk |
| 3 | `themegaradio.com/activate` Stripe flow'u canlı mı kontrol | 🟢 P2 | ~30 dk |

Sorularınız olursa direkt yazabilirsiniz, gereken bilgi ve TV tarafındaki ilgili dosya yolları bende.
