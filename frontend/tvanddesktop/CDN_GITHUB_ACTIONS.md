# Samsung / LG — GitHub → CDN otomasyonu

Workflow: `.github/workflows/deploy-tv-cdn.yml` → **Update Samsung-LG CDN**.
Hedef: mevcut `wrangler.jsonc` içindeki **megaradio-tv** Worker ve
`cdn-config.json` içindeki CDN kökü. `.wgt` / `.ipk` üretmez, Railway servisini ve
mobil uygulamayı değiştirmez. Bu dosyalar hazırlanıp yerelde test edilebilir;
**GitHub Secrets + ilk geçmiş arşivi kurulmadan canlı yayın yapılmaz.**

## 1. Bir kez: GitHub Secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Ad | Değer |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Mevcut Cloudflare hesabına sınırlandırılmış Workers düzenleme token'ı |
| `CLOUDFLARE_ACCOUNT_ID` | `megaradio-tv` Worker'ının bulunduğu hesap kimliği |

Cloudflare'da **Edit Cloudflare Workers** API token şablonunu kullanın. Mevcut
Worker'ı güncelleme ve static assets yükleme yetkisi verin; başka hesaplara erişimi
kaldırın. Bu akış yeni DNS/domain kurmaz: `cdn.themegaradio.com` mevcut Worker'a
bağlı kalmalı. İzin hatası varsa eksik yetkiyi hataya göre düzeltin; Global API Key
vermeyin. Token'ı sohbete, kaynak koda, JSON dosyasına veya `VITE_*` değişkenine yazmayın.

GitHub'ın `GITHUB_TOKEN` değeri workflow tarafından otomatik sağlanır. Ayrı PAT
gerekmiyor; job'un `contents: write` izni kurtarma Release arşivleri içindir.
Organizasyon politikası Actions'ın release/tag oluşturmasına izin vermeli.

## 2. Bir kez: eski TV'ler için başlangıç arşivi (zorunlu)

TV önbelleğindeki eski `index.html`, eski hash'li dosyaları açabilir. Yeni GitHub
runner'ında bunlar kendiliğinden yoktur. Actions cache süresi dolabilir; Cloudflare
yeni manifest'e eklenmeyen eski dosyaları otomatik sunacak diye varsaymıyoruz.

1. **Son canlı CDN'ye yüklediğin TAM `cdn-dist` yedeğini** bul. Daha önce yayımlanan
   eski `assets/*` dosyalarını da içermeli. Gerekiyorsa eski yayın klasörlerinin
   hash'li dosyalarını bu yedekte birleştir; mevcut `index.html` ve `version.json`
   canlı sürümün olmalı. Repo içindeki rastgele/eski çıktıyı canlı yedek sanma.
2. **Yeni build çalıştırmadan önce** arşivle (Node22+, Python3.11+):

   ```bash
   cd frontend/tvanddesktop
   node cdn-ci/verify.cjs local /path/to/full-cdn-backup
   node cdn-ci/verify.cjs history /path/to/full-cdn-backup
   python3 cdn-ci/history.py pack --directory /path/to/full-cdn-backup --output /path/to/cdn-history-export
   ```

   Windows'ta `python3` yerine kuruluma göre `py -3` kullanılabilir. `--output`
   yedek klasörünün **dışında** olmalı. History kontrolü canlı girişteki hash'leri
   doğrular; geçmişteki bilinmeyen tüm sürümleri internetten listeleyemez. Tam eski
   yedeğin sağlandığından sorumlu kişi emin olmalıdır. Yedek yoksa ilk yayını durdurun;
   boş arşivle veya sadece güncel HTML'yi indirerek bu korumayı aşmayın.
3. GitHub → **Releases → Draft a new release**:
   - Tag: **`tv-cdn-seed`**, Target: **main**.
   - **Pre-release** seçin, uygulamanın normal "Latest release" sürümünü değiştirmeyin.
   - Oluşan **iki** dosyayı ekleyin: `tv-cdn-history.tar.gz` ve
     `tv-cdn-history.tar.gz.sha256`.
   - Release'i yayımlayın; taslak bırakmayın.

Arşiv yoksa/bozuksa veya canlı girişteki dosyaları kapsamıyorsa workflow durur;
eski TV'leri kırabilecek temiz/eksik yayın yapılmaz. Yeni bir CDN kurulumu bu
mevcut-CDN otomasyonunun ilk-import güvenlik koşulunu otomatik atlamaz.

## 3. İlk deneme ve normal kullanım

1. Bu değişiklikler GitHub deposunun `main` dalına kaydedildikten sonra:
   **Actions → Update Samsung-LG CDN → Run workflow → main → dry_run=true**.
   Bu deneme Cloudflare/GitHub Release değiştirmez, secret veya başlangıç arşivi
   gerektirmez. Derleme + dosya doğrulama + Wrangler paketleme kontrolüdür.
2. Kurulum tamamlanınca aynı yerden **dry_run=false** seçin.
3. Bundan sonra `main` üzerindeki **ilgili ortak TV web/CDN dosyası** değişiklikleri
   otomatik çalışır. Mobil/README-only değişiklikleri bu yayını başlatmaz.
   Elle çalıştırma yalnızca **main** dalında kabul edilir.

Otomatik job sırası:
```
kilitli TV bağımlılıkları → Python/Node regresyon testleri → secret kontrolü → tam geçmişi geri yükle
→ canlı girişin geçmişte bulunduğunu doğrula → TypeScript + yeni Vite build
→ yerel dosya kontrolü + Wrangler dry-run → kalıcı kurtarma arşivi
→ eski main commit'ini reddet → tek atomik Cloudflare yayını → canlı doğrulama
```

