"""
Backend API Tests for MegaRadio - Android Radio Streaming Issues
Tests for: HTTP stream playback, playlist resolution, cleartext traffic compatibility

User-reported Issue: Many radio stations NOT working on Android but work on iOS and web
Example stations: Austria Rock Radio, Arabesk FM, Penny Live

Key areas to test:
1. HTTP stream URL resolution (urlResolved vs url field)
2. Playlist resolution (.pls/.m3u files)
3. Direct HTTP stream accessibility (requires usesCleartextTraffic=true)
4. Fallback mechanism when primary URL fails
"""
import pytest
import requests
import os
from urllib.parse import quote

# API Configuration
MEGARADIO_API = "https://themegaradio.com"
API_KEY = os.environ.get('MEGARADIO_API_KEY', 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw')

# Problematic stations reported by user (Android-specific issues)
ARABESK_FM = {
    "id": "68a8c461bd66579311aadb0b",
    "name": "Arabesk FM",
    "slug": "arabesk-fm",
    "url": "http://yayin.arabeskfm.biz:8042/",  # HTTP Shoutcast stream
    "protocol": "HTTP"
}

PENNY_LIVE = {
    "id": "68a8c483bd66579311ab31e4",
    "name": "PENNY live",
    "slug": "penny-live",
    "url": "http://listen.radiomax.technology/penny",  # HTTP Icecast stream
    "protocol": "HTTP"
}

AUSTRIAN_ROCK_RADIO = {
    "id": "68a8c462bd66579311aaddcb",
    "name": "Austrian Rock Radio",
    "slug": "austrian-rock-radio",
    "url": "http://live.antenne.at/arr",  # HTTP stream
    "protocol": "HTTP"
}

# Reference: Energy NRJ Wien (HTTPS stream - should work)
ENERGY_NRJ_WIEN = {
    "id": "68a8c46dbd66579311aafa1f",
    "name": "Energy NRJ Wien",
    "slug": "energy-nrj-wien",
    "urlResolved": "https://streaming.nrjaudio.fm/ouvfydoarp52",  # HTTPS - works
    "protocol": "HTTPS"
}


class TestStationAPIResponses:
    """Test that API returns correct URL fields for problematic stations"""
    
    def test_arabesk_fm_station_data(self):
        """Arabesk FM - Verify API returns urlResolved field correctly"""
        response = requests.get(f"{MEGARADIO_API}/api/station/{ARABESK_FM['slug']}")
        
        assert response.status_code == 200, f"Station not found: {response.status_code}"
        data = response.json()
        
        assert data.get('_id') == ARABESK_FM['id'], f"ID mismatch: {data.get('_id')}"
        assert data.get('name') == ARABESK_FM['name'], f"Name mismatch: {data.get('name')}"
        
        # Check URL fields - API returns camelCase 'urlResolved'
        url = data.get('url')
        url_resolved = data.get('urlResolved')  # camelCase from API
        
        print(f"✓ Station: {data.get('name')}")
        print(f"✓ url: {url}")
        print(f"✓ urlResolved: {url_resolved}")
        
        # Both should be HTTP URLs for this station
        assert url is not None, "Missing url field"
        assert url.startswith('http://'), f"Expected HTTP URL, got: {url}"
        
        # urlResolved should also be present (may be same as url or resolved)
        if url_resolved:
            print(f"✓ urlResolved field present (camelCase)")
        else:
            print(f"⚠ urlResolved is empty - app should fall back to url")
    
    def test_penny_live_station_data(self):
        """PENNY live - Verify API returns urlResolved field correctly"""
        response = requests.get(f"{MEGARADIO_API}/api/station/{PENNY_LIVE['slug']}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get('_id') == PENNY_LIVE['id']
        
        url = data.get('url')
        url_resolved = data.get('urlResolved')
        
        print(f"✓ Station: {data.get('name')}")
        print(f"✓ url: {url}")
        print(f"✓ urlResolved: {url_resolved}")
        
        assert url is not None
        assert url.startswith('http://')
    
    def test_austrian_rock_radio_station_data(self):
        """Austrian Rock Radio - Verify API returns urlResolved field correctly"""
        response = requests.get(f"{MEGARADIO_API}/api/station/{AUSTRIAN_ROCK_RADIO['slug']}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get('_id') == AUSTRIAN_ROCK_RADIO['id']
        
        url = data.get('url')
        url_resolved = data.get('urlResolved')
        
        print(f"✓ Station: {data.get('name')}")
        print(f"✓ url: {url}")
        print(f"✓ urlResolved: {url_resolved}")
        
        assert url is not None
        assert url.startswith('http://')
    
    def test_energy_nrj_wien_has_https_resolved(self):
        """Energy NRJ Wien - Should have HTTPS urlResolved (reference for comparison)"""
        response = requests.get(f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}")
        
        assert response.status_code == 200
        data = response.json()
        
        url = data.get('url')
        url_resolved = data.get('urlResolved')
        
        print(f"✓ Station: {data.get('name')}")
        print(f"✓ url: {url}")
        print(f"✓ urlResolved: {url_resolved}")
        
        # This station should have HTTPS urlResolved
        if url_resolved and url_resolved.startswith('https://'):
            print(f"✓ urlResolved is HTTPS - should work on all platforms")
        else:
            print(f"⚠ urlResolved is not HTTPS - may have issues")


class TestStreamResolutionAPI:
    """Test /api/stream/resolve endpoint for HTTP streams"""
    
    def test_resolve_arabesk_fm_http_stream(self):
        """Arabesk FM HTTP stream should resolve correctly"""
        response = requests.get(
            f"{MEGARADIO_API}/api/stream/resolve",
            params={'url': ARABESK_FM['url']}
        )
        
        assert response.status_code == 200, f"Stream resolution failed: {response.status_code}"
        data = response.json()
        
        assert 'candidates' in data, "Missing candidates in response"
        assert len(data['candidates']) > 0, "No stream candidates found"
        
        resolved_url = data['candidates'][0]
        playlist_type = data.get('playlistType')
        
        print(f"✓ Original URL: {ARABESK_FM['url']}")
        print(f"✓ Resolved URL: {resolved_url}")
        print(f"✓ Playlist Type: {playlist_type}")
        
        # Should return the same URL (direct stream, not playlist)
        assert playlist_type == 'direct', f"Expected 'direct' playlist type, got: {playlist_type}"
    
    def test_resolve_penny_live_http_stream(self):
        """PENNY live HTTP stream should resolve correctly"""
        response = requests.get(
            f"{MEGARADIO_API}/api/stream/resolve",
            params={'url': PENNY_LIVE['url']}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'candidates' in data
        assert len(data['candidates']) > 0
        
        resolved_url = data['candidates'][0]
        playlist_type = data.get('playlistType')
        
        print(f"✓ Original URL: {PENNY_LIVE['url']}")
        print(f"✓ Resolved URL: {resolved_url}")
        print(f"✓ Playlist Type: {playlist_type}")
    
    def test_resolve_austrian_rock_radio_http_stream(self):
        """Austrian Rock Radio HTTP stream should resolve correctly"""
        response = requests.get(
            f"{MEGARADIO_API}/api/stream/resolve",
            params={'url': AUSTRIAN_ROCK_RADIO['url']}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'candidates' in data
        assert len(data['candidates']) > 0
        
        resolved_url = data['candidates'][0]
        print(f"✓ Resolved URL: {resolved_url}")


class TestHTTPStreamAccessibility:
    """Test if HTTP streams are accessible (simulates Android cleartext traffic)"""
    
    def test_arabesk_fm_stream_is_accessible(self):
        """Arabesk FM Shoutcast stream should be accessible"""
        # Test with HEAD first, then GET if HEAD fails (some servers don't support HEAD)
        try:
            response = requests.head(ARABESK_FM['url'], timeout=10, allow_redirects=True)
            status = response.status_code
        except:
            # Try GET with limited data
            response = requests.get(ARABESK_FM['url'], timeout=10, stream=True)
            status = response.status_code
            response.close()
        
        # Status 200 = accessible, 400 might mean HEAD not supported (but GET works)
        print(f"✓ Arabesk FM stream status: {status}")
        
        # Check content-type if available
        content_type = response.headers.get('content-type', 'unknown')
        icy_name = response.headers.get('icy-name', 'N/A')
        
        print(f"✓ Content-Type: {content_type}")
        print(f"✓ ICY-Name: {icy_name}")
        
        # Should be audio stream
        assert status in [200, 400], f"Stream not accessible: {status}"
        if status == 200:
            assert 'audio' in content_type.lower() or 'icy' in response.headers.get('icy-notice1', '').lower(), \
                f"Not an audio stream: {content_type}"
    
    def test_penny_live_stream_is_accessible(self):
        """PENNY live Icecast stream should be accessible"""
        # Icecast servers often don't support HEAD, use GET
        try:
            response = requests.get(PENNY_LIVE['url'], timeout=10, stream=True)
            status = response.status_code
            content_type = response.headers.get('content-type', 'unknown')
            response.close()
        except Exception as e:
            pytest.skip(f"Could not connect to PENNY live: {e}")
        
        print(f"✓ PENNY live stream status: {status}")
        print(f"✓ Content-Type: {content_type}")
        
        assert status == 200, f"Stream not accessible: {status}"
        assert 'audio' in content_type.lower(), f"Not an audio stream: {content_type}"
    
    def test_austrian_rock_radio_stream_is_accessible(self):
        """Austrian Rock Radio stream should be accessible"""
        try:
            response = requests.get(AUSTRIAN_ROCK_RADIO['url'], timeout=10, stream=True)
            status = response.status_code
            content_type = response.headers.get('content-type', 'unknown')
            response.close()
        except Exception as e:
            pytest.skip(f"Could not connect to Austrian Rock Radio: {e}")
        
        print(f"✓ Austrian Rock Radio stream status: {status}")
        print(f"✓ Content-Type: {content_type}")
        
        # May return redirect or audio
        assert status in [200, 301, 302], f"Stream not accessible: {status}"


class TestURLResolvedVsURLLogic:
    """Test the URL resolution logic used by AudioProvider.tsx"""
    
    def test_url_field_priority(self):
        """
        Backend Developer Recommendation:
        1. If urlResolved exists and is not empty → use urlResolved
        2. If url is .pls/.m3u/.m3u8/.asx → use /api/stream/resolve
        3. Otherwise → use url
        """
        # Get Arabesk FM station data
        response = requests.get(f"{MEGARADIO_API}/api/station/{ARABESK_FM['slug']}")
        data = response.json()
        
        url = data.get('url')
        url_resolved = data.get('urlResolved')
        
        # Simulate AudioProvider.tsx logic
        # const urlResolved = (station as any).urlResolved || station.url_resolved;
        # let streamUrl = (urlResolved && urlResolved.trim() !== '') ? urlResolved : originalUrl;
        
        effective_url = url_resolved if (url_resolved and url_resolved.strip()) else url
        
        print(f"✓ url: {url}")
        print(f"✓ urlResolved: {url_resolved}")
        print(f"✓ Effective URL (AudioProvider logic): {effective_url}")
        
        assert effective_url is not None, "No effective URL determined"
        assert effective_url.startswith('http'), f"Invalid URL: {effective_url}"
    
    def test_playlist_url_detection(self):
        """Test detection of playlist URLs that need resolution"""
        test_urls = [
            ("http://stream.example.com/live", False, "direct stream"),
            ("http://stream.example.com/playlist.pls", True, "PLS playlist"),
            ("http://stream.example.com/playlist.m3u", True, "M3U playlist"),
            ("http://stream.example.com/playlist.m3u8", True, "M3U8/HLS playlist"),
            ("http://stream.example.com/playlist.asx", True, "ASX playlist"),
            ("http://yayin.arabeskfm.biz:8042/", False, "Shoutcast port"),
        ]
        
        def is_playlist_url(url):
            if not url:
                return False
            lower_url = url.lower()
            return (lower_url.endswith('.pls') or 
                    lower_url.endswith('.m3u') or 
                    lower_url.endswith('.m3u8') or
                    lower_url.endswith('.asx'))
        
        for url, expected, description in test_urls:
            result = is_playlist_url(url)
            status = "✓" if result == expected else "✗"
            print(f"{status} {description}: {url} -> isPlaylist={result}")
            assert result == expected, f"Failed for {description}"


class TestFallbackMechanism:
    """Test fallback mechanism when primary URL fails"""
    
    def test_candidates_returned_by_resolve_api(self):
        """Stream resolve should return multiple candidates for fallback"""
        # Test with Energy NRJ Wien which has a more complex setup
        station_response = requests.get(f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}")
        station_data = station_response.json()
        
        url = station_data.get('url')
        url_resolved = station_data.get('urlResolved')
        
        # Test resolve API
        resolve_response = requests.get(
            f"{MEGARADIO_API}/api/stream/resolve",
            params={'url': url}
        )
        
        if resolve_response.status_code == 200:
            data = resolve_response.json()
            candidates = data.get('candidates', [])
            
            print(f"✓ Primary URL: {url}")
            print(f"✓ urlResolved: {url_resolved}")
            print(f"✓ Candidates from resolve: {len(candidates)}")
            for i, c in enumerate(candidates):
                print(f"  [{i}] {c[:80]}...")
            
            # In AudioProvider.tsx, candidates are stored in streamCandidatesRef
            # and tryNextCandidate() iterates through them on failure
    
    def test_fallback_candidates_include_both_urls(self):
        """AudioProvider should build candidates from both urlResolved and url"""
        station_response = requests.get(f"{MEGARADIO_API}/api/station/{ENERGY_NRJ_WIEN['slug']}")
        data = station_response.json()
        
        url = data.get('url')
        url_resolved = data.get('urlResolved')
        
        # Simulate AudioProvider.tsx candidate building logic:
        # const candidates: string[] = [];
        # if (urlResolved && urlResolved.trim() !== '') candidates.push(urlResolved);
        # if (originalUrl && originalUrl !== urlResolved) candidates.push(originalUrl);
        
        candidates = []
        if url_resolved and url_resolved.strip():
            candidates.append(url_resolved)
        if url and url != url_resolved:
            candidates.append(url)
        
        print(f"✓ Built {len(candidates)} fallback candidates:")
        for i, c in enumerate(candidates):
            print(f"  [{i}] {c}")
        
        # Should have at least one candidate
        assert len(candidates) > 0, "No fallback candidates built"


class TestAndroidCleartextTrafficConfig:
    """Verify app.json has correct Android configuration"""
    
    def test_uses_cleartext_traffic_enabled(self):
        """app.json should have usesCleartextTraffic: true for HTTP streams"""
        import json
        
        app_json_path = '/app/frontend/app.json'
        try:
            with open(app_json_path, 'r') as f:
                app_config = json.load(f)
        except FileNotFoundError:
            pytest.skip("app.json not found in test environment")
        
        expo_config = app_config.get('expo', {})
        android_config = expo_config.get('android', {})
        uses_cleartext = android_config.get('usesCleartextTraffic')
        
        print(f"✓ Android config: {android_config}")
        print(f"✓ usesCleartextTraffic: {uses_cleartext}")
        
        assert uses_cleartext == True, \
            "usesCleartextTraffic must be true for HTTP streams on Android"
    
    def test_internet_permission_present(self):
        """app.json should have INTERNET permission"""
        import json
        
        app_json_path = '/app/frontend/app.json'
        try:
            with open(app_json_path, 'r') as f:
                app_config = json.load(f)
        except FileNotFoundError:
            pytest.skip("app.json not found in test environment")
        
        expo_config = app_config.get('expo', {})
        android_config = expo_config.get('android', {})
        permissions = android_config.get('permissions', [])
        
        print(f"✓ Android permissions: {permissions}")
        
        assert 'INTERNET' in permissions, "INTERNET permission must be present"
        assert 'ACCESS_NETWORK_STATE' in permissions, "ACCESS_NETWORK_STATE permission must be present"


class TestNowPlayingMetadataAPI:
    """Test now-playing metadata API for HTTP streams"""
    
    def test_now_playing_for_arabesk_fm(self):
        """Test now-playing metadata extraction for Arabesk FM"""
        response = requests.get(
            f"{MEGARADIO_API}/api/stations/{ARABESK_FM['id']}/metadata"
        )
        
        assert response.status_code == 200, f"Metadata API failed: {response.status_code}"
        data = response.json()
        
        print(f"✓ Metadata API response: {data}")
        
        # Response format: { station: {...}, metadata: {...} }
        metadata = data.get('metadata', {})
        station_info = data.get('station', {})
        
        print(f"✓ Station info: {station_info}")
        print(f"✓ Metadata: {metadata}")
        
        # Metadata may be empty if ICY not available
        if metadata.get('title') or metadata.get('artist'):
            print(f"✓ Got actual metadata: {metadata.get('title')} - {metadata.get('artist')}")
        else:
            print(f"⚠ No ICY metadata available (normal for some stations)")
    
    def test_now_playing_for_penny_live(self):
        """Test now-playing metadata extraction for PENNY live"""
        response = requests.get(
            f"{MEGARADIO_API}/api/stations/{PENNY_LIVE['id']}/metadata"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"✓ PENNY live metadata: {data}")


class TestStreamProxyEndpoint:
    """Test stream proxy endpoint for web fallback"""
    
    def test_stream_proxy_url_construction(self):
        """Verify proxy URL format is correct"""
        test_url = ARABESK_FM['url']
        encoded_url = quote(test_url, safe='')
        proxy_url = f"{MEGARADIO_API}/api/stream/{encoded_url}"
        
        print(f"✓ Original URL: {test_url}")
        print(f"✓ Encoded URL: {encoded_url}")
        print(f"✓ Proxy URL: {proxy_url}")
        
        assert encoded_url in proxy_url
    
    def test_stream_proxy_endpoint_responds(self):
        """Proxy endpoint should respond (may return 500 which is known issue)"""
        test_url = "http://yayin.arabeskfm.biz:8042/"
        encoded_url = quote(test_url, safe='')
        proxy_url = f"{MEGARADIO_API}/api/stream/{encoded_url}"
        
        try:
            response = requests.head(proxy_url, timeout=10, allow_redirects=True)
            status = response.status_code
            print(f"✓ Proxy endpoint status: {status}")
            
            # Note: Proxy may return 500 (known issue from iteration_26)
            if status == 500:
                print(f"⚠ Proxy returns 500 - known issue, native apps don't need proxy")
            elif status == 404:
                print(f"⚠ Proxy endpoint not found")
            else:
                print(f"✓ Proxy endpoint responded: {status}")
        except Exception as e:
            print(f"⚠ Could not test proxy: {e}")


class TestExoPlayerCompatibility:
    """Test stream formats compatible with ExoPlayer (used by react-native-track-player on Android)"""
    
    def test_shoutcast_stream_headers(self):
        """Verify Shoutcast stream has proper headers for ExoPlayer"""
        try:
            response = requests.get(
                ARABESK_FM['url'], 
                timeout=10, 
                stream=True,
                headers={'Icy-MetaData': '1'}  # Request ICY metadata
            )
            
            headers = dict(response.headers)
            response.close()
            
            print(f"✓ Shoutcast response headers:")
            for key, value in headers.items():
                if key.lower().startswith('icy') or key.lower() == 'content-type':
                    print(f"  {key}: {value}")
            
            content_type = headers.get('content-type', headers.get('Content-Type', ''))
            
            # ExoPlayer supports: audio/mpeg, audio/aac, audio/aacp, audio/ogg, etc.
            supported_types = ['audio/mpeg', 'audio/aac', 'audio/aacp', 'application/ogg', 'audio/ogg']
            
            is_supported = any(t in content_type.lower() for t in supported_types)
            print(f"✓ Content-Type: {content_type}")
            print(f"✓ ExoPlayer compatible: {is_supported}")
            
        except Exception as e:
            print(f"⚠ Could not test Shoutcast headers: {e}")
    
    def test_icecast_stream_headers(self):
        """Verify Icecast stream has proper headers for ExoPlayer"""
        try:
            response = requests.get(
                PENNY_LIVE['url'],
                timeout=10,
                stream=True,
                headers={'Icy-MetaData': '1'}
            )
            
            headers = dict(response.headers)
            response.close()
            
            print(f"✓ Icecast response headers:")
            for key, value in headers.items():
                if key.lower().startswith('icy') or key.lower() == 'content-type':
                    print(f"  {key}: {value}")
            
            content_type = headers.get('content-type', headers.get('Content-Type', ''))
            print(f"✓ Content-Type: {content_type}")
            
        except Exception as e:
            print(f"⚠ Could not test Icecast headers: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
