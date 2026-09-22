(function () {
  'use strict';

  window.TVAudioPlayer = function (containerId) {
    this.containerId = containerId;
    this.platform = window.platform || 'web';
    this.audioElement = null;
    this.isPlaying = false;
    this.currentUrl = '';
    this.volume = 1.0;
    if (this.platform === 'samsung') {
      this.initSamsungPlayer();
    } else if (this.platform === 'lg') {
      this.initLGPlayer();
    } else {
      this.initWebPlayer();
    }
  };
  TVAudioPlayer.prototype = {
    initSamsungPlayer: function initSamsungPlayer() {
      var self = this;
      this.play = function (url) {
        self.currentUrl = url;
        if (self._watchdog) {
          clearTimeout(self._watchdog);
          self._watchdog = null;
        }
        try {
          try {
            var state = webapis.avplay.getState();
            console.log('[Samsung Player] Current state:', state);
            if (state !== 'NONE' && state !== 'IDLE') {
              console.log('[Samsung Player] Closing player to reset state');
              webapis.avplay.stop();
              webapis.avplay.close();
            }
          } catch (stateError) {
            console.log('[Samsung Player] State check failed, attempting close:', stateError);
            try {
              webapis.avplay.close();
            } catch (e) {}
          }
          console.log('[Samsung Player] Opening URL:', url);
          webapis.avplay.open(url);
          var listener = {
            onbufferingstart: function onbufferingstart() {
              console.log('Buffering started');
              self.onBuffering && self.onBuffering();
            },
            onbufferingcomplete: function onbufferingcomplete() {
              console.log('Buffering complete');
              self.onReady && self.onReady();
            },
            onstreamcompleted: function onstreamcompleted() {
              console.log('Stream completed');
              self.onEnded && self.onEnded();
            },
            oncurrentplaytime: function oncurrentplaytime(currentTime) {
              self.onTimeUpdate && self.onTimeUpdate(currentTime / 1000);
            },
            onerror: function onerror(eventType) {
              console.error('AVPlay error:', eventType);
              self.onError && self.onError(eventType);
            }
          };
          webapis.avplay.setListener(listener);
          var settled = false;
          self._watchdog = setTimeout(function () {
            if (settled) return;
            var liveState = 'UNKNOWN';
            try {
              liveState = webapis.avplay.getState();
            } catch (e) {}
            if (liveState === 'PLAYING' || liveState === 'READY') {
              console.log('[Samsung Player] Watchdog: state is ' + liveState + ' — stream is fine, NOT erroring');
              settled = true;
              self._watchdog = null;
              self.isPlaying = liveState === 'PLAYING';
              self.onPlay && self.onPlay();
              return;
            }
            settled = true;
            self._watchdog = null;
            console.error('[Samsung Player] prepareAsync timeout (15s) — treating as error');
            try {
              webapis.avplay.stop();
              webapis.avplay.close();
            } catch (e) {}
            self.onError && self.onError('PREPARE_TIMEOUT');
          }, 15000);
          webapis.avplay.prepareAsync(function () {
            if (settled) return;
            settled = true;
            if (self._watchdog) {
              clearTimeout(self._watchdog);
              self._watchdog = null;
            }
            webapis.avplay.play();
            self.isPlaying = true;
            self.onPlay && self.onPlay();
          }, function (error) {
            if (settled) return;
            settled = true;
            if (self._watchdog) {
              clearTimeout(self._watchdog);
              self._watchdog = null;
            }
            console.error('Prepare failed:', error);
            self.onError && self.onError(error);
          });
        } catch (e) {
          console.error('Samsung player error:', e);
          self.onError && self.onError(e);
        }
      };
      this.pause = function () {
        try {
          var state = webapis.avplay.getState();
          console.log('[Samsung Player] Pause requested, current state:', state);
          if (state === 'PLAYING') {
            webapis.avplay.pause();
            self.isPlaying = false;
            self.onPause && self.onPause();
            console.log('[Samsung Player] Paused successfully');
          } else {
            console.log('[Samsung Player] Cannot pause - not in PLAYING state, current state:', state);
            self.isPlaying = false;
            self.onPause && self.onPause();
          }
        } catch (e) {
          console.error('Pause error:', e);
          self.isPlaying = false;
          self.onPause && self.onPause();
        }
      };
      this.resume = function () {
        try {
          var state = webapis.avplay.getState();
          console.log('[Samsung Player] Resume requested, current state:', state);
          if (state === 'PAUSED') {
            webapis.avplay.play();
            self.isPlaying = true;
            self.onPlay && self.onPlay();
            console.log('[Samsung Player] Resumed successfully');
          } else if (state === 'PLAYING') {
            console.log('[Samsung Player] Already playing, no need to resume');
            self.isPlaying = true;
          } else {
            console.log('[Samsung Player] Cannot resume - invalid state:', state);
          }
        } catch (e) {
          console.error('Resume error:', e);
        }
      };
      this.stop = function () {
        try {
          webapis.avplay.stop();
          webapis.avplay.close();
          self.isPlaying = false;
          self.onStop && self.onStop();
        } catch (e) {
          console.error('Stop error:', e);
        }
      };
      this.setVolume = function (vol) {
        try {
          webapis.avplay.setStreamingProperty('SET_MODE_4K', 'false');
          self.volume = Math.max(0, Math.min(1, vol));
        } catch (e) {
          console.error('Volume error:', e);
        }
      };
    },
    initLGPlayer: function initLGPlayer() {
      var self = this;
      var container = document.getElementById(this.containerId);
      this.audioElement = document.createElement('audio');
      this.audioElement.setAttribute('preload', 'auto');
      if (container) {
        container.appendChild(this.audioElement);
      }
      this.audioElement.addEventListener('canplay', function () {
        self.onReady && self.onReady();
      });
      this.audioElement.addEventListener('play', function () {
        self.isPlaying = true;
        self.onPlay && self.onPlay();
      });
      this.audioElement.addEventListener('pause', function () {
        self.isPlaying = false;
        self.onPause && self.onPause();
      });
      this.audioElement.addEventListener('ended', function () {
        self.isPlaying = false;
        self.onEnded && self.onEnded();
      });
      this.audioElement.addEventListener('error', function (e) {
        if (self.isStopping || !self.currentUrl) return;
        console.error('LG audio error:', e);
        self.onError && self.onError(e);
      });
      this.audioElement.addEventListener('timeupdate', function () {
        self.onTimeUpdate && self.onTimeUpdate(self.audioElement.currentTime);
      });
      this.audioElement.addEventListener('waiting', function () {
        self.onBuffering && self.onBuffering();
      });
      this.play = function (url) {
        self.currentUrl = url;
        self.audioElement.src = url;
        self.audioElement.load();
        var playPromise = self.audioElement.play();
        if (playPromise !== undefined) {
          playPromise["catch"](function (error) {
            console.error('Play error:', error);
            self.onError && self.onError(error);
          });
        }
      };
      this.pause = function () {
        self.audioElement.pause();
      };
      this.resume = function () {
        var playPromise = self.audioElement.play();
        if (playPromise !== undefined) {
          playPromise["catch"](function (error) {
            console.error('Resume error:', error);
            self.onError && self.onError(error);
          });
        }
      };
      this.stop = function () {
        self.isStopping = true;
        self.audioElement.pause();
        self.audioElement.removeAttribute('src');
        self.audioElement.load();
        self.isPlaying = false;
        self.currentUrl = '';
        setTimeout(function () {
          self.isStopping = false;
        }, 100);
        self.onStop && self.onStop();
      };
      this.setVolume = function (vol) {
        self.volume = Math.max(0, Math.min(1, vol));
        self.audioElement.volume = self.volume;
      };
    },
    initWebPlayer: function initWebPlayer() {
      var self = this;
      var container = document.getElementById(this.containerId);
      console.log('[WebPlayer] Initializing HTML5 audio player');
      this.audioElement = document.createElement('audio');
      this.audioElement.setAttribute('preload', 'auto');
      this.audioElement.setAttribute('controls', 'true');
      this.audioElement.crossOrigin = 'anonymous';
      if (container) {
        container.appendChild(this.audioElement);
      }
      this.audioElement.addEventListener('canplay', function () {
        console.log('[WebPlayer] ✅ canplay - ready to play');
        self.onReady && self.onReady();
      });
      this.audioElement.addEventListener('play', function () {
        console.log('[WebPlayer] ▶️ play event fired');
        self.isPlaying = true;
        self.onPlay && self.onPlay();
      });
      this.audioElement.addEventListener('pause', function () {
        console.log('[WebPlayer] ⏸️ pause event fired');
        self.isPlaying = false;
        self.onPause && self.onPause();
      });
      this.audioElement.addEventListener('ended', function () {
        console.log('[WebPlayer] ⏹️ ended event fired');
        self.isPlaying = false;
        self.onEnded && self.onEnded();
      });
      this.audioElement.addEventListener('error', function (e) {
        if (self.isStopping || !self.currentUrl) return;
        var mediaErr = self.audioElement.error;
        var errorInfo = {
          code: mediaErr ? mediaErr.code : 'N/A',
          message: mediaErr ? mediaErr.message : 'unknown',
          networkState: self.audioElement.networkState,
          readyState: self.audioElement.readyState,
          src: (self.currentUrl || '').substring(0, 120)
        };
        var codeNames = {
          1: 'ABORTED',
          2: 'NETWORK',
          3: 'DECODE',
          4: 'SRC_NOT_SUPPORTED'
        };
        var codeName = codeNames[errorInfo.code] || 'UNKNOWN';
        console.error('[WebPlayer] 🔴 ERROR:', codeName, '(' + errorInfo.code + ')', errorInfo.message);
        console.error('[WebPlayer] 🔴 Network state:', errorInfo.networkState, '| Ready state:', errorInfo.readyState);
        console.error('[WebPlayer] 🔴 URL:', errorInfo.src);
        self.onError && self.onError(e);
      });
      this.audioElement.addEventListener('timeupdate', function () {
        self.onTimeUpdate && self.onTimeUpdate(self.audioElement.currentTime);
      });
      this.audioElement.addEventListener('waiting', function () {
        console.log('[WebPlayer] ⏳ waiting/buffering...');
        self.onBuffering && self.onBuffering();
      });
      this.audioElement.addEventListener('stalled', function () {
        console.warn('[WebPlayer] ⚠️ stalled - data transfer interrupted');
      });
      this.audioElement.addEventListener('abort', function () {
        console.warn('[WebPlayer] ⚠️ abort - loading aborted');
      });
      this.audioElement.addEventListener('loadstart', function () {
        console.log('[WebPlayer] 📥 loadstart - beginning to load:', (self.currentUrl || '').substring(0, 80));
      });
      this.play = function (url) {
        self.currentUrl = url;
        console.log('[WebPlayer] 🎵 play() called with:', url.substring(0, 120));
        self.audioElement.src = url;
        self.audioElement.load();
        var playPromise = self.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.then(function () {
            console.log('[WebPlayer] ✅ play() promise resolved');
          })["catch"](function (error) {
            console.error('[WebPlayer] 🔴 play() promise rejected:', error.name, error.message);
            self.onError && self.onError(error);
          });
        }
      };
      this.pause = function () {
        self.audioElement.pause();
      };
      this.resume = function () {
        var playPromise = self.audioElement.play();
        if (playPromise !== undefined) {
          playPromise["catch"](function (error) {
            console.error('Resume error:', error);
            self.onError && self.onError(error);
          });
        }
      };
      this.stop = function () {
        self.isStopping = true;
        self.audioElement.pause();
        self.audioElement.removeAttribute('src');
        self.audioElement.load();
        self.isPlaying = false;
        self.currentUrl = '';
        setTimeout(function () {
          self.isStopping = false;
        }, 100);
        self.onStop && self.onStop();
      };
      this.setVolume = function (vol) {
        self.volume = Math.max(0, Math.min(1, vol));
        self.audioElement.volume = self.volume;
      };
    },
    getState: function getState() {
      return {
        isPlaying: this.isPlaying,
        url: this.currentUrl,
        volume: this.volume,
        platform: this.platform
      };
    }
  };
})();