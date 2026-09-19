"""Issue51 live read-only API checks (no mutations)."""

import os
import re
from urllib.parse import urljoin

import pytest
import requests


TIMEOUT = 25


def _read_text(path: str) -> str:
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as fp:
        return fp.read()


def _configured_api_base() -> str:
    """Resolve the actual mobile client API base from app source code."""
    constants_src = _read_text("/app/frontend/src/constants/api.ts")
    m = re.search(r"API_BASE_URL\s*=\s*['\"]([^'\"]+)['\"]", constants_src)
    if m:
        return m.group(1).rstrip("/")

    # Fallback only to explicit runtime env value if source constant is absent.
    direct = os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if direct:
        return direct.rstrip("/")

    pytest.skip("Unable to resolve API base URL from app source or environment")


def _configured_public_headers() -> dict:
    """Mirror public client headers used by app source for live readonly checks."""
    headers = {"Content-Type": "application/json"}

    api_src = _read_text("/app/frontend/src/services/api.ts")
    m = re.search(r"MEGARADIO_API_KEY\s*=\s*['\"]([^'\"]+)['\"]", api_src)
    if m:
        headers["X-API-Key"] = m.group(1)

    return headers


def _get(path: str, params=None):
    base = _configured_api_base()
    headers = _configured_public_headers()
    url = urljoin(base + "/", path.lstrip("/"))
    res = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
    assert res.status_code == 200, f"{url} -> {res.status_code}, body={res.text[:240]}"
    return res.json(), res


def _profiles(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            return payload["data"]
        if isinstance(payload.get("users"), list):
            return payload["users"]
    return []


class TestIssue51LiveReadonly:
    """Community/public profile pagination semantics and profile readability."""

    # Ensure tests are hitting the same origin currently configured by app source.
    def test_configured_api_base_is_live_mobile_origin(self):
        assert _configured_api_base() == "https://api.themegaradio.com"

    # publicDirectoryService + usePublicDirectory read-only semantics
    def test_public_profiles_limit_cap_is_100(self):
        p100, _ = _get("/api/public-profiles", {"limit": 100})
        p200, _ = _get("/api/public-profiles", {"limit": 200})
        p500, _ = _get("/api/public-profiles", {"limit": 500})

        l100 = _profiles(p100)
        l200 = _profiles(p200)
        l500 = _profiles(p500)

        assert len(l100) == 100
        assert len(l200) == 100
        assert len(l500) == 100

    # publicDirectoryService pagination fallback behavior on repeated pages
    def test_public_profiles_page2_offset_skip_repeat_page1(self):
        page1, _ = _get("/api/public-profiles", {"page": 1, "limit": 100})
        page2, _ = _get("/api/public-profiles", {"page": 2, "limit": 100})
        offset, _ = _get("/api/public-profiles", {"offset": 100, "limit": 100})
        skip, _ = _get("/api/public-profiles", {"skip": 100, "limit": 100})

        a = _profiles(page1)
        b = _profiles(page2)
        c = _profiles(offset)
        d = _profiles(skip)

        ids_a = [u.get("_id") for u in a if isinstance(u, dict)]
        ids_b = [u.get("_id") for u in b if isinstance(u, dict)]
        ids_c = [u.get("_id") for u in c if isinstance(u, dict)]
        ids_d = [u.get("_id") for u in d if isinstance(u, dict)]

        assert len(ids_a) == 100
        assert ids_b == ids_a
        assert ids_c == ids_a
        assert ids_d == ids_a

    # normalizeDirectory/private exclusion expectation against live payload shape
    def test_public_profiles_payload_not_explicit_private(self):
        payload, _ = _get("/api/public-profiles", {"limit": 100})
        profiles = _profiles(payload)
        assert len(profiles) > 0
        assert all(p.get("_id") for p in profiles if isinstance(p, dict))
        assert all((p.get("isPublicProfile") is not False) for p in profiles if isinstance(p, dict))

    # profileShare/open-link requirement: user-profile endpoint supports id lookup
    def test_user_profile_readable_by_id(self):
        payload, _ = _get("/api/public-profiles", {"limit": 100})
        profiles = _profiles(payload)
        user_id = next((p.get("_id") for p in profiles if isinstance(p, dict) and p.get("_id")), None)
        assert user_id, "No public profile id found"

        data, _ = _get(f"/api/user-profile/{user_id}")
        assert isinstance(data, dict)
        assert (data.get("_id") == user_id) or (data.get("id") == user_id)

    # Native association files are external website assets: verify live observed values.
    def test_live_aasa_contains_visiongo_identifier(self):
        res = requests.get("https://themegaradio.com/.well-known/apple-app-site-association", timeout=TIMEOUT)
        assert res.status_code == 200, f"AASA status={res.status_code}"
        payload = res.json()
        details = (((payload or {}).get("applinks") or {}).get("details") or [])
        app_ids = [item.get("appID") for item in details if isinstance(item, dict)]
        assert "M6T85HP76P.com.visiongo.megaradio" in app_ids

    # External blocker tracking: assetlinks still points to com.visiongo.megaradio.
    def test_live_assetlinks_currently_not_com_megaradio(self):
        res = requests.get("https://themegaradio.com/.well-known/assetlinks.json", timeout=TIMEOUT)
        assert res.status_code == 200, f"assetlinks status={res.status_code}"
        payload = res.json()
        assert isinstance(payload, list)
        pkgs = [((item or {}).get("target") or {}).get("package_name") for item in payload if isinstance(item, dict)]
        assert "com.visiongo.megaradio" in pkgs
