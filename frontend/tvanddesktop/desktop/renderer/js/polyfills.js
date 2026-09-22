// Polyfills for Samsung Tizen TV (Chromium 76 / ES2015 support only)
(function() {
    'use strict';
    
    console.log('[Polyfills] Loading polyfills for Samsung Tizen TV...');
    
    // globalThis polyfill (ES2020) - MUST BE FIRST
    if (typeof globalThis === 'undefined') {
        (function() {
            if (typeof self !== 'undefined') { 
                self.globalThis = self; 
            } else if (typeof window !== 'undefined') { 
                window.globalThis = window; 
            } else if (typeof global !== 'undefined') { 
                global.globalThis = global; 
            } else { 
                this.globalThis = this; 
            }
        }).call(this);
        console.log('[Polyfills] Added globalThis');
    }
    
    // Object.fromEntries polyfill (ES2019)
    if (!Object.fromEntries) {
        Object.fromEntries = function(entries) {
            if (!entries || !entries[Symbol.iterator]) {
                throw new Error('Object.fromEntries() requires an iterable argument');
            }
            
            const obj = {};
            for (const [key, value] of entries) {
                obj[key] = value;
            }
            return obj;
        };
        console.log('[Polyfills] Added Object.fromEntries');
    }
    
    // Object.entries polyfill (ES2017) - just in case
    if (!Object.entries) {
        Object.entries = function(obj) {
            var ownProps = Object.keys(obj),
                i = ownProps.length,
                resArray = new Array(i);
            while (i--)
                resArray[i] = [ownProps[i], obj[ownProps[i]]];
            return resArray;
        };
        console.log('[Polyfills] Added Object.entries');
    }
    
    // Array.prototype.flat polyfill (ES2019)
    if (!Array.prototype.flat) {
        Array.prototype.flat = function(depth) {
            var flattend = [];
            (function flat(array, depth) {
                for (var el of array) {
                    if (Array.isArray(el) && depth > 0) {
                        flat(el, depth - 1);
                    } else {
                        flattend.push(el);
                    }
                }
            })(this, Math.floor(depth) || 1);
            return flattend;
        };
        console.log('[Polyfills] Added Array.prototype.flat');
    }
    
    // Array.prototype.flatMap polyfill (ES2019)
    if (!Array.prototype.flatMap) {
        Array.prototype.flatMap = function(callback, thisArg) {
            return this.map(callback, thisArg).flat(1);
        };
        console.log('[Polyfills] Added Array.prototype.flatMap');
    }
    
    // String.prototype.replaceAll polyfill (ES2021)
    if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function(str, newStr) {
            if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
                return this.replace(str, newStr);
            }
            return this.replace(new RegExp(str, 'g'), newStr);
        };
        console.log('[Polyfills] Added String.prototype.replaceAll');
    }
    
    // Promise.allSettled polyfill (ES2020)
    if (!Promise.allSettled) {
        Promise.allSettled = function(promises) {
            return Promise.all(
                promises.map(function(promise) {
                    return Promise.resolve(promise).then(
                        function(value) {
                            return { status: 'fulfilled', value: value };
                        },
                        function(reason) {
                            return { status: 'rejected', reason: reason };
                        }
                    );
                })
            );
        };
        console.log('[Polyfills] Added Promise.allSettled');
    }
    
    // Promise.any polyfill (ES2021)
    if (!Promise.any) {
        Promise.any = function(promises) {
            var rejectionReasons = [];
            var rejectionCount = 0;
            var promisesArray = Array.from(promises);
            
            if (promisesArray.length === 0) {
                return Promise.reject(new AggregateError([], 'All promises were rejected'));
            }
            
            return new Promise(function(resolve, reject) {
                promisesArray.forEach(function(promise, index) {
                    Promise.resolve(promise).then(
                        function(value) {
                            resolve(value);
                        },
                        function(reason) {
                            rejectionReasons[index] = reason;
                            rejectionCount++;
                            
                            if (rejectionCount === promisesArray.length) {
                                var error = new Error('All promises were rejected');
                                error.name = 'AggregateError';
                                error.errors = rejectionReasons;
                                reject(error);
                            }
                        }
                    );
                });
            });
        };
        console.log('[Polyfills] Added Promise.any');
    }
    
    // AbortController polyfill (limited support in Chromium 76)
    if (typeof AbortController === 'undefined') {
        window.AbortController = function() {
            this.signal = new AbortSignal();
        };
        
        window.AbortController.prototype.abort = function() {
            if (this.signal) {
                this.signal._aborted = true;
                if (this.signal.onabort) {
                    this.signal.onabort({ type: 'abort' });
                }
                // Dispatch abort event to listeners
                if (this.signal._listeners) {
                    this.signal._listeners.forEach(function(listener) {
                        listener({ type: 'abort' });
                    });
                }
            }
        };
        
        window.AbortSignal = function() {
            this._aborted = false;
            this._listeners = [];
        };
        
        window.AbortSignal.prototype.addEventListener = function(type, listener) {
            if (type === 'abort' && listener) {
                this._listeners.push(listener);
            }
        };
        
        window.AbortSignal.prototype.removeEventListener = function(type, listener) {
            if (type === 'abort' && listener && this._listeners) {
                var index = this._listeners.indexOf(listener);
                if (index !== -1) {
                    this._listeners.splice(index, 1);
                }
            }
        };
        
        Object.defineProperty(window.AbortSignal.prototype, 'aborted', {
            get: function() {
                return this._aborted;
            }
        });
        
        console.log('[Polyfills] Added AbortController and AbortSignal');
    }
    
    // TextEncoder/TextDecoder polyfill (ES2016)
    if (typeof TextEncoder === 'undefined') {
        window.TextEncoder = function() {};
        
        window.TextEncoder.prototype.encode = function(string) {
            var bytes = [];
            for (var i = 0; i < string.length; i++) {
                var code = string.charCodeAt(i);
                if (code <= 0x7F) {
                    bytes.push(code);
                } else if (code <= 0x7FF) {
                    bytes.push((code >> 6) | 0xC0);
                    bytes.push((code & 0x3F) | 0x80);
                } else if (code <= 0xFFFF) {
                    bytes.push((code >> 12) | 0xE0);
                    bytes.push(((code >> 6) & 0x3F) | 0x80);
                    bytes.push((code & 0x3F) | 0x80);
                } else if (code <= 0x10FFFF) {
                    bytes.push((code >> 18) | 0xF0);
                    bytes.push(((code >> 12) & 0x3F) | 0x80);
                    bytes.push(((code >> 6) & 0x3F) | 0x80);
                    bytes.push((code & 0x3F) | 0x80);
                }
            }
            return new Uint8Array(bytes);
        };
        
        console.log('[Polyfills] Added TextEncoder');
    }
    
    if (typeof TextDecoder === 'undefined') {
        window.TextDecoder = function(encoding) {
            this.encoding = (encoding || 'utf-8').toLowerCase();
        };
        
        window.TextDecoder.prototype.decode = function(bytes) {
            if (!bytes || bytes.length === 0) {
                return '';
            }
            
            var byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            var result = '';
            var i = 0;
            
            while (i < byteArray.length) {
                var byte1 = byteArray[i];
                
                if (byte1 < 0x80) {
                    // Single-byte character (0xxxxxxx)
                    result += String.fromCharCode(byte1);
                    i++;
                } else if ((byte1 & 0xE0) === 0xC0) {
                    // Two-byte character (110xxxxx)
                    var byte2 = byteArray[i + 1];
                    if (byte2 !== undefined) {
                        var code = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
                        result += String.fromCharCode(code);
                        i += 2;
                    } else {
                        i++;
                    }
                } else if ((byte1 & 0xF0) === 0xE0) {
                    // Three-byte character (1110xxxx)
                    var byte2 = byteArray[i + 1];
                    var byte3 = byteArray[i + 2];
                    if (byte2 !== undefined && byte3 !== undefined) {
                        var code = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
                        result += String.fromCharCode(code);
                        i += 3;
                    } else {
                        i++;
                    }
                } else if ((byte1 & 0xF8) === 0xF0) {
                    // Four-byte character (11110xxx)
                    var byte2 = byteArray[i + 1];
                    var byte3 = byteArray[i + 2];
                    var byte4 = byteArray[i + 3];
                    if (byte2 !== undefined && byte3 !== undefined && byte4 !== undefined) {
                        var code = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
                        code -= 0x10000;
                        result += String.fromCharCode(0xD800 + (code >> 10));
                        result += String.fromCharCode(0xDC00 + (code & 0x3FF));
                        i += 4;
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }
            }
            
            return result;
        };
        
        console.log('[Polyfills] Added TextDecoder');
    }
    
    console.log('[Polyfills] All polyfills loaded successfully');
})();
