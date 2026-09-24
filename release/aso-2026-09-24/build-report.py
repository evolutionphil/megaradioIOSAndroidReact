from pathlib import Path
import json
R=Path(__file__).resolve().parent
copy=json.loads((R/'copy.json').read_text())
market=dict(zip('tr de-DE en-US fr-FR es-ES it pt-PT ru ja zh-Hant he ar-SA en-GB en-AU fr-CA es-MX pt-BR nl-NL sv no da fi pl cs sk hu ro hr el uk ca zh-Hans ko id ms th vi hi en-CA bn gu kn ml mr or pa ta te ur sl'.split(),'tr de us fr es it pt ru jp tw il sa gb au ca mx br nl se no dk fi pl cz sk hu ro hr gr ua es cn kr id my th vn in ca in in in in in in in in in pk si'.split()))
lines=['# MegaRadio ASO araştırması — 24 Eylül 2026','',
'## Yöntem ve sınırlar','',
'50 App Store yerelleştirmesi için yerel dildeki sorgular, Apple’ın herkese açık arama sonuçları ve rakip ürün sayfaları incelendi. Aynı dilin farklı pazarları (ör. Brezilya/Portekiz; Meksika/İspanya; ABD/Birleşik Krallık/Avustralya/Kanada) ayrı işlendi. Bir ülke için ayrı yerelleştirme alanı bulunmadığında Apple’ın desteklediği ortak dil alanı kullanılır; Almanca alanı Almanya, Avusturya ve Almanca konuşulan İsviçre’yi kapsar.','',
'Arama hacmi, indirme sayısı, rakiplerin gizli keyword alanı ve Apple Ads popülerlik puanına erişim yoktur. Aşağıdaki terimler gözlenen yerel kullanım ve ürün uygunluğuna dayalı adaylardır; “en çok aranan” veya garantili sıralama iddiası değildir. Apple API sonuç sırası, kişiselleştirilmiş App Store sıralaması değildir. Puan sayıları yalnızca görünürlük için yardımcı göstergedir. Rakip seçiminde “en çok indirilen 10” iddiası kullanılmaz.','',
'## 10 rakibin karşılaştırması','',
'| Uygulama (Almanya mağazası) | Alt başlık | Puan sayısı | MegaRadio için çıkarım |','|---|---|---:|---|']
insights=['Webradio ve haber niyeti güçlü; podcast üründe olmadığı için alınmadı.','Canlı yayın, spor ve haber niyetleri ayrıştırıldı; marka adı keyword olarak kullanılmadı.','Radio/Online/Internetradio kelime aileleri pazar diline göre seçildi.','FM ve AM amacı başlık/alt başlıkta sadeleştirildi.','Genel radio terimi yerel dildeki dinleme ifadesiyle desteklendi.','Kayıt özelliği mevcut üründe yok; kayıt anahtar kelimesi eklenmedi.','Yerel istasyon bulma niyeti ve kolay dinleme vurgusu tercih edildi.','Dünya radyoları keşfi uygun; rakibin harita özelliği vaat edilmedi.','İnternet radyosu uygun; podcast/DAB alıcısı iddiası kullanılmadı.','Türkiye için radyo dinle/canlı radyo; rakip marka ve kulesi keyword alanından çıkarıldı.']
pages=json.loads((R/'research/competitor-pages.json').read_text())
for a,note in zip(pages[:10],insights):
 lines.append(f"| [{a['name']}]({a['url']}) | {a.get('subtitle','').replace('|', '&#124;')} | {a.get('ratings','')} | {note} |")
