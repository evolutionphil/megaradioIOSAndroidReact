"""
Backend API Tests for MegaRadio - Radio Stream Issues
Tests for: Energy NRJ Wien station, now-playing metadata, artwork URLs, stream proxy

Test Scenarios:
1. Energy NRJ Wien station - stream resolution and proxy functionality
2. Now-playing metadata API endpoint
3. Lock screen artwork/logo URL resolution
4. HTTP to HTTPS stream proxy functionality
"""
import pytest
import requests
import os
from urllib.parse import quote

# Backend URLs
MEGARADIO_API = "https://themegaradio.com"
LOCAL_BACKEND = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://megaradio-crash-fix.preview.emergentagent.com').rstrip('/')

# Test stations
ENERGY_NRJ_WIEN = {
    "slug": "energy-nrj-wien",
    "id": "68a8c46dbd66579311aafa1f",
    "name": "Energy NRJ Wien"
}

# Other stations for comparison
TEST_STATIONS = [
    {"id": "68a8c47dbd66579311ab228c", "name": "Station 1"},
    {"id": "68a8c46abd66579311aaf265", "name": "Dance Wave"},
    {"id": "68a8c496bd66579311ab6165", "name": "REYFM"},
]


class TestEnergyNRJWienStation:
    """Test Energy NRJ Wien specific issues - plays on web but not in app"""
    
    def test_station_exists_by_slug(self):
        """Energy NRJ Wien should be accessible by slug"""
        response = requests.get(
            f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}"
        )
        
        assert response.status_code == 200, f"Station not found: {response.status_code}"
        data = response.json()
        
        assert data.get('name') == ENERGY_NRJ_WIEN['name'], f"Name mismatch: {data.get('name')}"
        assert data.get('_id') == ENERGY_NRJ_WIEN['id'], f"ID mismatch: {data.get('_id')}"
        
        print(f"✓ Station found: {data.get('name')} (ID: {data.get('_id')})")
    
    def test_station_has_valid_stream_url(self):
        """Energy NRJ Wien should have a valid stream URL"""
        response = requests.get(
            f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        url = data.get('url')
        url_resolved = data.get('url_resolved')
        
        # At least one URL should exist
        stream_url = url_resolved or url
        assert stream_url is not None, "Station has no stream URL"
        assert stream_url.startswith('http'), f"Invalid URL format: {stream_url}"
        
        # Check if HTTPS (direct) or HTTP (needs proxy)
        is_https = stream_url.startswith('https://')
        print(f"✓ Stream URL: {stream_url}")
        print(f"✓ Protocol: {'HTTPS (direct)' if is_https else 'HTTP (needs proxy)'}")
        
        return stream_url
    
    def test_stream_resolution_api(self):
        """Stream resolution API should work for Energy NRJ Wien"""
        # First get station URL
        station_response = requests.get(
            f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}"
        )
        assert station_response.status_code == 200
        station_data = station_response.json()
        
        stream_url = station_data.get('url_resolved') or station_data.get('url')
        assert stream_url is not None
        
        # Test stream resolution
        resolve_response = requests.get(
            f"{MEGARADIO_API}/api/stream/resolve",
            params={'url': stream_url}
        )
        
        assert resolve_response.status_code == 200, f"Stream resolution failed: {resolve_response.status_code}"
        resolve_data = resolve_response.json()
        
        # Verify response structure
        assert 'candidates' in resolve_data, "Missing 'candidates' in response"
        assert len(resolve_data['candidates']) > 0, "No stream candidates found"
        
        resolved_url = resolve_data['candidates'][0]
        print(f"✓ Original URL: {stream_url}")
        print(f"✓ Resolved URL: {resolved_url}")
        print(f"✓ Playlist Type: {resolve_data.get('playlistType')}")
        
        return resolved_url
    
    def test_stream_url_is_https(self):
        """Verify stream URL protocol - HTTPS can be direct, HTTP needs proxy"""
        station_response = requests.get(
            f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}"
        )
        assert station_response.status_code == 200
        station_data = station_response.json()
        
        stream_url = station_data.get('url_resolved') or station_data.get('url')
        
        # Test stream resolution to get final URL
        resolve_response = requests.get(
            f"{MEGARADIO_API}/api/stream/resolve",
            params={'url': stream_url}
        )
        assert resolve_response.status_code == 200
        resolve_data = resolve_response.json()
        
        final_url = resolve_data['candidates'][0] if resolve_data['candidates'] else stream_url
        
        if final_url.startswith('https://'):
            print(f"✓ Stream is HTTPS - can be played directly")
        else:
            print(f"⚠ Stream is HTTP - requires proxy for React Native")
            # Test proxy URL construction
            proxy_url = f"{MEGARADIO_API}/api/stream/{quote(final_url, safe='')}"
            print(f"✓ Proxy URL would be: {proxy_url}")
    
    def test_station_artwork_urls(self):
        """Test artwork/logo URLs for lock screen display"""
        response = requests.get(
            f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        logo = data.get('logo')
        favicon = data.get('favicon')
        
        print(f"✓ Logo: {logo}")
        print(f"✓ Favicon: {favicon}")
        
        # At least one image should exist
        artwork_url = logo or favicon
        if artwork_url is None:
            print("⚠ WARNING: No artwork URL found - lock screen will use default")
        else:
            # Verify artwork URL is valid
            if artwork_url.startswith('/'):
                # Relative URL - needs base URL prepended
                artwork_url = f"https://themegaradio.com{artwork_url}"
                print(f"✓ Full artwork URL: {artwork_url}")
            
            # Check if HTTPS
            if artwork_url.startswith('http://'):
                print(f"⚠ WARNING: Artwork URL is HTTP, should be converted to HTTPS")
                artwork_url = artwork_url.replace('http://', 'https://')
                print(f"✓ HTTPS artwork URL: {artwork_url}")
            
            # Try to fetch artwork
            try:
                artwork_response = requests.head(artwork_url, timeout=5)
                if artwork_response.status_code == 200:
                    print(f"✓ Artwork URL is accessible")
                else:
                    print(f"⚠ WARNING: Artwork URL returned {artwork_response.status_code}")
            except Exception as e:
                print(f"⚠ WARNING: Could not verify artwork URL: {e}")


class TestNowPlayingAPI:
    """Test /api/now-playing/{station_id} endpoint for song info"""
    
    def test_now_playing_for_energy_nrj_wien(self):
        """Test now-playing metadata for Energy NRJ Wien"""
        response = requests.get(
            f"{LOCAL_BACKEND}/api/now-playing/{ENERGY_NRJ_WIEN['id']}"
        )
        
        assert response.status_code == 200, f"Now-playing failed: {response.status_code}"
        data = response.json()
        
        # Verify structure
        assert 'station_id' in data, "Missing station_id"
        assert data['station_id'] == ENERGY_NRJ_WIEN['id'], "Station ID mismatch"
        
        print(f"✓ Station ID: {data.get('station_id')}")
        print(f"✓ Title: {data.get('title')}")
        print(f"✓ Artist: {data.get('artist')}")
        print(f"✓ Song: {data.get('song')}")
        print(f"✓ Artwork: {data.get('artwork')}")
        
        # Check if we got actual song info or just fallback
        title = data.get('title')
        if title in ['Live Radio', 'Unknown', None, '']:
            print("⚠ WARNING: Only fallback title - ICY metadata not extracted")
        elif title and ' - ' in str(title):
            print("✓ Appears to have 'Artist - Song' format from ICY metadata")
        else:
            # May be genre as fallback
            print(f"✓ Title appears to be genre fallback: {title}")
    
    def test_now_playing_external_metadata_api(self):
        """Test themegaradio.com's metadata API for comparison"""
        response = requests.get(
            f"{MEGARADIO_API}/api/stations/{ENERGY_NRJ_WIEN['id']}/metadata"
        )
        
        assert response.status_code == 200, f"External metadata failed: {response.status_code}"
        data = response.json()
        
        print(f"✓ External API Response: {data}")
        
        metadata = data.get('metadata', {})
        if metadata:
            print(f"✓ Has metadata: {metadata}")
        else:
            print("⚠ External API also returns empty metadata")
    
    def test_now_playing_response_has_required_fields(self):
        """Verify now-playing response structure"""
        response = requests.get(
            f"{LOCAL_BACKEND}/api/now-playing/{ENERGY_NRJ_WIEN['id']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields per NowPlayingResponse model
        required_fields = ['station_id', 'timestamp']
        optional_fields = ['title', 'artist', 'song', 'album', 'artwork']
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ All required fields present: {required_fields}")
        print(f"✓ Optional fields: {[f for f in optional_fields if data.get(f)]}")
    
    def test_now_playing_multiple_stations(self):
        """Test now-playing for multiple stations"""
        results = []
        
        # Test Energy NRJ Wien + other stations
        all_stations = [ENERGY_NRJ_WIEN] + TEST_STATIONS
        
        for station in all_stations:
            response = requests.get(
                f"{LOCAL_BACKEND}/api/now-playing/{station['id']}"
            )
            
            assert response.status_code == 200, f"Failed for {station['name']}: {response.status_code}"
            data = response.json()
            
            results.append({
                'name': station['name'],
                'title': data.get('title'),
                'artist': data.get('artist'),
                'song': data.get('song'),
            })
        
        print("\n✓ Now-Playing Results:")
        for r in results:
            print(f"  - {r['name']}: '{r['title']}' by '{r['artist']}' (Song: {r['song']})")


class TestStreamProxyFunctionality:
    """Test HTTP to HTTPS proxy for mixed content issues"""
    
    def test_proxy_url_construction(self):
        """Verify proxy URL format is correct"""
        test_url = "http://example.com/stream"
        encoded_url = quote(test_url, safe='')
        proxy_url = f"{MEGARADIO_API}/api/stream/{encoded_url}"
        
        print(f"✓ Original URL: {test_url}")
        print(f"✓ Encoded URL: {encoded_url}")
        print(f"✓ Proxy URL: {proxy_url}")
        
        assert encoded_url in proxy_url, "Encoded URL not in proxy URL"
    
    def test_proxy_endpoint_exists(self):
        """Verify proxy endpoint returns proper response"""
        # Use a known working test URL
        test_url = "https://example.com"
        encoded_url = quote(test_url, safe='')
        proxy_url = f"{MEGARADIO_API}/api/stream/{encoded_url}"
        
        response = requests.head(proxy_url, timeout=5, allow_redirects=True)
        # Should return something (200, 302, etc.) not 404
        assert response.status_code != 404, f"Proxy endpoint not found: {response.status_code}"
        
        print(f"✓ Proxy endpoint exists, status: {response.status_code}")


class TestArtworkURLResolution:
    """Test artwork URL resolution for lock screen display"""
    
    def test_artwork_url_formats(self):
        """Test different artwork URL scenarios"""
        # Get station data
        response = requests.get(
            f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}"
        )
        assert response.status_code == 200
        data = response.json()
        
        logo = data.get('logo')
        favicon = data.get('favicon')
        
        # Test URL resolution logic (as per AudioProvider.tsx)
        def resolve_artwork(station_data):
            artwork_url = 'https://themegaradio.com/logo.png'  # Default
            
            logo = station_data.get('logo')
            favicon = station_data.get('favicon')
            
            if logo and logo.startswith('http'):
                artwork_url = logo
            elif favicon and favicon.startswith('http'):
                artwork_url = favicon
            elif logo and logo.startswith('/'):
                artwork_url = f'https://themegaradio.com{logo}'
            
            # Convert HTTP to HTTPS
            if artwork_url.startswith('http://'):
                artwork_url = artwork_url.replace('http://', 'https://')
            
            return artwork_url
        
        resolved_url = resolve_artwork(data)
        print(f"✓ Logo: {logo}")
        print(f"✓ Favicon: {favicon}")
        print(f"✓ Resolved artwork URL: {resolved_url}")
        
        # Verify HTTPS
        assert resolved_url.startswith('https://'), f"Artwork URL not HTTPS: {resolved_url}"
        
        # Verify accessible
        try:
            response = requests.head(resolved_url, timeout=5)
            print(f"✓ Artwork URL status: {response.status_code}")
        except Exception as e:
            print(f"⚠ WARNING: Could not verify artwork: {e}")


class TestLocalBackendHealth:
    """Test local backend server health"""
    
    def test_root_endpoint(self):
        """Root API should return Hello World"""
        response = requests.get(f"{LOCAL_BACKEND}/api/")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('message') == 'Hello World'
        
        print(f"✓ Backend healthy: {data}")
    
    def test_status_endpoint(self):
        """Status endpoint should work"""
        response = requests.get(f"{LOCAL_BACKEND}/api/status")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Status endpoint returned {len(data)} items")


class TestICYMetadataExtraction:
    """Test ICY metadata extraction from streams"""
    
    def test_now_playing_attempts_icy_extraction(self):
        """Verify backend attempts to extract ICY metadata"""
        # This tests the flow - backend should try ICY then fallback
        response = requests.get(
            f"{LOCAL_BACKEND}/api/now-playing/{ENERGY_NRJ_WIEN['id']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If we got artist or song separately, ICY parsing worked
        has_parsed_icy = bool(data.get('song') or (data.get('artist') and data.get('artist') != data.get('title')))
        
        if has_parsed_icy:
            print(f"✓ ICY metadata successfully parsed:")
            print(f"  Artist: {data.get('artist')}")
            print(f"  Song: {data.get('song')}")
        else:
            print(f"✓ Using fallback metadata (ICY not available or parsing failed):")
            print(f"  Title: {data.get('title')}")
            print(f"  Artist: {data.get('artist')}")
        
        # Either way, we should have some title
        assert data.get('title') or data.get('artist'), "No metadata at all"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
