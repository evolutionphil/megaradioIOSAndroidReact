# MegaRadio Custom Cast Receiver - Kurulum Rehberi

## 📺 Custom Receiver Nedir?

Custom Receiver, Chromecast'te çalışan sizin kendi tasarımınız olan bir web uygulamasıdır. 
Bu receiver MegaRadio markanıza özel:
- Pembe gradient arka plan ve animasyonlu daireler
- MegaRadio logosu ve branding
- Equalizer animasyonu (çalarken)
- Türkçe durum mesajları (CANLI YAYIN, DURAKLATILDI, YÜKLENİYOR)
- Profesyonel album art gösterimi
- Hata yönetimi ve kullanıcı bildirimleri

---

## 🛠️ Kurulum Adımları

### Adım 1: Receiver Dosyasını Host Edin

Custom receiver dosyası (`cast-receiver/index.html`) bir HTTPS sunucusunda host edilmelidir.

**Seçenek A: themegaradio.com'da host edin**
```
1. cast-receiver/index.html dosyasını sunucunuza yükleyin
2. Örnek URL: https://themegaradio.com/cast-receiver/index.html
3. HTTPS olmalı (HTTP çalışmaz)
```

**Seçenek B: Firebase Hosting (Ücretsiz)**
```bash
# Firebase CLI kurulumu
npm install -g firebase-tools

# Giriş yapın
firebase login

# Yeni proje oluşturun
firebase init hosting

# cast-receiver klasörünü public olarak seçin
# Deploy edin
firebase deploy
```

**Seçenek C: Vercel/Netlify (Ücretsiz)**
```
1. cast-receiver klasörünü yeni bir Git repo olarak oluşturun
2. Vercel veya Netlify'a bağlayın
3. Otomatik deploy edilecek
```

---

### Adım 2: Google Cast Developer Console'da Kayıt

1. **Google Cast Console'a gidin**: https://cast.google.com/publish

2. **Google hesabınızla giriş yapın** (geliştirici hesabı gerekli)

3. **Yeni Uygulama Ekleyin**:
   - "Add New Application" butonuna tıklayın
   - "Custom Receiver" seçin

4. **Uygulama Bilgilerini Girin**:
   ```
   Name: MegaRadio
   Receiver Application URL: https://themegaradio.com/cast-receiver/index.html
   (veya hosting yaptığınız URL)
   ```

5. **Kaydet** → Application ID alacaksınız (örn: `ABCD1234`)

---

### Adım 3: App'te Application ID'yi Güncelleyin

`app.json` dosyasında receiverAppId'yi güncelleyin:

```json
[
  "react-native-google-cast",
  {
    "receiverAppId": "BURAYA_YENI_ID_YAZIN",
    "androidPlayServicesCastFrameworkVersion": "21.4.0",
    "startDiscoveryAfterFirstTapOnCastButton": false,
    "disableDiscoveryAutostart": false
  }
]
```

Ayrıca `plugins/withGoogleCast.js` dosyasında:
```javascript
config.modResults.NSBonjourServices = [
  '_googlecast._tcp',
  '_BURAYA_YENI_ID_YAZIN._googlecast._tcp',
];
```

---

### Adım 4: Test Cihazı Ekleyin (Opsiyonel ama Önerilen)

Geliştirme sırasında published olmadan test etmek için:

1. Cast Console'da "Devices" sekmesine gidin
2. "Add New Device" tıklayın
3. Chromecast'inizin Serial Number'ını girin
4. Kaydedin

Bu sayede sadece sizin cihazınız yeni receiver'ı görebilir.

---

### Adım 5: Publish Edin

Test tamamlandıktan sonra:
1. Cast Console'da uygulamanızı seçin
2. "Publish" butonuna tıklayın
3. 15-30 dakika içinde tüm dünyada aktif olur

---

## 🎨 Receiver Özellikleri

| Özellik | Açıklama |
|---------|----------|
| Idle Ekranı | MegaRadio logosu + "Cast yaparak dinlemeye başlayın" |
| Playing Ekranı | Album art + station name + now playing + equalizer |
| Paused | Equalizer durur, status "DURAKLATILDI" olur |
| Error | Türkçe hata mesajları gösterilir |
| Background | Animasyonlu pembe daireler (splash screen gibi) |

---

## ⚠️ Önemli Notlar

1. **HTTPS Zorunlu**: Receiver URL'si HTTPS olmalıdır
2. **CORS**: Receiver'ın stream URL'lerine erişebilmesi için backend'de CORS ayarları yapılmalı
3. **Test**: Published olmadan önce sadece kayıtlı cihazlarda test edilebilir
4. **Gecikme**: Publish sonrası 15-30 dakika aktifleşme süresi var

---

## 🔧 Sorun Giderme

**Receiver yüklenmiyor:**
- URL'nin HTTPS olduğundan emin olun
- Tarayıcıda URL'yi açıp çalıştığını kontrol edin
- Console'da Application ID'nin doğru olduğunu kontrol edin

**Audio çalmıyor:**
- Stream URL'nin Chromecast'ten erişilebilir olduğunu kontrol edin
- CORS headers'ın doğru ayarlandığını kontrol edin
- Content-Type'ın doğru olduğunu kontrol edin

**Cihaz bulunamıyor:**
- Aynı WiFi ağında olduğunuzdan emin olun
- iOS'ta Bonjour services eklendiğinden emin olun
- Android'de network permissions kontrol edin

---

## 📱 Sonraki Adımlar

1. Receiver'ı host edin
2. Cast Console'da kayıt yapın
3. Application ID'yi bana söyleyin, app.json'u güncelleyeyim
4. Yeni build oluşturun ve test edin
