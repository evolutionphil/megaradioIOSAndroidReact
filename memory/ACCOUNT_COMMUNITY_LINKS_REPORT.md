# Hesap istatistikleri / Community / profil paylaşımı / varsayılan logo

## Tamamlanan uygulama değişiklikleri
### Hesapların istatistikleri karışıyordu
Neden: tek cihaz-geneli AsyncStorage anahtarları ve ekranın sadece ilk mount'ta okuması.
Yeni storage namespace userID bazlı, guest ayrı; async iş başlamadan owner yakalanır.
Her hesabın writes kuyruğu ayrı; A'nın gecikmiş isteği B'ye yazılamaz. Ekran hesap değişince
eski sayıları göstermeden yeniden yüklenir. Radio devam ederse oturum sınırı account değişimidir.

Session-end ekstra song artışı ve dakika double-count kaldırıldı; yarım dakika gibi
parçalar totalSeconds ile birikir. Crash/restart'tan kalan timestamp offline dinleme sayılmaz.
Eski karışık global kayıtlar silinmez ama sahibi kanıtlanamadığından otomatik taşınmaz.
Bu cihazda account-scoped kayıt çözümüdür; cihazlar arası cloud stats sync eklenmedi.

### Community ve takip durumu
Ortak directory service ekranlarda aynı public kayıtları kullanır, duplicate ID temizler,
tekrar gelen sayfada durur; yükleme/hata/yenileme/limit görünür. Filtreleme yüklü profillerde.
Takip cache'i owner bazlı; eski auth/fetch sonuçları yeni görünümü değiştirmez, token action
başında yakalanır. Paralel status istekleri4ile sınırlı; slow refresh yeni Follow sonucunu ezmez.

Gerçek API gözlemi: limit100/200/500 ->100; page2/offset100/skip100 -> aynıIDs. Bu,
mobile daha fazla kayıt ürettirmez. Kaç ek public profil bulunduğu doğrulanmadı; private
kullanıcıları göstermeye çalışılmadı. Harici backend pagination/search gerekir.

### Profil ve radyo bağlantıları
Profil Share artık boş onPress değil; public profil doğrulanır, title+message içinde
birHTTPSlink ile native Share çağrılır. Gizli profil paylaşılmaz. Slug mevcutsa kullanılır;
yoksa backend'in desteklediği doğru profileID korunur (adı tahmini slug'a çevirmeyiz).

HTTPS linkin WhatsApp'ta site adresi gibi görünmesi normaldir: Universal/App Links aynı
adresi yüklü uygulamaya açabilir, uygulama yoksa web fallback gerekir. Sadece
megaradio:// paylaşmak no-app alıcıya mağaza yönlendirmesi sağlamaz.

`+native-intent` / `incomingLinks` / `open-link`: station,user,genre ve dil prefixleri;
aynı çalan radyoda tekrarPLAYpause olmaz; stale async route sonuçları iptal; bozuklink
hataekranı; Siri/OAuth kendiakışında. iOSentitlement/Androidfilters prebuild'e dahil.

### Logolar
SharedImageWithFallback, AllStations, Favorites, genre,nearby,search radios,StationCard,
MiniPlayer,mainplayer,publicuserstations + önceki CarMode/Recent/Share alanlarında.
Remote503/eksikURL ve eski defaultURL -> yerel default-station-logo.png.
Yerel fallback her zaman contain; ağdaki geniş website logosu cover ile kırpılmaz.

## Test sonucu / yanlış pozitiflerin ayrımı
- `/app/test_reports/iteration_52.json` son zorunlu testagent raporu.
-3Node executable harness: stats isolation/math, directory/link/share/logo, nativeconfig/banner generation.
-7canlı salt-okuma API testi; hesap/satınalma/follow verisi değiştirilmedi, yenicredential yok.
- Test51malformed `/station/../x` normalizasyon hatası düzeltildi ve52'de yeniden geçti.
- Test51reset düğmesi konusu yanlış yorumdu: kullanıcı destructive reset istemedi;
  gereken hesap değişimindeki display reset ve scoped service reset zaten test edildi.
- Test51preview/api/public-profiles404 o ekrancağrısı değildi. Uygulamanın gerçekapi
  origin'i test52'de doğrudan kullanıldı. Legacyhardcoded API config ayrıborç olarak kaldı.
- Gerçek cihazda yüklü/yüklüdeğil cold/warm app-link akışları denenmedi. JS/native config
  testlerinden gerçek iOS/Android/AppStore davranışı kanıtlandığı sonucu çıkarılmamalı.

## Dış tarafta yapılması gerekenler
1. `themegaradio.com/.well-known/assetlinks.json`: Android paketini com.megaradio + gerçek
   Play App Signing SHA256 ile doğrula. Mevcut com.visiongo.megaradio girdisinin
   sertifikasını doğruymuş gibi kopyalamadık. Mevcut diğer gerçekappgirdileri gerekirse korunur.
2. iOS AASA appID M6T85HP76P.com.visiongo.megaradio; signedarchive entitlements ile eşleşmeli.
3. İndirme/OpenApp banner'ı gerçek website station/user sayfalarına eklenmeli. Hazır
   asset ve generator `frontend/linking/README.md`; burada hazırlanması live siteyi değiştirmez.
4. Automaticdeferredinstall yok. Store'dan indirdikten sonra orijinal link tekrar açılmalı.
5. Community public pagination ve search sözleşmesi dışAPI'de tamamlanmalı.

Mevcut native app build number'ları değişmedi. AssociatedDomains/intentFilters için
prebuild/pods ve yeni native derleme gerekir; Xcode signing capability provisioning'i de doğrulanmalı.