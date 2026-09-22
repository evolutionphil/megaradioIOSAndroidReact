// Platform Detection for LG webOS and Samsung Tizen TVs
(function() {
    'use strict';
    
    // Detect platform based on user agent
    window.platform = 'web'; // default
    
    try {
        const userAgent = window.navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('web0s')) {
            window.platform = 'lg';
            console.log('Platform detected: LG webOS');
        } else if (userAgent.includes('tizen') || typeof tizen !== 'undefined') {
            window.platform = 'samsung';
            console.log('Platform detected: Samsung Tizen');
        } else {
            console.log('Platform detected: Web Browser');
        }
    } catch (e) {
        console.error('Platform detection error:', e);
    }
    
    // Export platform info
    window.platformInfo = {
        isLG: function() { return window.platform === 'lg'; },
        isSamsung: function() { return window.platform === 'samsung'; },
        isTV: function() { return window.platform === 'lg' || window.platform === 'samsung'; },
        isWeb: function() { return window.platform === 'web'; },
        getPlatform: function() { return window.platform; }
    };
})();
