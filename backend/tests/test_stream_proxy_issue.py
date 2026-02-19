"""
Test script to diagnose Energy NRJ Wien radio stream issues
Testing whether proxy is causing stream failures in React Native

CRITICAL FINDINGS:
1. iOS ATS (App Transport Security) settings NOT configured - HTTP streams blocked
2. Primary stream URL (scdn.nrjaudio.fm) often unreachable
3. urlResolved (streaming.nrjaudio.fm) works but not used as primary
4. Proxy endpoint returns 500 error
"""

import pytest
import requests
import os

# Use the main API endpoint
BASE_URL = "https://themegaradio.com"
ENERGY_NRJ_STATION_ID = "68a8c46dbd66579311aafa1f"
ENERGY_NRJ_SLUG = "energy-nrj-wien"

class TestStreamProxyIssue:
    """Test stream resolution and proxy for Energy NRJ Wien"""
    
    def test_get_station_data(self):
        """Verify Energy NRJ Wien station data is accessible"""
        response = requests.get(f"{BASE_URL}/api/station/{ENERGY_NRJ_SLUG}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("name") == "Energy NRJ Wien"
        assert "_id" in data
        
        # Check both URLs are present
        url = data.get("url", "")
        url_resolved = data.get("urlResolved", "")
        
        print(f"Station URL: {url}")
        print(f"Station URL Resolved: {url_resolved}")
        
        # Both should be HTTPS
        assert url.startswith("https://"), f"URL should be HTTPS: {url}"
        assert url_resolved.startswith("https://"), f"urlResolved should be HTTPS: {url_resolved}"
        
    def test_stream_resolution_api(self):
        """Test stream resolution API returns valid candidates"""
        stream_url = "https://scdn.nrjaudio.fm/adwz1/at/36001/mp3_128.mp3"
        response = requests.get(f"{BASE_URL}/api/stream/resolve", params={"url": stream_url})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "candidates" in data
        assert len(data["candidates"]) > 0
        assert data["playlistType"] == "direct"
        
        print(f"Resolved candidates: {data['candidates']}")
        
    def test_primary_stream_url_accessibility(self):
        """Test if primary stream URL is accessible - EXPECTED TO FAIL"""
        # This tests scdn.nrjaudio.fm which is often unreachable
        stream_url = "https://scdn.nrjaudio.fm/adwz1/at/36001/mp3_128.mp3"
        
        try:
            response = requests.head(stream_url, timeout=5, allow_redirects=True)
            print(f"Primary stream status: {response.status_code}")
            print(f"Primary stream headers: {dict(response.headers)}")
            # This might fail or work depending on DNS/network
            assert response.status_code in [200, 302, 301]
        except requests.exceptions.RequestException as e:
            # Expected: scdn.nrjaudio.fm often not reachable
            pytest.skip(f"Primary stream not accessible (expected): {e}")
            
    def test_urlresolved_stream_accessibility(self):
        """Test if urlResolved stream works - THIS SHOULD WORK"""
        # This tests streaming.nrjaudio.fm which works
        stream_url = "https://streaming.nrjaudio.fm/ouvfydoarp52"
        
        response = requests.head(stream_url, timeout=10, allow_redirects=True)
        
        assert response.status_code == 200
        assert "audio/mpeg" in response.headers.get("content-type", "")
        print(f"urlResolved stream status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        print(f"ICY-Name: {response.headers.get('icy-name')}")
        
    def test_proxy_endpoint_returns_error(self):
        """Test proxy endpoint - EXPECTED TO FAIL (500 error)"""
        # The proxy endpoint on themegaradio.com returns 500
        import urllib.parse
        test_url = "http://example.com/stream"
        encoded_url = urllib.parse.quote(test_url, safe="")
        
        response = requests.head(f"{BASE_URL}/api/stream/{encoded_url}", timeout=5)
        
        # Document the failure - proxy returns 500
        print(f"Proxy endpoint status: {response.status_code}")
        # This is expected to fail - documenting the issue
        assert response.status_code == 500, "Proxy endpoint is broken (expected 500)"
        
    def test_https_stream_no_proxy_needed(self):
        """Verify HTTPS streams work directly without proxy"""
        # Energy NRJ Wien has HTTPS streams - no proxy needed
        response = requests.get(f"{BASE_URL}/api/station/{ENERGY_NRJ_SLUG}")
        data = response.json()
        
        url = data.get("url", "")
        url_resolved = data.get("urlResolved", "")
        
        # Both are HTTPS - proxy NOT needed
        assert url.startswith("https://"), "Station URL is HTTPS - no proxy needed"
        assert url_resolved.startswith("https://"), "urlResolved is HTTPS - no proxy needed"
        
        print("CONCLUSION: Energy NRJ Wien has HTTPS streams - proxy is UNNECESSARY")
        print("The app should use urlResolved directly without proxy")


class TestIOSATSConfiguration:
    """Test iOS App Transport Security requirements"""
    
    def test_stream_uses_https(self):
        """Verify streams use HTTPS for iOS ATS compliance"""
        response = requests.get(f"{BASE_URL}/api/station/{ENERGY_NRJ_SLUG}")
        data = response.json()
        
        # Check both URLs
        url = data.get("url", "")
        url_resolved = data.get("urlResolved", "")
        
        # For iOS ATS, HTTPS is required unless exceptions are configured
        is_https = url.startswith("https://") or url_resolved.startswith("https://")
        assert is_https, "At least one stream URL must be HTTPS for iOS"
        
        print(f"URL: {url} - {'HTTPS ✓' if url.startswith('https://') else 'HTTP ✗'}")
        print(f"urlResolved: {url_resolved} - {'HTTPS ✓' if url_resolved.startswith('https://') else 'HTTP ✗'}")


class TestRecommendedFixes:
    """Document recommended fixes"""
    
    def test_document_fix_1_use_url_resolved_first(self):
        """FIX 1: Use urlResolved as primary stream URL"""
        response = requests.get(f"{BASE_URL}/api/station/{ENERGY_NRJ_SLUG}")
        data = response.json()
        
        url_resolved = data.get("urlResolved", "")
        
        # urlResolved (streaming.nrjaudio.fm) works, url (scdn.nrjaudio.fm) doesn't
        print("RECOMMENDED FIX 1:")
        print("In AudioProvider.tsx resolveStreamUrl():")
        print("1. Try station.url_resolved FIRST (it's often more reliable)")
        print("2. Fall back to stream/resolve API only if url_resolved unavailable")
        print(f"Working URL: {url_resolved}")
        
        # Verify urlResolved works
        head_response = requests.head(url_resolved, timeout=5)
        assert head_response.status_code == 200
        
    def test_document_fix_2_skip_proxy_for_https(self):
        """FIX 2: Already implemented - skip proxy for HTTPS"""
        print("ALREADY FIXED:")
        print("AudioProvider.tsx lines 239-245 already skip proxy for HTTPS streams")
        print("But the issue is using the WRONG stream URL (scdn vs streaming)")
        
    def test_document_fix_3_ios_ats_settings(self):
        """FIX 3: Add iOS ATS settings for HTTP streams if needed"""
        print("RECOMMENDATION 3:")
        print("Add NSAppTransportSecurity to app.json if HTTP streams needed:")
        print("""
        "ios": {
          "infoPlist": {
            "NSAppTransportSecurity": {
              "NSAllowsArbitraryLoads": false,
              "NSAllowsArbitraryLoadsForMedia": true,
              "NSAllowsArbitraryLoadsInWebContent": false
            }
          }
        }
        """)
        print("NSAllowsArbitraryLoadsForMedia allows HTTP for audio/video only")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
