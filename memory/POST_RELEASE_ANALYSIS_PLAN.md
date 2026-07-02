# v1.0.70 Yayın Sonrası İlk Hafta Analiz Planı
Amaç: "Açılış süresi gerçekten düştü mü? Kısayollar kullanılıyor mu?" sorularını veriyle
yanıtlayıp v1.0.71 önceliklerini belirlemek.

## Toplanan Yeni Metrikler (v1.0.70 ile eklendi)
1. **`app_startup_time`** (GA4 event) — `duration_ms`: JS başlangıcı → splash gizlenene kadar
   geçen süre, `platform`. Kaynak: `_layout.tsx` (JS_START_TIME → splashHidden).
2. **`app_launch`** (GA4 event) — `launch_source`: `normal` / `quick_action` / `siri` / `assistant`.
3. Crashlytics: crash-free users + ANR (Android) — otomatik.

## Nerede Bakılır (Firebase Console)
- Analytics → Events → `app_startup_time` → `duration_ms` ortalaması; "App version" ile
  1.0.69 vs 1.0.70 karşılaştır (1.0.69'da bu event yok → karşılaştırma proxy'si: Android
  Vitals "App start time" + kullanıcı şikayetleri; iOS için Xcode Organizer → Launch Time).
- Analytics → Events → `app_launch` → `launch_source` parametre kırılımı (parametreyi
  "custom dimension" olarak kaydetmek gerekebilir: Admin → Custom definitions →
  `launch_source` event-scoped ekle — İLK GÜN YAPILMALI, geriye dönük çalışmaz!).
- Crashlytics → "Crash-free users" 1.0.69 vs 1.0.70; yeni crash imzalarında
  QuickActionsHandler / AppIntents / launchSourceService araması yap.
- Android Vitals (Play Console) → App start time + ANR rate.
- Xcode Organizer → Metrics → Launch Time (yalnızca iOS gerçek karşılaştırma kaynağı).

## Başarı Kriterleri
- `app_startup_time` medyan < 4000 ms (yavaş ağ dahil); p90 < 8000 ms.
- `launch_source != normal` oranı ilk hafta > %3 ise kısayollar tutuyor demektir →
  v1.0.71'de Live Activity/widget yatırımı doğrulanır.
- Crash-free users ≥ 1.0.69 seviyesi (düşüş varsa yeni eklenen modüller ilk şüpheli).

## Karar Kuralları (v1.0.71 önceliklendirme)
- Startup medyanı hâlâ > 6s ise → tv/init dışındaki startup ağırlıkları profillenir
  (Firebase Perf SDK eklemeyi değerlendir).
- `quick_action`+`siri` kullanımı anlamlıysa → iOS Live Activity + Android widget (B1/B6) P0.
- Assistant kullanımı sıfırsa → Play yayını sonrası Test Tool ile doğrula (capability
  onayı gecikmiş olabilir).

## ÖNEMLİ İLK GÜN GÖREVİ
GA4 Admin → Custom definitions → event-scoped custom dimension olarak `launch_source` ve
metric olarak `duration_ms` kaydet (yoksa konsol kırılımı gösteremez; BigQuery bağlıysa gerek yok).
