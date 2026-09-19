/* External website integration asset, NOT injected/published by the mobile app.
   Load after app-link-config.js on the real canonical station/user pages. */
(function () {
  var config = window.MEGARADIO_LINKS;
  if (!config || document.getElementById('megaradio-install-banner')) return;
  var path = window.location.pathname.split('/').filter(Boolean);
  if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(path[0] || '')) path.shift();
  if (!['station', 'user'].includes(path[0]) || !path[1] || path.length !== 2) return;
  var identifier;
  try { identifier = decodeURIComponent(path[1]); } catch (_) { return; }
  if (!identifier || /[\/?#\u0000-\u001f]/.test(identifier)) return;
  var region = document.createElement('section');
  region.id = 'megaradio-install-banner';
  region.setAttribute('aria-label', 'MegaRadio uygulamasında aç');
  region.style.cssText = 'padding:20px;margin:16px;border-radius:16px;background:#17171b;color:#fff;font:16px system-ui;display:flex;flex-wrap:wrap;align-items:center;gap:12px;';
  var heading = document.createElement('strong');
  heading.textContent = 'MegaRadio uygulamasında aç'; region.appendChild(heading);
  function button(text, href, id) {
    if (!href) return;
    var a = document.createElement('a'); a.textContent = text; a.href = href; a.id = id;
    a.style.cssText = 'display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:22px;background:#ff4199;color:white;text-decoration:none;';
    region.appendChild(a);
  }
  button('Uygulamayı aç', 'megaradio://' + path[0] + '/' + encodeURIComponent(identifier), 'megaradio-open-app');
  button('App Store', config.appStoreUrl, 'megaradio-install-ios');
  button('Google Play', config.playStoreUrl, 'megaradio-install-android');
  var note = document.createElement('p');
  note.style.cssText = 'flex-basis:100%;margin:0;line-height:1.5;';
  note.textContent = 'Uygulama yüklü değilse indirin, ardından bu bağlantıya tekrar dokunun. Kurulumdan sonra hedefin otomatik aktarılması desteklenmiyor.';
  region.appendChild(note);
  document.body.insertBefore(region, document.body.firstChild);
})();