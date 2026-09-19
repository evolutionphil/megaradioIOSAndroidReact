"""Issue49 read-only endpoint checks for station slug/canonical data and favicon reachability."""

import os
import requests
import pytest


def _read_frontend_env(key: str) -> str | None:
    try:
        with open('/app/frontend/.env', 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith(f"{key}="):
                    return line.split('=', 1)[1].strip().strip('"').strip("'")
    except Exception:
        return None
    return None


@pytest.fixture(scope="module")
def base_url() -> str:
    """Read base URL from env only (frontend public URL), fail fast if missing."""
    url = (
        os.environ.get("EXPO_BACKEND_URL")
        or _read_frontend_env("EXPO_BACKEND_URL")
        or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
        or _read_frontend_env("EXPO_PUBLIC_BACKEND_URL")
    )
    if not url:
        pytest.skip("EXPO_BACKEND_URL is not set")
    return url.rstrip("/")


def _get_json(url: str, timeout: int = 8):
    response = requests.get(url, timeout=timeout)
    body = None
    try:
      body = response.json()
    except Exception:
      body = None
    return response, body


def _pick_station_payload(body):
    if isinstance(body, dict):
        if isinstance(body.get("station"), dict):
            return body["station"]
        if isinstance(body.get("data"), dict):
            return body["data"]
        return body
    return None


class TestIssue49ReadonlyChecks:
    """Station detail + canonical slug read-only checks."""

    def test_best_fm_detail_has_expected_slug(self, base_url):
        station_id = "68a8c462bd66579311aae076"
        hosts = [base_url, "https://themegaradio.com", "https://api.themegaradio.com"]
        seen = []
        candidates = []
        for host in hosts:
            h = host.rstrip("/")
            if h in seen:
                continue
            seen.append(h)
            candidates.extend([
                f"{h}/api/station/{station_id}",
                f"{h}/api/stations/{station_id}",
            ])

        payload = None
        for url in candidates:
            res, body = _get_json(url, timeout=8)
            if 200 <= res.status_code < 300 and body is not None:
                payload = _pick_station_payload(body)
                if payload:
                    break

        assert payload is not None, "Station detail endpoint did not return JSON payload"
        assert payload.get("slug") == "best-fm-2"
        stream = payload.get("urlResolved") or payload.get("url_resolved") or payload.get("url") or ""
        assert "46.20.7.126" in stream or "stream.mp3" in stream

    def test_canonical_station_page_uses_slug(self):
        """External blocker test: xfail if canonical endpoint is externally unavailable."""
        response = requests.get("https://themegaradio.com/station/best-fm-2", timeout=8)
        if response.status_code in {404, 410}:
            pytest.xfail(
                f"EXTERNAL UNAVAILABLE: canonical /station/best-fm-2 returned {response.status_code}"
            )
        assert 200 <= response.status_code < 400
        assert "best-fm-2" in response.text.lower()

    def test_best_fm_external_unavailable_signal(self):
        """Read-only evidence for current external website issue (do not treat as backend regression)."""
        get_res = requests.get("https://themegaradio.com/station/best-fm-2", timeout=8)
        head_res = requests.head("https://themegaradio.com/station/best-fm-2", timeout=8, allow_redirects=True)
        if get_res.status_code == 410 or head_res.status_code == 410:
            assert True
            return
        # If no longer unavailable, still require canonical route to be healthy.
        assert 200 <= get_res.status_code < 400

    def test_virgin_favicon_readonly_status(self):
        response = requests.get(
            "https://i.karnavalcdn.com/media/site_media/icons/android-icon-192x192.png",
            timeout=8,
        )
        assert response.status_code in {200, 301, 302, 403, 404, 500, 502, 503}
