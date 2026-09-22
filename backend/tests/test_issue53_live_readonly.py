"""Issue53 live read-only checks for auth/session/subscription/country+genre contracts."""

import os
import re
from urllib.parse import urljoin

import pytest
import requests


TIMEOUT = 25


def _read(path: str) -> str:
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def _api_base() -> str:
    src = _read("/app/frontend/src/constants/api.ts")
    m = re.search(r"API_BASE_URL\s*=\s*['\"]([^'\"]+)['\"]", src)
    if m:
        return m.group(1).rstrip("/")
    env = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if env:
        return env.rstrip("/")
    pytest.skip("No configured API base found")


def _headers() -> dict:
    src = _read("/app/frontend/src/services/api.ts")
    m = re.search(r"MEGARADIO_API_KEY\s*=\s*['\"]([^'\"]+)['\"]", src)
    h = {"Content-Type": "application/json"}
    if m:
        h["X-API-Key"] = m.group(1)
    return h


def _request(method: str, path: str, *, token: str | None = None, **kwargs):
    url = urljoin(_api_base() + "/", path.lstrip("/"))
    headers = dict(_headers())
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.request(method, url, headers=headers, timeout=TIMEOUT, **kwargs)


def _credentials():
    body = _read("/app/memory/test_credentials.md")
    email = re.search(r"Email:\s*([^\s]+)", body)
    pw = re.search(r"Password:\s*([^\s]+)", body)
    if not email or not pw:
        pytest.skip("Test credentials missing in /app/memory/test_credentials.md")
    return email.group(1).strip(), pw.group(1).strip()


class TestIssue53LiveReadonly:
    # Config/source checks for live integration parity.
    def test_mobile_source_uses_live_api_host(self):
        assert _api_base() == "https://api.themegaradio.com"

    # Public read-only countries/genres payload checks used by companion catalog sync.
    def test_filters_countries_returns_string_selectors(self):
        response = _request("GET", "/api/filters/countries")
        assert response.status_code == 200, response.text[:300]
        payload = response.json()
        countries = payload if isinstance(payload, list) else payload.get("countries")
        assert isinstance(countries, list)
        assert len(countries) > 0
        assert all(isinstance(c, str) and c.strip() and len(c.strip()) >= 2 for c in countries[:25])

    # Tag/genre contract sanity so watch request_data routes can use real selectors.
    def test_genre_filter_returns_items(self):
        response = _request("GET", "/api/stations", params={"genre": "jazz", "limit": 5})
        assert response.status_code == 200, response.text[:300]
        data = response.json()
        stations = data if isinstance(data, list) else data.get("stations") or data.get("data") or []
        assert isinstance(stations, list)
        assert len(stations) > 0
        first = stations[0]
        assert isinstance(first, dict)
        assert first.get("name")

    # Auth session verification for TV/MAS preflight behavior.
    def test_tv_verify_without_token_is_rejected(self):
        response = _request("GET", "/api/auth/tv/verify")
        assert response.status_code in (401, 403)

    # Read-only login + subscription shape snapshot (no payment mutation calls).
    def test_login_and_get_subscription_shape(self):
        email, password = _credentials()
        login = _request(
            "POST",
            "/api/auth/mobile/login",
            json={"email": email, "password": password},
        )
        if login.status_code != 200:
            pytest.skip(f"Login failed for provided readonly account: {login.status_code}")

        body = login.json() if login.headers.get("content-type", "").startswith("application/json") else {}
        token = body.get("token")
        if not token:
            pytest.skip("Login response did not include token")

        verify = _request("GET", "/api/auth/tv/verify", token=token)
        assert verify.status_code == 200, verify.text[:300]

        sub = _request("GET", "/api/user/subscription", token=token)
        assert sub.status_code == 200, sub.text[:300]
        data = sub.json()
        assert isinstance(data, dict)
        assert any(k in data for k in ("isActive", "plan", "success", "subscription"))
