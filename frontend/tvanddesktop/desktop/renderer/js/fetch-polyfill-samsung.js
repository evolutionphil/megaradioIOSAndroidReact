// Fetch polyfill for Samsung Tizen TV - handles CORS better
(function() {
    'use strict';
    
    console.log('[Fetch Polyfill] Loading Samsung TV fetch handler...');
    
    // Store original fetch
    const originalFetch = window.fetch;
    
    // Enhanced fetch for Samsung TV
    window.fetch = function(url, options) {
        options = options || {};
        
        // Log all fetch requests for debugging
        console.log('[Fetch] Request:', url);
        
        // For Samsung TV, try to use XMLHttpRequest for better CORS support
        if (navigator.userAgent.toLowerCase().includes('tizen')) {
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                var method = (options.method || 'GET').toUpperCase();
                
                xhr.open(method, url, true);
                
                // Samsung TV FIX: DON'T set responseType - it causes empty responses on Tizen
                // Leave it undefined to use the default behavior
                
                // Set headers
                xhr.setRequestHeader('Accept', 'application/json');
                if (options.headers) {
                    Object.keys(options.headers).forEach(function(key) {
                        xhr.setRequestHeader(key, options.headers[key]);
                    });
                }
                
                // Use onreadystatechange for better Samsung TV compatibility
                xhr.onreadystatechange = function() {
                    if (xhr.readyState !== 4) return;
                    
                    if (xhr.status === 0) {
                        console.error('[Fetch] Network error (status 0) for:', url);
                        reject(new TypeError('Network request failed'));
                        return;
                    }
                    
                    handleResponse();
                };
                
                function handleResponse() {
                    console.log('[Fetch] Response status:', xhr.status, 'for', url);
                    console.log('[Fetch] Response ready state:', xhr.readyState);
                    
                    // Samsung TV: Try multiple ways to get response text
                    var responseText = '';
                    
                    // Method 1: responseText (most reliable for Samsung TV)
                    try {
                        responseText = xhr.responseText || '';
                        console.log('[Fetch] Got responseText, length:', responseText.length);
                    } catch(e) {
                        console.log('[Fetch] responseText failed:', e.message);
                    }
                    
                    // Method 2: response property (fallback)
                    if (!responseText && xhr.response) {
                        try {
                            responseText = typeof xhr.response === 'string' ? xhr.response : String(xhr.response);
                            console.log('[Fetch] Got response, length:', responseText.length);
                        } catch(e) {
                            console.log('[Fetch] response failed:', e.message);
                        }
                    }
                    
                    console.log('[Fetch] Final response text length:', responseText ? responseText.length : 0);
                    console.log('[Fetch] Response preview:', responseText ? responseText.substring(0, 100) + '...' : 'EMPTY');
                    
                    if (typeof responseText !== 'string') {
                        responseText = String(responseText);
                    }
                    
                    var response = {
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        headers: {
                            get: function(name) {
                                return xhr.getResponseHeader(name);
                            }
                        },
                        text: function() {
                            return Promise.resolve(responseText);
                        },
                        json: function() {
                            try {
                                if (!responseText || responseText.trim() === '') {
                                    console.error('[Fetch] Empty response body for:', url);
                                    return Promise.resolve(null);
                                }
                                var parsed = JSON.parse(responseText);
                                console.log('[Fetch] JSON parsed successfully, keys:', Object.keys(parsed || {}));
                                return Promise.resolve(parsed);
                            } catch(e) {
                                console.error('[Fetch] JSON parse error:', e);
                                console.error('[Fetch] Response text was:', responseText.substring(0, 200));
                                return Promise.reject(e);
                            }
                        }
                    };
                    
                    resolve(response);
                }
                
                xhr.onerror = function() {
                    console.error('[Fetch] Network error for:', url);
                    reject(new TypeError('Network request failed'));
                };
                
                xhr.ontimeout = function() {
                    console.error('[Fetch] Timeout for:', url);
                    reject(new TypeError('Network request timeout'));
                };
                
                // Set timeout (30 seconds)
                xhr.timeout = 30000;
                
                // Send request
                xhr.send(options.body || null);
            });
        }
        
        // For other platforms, use original fetch
        return originalFetch.apply(this, arguments);
    };
    
    console.log('[Fetch Polyfill] Samsung TV fetch handler loaded');
})();
