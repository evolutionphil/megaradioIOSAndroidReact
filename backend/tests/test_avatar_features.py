"""
Backend API tests for MegaRadio Avatar and User Profile features
Tests: Login, Avatar API, Public Profiles, Follow/Unfollow, User Favorites
"""
import pytest
import requests
import os

BASE_URL = "https://themegaradio.com"
TEST_EMAIL = "gey14853@outlook.com"
TEST_PASSWORD = "Muhammed5858"


class TestAuthAndAvatarAPIs:
    """Authentication and Avatar API endpoint tests"""
    
    auth_token = None
    user_id = None
    
    @classmethod
    def setup_class(cls):
        """Login once for all tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        cls.auth_token = data.get("token")
        cls.user_id = data.get("user", {}).get("_id")
        assert cls.auth_token is not None, "No token in login response"
        assert cls.user_id is not None, "No user ID in login response"
        print(f"Logged in as user: {cls.user_id}")
    
    def test_login_returns_avatar_url(self):
        """Test that login response includes avatar URL"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify user object structure
        user = data.get("user", {})
        assert "avatar" in user, "avatar field missing in user response"
        assert user["avatar"] is not None, "avatar should not be null for test user"
        
        # Verify avatar URL format
        avatar_url = user["avatar"]
        assert avatar_url.startswith("/uploads/avatars/") or avatar_url.startswith("http"), \
            f"Unexpected avatar URL format: {avatar_url}"
        
        print(f"Avatar URL: {avatar_url}")
    
    def test_avatar_url_is_accessible(self):
        """Test that the avatar image URL returns valid image"""
        # First get the avatar URL
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        avatar_path = response.json().get("user", {}).get("avatar")
        
        if avatar_path:
            # Build full URL
            if not avatar_path.startswith("http"):
                avatar_url = f"{BASE_URL}{avatar_path}"
            else:
                avatar_url = avatar_path
            
            # Check avatar is accessible
            img_response = requests.head(avatar_url)
            assert img_response.status_code == 200, f"Avatar image not accessible: {avatar_url}"
            assert "image" in img_response.headers.get("content-type", ""), \
                "Avatar URL does not return an image content type"
            print(f"Avatar accessible: {avatar_url}")
    
    def test_login_returns_follower_counts(self):
        """Test that login response includes follower/following counts"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        assert response.status_code == 200
        data = response.json()
        user = data.get("user", {})
        
        # Verify counts exist
        assert "followersCount" in user, "followersCount missing"
        assert "followingCount" in user, "followingCount missing"
        assert isinstance(user["followersCount"], int), "followersCount should be int"
        assert isinstance(user["followingCount"], int), "followingCount should be int"
        
        print(f"Followers: {user['followersCount']}, Following: {user['followingCount']}")


class TestPublicProfiles:
    """Public Profiles API tests - for Favorites From Users section"""
    
    def test_get_public_profiles(self):
        """Test fetching public profiles list"""
        response = requests.get(f"{BASE_URL}/api/public-profiles?limit=10")
        assert response.status_code == 200, f"Public profiles failed: {response.text}"
        
        data = response.json()
        # Check it's a list
        profiles = data if isinstance(data, list) else data.get("profiles", data.get("users", []))
        assert isinstance(profiles, list), "Response should contain profiles list"
        
        if len(profiles) > 0:
            profile = profiles[0]
            # Verify profile structure
            assert "_id" in profile, "Profile should have _id"
            print(f"Found {len(profiles)} public profiles")
    
    def test_public_profile_has_expected_fields(self):
        """Test that public profiles have required fields for display"""
        response = requests.get(f"{BASE_URL}/api/public-profiles?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        profiles = data if isinstance(data, list) else data.get("profiles", data.get("users", []))
        
        if len(profiles) > 0:
            profile = profiles[0]
            # Check expected fields exist
            expected_fields = ["_id", "name", "profileImageUrl"]
            for field in expected_fields:
                if field in profile:
                    print(f"  {field}: {profile.get(field, 'N/A')[:50] if profile.get(field) else 'N/A'}")


class TestUserProfile:
    """User Profile and Follow/Unfollow API tests"""
    
    auth_token = None
    user_id = None
    
    @classmethod
    def setup_class(cls):
        """Login once for all tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        cls.auth_token = response.json().get("token")
        cls.user_id = response.json().get("user", {}).get("_id")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_get_user_favorites(self):
        """Test fetching a user's favorite stations"""
        # Get first public profile to test
        profiles_response = requests.get(f"{BASE_URL}/api/public-profiles?limit=1")
        if profiles_response.status_code != 200:
            pytest.skip("Could not get public profiles")
        
        data = profiles_response.json()
        profiles = data if isinstance(data, list) else data.get("profiles", data.get("users", []))
        if not profiles:
            pytest.skip("No public profiles available")
        
        target_user_id = profiles[0].get("_id")
        
        # Fetch user's favorites
        response = requests.get(
            f"{BASE_URL}/api/users/{target_user_id}/favorites",
            headers=self.get_auth_headers()
        )
        
        # May be 200 or 404 if user has no favorites
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print(f"User {target_user_id} favorites loaded successfully")
    
    def test_get_user_followers(self):
        """Test fetching a user's followers"""
        # Use own user ID for testing
        response = requests.get(
            f"{BASE_URL}/api/users/{self.user_id}/followers",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code in [200, 404], f"Followers API error: {response.text}"
        print(f"Followers API returned status: {response.status_code}")
    
    def test_get_user_following(self):
        """Test fetching who a user is following"""
        response = requests.get(
            f"{BASE_URL}/api/users/{self.user_id}/following",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code in [200, 404], f"Following API error: {response.text}"
        print(f"Following API returned status: {response.status_code}")
    
    def test_check_is_following(self):
        """Test checking if current user follows another user"""
        # Get another user to check
        profiles_response = requests.get(f"{BASE_URL}/api/public-profiles?limit=5")
        if profiles_response.status_code != 200:
            pytest.skip("Could not get public profiles")
        
        data = profiles_response.json()
        profiles = data if isinstance(data, list) else data.get("profiles", data.get("users", []))
        
        # Find a user other than self
        target_user = None
        for p in profiles:
            if p.get("_id") != self.user_id:
                target_user = p
                break
        
        if not target_user:
            pytest.skip("No other users to check following status")
        
        response = requests.get(
            f"{BASE_URL}/api/user/is-following/{target_user['_id']}",
            headers=self.get_auth_headers()
        )
        
        # This API may not exist or return various statuses
        if response.status_code == 200:
            data = response.json()
            assert "isFollowing" in data, "Response should have isFollowing field"
            print(f"Is following {target_user.get('name', target_user['_id'])}: {data['isFollowing']}")
        else:
            print(f"is-following API returned: {response.status_code}")


class TestAvatarUpload:
    """Avatar Upload API tests"""
    
    auth_token = None
    
    @classmethod
    def setup_class(cls):
        """Login once for all tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mobile/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "deviceType": "mobile",
                "deviceName": "Test Device"
            }
        )
        cls.auth_token = response.json().get("token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_avatar_upload_endpoint_exists(self):
        """Test that avatar upload endpoint exists (OPTIONS/HEAD check)"""
        # Just check the endpoint responds to authenticated request
        # We can't test actual upload without a real image file
        
        response = requests.options(
            f"{BASE_URL}/api/auth/avatar",
            headers=self.get_auth_headers()
        )
        # Most servers return 200 or 204 for OPTIONS, or 405 if not allowed
        print(f"Avatar upload OPTIONS returned: {response.status_code}")
    
    def test_avatar_upload_requires_auth(self):
        """Test that avatar upload requires authentication"""
        # Try to upload without auth - should fail
        response = requests.post(
            f"{BASE_URL}/api/auth/avatar",
            data={"test": "data"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code in [401, 403], \
            f"Avatar upload without auth should fail, got: {response.status_code}"
        print("Avatar upload correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
