"""Backend tests for TV/Desktop additions:
- /api/stream-proxy
- /api/stream-metadata (SSE)
- /api/stream-resolve
- /api/tv-app/ static mount
"""
import os
import time
import urllib.parse
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://music-premium-fix.preview.emergentagent.com").rstrip("/")
ICY_STREAM = "http://stream.radioparadise.com/mp3-192"


# ---------- /api/stream-resolve ----------
class TestStreamResolve:
    def test_resolve_icy_stream(self):
        r = requests.get(f"{BASE_URL}/api/stream-resolve",
                         params={"url": ICY_STREAM}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True, data
        assert "final_url" in data
        assert "content_type" in data
        # Radio Paradise serves MPEG audio
        assert "audio" in data["content_type"] or "mpeg" in data["content_type"]

    def test_resolve_bad_scheme(self):
        r = requests.get(f"{BASE_URL}/api/stream-resolve",
                         params={"url": "ftp://example.com/foo"}, timeout=10)
        # endpoint always returns 200 with ok=false
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is False


# ---------- /api/stream-proxy ----------
class TestStreamProxy:
    def test_proxy_returns_audio(self):
        # Use stream=True and read a small chunk so we can validate quickly
        with requests.get(f"{BASE_URL}/api/stream-proxy",
                          params={"url": ICY_STREAM},
                          stream=True, timeout=20) as r:
            assert r.status_code == 200, r.text[:200] if r.content else r.status_code
            ct = r.headers.get("content-type", "")
            assert ("audio" in ct or "mpeg" in ct), f"content-type was {ct}"
            # Read first chunk to confirm audio is actually flowing
            it = r.iter_content(chunk_size=4096)
            first = next(it, b"")
            assert first and len(first) > 0, "no bytes from stream-proxy"

    def test_proxy_bad_scheme(self):
        r = requests.get(f"{BASE_URL}/api/stream-proxy",
                         params={"url": "ftp://example.com/x"}, timeout=10)
        assert r.status_code == 400


# ---------- /api/stream-metadata (SSE) ----------
class TestStreamMetadataSSE:
    def test_sse_emits_data_event(self):
        """Open SSE, expect a 'data:' (StreamTitle) event within ~30 seconds.
        Radio Paradise pushes ICY metadata frequently."""
        url = f"{BASE_URL}/api/stream-metadata?url={urllib.parse.quote(ICY_STREAM)}"
        deadline = time.time() + 30
        got_data = False
        raw_buf = ""
        with requests.get(url, stream=True, timeout=35) as r:
            assert r.status_code == 200, r.text[:200]
            assert "text/event-stream" in r.headers.get("content-type", "")
            for line in r.iter_lines(decode_unicode=True):
                if time.time() > deadline:
                    break
                if line is None:
                    continue
                raw_buf += (line or "") + "\n"
                if line.startswith("data:") and line.strip() != "data: {}":
                    # parse minimal validation
                    payload = line[len("data:"):].strip()
                    assert "title" in payload or "raw" in payload, payload
                    got_data = True
                    break
                if line.startswith("event: nometa"):
                    pytest.fail("Upstream reported nometa — ICY missing")
        assert got_data, f"No SSE data event received in 30s. Buffer: {raw_buf[:400]}"


# ---------- /api/tv-app/ static mount ----------
class TestTvAppMount:
    def test_index_loads(self):
        r = requests.get(f"{BASE_URL}/api/tv-app/", timeout=15)
        assert r.status_code == 200
        html = r.text
        assert "<html" in html.lower()
        # Reference hashed assets
        assert "/api/tv-app/assets/index-" in html
        assert ".js" in html and ".css" in html

    def test_assets_served(self):
        # Pull index, extract first hashed JS, fetch it
        r = requests.get(f"{BASE_URL}/api/tv-app/", timeout=15)
        import re
        m = re.search(r'src="(/api/tv-app/assets/index-[^"]+\.js)"', r.text)
        assert m, "no hashed JS asset reference"
        asset = requests.get(BASE_URL + m.group(1), timeout=15)
        assert asset.status_code == 200
        assert "application/javascript" in asset.headers.get("content-type", "") or \
               "text/javascript" in asset.headers.get("content-type", "")
        assert len(asset.content) > 1000