Eski webOS koruması ayrıca çalışır: legacy bundle + public helper'lar ES5 parser
kontrolünden geçer; yeni CDN HTML'si üzerinde bootstrap/timeout/fallback runtime
testleri çalışır. Testler `lg-webos/dist` gibi runner'da bulunmayan yerel çıktılara
bağlı değildir. Bu kontroller gerçek TV donanım sertifikası yerine geçmez.

İlgili yollar workflow'da açıkça listeli. `remote-bootstrap.html`, Tizen `config.xml`
ve LG `appinfo.json` gibi **paket dosyası** değişiklikleri tek başına CDN güncellemesi
değildir; yeni TV paketi gerekir. Bu nedenle otomatik CDN tetikleyicisine katılmadılar.

## 4. Sürüm dosyaları nasıl korunuyor?

- Her gerçek yayın adayı, **yayından önce** `tv-cdn-<run-id>-<attempt>` adıyla
  yayımlanmış bir **pre-release** kurtarma kaydı oluşturur. İki arşiv dosyası da
  yüklenmeden taslak yayımlanmaz. Normal desktop/TV paket release'leri seçilmez.
- Sonraki runner son tam kaydı SHA-256 ile doğrular; yeni build mevcut dosyaların
  üzerine birleştirilir, eski hash'li dosyalar **yaşa göre silinmez**.
- Dosya adı aynı olan hash'li bir dosyanın içeriği değişirse build durur.
- Cloudflare aktarımından hemen sonra job kesilse bile arşiv zaten kalıcıdır.
  Arşiv kaydı **yayının başarılı olduğu anlamına gelmez**; son doğrulama adımına bakın.
- Job'lar aynı concurrency grubunda seri ilerler; çalışan iş iptal edilmez.
  `main` ilerlemişken eski SHA ile yeniden çalıştırılan yayın durur.
- Arşivleri/tag'leri silmeyin; mümkünse repository Release immutability politikasını
  etkinleştirin. GitHub yöneticisinin silmesine karşı otomatik arşiv garantisi yoktur.
- Koruyucu limitler: 20.000 dosya, tek dosya25MiB, geçmiş arşivi açılmış boyut1GiB.
  Sınır aşılırsa otomatik silme yerine job durur; kontrollü tarihçe planlaması gerekir.

**Uyumluluk sınırı:** Eski hash'li `/assets/*` korunur. `/js/*`, `/css/*`, resim gibi
**sabit isimli** kaynaklar yeni dosyayla güncellenebilir. Bu yardımcıları eski UI
bundle'larıyla geriye uyumlu tutun; arşiv saklamak JS API uyumluluğunu kendiliğinden
sağlamaz. Kırıcı değişiklik için sürümlenmiş yollar/yeni native paket planlayın.

## 5. Başarı kontrolü / hata / geri dönüş

- `version.json` beklenen build kimliğiyle eşleşmeli, `no-cache/no-store` olmalı.
- Canlı `index.html` byte hash'i yeni çıktıyla aynı olmalı; JS/CSS ve diğer giriş
  kaynakları yerel dosyalarla eşleşmeli. Bir eski asset de örneklenir.
- JS/CSS için `Access-Control-Allow-Origin: *` kontrol edilir (`file://` TV için).
- SPA fallback yanlışlıkla eksik JS yerine HTML200 döndürse de doğrulama başarısız
  olur. Mevcut Worker'ın SPA ayarı değiştirilmedi.
- Derleme bozulursa **eski bundle'a fallback yapıp yeni sürüm etiketi basılmaz**.
- Yayın sonrası test kırmızıysa dosyalar **zaten canlıya geçmiş olabilir**. Yeşil
  sanmayın; sonraki adımı inceleyin. Otomatik geri alma mevcut çalışan sürümü başka
  bir adayla değiştirmez; sorumlu kişi Cloudflare Worker sürümlerinden bilinen iyi
  sürümü seçebilir. Sonraki düzeltmeyi `main` üzerinden yeni aday olarak yayınlayın.
- Acil yerel pakete dönüş: `cdn-config.json` → `killSwitch:true`; normal akışla
  yayınlayın. TV güncelleyici bunu arka planda gördüğünde cache'i temizler,
  **sonraki açılışta** paket içi yedeğe geçer. Anlık uzaktan uygulama kapatma değildir.

## TV tarafı

İlk `.wgt`/`.ipk` bootstrap ve güncelleyici içermeli. TV normal açılıştan sonra
manifest'i kontrol eder; yeni web sürümü **bir sonraki açılışta** kullanılır.
Samsung/LG gerçek cihazda ağ kesilmesi, eski cache, kumanda ve ses kabul testi yapın.
Mağaza kuralları/onaylı kapsam geçerlidir; native izin/kimlik/sertifika değişiklikleri
bu web güncellemesiyle yapılamaz. Burada credential'lı gerçek GitHub/Cloudflare yayını
ve fiziksel TV doğrulaması yapılmış sayılmaz.

## Yerel kontrol (yayın yapmaz)
```bash
cd frontend/tvanddesktop
yarn --cwd apple-tv-and-macos/web-preview install --frozen-lockfile
node build-cdn.js
node cdn-ci/verify.cjs local
python3 -m unittest discover -s cdn-ci/tests -p 'test_*.py' -v
node --test cdn-ci/tests/*.test.cjs
node apple-tv-and-macos/web-preview/compat/check-legacy.cjs cdn-dist
node --test ../../tests/test_webos_legacy_bootstrap_regression.cjs
npx --yes wrangler@4.136.2 deploy --dry-run --outdir .wrangler-dry-run
```

Kaynaklar: [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/),
[Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[GitHub Release assets](https://docs.github.com/en/rest/releases/assets).