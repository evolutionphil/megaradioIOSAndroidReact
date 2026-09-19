"""Read-only live API checks against https://api.themegaradio.com (GET only)."""

import requests


BASE_URL = "https://api.themegaradio.com"
TIMEOUT = 25


def _get(path: str, params=None):
    response = requests.get(f"{BASE_URL}{path}", params=params, timeout=TIMEOUT)
    assert response.status_code == 200, f"{path} -> {response.status_code}, body={response.text[:240]}"
    return response.json()


def _extract_stations(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("stations", "data", "items", "results"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def _extract_genres(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("genres", "data", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


class TestLiveApiReadonly:
    """Core mobile/tv read-only API shape validation."""

    def test_tv_init_country_germany(self):
        data = _get("/api/tv/init", {"country": "Germany"})
        assert isinstance(data, dict)
        assert any(k in data for k in ("popular", "popularStations", "stations", "genres", "home"))

    def test_popular_stations_shape(self):
        data = _get("/api/stations/popular", {"country": "Germany", "limit": 10})
        stations = _extract_stations(data)
        assert isinstance(stations, list)
        assert len(stations) > 0
        sample = stations[0]
        assert isinstance(sample, dict)
        assert any(k in sample for k in ("_id", "id"))
        assert "name" in sample

    def test_stations_search_and_filters(self):
        search_data = _get("/api/stations", {"search": "jazz", "limit": 10})
        search_stations = _extract_stations(search_data)
        assert isinstance(search_stations, list)

        tag_data = _get("/api/stations", {"tag": "jazz", "limit": 20})
        genre_data = _get("/api/stations", {"genre": "jazz", "limit": 20})
        tag_stations = _extract_stations(tag_data)
        genre_stations = _extract_stations(genre_data)

        # Both endpoints should be live and responsive.
        assert isinstance(tag_stations, list)
        assert isinstance(genre_stations, list)
        assert len(genre_stations) > 0

        # Evidence output for known production behavior analysis.
        def jazz_ratio(stations):
            if not stations:
                return 0.0
            hits = 0
            for st in stations:
                tags = (st.get("tags") or "").lower()
                genre = (st.get("genre") or "").lower()
                genres = ",".join(st.get("genres") or []).lower() if isinstance(st.get("genres"), list) else ""
                if "jazz" in tags or "jazz" in genre or "jazz" in genres:
                    hits += 1
            return hits / len(stations)

        tag_ratio = jazz_ratio(tag_stations)
        genre_ratio = jazz_ratio(genre_stations)
        print(f"tag_ratio={tag_ratio:.2f}, genre_ratio={genre_ratio:.2f}, tag_count={len(tag_stations)}, genre_count={len(genre_stations)}")

    def test_genres_precomputed_and_genre_stations(self):
        genres_data = _get("/api/genres/precomputed", {"country": "Germany", "limit": 20})
        genres = _extract_genres(genres_data)
        assert isinstance(genres, list)
        assert len(genres) > 0

        slug = None
        for g in genres:
            maybe_name = (g.get("name") or "").strip().lower() if isinstance(g, dict) else ""
            maybe_slug = (g.get("slug") or "").strip().lower() if isinstance(g, dict) else ""
            if maybe_name == "jazz" or maybe_slug == "jazz":
                slug = "jazz"
                break
        if not slug:
            slug = "jazz"

        stations_data = _get(f"/api/genres/{slug}/stations", {"country": "Germany", "limit": 10})
        stations = _extract_stations(stations_data)
        assert isinstance(stations, list)

    def test_countries_now_playing_nearby(self):
        countries_data = _get("/api/filters/countries")
        countries = countries_data if isinstance(countries_data, list) else countries_data.get("countries", [])
        assert isinstance(countries, list)
        assert len(countries) > 0

        popular_data = _get("/api/stations/popular", {"limit": 5})
        popular = _extract_stations(popular_data)
        assert len(popular) > 0
        station_id = popular[0].get("_id") or popular[0].get("id")
        assert station_id

        now_playing = _get(f"/api/now-playing/{station_id}")
        assert isinstance(now_playing, dict)
        assert any(k in now_playing for k in ("title", "song", "artist", "station_id"))

        nearby_data = _get("/api/stations/nearby", {"lat": 0, "lng": 0, "radius": 100, "limit": 10})
        nearby_stations = _extract_stations(nearby_data)
        assert isinstance(nearby_stations, list)
