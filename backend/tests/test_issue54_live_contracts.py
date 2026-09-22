"""Issue54 read-only live contract checks for countries/popular filters and subscription snapshot."""

import json
import os
import re
from pathlib import Path
from urllib.parse import urljoin

import pytest
import requests


TIMEOUT = 25
KNOWN_COUNTRY_NAMES = ("Germany", "United Kingdom", "Turkey")
SENSITIVE_KEYS = {
    "token", "email", "user", "user_id", "userid", "receipt", "purchaseToken",
    "authorization", "jwt", "accessToken", "refreshToken",
}
ALLOWLIST = {
    "success", "plan", "isActive", "expiryDate", "features", "subscription",
    "platform", "provider", "entitlements",
}


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
    pytest.skip("API_BASE_URL not found in frontend/src/constants/api.ts")


def _headers() -> dict:
    creds = _read("/app/memory/test_credentials.md")
    key = re.search(r"X-API-Key:\s*([^\s]+)", creds)
    headers = {"Content-Type": "application/json"}
    if key:
        headers["X-API-Key"] = key.group(1).strip()
    return headers


def _request(method: str, path: str, *, token: str | None = None, **kwargs):
    url = urljoin(_api_base() + "/", path.lstrip("/"))
    headers = dict(_headers())
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.request(method, url, headers=headers, timeout=TIMEOUT, **kwargs)


def _credentials() -> tuple[str, str]:
    body = _read("/app/memory/test_credentials.md")
    email = re.search(r"Standard Test User\s*-\s*Email:\s*([^\s]+)", body, re.MULTILINE)
    password = re.search(r"Standard Test User[\s\S]*?-\s*Password:\s*([^\s]+)", body, re.MULTILINE)
    if not email or not password:
        # Fallback for compact credential docs
        email = re.search(r"Email:\s*([^\s]+)", body)
        password = re.search(r"Password:\s*([^\s]+)", body)
    if not email or not password:
        pytest.skip("Test credentials missing in /app/memory/test_credentials.md")
    return email.group(1).strip(), password.group(1).strip()


def _station_list(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return payload.get("stations") or payload.get("data") or []
    return []


def _sanitize_subscription(data):
    if isinstance(data, dict):
        clean = {}
        for key, value in data.items():
            if key in ALLOWLIST:
                clean[key] = _sanitize_subscription(value)
        return clean
    if isinstance(data, list):
        return [_sanitize_subscription(item) for item in data]
    return data


class TestIssue54LiveContracts:
    # Live countries/public catalog contract checks for watch/wear name selectors.
    def test_countries_include_known_names(self):
        response = _request("GET", "/api/filters/countries")
        assert response.status_code == 200, response.text[:300]
        payload = response.json()
        countries = payload if isinstance(payload, list) else payload.get("countries")
        assert isinstance(countries, list)
        normalized = {str(c).strip().lower() for c in countries if isinstance(c, str)}
        assert any(name.lower() in normalized for name in KNOWN_COUNTRY_NAMES), normalized

    # Live station contract checks for country-filter consistency and genre endpoint sanity.
    def test_country_filter_consistency_and_genre_contract(self):
        country_hit = False
        for country_name in KNOWN_COUNTRY_NAMES:
            response = _request("GET", "/api/stations/popular", params={"country": country_name, "limit": 15})
            if response.status_code != 200:
                continue
            stations = _station_list(response.json())
            if not stations:
                continue
            country_hit = True
            for station in stations:
                assert isinstance(station, dict)
                station_country = station.get("country")
                assert isinstance(station_country, str) and station_country.strip(), "Station country is missing"
                assert country_name.lower() in station_country.lower(), (
                    f"Country filter mismatch: expected '{country_name}', got '{station_country}'"
                )
            if country_hit:
                break
        assert country_hit, "No non-empty /api/stations/popular country response for known test countries"

        genre_response = _request("GET", "/api/stations", params={"genre": "jazz", "limit": 15})
        assert genre_response.status_code == 200, genre_response.text[:300]
        genre_stations = _station_list(genre_response.json())
        assert isinstance(genre_stations, list)
        assert len(genre_stations) > 0
        assert all(isinstance(item, dict) and item.get("name") for item in genre_stations), (
            "Genre response should return station-like objects"
        )

        # Validate genre semantics only when backend includes tags/genres fields.
        stations_with_genre_fields = []
        for station in genre_stations:
            values = []
            tags = station.get("tags")
            genres = station.get("genres")
            if isinstance(tags, list):
                values.extend(str(v).lower() for v in tags)
            elif isinstance(tags, str):
                values.extend(part.strip().lower() for part in tags.split(",") if part.strip())
            if isinstance(genres, list):
                values.extend(str(v).lower() for v in genres)
            elif isinstance(genres, str):
                values.extend(part.strip().lower() for part in genres.split(",") if part.strip())
            if values:
                stations_with_genre_fields.append(values)

        if stations_with_genre_fields:
            assert any("jazz" in values for values in stations_with_genre_fields), (
                "Genre fields present but none include requested 'jazz'"
            )

    # Read-only auth + sanitized subscription response artifact for README mapping.
    def test_subscription_snapshot_allowlisted_artifact(self):
        email, password = _credentials()
        login = _request("POST", "/api/auth/mobile/login", json={"email": email, "password": password})
        if login.status_code != 200:
            pytest.skip(f"Readonly login failed for provided account: {login.status_code}")
        login_data = login.json() if "application/json" in login.headers.get("content-type", "") else {}
        token = login_data.get("token")
        if not token:
            pytest.skip("Login did not return token")

        sub = _request("GET", "/api/user/subscription", token=token)
        assert sub.status_code == 200, sub.text[:300]
        raw = sub.json()
        sanitized = _sanitize_subscription(raw)
        assert isinstance(sanitized, dict)
        assert len(sanitized.keys()) > 0

        dumped = json.dumps(sanitized, ensure_ascii=False)
        for key in SENSITIVE_KEYS:
            assert key not in dumped, f"sanitized snapshot leaks sensitive field: {key}"

        out_dir = Path("/app/test_reports/artifacts_iter55")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "subscription_snapshot_sanitized.json"
        out_file.write_text(json.dumps(sanitized, indent=2, ensure_ascii=False), encoding="utf-8")
        assert out_file.exists()
