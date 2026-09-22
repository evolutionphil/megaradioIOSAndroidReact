# Cloudflare erişimi: token ve LG QA IP listesi

## “Token var ama API göremiyorum”
**API Token zaten gereken erişim anahtarıdır.** Ayrıca "API" adlı ayrı bir değer
aranmaz. GitHub'da şu iki değer ayrı kayıt olur:

| GitHub repository secret adı | Nereden alınır |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Tokens → Workers düzenleme yetkili token **değeri** |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages → Account Details → **Account ID** (Zone ID değil) |

Token'ın listede görülen **adı/ID'si** ile token'ın gizli **değeri** farklıdır. Gizli
değer oluştururken bir kere görünür. Elinizde yalnız adı varsa mevcut servisin
token'ını hemen iptal etmeyin: bu iş için ayrı, yalnız ilgili hesaba yetkili bir
Workers token'ı oluşturup kaydedin. **Global API Key kullanmayın.**

Cloudflare: hesap → **Manage Account → API Tokens → Create Token**; bu menü yoksa
profil → **My Profile → API Tokens**. **Edit Cloudflare Workers** şablonu; yalnız
ilgili hesap, zone sorarsa `themegaradio.com`. Değeri yalnız GitHub repository →
**Settings → Secrets and variables → Actions → New repository secret** alanına yapıştırın.
Sohbete/ekran görüntüsüne/koda yazmayın. Menü bulunamıyorsa değerleri gizlenmiş ekran
görüntüsü ile hangi sayfada olunduğu paylaşılabilir. GitHubToken ayrıca istenmez.

Bu çalışma ortamı Cloudflare hesabına bağlı değil. Buradan hesabınıza token,
GitHub Secret veya WAF kuralı eklendiği iddia edilmez. Secrets + ilk tam arşiv
kurulumu için [CDN_GITHUB_ACTIONS.md](CDN_GITHUB_ACTIONS.md).

## LG'nin verdiği tam IP aralıkları
```
182.224.177.1 – 182.224.177.255
121.66.144.138
121.66.144.140 – 121.66.144.142
27.122.242.78
```

Cloudflare expression IP kümesi (ilk aralığı `.0` adresine genişletmez):
```
ip.src in {
  182.224.177.1
  182.224.177.2/31
  182.224.177.4/30
  182.224.177.8/29
  182.224.177.16/28
  182.224.177.32/27
  182.224.177.64/26
  182.224.177.128/25
  121.66.144.138
  121.66.144.140/31
  121.66.144.142
  27.122.242.78
}
```

## Önce teşhis, sonra yalnız ilgili engeli düzeltin
1. `themegaradio.com` zone → **Security → Events** (arayüze göre Security Analytics).
   LG test saati, istemci IP ve `cdn.themegaradio.com` / `api.themegaradio.com`
   host'larıyla arayın. Block/Managed Challenge hangi rule ID'den geliyor?
2. Geo custom rule kanıtlandıysa mevcut **o engelleme kuralına** bu IP kümesi için
   `and not (ip.src in {...})` istisnası eklemek, tüm WAF'ı kapatmaktan daha dardır.
   Gerçek rule ifadesine doğru parantezle ekleyin; farklı kuralların mantığını bozmayın.
3. Managed WAF veya challenge kaynaklıysa yalnız raporlanan host/path ve QA IP'lerine
   uygun **Skip** kuralını ilgili kuraldan önce değerlendirin. Skip'in tüm güvenlik
   ürünlerini veya Basic Bot Fight Mode'u atladığını varsaymayın.
4. Gerçek QA IP'sinden yeniden test ve olay kaydıyla doğrulayın. `X-Forwarded-For`
   başlığını taklit ederek yapılan curl, Cloudflare `ip.src` kontrolünü test etmez.
5. Değişiklik tarihi/sahibi/QA bitişini kaydedin; geçici istisnayı test sonrası gözden geçirin.

Workers yayın token'ı WAF düzenleme yetkisi sağlamayabilir. Gerekmedikçe genişletmeyin;
bu güvenlik kontrolü mevcut zone yöneticisi tarafından yapılabilir. TLS/JS motor hatası
IP whitelist ile çözülmez. Bu raporda cihaz-sürümüne özgü gerçek kod uyumsuzluğu da vardı.