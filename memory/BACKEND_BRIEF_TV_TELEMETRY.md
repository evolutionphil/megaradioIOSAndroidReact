# Backend Brief — TV "Açılış Telemetrisi" (CDN remote-update için)

Amaç: Smart TV uygulaması (Tizen/webOS) her açılışında, **CDN'den mi yoksa yerel
yedekten mi** açıldığını + hangi bundle sürümünü çalıştırdığını backend'e bildirsin.
Böyleyce panodan "kaç TV yeni sürümü aldı?" görülebilir ve `killSwitch` geri alımları
güvenle yönetilir.

## 1) Endpoint
- **Yöntem:** `GET /api/tv/telemetry/open`  (GET pixel/beacon — eski Tizen/webOS
  WebView'larında `navigator.sendBeacon` güvenilmez; en uyumlusu GET + 1x1 cevap)
- **Auth:** YOK (public beacon). Sadece query parametrelerini whitelist'le.
- **CORS:** `Access-Control-Allow-Origin: *` döndür. Çağrı `file://` (Origin: null) ve
  `https://cdn.themegaradio.com` origin'lerinden gelir.
- **Cevap:** `204 No Content` (veya 1x1 transparan GIF). Gövde gereksiz.

## 2) Query parametreleri (hepsi opsiyonel ama whitelist'le)
| Param | Örnek | Anlamı |
|------|-------|--------|
| `src`  | `remote` \| `local` | CDN'den mi (remote) yoksa paketteki yerel yedekten mi (local) açıldı |
| `v`    | `20260601150741`    | Çalışan bundle sürümü (CDN `version.json` içindeki `version`) |
| `plat` | `tizen` \| `webos` \| `other` | Platform |
| `app`  | `1.0.2`             | Mağaza paketi sürümü (config.xml / appinfo.json) |
| `did`  | `a3f9c1...` (opaque) | Anonim cihaz kimliği (rastgele, localStorage'da saklı) — tekil TV saymak için |

> Not: `did` rastgele/anonimdir, PII değildir. İstersen ülke bilgisini Cloudflare/proxy
> IP header'ından türetebilirsin; ham IP saklama zorunlu değil.

## 3) Saklama (MongoDB önerisi)
İki yaklaşımdan biri yeterli:

**(a) Ham log koleksiyonu** `tv_telemetry`:
```json
{ "ts": "2026-06-01T15:00:00Z", "src": "remote", "v": "20260601150741",
  "plat": "tizen", "app": "1.0.2", "did": "a3f9c1...", "country": "DE" }
```
- TTL index öner: 30–90 gün (`ts` üzerinde expireAfterSeconds) — şişmesin.

**(b) Veya günlük agregat sayaç** `tv_telemetry_daily` (daha hafif):
```json
{ "_id": "2026-06-01|tizen|remote|20260601150741", "day":"2026-06-01",
  "plat":"tizen","src":"remote","v":"20260601150741","count": 1240,
  "uniqueDids": ["...", "..."] }   // veya HyperLogLog/set
```
`$inc: { count: 1 }` + `$addToSet: { uniqueDids: did }` ile upsert.

## 4) Doğrulama / güvenlik
- Parametreleri whitelist'le (`src ∈ {remote,local}`, `plat ∈ {tizen,webos,other}`,
  `v`/`app` regex: `^[0-9.]{1,20}$`, `did`: `^[a-z0-9-]{8,64}$`). Uymayan değeri yok say.
- Auth yok ama bu endpoint **sadece yazar**, hiçbir veri döndürmez → düşük risk.
- İstersen basit rate-limit (IP başına) ekle; şart değil (fire-and-forget).

## 5) Pano / sorgu örneği (ne işimize yarayacak)
Son 24 saatte sürüm bazında tekil TV sayısı + remote/local oranı:
```
- v=20260601150741 → 9.320 tekil TV (remote %96 / local %4)   ← yeni sürüm yayıldı
- v=20260520xxxxxx →   410 tekil TV (henüz güncellememiş)
```
Bu sayede: yeni CDN sürümü kaç TV'ye ulaştı görürsün; `killSwitch=true` yaparsan
"local" oranının yükselişini canlı izlersin (geri alım çalışıyor mu emin olursun).

## 6) Frontend tarafı (BİZDE — backend dev yapmayacak)
TV bootstrap'ına (`remote-bootstrap.html`) sessiz bir ping ekleyeceğiz:
endpoint hazır olunca `new Image().src = "https://api.themegaradio.com/api/tv/telemetry/open?src=...&v=...&plat=...&app=...&did=..."`
şeklinde tek satırlık, hata yutan (uygulamayı asla bloklamayan) çağrı.
**Backend dev'den tek ihtiyacımız: yukarıdaki endpoint'in canlı URL'i + CORS `*`.**
