# Harici API: `tag` parametresi filtre uygulamıyor

Salt-okuma reproduksiyon (kimlik doğrulama/satın alma gerekmez):

```sh
curl 'https://api.themegaradio.com/api/stations?tag=jazz&limit=20'
curl 'https://api.themegaradio.com/api/stations?genre=jazz&limit=20'
```

Test48 örnekleminde `tag` sonucu caz eşleşme oranı %20, `genre` sonucu %100.
Bu oran canlı istasyon listesindeki değişimle farklılaşabilir; temel bulgu `tag`'in
eşdeğer tür filtresi olmaması. `tag` parametresi server sözleşmesinde desteklenmiyorsa
hata yerine sessizce genel liste dönüyor olabilir; backend bug'ı olduğu kesin varsayılmamalı.

**İstemci düzeltmesi:** tvOS `fetchStationsByGenre` artık `genre` gönderiyor.
Mobil ve ortak TV'deki tür endpoint akışları korunuyor. Bu depoda harici Express
API kaynağı yok; local FastAPI proxy'de gerçek API düzeltilmiş gibi değişiklik yapılmadı.

Backend tarafında istenirse `tag` alias'ı veya geçersiz parametre bildirimi eklenebilir.
Bu, istemci düzeltmesinden ayrı bir API sözleşmesi kararıdır.