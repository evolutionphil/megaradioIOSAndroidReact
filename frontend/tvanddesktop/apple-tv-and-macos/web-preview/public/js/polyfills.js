// Full standards polyfills are built into compat-runtime.js and run first.
// This classic helper must remain ES5-parseable (including on Chromium38).
(function () {
    if (typeof globalThis === 'undefined') window.globalThis = window;
    if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
})();