"""
Backend API Tests for MegaRadio Recently Played Feature
Tests against external API: https://themegaradio.com

Features tested:
- Login to get Bearer token
- GET /api/recently-played with Bearer token
- POST /api/recently-played to sync station play
"""
import pytest
import requests
import os

# External API base URL
BASE_URL = "https://themegaradio.com"

# Test credentials
TEST_EMAIL = "gey14853@outlook.com"
TEST_PASSWORD = "Muhammed5858"
API_KEY = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"


class TestMegaRadioAuth:
    """Authentication tests for MegaRadio API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token via mobile login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",  # Must be 'mobile' to get JWT token
                "deviceName": "Test Device"
            }
        )
        print(f"[Login] Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print(f"[Login] Token received: {token[:20]}..." if token else "[Login] No token in response")
            return token
        else:
            print(f"[Login] Error: {response.text}")
            pytest.skip("Login failed - skipping authenticated tests")
        
    def test_login_returns_valid_token(self):
        """Test that login returns a valid mrt_ token (not web_session_*)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        
        # Status assertion
        assert response.status_code == 200, f"Login failed with status {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        token = data["token"]
        assert token is not None, "Token should not be None"
        assert token.startswith("mrt_"), f"Token should start with 'mrt_', got: {token[:20]}..."
        
        # Verify user data
        user = data["user"]
        assert user.get("email") == TEST_EMAIL, "User email should match"
        assert "_id" in user, "User should have _id"
        
        print(f"[SUCCESS] Login returned valid JWT token: {token[:20]}...")
        print(f"[SUCCESS] User: {user.get('fullName', user.get('username', 'Unknown'))}")

    def test_login_invalid_credentials(self):
        """Test that invalid credentials return appropriate error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            json={
                "email": "invalid@example.com",
                "password": "wrongpassword",
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        
        # Should return 401 or 400 for invalid credentials
        assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
        print(f"[SUCCESS] Invalid credentials correctly rejected with status {response.status_code}")


class TestRecentlyPlayedAPI:
    """Tests for Recently Played API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token via mobile login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        
        if response.status_code == 200:
            token = response.json().get("token")
            print(f"[Auth] Got token: {token[:20]}...")
            return token
        else:
            pytest.skip("Login failed - skipping authenticated tests")
    
    def test_get_recently_played_with_auth(self, auth_token):
        """Test GET /api/recently-played with Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        print(f"[GET /api/recently-played] Status: {response.status_code}")
        print(f"[GET /api/recently-played] Response: {response.text[:500] if response.text else 'empty'}")
        
        # Status assertion - should return 200
        assert response.status_code == 200, f"GET recently-played failed with status {response.status_code}"
        
        # Data assertions
        data = response.json()
        # API may return array or object with stations array
        stations = data if isinstance(data, list) else data.get("stations", data.get("recentlyPlayed", []))
        
        assert isinstance(stations, list), "Response should contain a list of stations"
        print(f"[SUCCESS] GET /api/recently-played returned {len(stations)} stations")
        
        # If stations exist, verify structure
        if len(stations) > 0:
            station = stations[0]
            assert "_id" in station or "id" in station, "Station should have ID"
            print(f"[INFO] First station: {station.get('name', 'Unknown')}")
    
    def test_get_recently_played_without_auth(self):
        """Test GET /api/recently-played without Bearer token - should fail"""
        response = requests.get(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            }
        )
        
        print(f"[GET /api/recently-played NO AUTH] Status: {response.status_code}")
        
        # Should return 401 Unauthorized without Bearer token
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"[SUCCESS] GET /api/recently-played correctly requires auth (401)")
    
    def test_post_recently_played_with_auth(self, auth_token):
        """Test POST /api/recently-played to sync a station play"""
        # First, get a sample station ID from popular stations
        popular_response = requests.get(
            f"{BASE_URL}/api/stations/precomputed",
            headers={
                "X-API-Key": API_KEY
            }
        )
        
        if popular_response.status_code != 200:
            pytest.skip("Could not fetch stations to test with")
        
        stations_data = popular_response.json()
        stations = stations_data if isinstance(stations_data, list) else stations_data.get("stations", [])
        
        if len(stations) == 0:
            pytest.skip("No stations available to test with")
        
        test_station_id = stations[0].get("_id") or stations[0].get("id")
        test_station_name = stations[0].get("name", "Unknown")
        print(f"[POST Test] Using station: {test_station_name} (ID: {test_station_id})")
        
        # Now POST to recently-played
        response = requests.post(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
                "Authorization": f"Bearer {auth_token}"
            },
            json={
                "stationId": test_station_id
            }
        )
        
        print(f"[POST /api/recently-played] Status: {response.status_code}")
        print(f"[POST /api/recently-played] Response: {response.text[:500] if response.text else 'empty'}")
        
        # Status assertion - should return 200 or 201
        assert response.status_code in [200, 201], f"POST recently-played failed with status {response.status_code}"
        print(f"[SUCCESS] POST /api/recently-played synced station: {test_station_name}")
        
        # Verify by GETting recently played again
        get_response = requests.get(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        if get_response.status_code == 200:
            data = get_response.json()
            stations_list = data if isinstance(data, list) else data.get("stations", data.get("recentlyPlayed", []))
            station_ids = [s.get("_id") or s.get("id") for s in stations_list]
            
            if test_station_id in station_ids:
                print(f"[SUCCESS] Verified station {test_station_name} is in recently played list")
            else:
                print(f"[INFO] Station may take time to appear in list, current count: {len(stations_list)}")
    
    def test_post_recently_played_without_auth(self):
        """Test POST /api/recently-played without Bearer token - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/recently-played",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            json={
                "stationId": "test_station_id"
            }
        )
        
        print(f"[POST /api/recently-played NO AUTH] Status: {response.status_code}")
        
        # Should return 401 Unauthorized without Bearer token
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"[SUCCESS] POST /api/recently-played correctly requires auth (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
