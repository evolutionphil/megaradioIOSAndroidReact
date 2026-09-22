(function () {
  'use strict';

  window.platform = 'web';
  try {
    var userAgent = window.navigator.userAgent.toLowerCase();
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
  window.platformInfo = {
    isLG: function isLG() {
      return window.platform === 'lg';
    },
    isSamsung: function isSamsung() {
      return window.platform === 'samsung';
    },
    isTV: function isTV() {
      return window.platform === 'lg' || window.platform === 'samsung';
    },
    isWeb: function isWeb() {
      return window.platform === 'web';
    },
    getPlatform: function getPlatform() {
      return window.platform;
    }
  };
})();