(function () {
  'use strict';

  console.log('[Fetch Polyfill] Loading Samsung TV fetch handler...');
  var originalFetch = window.fetch;
  window.fetch = function (url, options) {
    options = options || {};
    console.log('[Fetch] Request:', url);
    if (navigator.userAgent.toLowerCase().includes('tizen')) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        var method = (options.method || 'GET').toUpperCase();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        if (options.headers) {
          Object.keys(options.headers).forEach(function (key) {
            xhr.setRequestHeader(key, options.headers[key]);
          });
        }
        xhr.onreadystatechange = function () {
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
          var responseText = '';
          try {
            responseText = xhr.responseText || '';
            console.log('[Fetch] Got responseText, length:', responseText.length);
          } catch (e) {
            console.log('[Fetch] responseText failed:', e.message);
          }
          if (!responseText && xhr.response) {
            try {
              responseText = typeof xhr.response === 'string' ? xhr.response : String(xhr.response);
              console.log('[Fetch] Got response, length:', responseText.length);
            } catch (e) {
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
              get: function get(name) {
                return xhr.getResponseHeader(name);
              }
            },
            text: function text() {
              return Promise.resolve(responseText);
            },
            json: function json() {
              try {
                if (!responseText || responseText.trim() === '') {
                  console.error('[Fetch] Empty response body for:', url);
                  return Promise.resolve(null);
                }
                var parsed = JSON.parse(responseText);
                console.log('[Fetch] JSON parsed successfully, keys:', Object.keys(parsed || {}));
                return Promise.resolve(parsed);
              } catch (e) {
                console.error('[Fetch] JSON parse error:', e);
                console.error('[Fetch] Response text was:', responseText.substring(0, 200));
                return Promise.reject(e);
              }
            }
          };
          resolve(response);
        }
        xhr.onerror = function () {
          console.error('[Fetch] Network error for:', url);
          reject(new TypeError('Network request failed'));
        };
        xhr.ontimeout = function () {
          console.error('[Fetch] Timeout for:', url);
          reject(new TypeError('Network request timeout'));
        };
        xhr.timeout = 30000;
        xhr.send(options.body || null);
      });
    }
    return originalFetch.apply(this, arguments);
  };
  console.log('[Fetch Polyfill] Samsung TV fetch handler loaded');
})();