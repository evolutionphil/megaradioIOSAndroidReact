# Apple App Privacy Labels Rehberi

App Store Connect'te uygulamanın **App Privacy** bölümünü doldurman gerekiyor.
Bu rehber MegaRadio'nun topladığı verileri listeler.

## App Store Connect → Deine App → App-Datenschutz

### Adım 1: "Daten sammeln" (Do you collect data?)
**Ja** (Evet) seç

### Adım 2: Toplanan Veri Kategorileri

Aşağıdaki kategorileri seç ve her biri için detayları doldur:

---

#### 1. Kontaktinformationen (Contact Info)
- **E-Mail-Adresse** (Email Address)
  - Verwendungszweck: **App-Funktionalität** (App Functionality) + **Kontoverwaltung** (Account Management)
  - Verknüpft mit der Identität: **Ja** (Yes)
  - Tracking: **Nein** (No)

#### 2. Nutzungsdaten (Usage Data)
- **Produktinteraktion** (Product Interaction)
  - Verwendungszweck: **App-Funktionalität** (App Functionality) + **Analysen** (Analytics)
  - Verknüpft mit der Identität: **Ja** (Yes)
  - Tracking: **Nein** (No)

#### 3. Kennungen (Identifiers)
- **Benutzer-ID** (User ID)
  - Verwendungszweck: **App-Funktionalität** (App Functionality)
  - Verknüpft mit der Identität: **Ja** (Yes)
  - Tracking: **Nein** (No)

- **Geräte-ID** (Device ID) — AdMob için
  - Verwendungszweck: **Werbung Dritter** (Third-Party Advertising)
  - Verknüpft mit der Identität: **Nein** (No)
  - Tracking: **Ja** (Yes) — AdMob reklam gösterimi için

#### 4. Standort (Location)
- **Ungefährer Standort** (Coarse Location) — Yakın istasyonlar için
  - Verwendungszweck: **App-Funktionalität** (App Functionality)
  - Verknüpft mit der Identität: **Nein** (No)
  - Tracking: **Nein** (No)

#### 5. Käufe (Purchases)
- **Kaufverlauf** (Purchase History) — IAP için
  - Verwendungszweck: **App-Funktionalität** (App Functionality)
  - Verknüpft mit der Identität: **Ja** (Yes)
  - Tracking: **Nein** (No)

---

### Adım 3: Tracking
**"Verwendet deine App Daten für Tracking?"** (Does your app use data for tracking?)

**Ja** (Evet) — Çünkü AdMob reklam takibi yapıyor

**Tracking Domain:** `googleads.g.doubleclick.net`

### Adım 4: Privacy Policy URL
App Store Connect'e Privacy Policy URL'ini gir:
```
https://themegaradio.com/privacy-policy
```
(veya uygulamandaki mevcut privacy policy URL'i)

---

## Özet Tablo

| Veri Tipi | Neden | Tracking? | Kimliğe Bağlı? |
|---|---|---|---|
| Email | Hesap yönetimi | Hayır | Evet |
| Kullanıcı ID | Uygulama işlevselliği | Hayır | Evet |
| Cihaz ID | AdMob reklamları | Evet | Hayır |
| Konum (yaklaşık) | Yakın istasyonlar | Hayır | Hayır |
| Satın alma geçmişi | Premium/IAP | Hayır | Evet |
| Ürün etkileşimi | Analytics | Hayır | Evet |

## Premium kullanıcılar için:
Premium kullanıcılar reklam görmez, dolayısıyla **Cihaz ID / Tracking** onlar için geçerli değil. Ama Apple bunu uygulama genelinde soruyor, yani **free kullanıcılar için geçerli olduğu sürece "Ja"** demen gerekiyor.

## DIKKAT
- Bu bilgileri doldurduktan sonra **"Veröffentlichen"** (Publish) butonuna bas
- Her uygulama güncellemesinde bu bilgileri kontrol et ve gerekirse güncelle
- Yanlış beyan = **Apple tarafından uygulamanın kaldırılması** riski
