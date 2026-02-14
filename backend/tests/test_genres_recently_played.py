"""
Test suite for Genres API and Recently Played API
Tests: /api/genres, /api/genres/{slug}/stations, /api/recently-played
"""
import pytest
import requests
import os

BASE_URL = "https://themegaradio.com"
API_KEY = os.environ.get("MEGARADIO_API_KEY", "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw")
TEST_EMAIL = "gey14853@outlook.com"
TEST_PASSWORD = "Muhammed5858"


class TestGenresAPI:
    """Genres API endpoint tests"""

    def test_get_genres_returns_200(self):
        """Test GET /api/genres returns 200 with list of genres"""
        response = requests.get(
            f"{BASE_URL}/api/genres",
            params={"limit": 10},
            headers={"x-api-key": API_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "genres" in data or "data" in data
        genres = data.get("genres") or data.get("data")
        assert isinstance(genres, list)
        assert len(genres) > 0

    def test_get_genres_has_required_fields(self):
        """Test genres have required fields: name, slug, stationCount"""
        response = requests.get(
            f"{BASE_URL}/api/genres",
            params={"limit": 5},
            headers={"x-api-key": API_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        genres = data.get("genres") or data.get("data")
        
        for genre in genres:
            assert "name" in genre, f"Genre missing 'name': {genre}"
            assert "slug" in genre, f"Genre missing 'slug': {genre}"
            # Station count can be stationCount or total_stations
            assert "stationCount" in genre or "total_stations" in genre

    def test_get_genre_stations_pop(self):
        """Test GET /api/genres/pop/stations returns stations for Pop genre"""
        response = requests.get(
            f"{BASE_URL}/api/genres/pop/stations",
            params={"limit": 5},
            headers={"x-api-key": API_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stations are returned
        assert "stations" in data
        stations = data["stations"]
        assert isinstance(stations, list)
        assert len(stations) > 0

    def test_get_genre_stations_rock(self):
        """Test GET /api/genres/rock/stations returns stations for Rock genre"""
        response = requests.get(
            f"{BASE_URL}/api/genres/rock/stations",
            params={"limit": 5},
            headers={"x-api-key": API_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "stations" in data
        stations = data["stations"]
        assert isinstance(stations, list)
        assert len(stations) > 0

    def test_genre_stations_have_required_fields(self):
        """Test stations in genre have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/genres/pop/stations",
            params={"limit": 3},
            headers={"x-api-key": API_KEY}
        )
        assert response.status_code == 200
        stations = response.json()["stations"]
        
        for station in stations:
            assert "_id" in station, f"Station missing '_id'"
            assert "name" in station, f"Station missing 'name'"


class TestRecentlyPlayedAPI:
    """Recently Played API endpoint tests - requires authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile"
            },
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        )
        if response.status_code != 200:
            pytest.skip(f"Failed to authenticate: {response.status_code}")
        
        data = response.json()
        return data.get("token")

    def test_get_recently_played_without_auth_returns_401(self):
        """Test GET /api/recently-played without auth returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/recently-played",
            headers={"x-api-key": API_KEY}
        )
        assert response.status_code == 401
        data = response.json()
        assert "error" in data

    def test_post_recently_played_without_auth_returns_401(self):
        """Test POST /api/recently-played without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/recently-played",
            json={"stationId": "68a8c46dbd66579311aafbda"},
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        )
        assert response.status_code == 401
        data = response.json()
        assert "error" in data

    def test_get_recently_played_with_auth_returns_200(self, auth_token):
        """Test GET /api/recently-played with Bearer token returns stations"""
        response = requests.get(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "x-api-key": API_KEY
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response should be an array of stations
        assert isinstance(data, list)

    def test_post_recently_played_with_auth_syncs_station(self, auth_token):
        """Test POST /api/recently-played with Bearer token syncs station"""
        # Use Europa Plus station ID
        station_id = "68a8c46dbd66579311aafbda"
        
        response = requests.post(
            f"{BASE_URL}/api/recently-played",
            json={"stationId": station_id},
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True

    def test_get_recently_played_returns_synced_station(self, auth_token):
        """Test GET /api/recently-played returns previously synced station"""
        # First sync a station
        station_id = "68a8c46dbd66579311aafbda"
        requests.post(
            f"{BASE_URL}/api/recently-played",
            json={"stationId": station_id},
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        )
        
        # Then verify it's in the list
        response = requests.get(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "x-api-key": API_KEY
            }
        )
        assert response.status_code == 200
        stations = response.json()
        
        # Check if synced station is in the list
        station_ids = [s.get("_id") for s in stations]
        assert station_id in station_ids, "Synced station not found in recently played list"


class TestLoginAPI:
    """Login API tests to verify authentication flow"""

    def test_login_returns_valid_token(self):
        """Test login returns mrt_* JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile"
            },
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert data["token"].startswith("mrt_")
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL

    def test_login_invalid_credentials_returns_401(self):
        """Test login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": "wrongpassword",
                "deviceType": "mobile"
            },
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
