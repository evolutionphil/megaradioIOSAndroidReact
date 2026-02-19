# Backend Developer'a Sorular - Radio Streaming Sorunları

## Mevcut Durum

Android uygulamasında birçok radyo istasyonu "Oops! Radio station is not working" hatası veriyor. Daha önce çalışan istasyonlar artık çalışmıyor.

## Teknik Detaylar

### react-native-track-player Desteklediği Formatlar:
- **Audio**: MP3, AAC, AAC+, FLAC
- **Streaming**: Regular HTTP/HTTPS streams, HLS (m3u8), DASH (Android only)
- **Protokol**: HTTP ve HTTPS doğrudan destekleniyor - proxy gerekmez

### Test Edilen İstasyonlar:

| İstasyon | URL | urlResolved | Codec | Sonuç |
|----------|-----|-------------|-------|-------|
| MANGORADIO | ✅ HTTPS | ✅ HTTPS | MP3 | ✅ Çalışıyor |
| Energy NRJ Wien | ✅ HTTPS | ✅ HTTPS | MP3 | ⚠️ urlResolved farklı |
| Arabesk FM | HTTP | HTTP | AAC+ | ❓ Test gerekli |
| Best FM | .pls dosyası | .pls dosyası | AAC+ | ❌ URL yanlış |
| Virgin Radio Türkiye | ❌ YOK | ❌ YOK | - | ❌ API'de yok |
| Radyo Maximum | ❌ YOK | ❌ YOK | - | ❌ API'de yok |

---

## SORULAR

### 1. Station URL Stratejisi
```
Mobil uygulamada hangi URL alanını kullanmalıyız?
- url (orijinal)
- urlResolved (çözümlenmiş)
- yoksa /api/stream/resolve endpoint'i mi?
```

### 2. URL Formatları
```
Bazı station'larda url .pls veya .m3u uzantılı görünüyor (örn: Best FM).
Bu URL'ler gerçekten playlist dosyası mı yoksa direkt stream mi?
Örnek: http://46.20.7.125/listen.pls - Bu URL'yi curl ile çektiğimizde 
binary audio data geliyor, playlist formatı değil.
```

### 3. Eksik İstasyonlar
```
Bazı popüler istasyonlar API'de bulunamıyor:
- Virgin Radio Türkiye
- Radyo Maximum

Bu istasyonlar başka bir slug ile mi kayıtlı?
Yoksa API'den kaldırıldılar mı?
```

### 4. urlResolved vs url
```
Energy NRJ Wien örneğinde:
- url: https://scdn.nrjaudio.fm/adwz1/at/36001/mp3_128.mp3 (timeout veriyor)
- urlResolved: https://streaming.nrjaudio.fm/ouvfydoarp52 (çalışıyor)

urlResolved her zaman daha güvenilir mi? 
Tüm istasyonlarda urlResolved mevcut mu?
```

### 5. /api/stream/resolve Endpoint'i
```
Bu endpoint ne zaman kullanılmalı?
Bazı çağrılarda timeout oluyor veya yanıt dönmüyor.
Bu endpoint'in limitasyonları neler?
```

### 6. HTTP vs HTTPS
```
Native mobil uygulamalarda HTTP stream'ler sorunsuz çalışır (mixed content sorunu yok).
HTTP stream'ler için özel bir işlem yapmamız gerekiyor mu?
```

### 7. Önerilen Akış
```
Mobil uygulama için önerdiğiniz URL resolution akışı nedir?

Şu anki mantık:
1. urlResolved varsa → doğrudan kullan
2. url .pls/.m3u ise → /api/stream/resolve kullan
3. Fallback → url kullan

Bu doğru mu yoksa farklı bir yaklaşım mı önerirsiniz?
```

---

## Ek Bilgiler

### Web vs Mobil Farkı
Web sitesinde istasyonlar çalışıyor ama mobil uygulamada çalışmıyorsa:
- Web'de farklı bir URL resolution mantığı mı kullanılıyor?
- Web'de proxy veya SSR üzerinden mi stream ediliyor?

### Log Örnekleri (Çalışmayan İstasyon)
```
[AudioProvider] Resolving stream for: Best FM
[AudioProvider] urlResolved: http://46.20.7.125/listen.pls
[AudioProvider] Native: Using urlResolved (recommended)
[AudioProvider] Error: Playback failed
```

---

## İstenen Çözüm

1. Tüm istasyonlar için tutarlı çalışan bir URL stratejisi
2. Eksik istasyonların API'ye eklenmesi veya doğru slug'ların bildirilmesi
3. URL resolution için en güvenilir yöntemin belirtilmesi

Teşekkürler!