lines += ['','## Yerel konumlandırma','',
'- Türkiye: “canlı radyo”, “radyo dinle”, “türkü”, “arabesk”. MegaRadio markası korunur; Türkçe arama niyeti açıklayıcı bölümde yer alır. “Mega Radyo” adıyla ayrı bir marka oluşturulmaz.',
'- Almanya/Avusturya/İsviçre: “Webradio”, “Internetradio”, “hören”, “Live-Sender”. Spor ve haber destekleyici niyetlerdir.',
'- Brezilya: “rádio ao vivo”, “emissoras”; sertanejo/gospel/pagode gibi yerel katalog türleri. Portekiz’de “em direto” ve “desporto” kullanılır.',
'- Meksika: “en vivo”, “emisoras/estaciones”, regional/banda. İspanya’da “en directo” ve “escuchar” kullanılır.',
'- Fransa: “radio en direct”, “écouter”; Kanada Fransızcasında Québec/francophone/nouvelles niyetleri.',
'- İskandinav ülkeleri: webbradio/nätradio (İsveç), nettradio (Norveç), netradio (Danimarka), nettiradio (Finlandiya). Aynı İngilizce ifadenin düz çevirisi kullanılmaz.',
'- Japonya: ラジオ/聴く/ネットラジオ; Tayvan/Hong Kong: 電台/收聽/網路; Kore: 실시간 라디오/듣기.',
'- Hindistan’daki yeni yerelleştirmelerde özgün yazı sistemiyle sonuç sayısı düşüktü; romanize dil sorguları da araştırıldı. Bu pazarlardaki seçimler daha düşük güvenli adaylar olarak değerlendirilir; hacim varmış gibi sunulmaz.','',
'## Her yerelleştirme için yayın metinleri ve kanıt','',
'| Yerelleştirme | Name | Subtitle | Sorgu kanıtı |','|---|---|---|---|']
manifest={}
for loc,a in copy.items():
 candidates=[R/'research'/f'{loc}-language-search.json',R/'research'/f'{market[loc]}-search.json']
 source=next((p for p in candidates if p.exists()),None)
 d=json.loads(source.read_text()) if source else {}
 roman=R/'research'/f'{loc}-romanized-search.json'
 evidence={'market':market[loc],'source':d.get('_source'), 'resultCount':d.get('resultCount'), 'examples':[{'name':x.get('trackName'),'url':x.get('trackViewUrl')} for x in d.get('results',[])[:5]],'confidence':'exploratory, no volume data'}
 if roman.exists():
  q=json.loads(roman.read_text());evidence['romanized']={'source':q.get('_source'),'resultCount':q.get('resultCount'),'examples':[x.get('trackName') for x in q.get('results',[])[:5]]}
 manifest[loc]=evidence
 url=d.get('_source',{}).get('url','')
 lines.append(f"| {loc} | {a['name']} | {a['subtitle']} | [Apple sorgusu]({url}), {d.get('resultCount','?')} sonuç |")
lines += ['','## Apple alanları ve denetim','',
'Name/subtitle 30 karakter; keyword 100 karakter; promotional text 170 karakter; açıklama 4.000 karakter sınırında kontrol edilir. Keyword alanında marka/rakip marka, offline, podcast, kayıt ve doğrulanmamış “en iyi” iddiaları kullanılmaz. Aynı kelimeleri ad, alt başlık ve keyword arasında tekrar ederek alan tüketmekten kaçınılır. Promotional text arama sıralamasına doğrudan keyword alanı gibi katkı vermez.','',
'Platform paragrafları iOS, macOS ve tvOS için ayrı hazırlanmıştır; mobil car mode gibi özellikler TV/Mac vaatlerine taşınmaz. Mağaza içi satın alma ve internet bağlantısı koşulları açıklanır. Screenshot üst yazıları yerelleştirilir; uygulama ekranlarının dil kapsamı metin çevirisiyle olduğundan farklı gösterilmez.','',
'## Kaynaklar','',
'- [Apple ürün sayfası ve alanlar](https://developer.apple.com/app-store/product-page/)',
'- [App Store arama ve keşif](https://developer.apple.com/app-store/search/)',
'- [Desteklenen yerelleştirmeler](https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations)',
'- [Screenshot boyutları](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)',
'- [App Review Guidelines — doğru metadata ve görseller](https://developer.apple.com/app-store/review/guidelines/)',
'', '## Yayın sonrası ölçüm','',
'Bu dosya başlangıç hipotezini kaydeder. App Store Connect’te ülke ve kaynak bazında gösterim → ürün sayfası görüntüleme → indirme dönüşümünü izlemek; karşılaştırılabilir dönemlerde ad/alt başlık veya ilk screenshot değişimini ayrı değerlendirmek gerekir. Arama terimi sırası veya büyüme garantisi verilmez. Otomatik izleme kurulmamıştır.','']
(R/'ASO-RESEARCH.md').write_text('\n'.join(lines))
(R/'market-evidence.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('ASO report and 50-locale evidence matrix created')
