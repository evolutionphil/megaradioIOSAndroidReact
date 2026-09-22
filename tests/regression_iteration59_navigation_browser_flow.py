"""
Iteration 59 targeted TV web regression flow.

Run this body inside an async Playwright context (with `page`) to verify:
- source-aware back navigation from Discover/GenreList/Search/Favorites
- deep-list restore (country + genre + favorites)
- direct hash/query radio routes and search hash route
"""

page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))

await page.set_viewport_size({"width": 1920, "height": 1080})
await page.goto("https://tvos-ui-match.preview.emergentagent.com/api/tv-app/#/discover-no-user", wait_until="domcontentloaded")

await page.wait_for_selector('[data-testid="page-discover-no-user"]', timeout=25000)

# Seed deterministic browser-only fixture data.
seed = await page.evaluate("""async () => {
  const r = await fetch('/api/tv-proxy/stations?limit=40&country=Türkiye');
  const d = await r.json();
  return (d.stations || []).map(s => ({ id: s._id, name: s.name, url: s.urlResolved || s.url_resolved || s.url }));
}""")

await page.evaluate("""(stations) => {
  localStorage.removeItem('tv_auth_token');
  localStorage.removeItem('tv_auth_user');
  localStorage.setItem('selectedCountry', 'Türkiye');
  localStorage.setItem('selectedCountryCode', 'TR');
  localStorage.setItem('selectedCountryFlag', 'https://flagcdn.com/w40/tr.png');
  localStorage.setItem('preferredKeyboard', 'tr');
  const fallback = '/api/tv-app/images/fallback-station.png';
  const fixtures = Array.from({ length: 35 }, (_, i) => ({
    _id: i < stations.length ? stations[i].id : `fixture-station-${i+1}`,
    name: i < stations.length ? `REAL ${stations[i].name}` : `Fixture Station ${i+1}`,
    url: i < stations.length ? stations[i].url : `https://stream.example.com/${i+1}`,
    url_resolved: i < stations.length ? stations[i].url : `https://stream.example.com/${i+1}`,
    country: 'Türkiye',
    tags: ['fixture'],
    favicon: fallback,
  }));
  localStorage.setItem('mega_radio_favorites', JSON.stringify(fixtures));
}""", seed)

await page.reload(wait_until="domcontentloaded")
await page.wait_for_selector('[data-testid="page-discover-no-user"]', timeout=25000)

# Discover popular -> radio -> back
await page.wait_for_selector('[data-testid^="card-station-"]', timeout=30000)
popular = page.locator('[data-testid^="card-station-"]').nth(1)
await popular.click(force=True)
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.keyboard.press('Escape')
await page.wait_for_selector('[data-testid="page-discover-no-user"]', timeout=25000)

# Discover country deep item -> radio -> remote back
await page.evaluate("""() => {
  const area = document.querySelector('[data-testid="discover-scroll-area"]');
  if (area) area.scrollTop = area.scrollHeight;
}""")
await page.wait_for_timeout(2500)
country_cards = page.locator('[data-testid^="card-country-station-"]')
await country_cards.nth(24).click(force=True)
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.evaluate("""() => {
  const code = 461;
  const evt = new KeyboardEvent('keydown', { keyCode: code, which: code, bubbles: true });
  Object.defineProperty(evt, 'keyCode', { get: () => code });
  Object.defineProperty(evt, 'which', { get: () => code });
  document.dispatchEvent(evt);
}""")
await page.wait_for_selector('[data-testid="page-discover-no-user"]', timeout=25000)

# GenreList deep index > 28 -> Backspace
await page.click('[data-testid="sidebar-link-genres"]', force=True)
await page.wait_for_selector('[data-testid="page-genres"]', timeout=25000)
await page.locator('[data-testid^="card-genre-"]').first.click(force=True)
await page.wait_for_selector('[data-testid="page-genre-list"]', timeout=25000)
await page.evaluate("""() => {
  const area = document.querySelector('[data-testid="page-genre-list"]');
  if (area) area.scrollTop = area.scrollHeight;
}""")
await page.wait_for_timeout(3000)
await page.locator('[data-testid^="station-card-"]').nth(30).click(force=True)
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.keyboard.press('Backspace')
await page.wait_for_selector('[data-testid="page-genre-list"]', timeout=25000)

# Search query route and result/recent roundtrip
await page.goto('https://tvos-ui-match.preview.emergentagent.com/api/tv-app/#/search?q=paradise', wait_until='domcontentloaded')
await page.wait_for_selector('[data-testid="page-search"]', timeout=25000)
await page.wait_for_timeout(2000)
await page.locator('[data-testid="search-result-2"]').click(force=True)
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.keyboard.press('Escape')
await page.wait_for_selector('[data-testid="page-search"]', timeout=25000)

await page.locator('[data-testid="recent-station-1"]').click(force=True)
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.evaluate("""() => {
  const code = 4;
  const evt = new KeyboardEvent('keydown', { keyCode: code, which: code, bubbles: true });
  Object.defineProperty(evt, 'keyCode', { get: () => code });
  Object.defineProperty(evt, 'which', { get: () => code });
  document.dispatchEvent(evt);
}""")
await page.wait_for_selector('[data-testid="page-search"]', timeout=25000)

# Favorites deep row restore (fixture 35)
await page.click('[data-testid="sidebar-link-favorites"]', force=True)
await page.wait_for_selector('[data-testid="page-favorites"]', timeout=25000)
await page.locator('[data-testid="station-card-34"]').click(force=True)
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.keyboard.press('Escape')
await page.wait_for_selector('[data-testid="page-favorites"]', timeout=25000)

# Direct route coverage
station_a = seed[0]["id"]
station_b = seed[1]["id"]
await page.goto(f'https://tvos-ui-match.preview.emergentagent.com/api/tv-app/#/radio-playing?station={station_a}', wait_until='domcontentloaded')
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.goto(f'https://tvos-ui-match.preview.emergentagent.com/api/tv-app/?station={station_b}#/radio-playing', wait_until='domcontentloaded')
await page.wait_for_selector('[data-testid="page-radio-playing"]', timeout=25000)
await page.goto('https://tvos-ui-match.preview.emergentagent.com/api/tv-app/#/search?q=jazz', wait_until='domcontentloaded')
await page.wait_for_selector('[data-testid="page-search"]', timeout=25000)
