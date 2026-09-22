# Masaüstü derleme

Paket içine güncel yerel TV arayüzünü dahil etmek için **bu sarmalayıcıyı kullanın**:
```sh
cd frontend/tvanddesktop/desktop
node build-desktop.js mac
node build-desktop.js win
node build-desktop.js linux
```
Yalnızca hedeflediğiniz satırı çalıştırın. Native imza/noterleştirme ve hedef işletim
sistemi araçları ayrıca gerekir. Bu komutlar burada bütün işletim sistemlerinde
imzalı paket üretildiği anlamına gelmez.

`build-desktop.js`, `electron-builder.config.js` içindeki `beforePack` hook'unu
**açıkça** kullanır: Vite renderer'ı geçici klasöre derler, relative asset yollarıyla
`renderer/` içine koyar. Build başarısızsa paketleme durur; eski bundle sessizce kullanılmaz.

Önemli: Mevcut package.json build ayarı otomatik config dosyası keşfinden öncelikli.
Eski doğrudan `electron-builder`/`yarn build:*` komutları hook'u otomatik yüklemez.
Alternatif: `yarn electron-builder --config electron-builder.config.js --linux`.

Yerel bundle sadece arayüz açılışı fallback'idir; internet olmadan canlı radyo
çalınabildiği veya tüm API verilerinin offline olduğu anlamına gelmez.

Native StoreKit sadece Mac App Store dağıtımında etkinleştirilir. Windows/Linux ve
MAS dışı macOS sürümleri mevcut web/QR ödeme akışına yönlenir. MAS satın alma ve
restore işlemleri gerçek sandbox hesabı ve imzalı MAS build ile doğrulanmalıdır.