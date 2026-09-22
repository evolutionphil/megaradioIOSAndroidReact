(function () {
  if (typeof globalThis === 'undefined') window.globalThis = window;
  if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }
})();