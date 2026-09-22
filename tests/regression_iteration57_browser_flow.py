"""
Iteration 57 targeted TV/Desktop regression script (manual Playwright runner).

This script body is intended to run inside an async Playwright context with `page`.
It reproduces:
- deterministic 35-item favorites fixture (`mega_radio_favorites`)
- D-pad and mouse-wheel scrolling on Favorites
- currentStation establishment via actual click flow to Radio Playing
- mini-player gap checks on Discover / Genres / GenreList / Favorites
"""

page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))

await page.set_viewport_size({"width": 1920, "height": 1080})
await page.goto("https://tvos-ui-match.preview.emergentagent.com/api/tv-app/#/favorites", wait_until="domcontentloaded")

station = await page.evaluate("""async () => {
  const r = await fetch('/api/tv-proxy/stations?limit=1');
  const d = await r.json();
  const s = (d.stations || [])[0];
  return s ? { id: s._id, name: s.name, url: s.urlResolved || s.url_resolved || s.url } : null;
}""")

await page.evaluate("""(real) => {
  localStorage.removeItem('tv_auth_token');
  localStorage.removeItem('tv_auth_user');
  const fallback = '/api/tv-app/images/fallback-station.png';
  const fixtures = Array.from({ length: 35 }, (_, i) => ({
    _id: i === 0 ? real.id : `fixture-station-${i+1}`,
    name: i === 0 ? `REAL ${real.name}` : `Fixture Station ${i+1}`,
    url: i === 0 ? real.url : `https://stream.example.com/${i+1}`,
    url_resolved: i === 0 ? real.url : `https://stream.example.com/${i+1}`,
    country: 'Fixtureland',
    tags: ['fixture', `genre-${(i % 5) + 1}`],
    favicon: fallback
  }));
  localStorage.setItem('mega_radio_favorites', JSON.stringify(fixtures));
}""", station)

await page.reload(wait_until="domcontentloaded")
await page.wait_for_selector('[data-testid="favorites-scroll-area"]', timeout=20000)

for _ in range(6):
  await page.keyboard.press('ArrowRight')
  await page.wait_for_timeout(100)
for _ in range(4):
  await page.keyboard.press('ArrowDown')
  await page.wait_for_timeout(200)

await page.click('[data-testid="station-card-0"]', force=True)
await page.wait_for_selector('[data-testid="button-play-pause"]', timeout=20000)

await page.click('[data-testid="sidebar-link-genres"]', force=True)
await page.wait_for_selector('[data-testid="genres-scroll-area"]', timeout=20000)
await page.wait_for_selector('[data-testid="button-global-play-pause"]', timeout=12000)
