# MegaRadio IAP Setup Guide
## Senin Yapman Gerekenler (App Store Connect + Google Play Console)

---

## iOS — App Store Connect

### 1. In-App Purchase Capability Ekle (Xcode)
- Xcode'da proje ayarlarını aç → **Signing & Capabilities**
- **"+ Capability"** → **"In-App Purchase"** ekle
- Entitlements dosyasına zaten ekledik ama Xcode'da da aktif olmalı

### 2. App Store Connect'te Ürünleri Oluştur
**My Apps → MegaRadio → Subscriptions** (veya In-App Purchases) bölümüne git.

#### Subscription Group Oluştur: `megaradio_premium`

#### 4 Ürün Oluştur:

| Product ID | Tip | Fiyat | Süre |
|------------|-----|-------|------|
| `megaradio_remove_ads_yearly` | Auto-Renewable Subscription | €5.99 | 1 Year |
| `megaradio_premium_monthly` | Auto-Renewable Subscription | €3.99 | 1 Month |
| `megaradio_premium_yearly` | Auto-Renewable Subscription | €29.99 | 1 Year |
| `megaradio_premium_lifetime` | Non-Consumable | €59.99 | - (Lifetime) |

**Her ürün için:**
- Display Name: İstediğin ismi ver (örn: "MegaRadio Premium Yillik")
- Description: Özellik açıklaması ekle
- Screenshot: Bir ekran görüntüsü yükle (review için gerekli)
- Review Notes: "Premium subscription for ad-free listening and additional features"

### 3. Sandbox Test Hesabı Oluştur
- **Users and Access → Sandbox Testers** → **"+"** → Test hesabı ekle
- Bu hesapla gerçek para ödemeden test edebilirsin

### 4. Pod Install Çalıştır
```bash
cd ios && pod install
```

---

## Android — Google Play Console

### 1. Billing Permission (Zaten Eklendi)
`AndroidManifest.xml`'e `com.android.vending.BILLING` permission'ı eklendi.

### 2. Google Play Console'da Ürünleri Oluştur
**Monetize → Products → Subscriptions** ve **In-app products** bölümüne git.

#### Subscription'lar (Monetize → Subscriptions):

| Product ID | Base Plan | Fiyat | Süre |
|------------|-----------|-------|------|
| `megaradio_remove_ads_yearly` | yearly-base | €5.99 | 1 Year |
| `megaradio_premium_monthly` | monthly-base | €3.99 | 1 Month |
| `megaradio_premium_yearly` | yearly-base | €29.99 | 1 Year |

**Her subscription için:**
1. "Create subscription" tıkla
2. Product ID'yi yukarıdaki gibi yaz (TAM AYNI)
3. "Add a base plan" tıkla
4. Fiyat ve süreyi ayarla
5. **"Activate"** tıkla

#### Non-Consumable (Monetize → In-app products):

| Product ID | Fiyat |
|------------|-------|
| `megaradio_premium_lifetime` | €59.99 |

### 3. Test Hesabı Ayarla
- **Settings → License testing** → Gmail adresini ekle
- Bu hesapla test card ile ödeme yapabilirsin

---

## Kodda Product ID Eşleştirmesi

Kodda tanımlanan ID'ler (`iapService.ts`):
```
megaradio_remove_ads_yearly    → Remove Ads (€5.99/yıl)
megaradio_premium_monthly      → Premium Aylık (€3.99/ay)
megaradio_premium_yearly       → Premium Yıllık (€29.99/yıl)
megaradio_premium_lifetime     → Premium Lifetime (€59.99)
```

**KRİTİK**: App Store Connect ve Google Play Console'daki Product ID'ler **TAM OLARAK** yukarıdaki gibi olmalı. Bir harf bile farklı olursa çalışmaz!

---

## Build Sonrası Test Adımları

### iOS Test
1. `pod install` çalıştır
2. Xcode'da build et
3. Sandbox test hesabıyla giriş yap (Settings → App Store → Sandbox Account)
4. Profil → "Go Premium" tıkla
5. Fiyatları kontrol et (sandbox'ta gerçek para çekmez)
6. Satın alma yap → Premium aktif olmalı

### Android Test
1. APK'yı internal test track'e yükle
2. License tester hesabıyla giriş yap
3. "Go Premium" tıkla → Test card ile ödeme yap
4. Premium aktif olmalı

---

## Önemli Notlar
- iOS: İlk build'de Xcode'da "In-App Purchase" capability'yi manuel olarak aktif etmelisin
- Android: İlk subscription test için uygulamayı en az internal test track'e yüklemiş olmalısın
- Her iki platform: Ürünler "Ready for Sale" / "Active" durumunda olmalı
- Test sırasında sorun olursa `iapService.ts`'deki logları kontrol et: `[IAP] ...`
