// TV Remote Control Key Handler for LG webOS and Samsung Tizen
(function() {
    'use strict';
    
    var tvKey = null;
    
    // Initialize TV keys based on platform
    function initTVKeys() {
        if (window.platform === 'samsung') {
            // Register Samsung Tizen keys
            try {
                var supportedKeys = tizen.tvinputdevice.getSupportedKeys();
                for (var i = 0; i < supportedKeys.length; i++) {
                    try {
                        tizen.tvinputdevice.registerKey(supportedKeys[i].name);
                    } catch (e) {
                        console.warn('Failed to register key:', supportedKeys[i].name);
                    }
                }
                // Unregister volume keys (handled by TV)
                tizen.tvinputdevice.unregisterKey("VolumeUp");
                tizen.tvinputdevice.unregisterKey("VolumeDown");
                tizen.tvinputdevice.unregisterKey("VolumeMute");
            } catch (e) {
                console.error('Failed to register Samsung TV keys:', e);
            }
            
            // Samsung Tizen key codes
            tvKey = {
                N1: 49, N2: 50, N3: 51, N4: 52, N5: 53, 
                N6: 54, N7: 55, N8: 56, N9: 57, N0: 48,
                ENTER: 13,
                RETURN: 10009,
                EXIT: 10182,
                UP: 38,
                DOWN: 40,
                LEFT: 37,
                RIGHT: 39,
                RED: 403,
                GREEN: 404,
                YELLOW: 405,
                BLUE: 406,
                PLAY: 415,
                PAUSE: 19,
                STOP: 413,
                PLAYPAUSE: 10252,
                FF: 417,
                RW: 412,
                MENU: 10133,
                SEARCH: 10255,
                INFO: 457,
                TOOLS: 10135,
                CH_UP: 427,
                CH_DOWN: 428,
                VOL_UP: 448,
                VOL_DOWN: 447,
                MUTE: 449
            };
        } else if (window.platform === 'lg') {
            // LG webOS key codes
            tvKey = {
                N1: 49, N2: 50, N3: 51, N4: 52, N5: 53,
                N6: 54, N7: 55, N8: 56, N9: 57, N0: 48,
                ENTER: 13,
                RETURN: 461,  // Different from Samsung
                EXIT: 10182,
                UP: 38,
                DOWN: 40,
                LEFT: 37,
                RIGHT: 39,
                RED: 403,
                GREEN: 404,
                YELLOW: 405,
                BLUE: 406,
                PLAY: 415,
                PAUSE: 19,
                STOP: 413,
                PLAYPAUSE: 10252,
                FF: 417,
                RW: 412,
                MENU: 10133,
                SEARCH: 10255,
                INFO: 457,
                TOOLS: 10135,
                CH_UP: 33,  // Different from Samsung
                CH_DOWN: 34,  // Different from Samsung
                VOL_UP: 448,
                VOL_DOWN: 447,
                MUTE: 449
            };
        } else {
            // Web browser - standard keys only
            tvKey = {
                ENTER: 13,
                UP: 38,
                DOWN: 40,
                LEFT: 37,
                RIGHT: 39,
                SPACE: 32,
                ESC: 27
            };
        }
        
        window.tvKey = tvKey;
        return tvKey;
    }
    
    // Helper to get key name from code
    function getKeyName(keyCode) {
        for (var name in tvKey) {
            if (tvKey[name] === keyCode) {
                return name;
            }
        }
        return 'UNKNOWN';
    }
    
    // Global key event handler - LGTV-style routing pattern
    window.handleTVKey = function(e) {
        var key = e.keyCode;
        var keyName = getKeyName(key);
        
        console.log('[TV Keys] 🎮 Key pressed:', {
            keyCode: key,
            keyName: keyName,
            key: e.key,
            code: e.code,
            platform: window.platform,
            hash: window.location.hash,
            focusRouterAvailable: !!window.focusRouterDispatch
        });
        
        // Exit app on EXIT key (Samsung only)
        if (window.platform === 'samsung' && key === tvKey.EXIT) {
            console.log('[TV Keys] ⚠️  EXIT key - closing app');
            try {
                tizen.application.getCurrentApplication().exit();
            } catch(err) {
                console.error('[TV Keys] ❌ Exit failed:', err);
            }
            return false;
        }
        
        // Handle media control buttons (Play/Pause/FF/RW)
        if (window.globalPlayer) {
            switch(key) {
                case tvKey.PLAY:
                    console.log('[TV Keys] ▶️  PLAY button pressed');
                    if (!window.globalPlayer.isPlaying) {
                        window.globalPlayer.resume();
                    }
                    e.preventDefault();
                    return false;
                case tvKey.PAUSE:
                    console.log('[TV Keys] ⏸️  PAUSE button pressed');
                    if (window.globalPlayer.isPlaying) {
                        window.globalPlayer.pause();
                    }
                    e.preventDefault();
                    return false;
                case tvKey.PLAYPAUSE:
                    console.log('[TV Keys] ⏯️  PLAY/PAUSE button pressed');
                    window.globalPlayer.togglePlayPause();
                    e.preventDefault();
                    return false;
                case tvKey.STOP:
                    console.log('[TV Keys] ⏹️  STOP button pressed');
                    window.globalPlayer.stop();
                    e.preventDefault();
                    return false;
            }
        }
        
        // Handle color button navigation (global shortcuts)
        switch(key) {
            case tvKey.RED:
                console.log('[TV Keys] 🔴 RED → Discover');
                window.location.hash = '#/discover-no-user';
                e.preventDefault();
                return false;
            case tvKey.GREEN:
                console.log('[TV Keys] 🟢 GREEN → Genres');
                window.location.hash = '#/genres';
                e.preventDefault();
                return false;
            case tvKey.BLUE:
                console.log('[TV Keys] 🔵 BLUE → Search');
                window.location.hash = '#/search';
                e.preventDefault();
                return false;
            case tvKey.YELLOW:
                console.log('[TV Keys] 🟡 YELLOW → Favorites');
                window.location.hash = '#/favorites';
                e.preventDefault();
                return false;
        }
        
        // Dispatch to FocusRouter (set by React)
        // This matches LGTV pattern: switch(current_route) { case "login": login_page.HandleKey(e); }
        if (window.focusRouterDispatch) {
            console.log('[TV Keys] 📤 Dispatching to FocusRouter');
            // Don't preventDefault here - let pages handle it
            // Guide pages use their own keydown listeners
            window.focusRouterDispatch(e);
        } else {
            console.warn('[TV Keys] ⚠️  FocusRouter not available yet');
        }
        
        // Allow event to propagate to page handlers
        return true;
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[TV Remote Keys] DOM ready, initializing...');
            initTVKeys();
            // DON'T call init here - let React hook handle it
            document.addEventListener('keydown', window.handleTVKey);
            console.log('[TV Remote Keys] Key handler attached, waiting for React...');
        });
    } else {
        console.log('[TV Remote Keys] DOM already ready, initializing now...');
        initTVKeys();
        // DON'T call init here - let React hook handle it
        document.addEventListener('keydown', window.handleTVKey);
        console.log('[TV Remote Keys] Key handler attached, waiting for React...');
    }
})();
