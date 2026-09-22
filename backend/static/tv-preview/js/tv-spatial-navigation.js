(function () {
  'use strict';

  console.log('[TV Spatial Nav] Script loaded and executing... v2.0 - Sidebar isolation enabled');
  window.tvSpatialNav = {
    focusedElement: null,
    focusableElements: [],
    scrollEnabled: true,
    init: function init() {
      this.updateFocusableElements();
      if (this.focusableElements.length > 0) {
        console.log('[TV Nav] Initialized with', this.focusableElements.length, 'focusable elements');
        var discoverBtn = this.focusableElements.find(function (el) {
          return el.dataset.testid === 'button-discover' || el.textContent && el.textContent.includes('Discover');
        });
        if (discoverBtn) {
          console.log('[TV Nav] Initial focus on Discover button');
          this.focus(discoverBtn);
        } else {
          console.log('[TV Nav] Initial focus on first element');
          this.focus(this.focusableElements[0]);
        }
      } else {
        console.warn('[TV Nav] No focusable elements found!');
      }
    },
    updateFocusableElements: function updateFocusableElements() {
      var selector = 'button:not([disabled]), a[href], [data-tv-focusable="true"], [tabindex]:not([tabindex="-1"])';
      this.focusableElements = Array.from(document.querySelectorAll(selector)).filter(function (el) {
        var rect = el.getBoundingClientRect();
        var isVisible = rect.width > 0 && rect.height > 0;
        var hasParent = el.offsetParent !== null;
        var isInScrollable = el.closest('[class*="overflow"]') !== null;
        return isVisible && (hasParent || isInScrollable);
      });
      console.log('[TV Nav] Found', this.focusableElements.length, 'focusable elements');
      if (this.focusableElements.length > 0) {
        var types = this.focusableElements.reduce(function (acc, el) {
          var type = el.dataset.testid || el.tagName.toLowerCase();
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        console.log('[TV Nav] Element types:', types);
      }
    },
    focus: function focus(element) {
      if (!element) {
        console.warn('[TV Nav] Attempted to focus null element');
        return;
      }
      if (this.focusedElement && this.focusedElement !== element) {
        this.focusedElement.classList.remove('tv-focused');
      }
      element.classList.add('tv-focused');
      this.focusedElement = element;
      console.log('[TV Nav] Focused:', element.dataset.testid || element.textContent && element.textContent.trim().substring(0, 20) || element.tagName);
      if (this.scrollEnabled) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    },
    getElementCenter: function getElementCenter(el) {
      var rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        rect: rect
      };
    },
    isSidebarElement: function isSidebarElement(el) {
      var testId = el.dataset.testid || '';
      return testId === 'button-discover' || testId === 'button-genres' || testId === 'button-search' || testId === 'button-favorites' || testId === 'button-records' || testId === 'button-settings';
    },
    isHeaderElement: function isHeaderElement(el) {
      var rect = el.getBoundingClientRect();
      return rect.top < 180 && !this.isSidebarElement(el);
    },
    findBestMatch: function findBestMatch(direction) {
      var _this = this;
      if (!this.focusedElement) {
        return this.focusableElements[0] || null;
      }
      var current = this.getElementCenter(this.focusedElement);
      var currentIsSidebar = this.isSidebarElement(this.focusedElement);
      var bestElement = null;
      var bestScore = Infinity;
      this.focusableElements.forEach(function (el) {
        if (el === _this.focusedElement) return;
        var candidate = _this.getElementCenter(el);
        var candidateIsSidebar = _this.isSidebarElement(el);
        var score = Infinity;
        var isValidDirection = false;
        if ((direction === 'UP' || direction === 'DOWN') && currentIsSidebar !== candidateIsSidebar) {
          console.log('[TV Nav] Blocking', direction, 'from', currentIsSidebar ? 'sidebar' : 'content', 'to', candidateIsSidebar ? 'sidebar' : 'content', '- current:', _this.focusedElement.dataset.testid, '- candidate:', el.dataset.testid);
          return;
        }
        if (direction === 'RIGHT' && currentIsSidebar && _this.isHeaderElement(el)) {
          return;
        }
        if (direction === 'LEFT' && _this.isHeaderElement(_this.focusedElement) && candidateIsSidebar) {
          return;
        }
        switch (direction) {
          case 'UP':
            if (candidate.y < current.y - 10) {
              var isPlayerControl = el.dataset.testid && (el.dataset.testid === 'button-play-pause' || el.dataset.testid === 'button-previous' || el.dataset.testid === 'button-next' || el.dataset.testid === 'button-favorite');
              var isFromStationCard = _this.focusedElement.dataset.testid && (_this.focusedElement.dataset.testid.startsWith('card-similar-') || _this.focusedElement.dataset.testid.startsWith('card-popular-'));
              var tolerance = isFromStationCard && isPlayerControl ? 1200 : 300;
              var hasHorizontalOverlap = candidate.rect.right >= current.rect.left - tolerance && candidate.rect.left <= current.rect.right + tolerance;
              if (hasHorizontalOverlap) {
                isValidDirection = true;
                var verticalDist = current.y - candidate.y;
                var horizontalDist = Math.abs(current.x - candidate.x);
                if (isFromStationCard && isPlayerControl) {
                  score = verticalDist + horizontalDist * 0.1;
                } else {
                  score = verticalDist + horizontalDist * 2;
                }
              }
            }
            break;
          case 'DOWN':
            if (candidate.y > current.y + 10) {
              var _tolerance = 300;
              var _hasHorizontalOverlap = candidate.rect.right >= current.rect.left - _tolerance && candidate.rect.left <= current.rect.right + _tolerance;
              if (_hasHorizontalOverlap) {
                isValidDirection = true;
                var _verticalDist = candidate.y - current.y;
                var _horizontalDist = Math.abs(current.x - candidate.x);
                score = _verticalDist + _horizontalDist * 2;
              }
            }
            break;
          case 'LEFT':
            if (candidate.x < current.x - 10) {
              isValidDirection = true;
              var _horizontalDist2 = current.x - candidate.x;
              var _verticalDist2 = Math.abs(current.y - candidate.y);
              score = _horizontalDist2 + _verticalDist2 * 2;
            }
            break;
          case 'RIGHT':
            if (candidate.x > current.x + 10) {
              isValidDirection = true;
              var _horizontalDist3 = candidate.x - current.x;
              var _verticalDist3 = Math.abs(current.y - candidate.y);
              score = _horizontalDist3 + _verticalDist3 * 2;
            }
            break;
        }
        if (isValidDirection && score < bestScore) {
          bestScore = score;
          bestElement = el;
        }
      });
      return bestElement;
    },
    findFallbackMatch: function findFallbackMatch(direction) {
      var _this2 = this;
      if (!this.focusedElement) return null;
      if (direction !== 'UP' && direction !== 'DOWN') return null;
      var current = this.getElementCenter(this.focusedElement);
      var currentIsSidebar = this.isSidebarElement(this.focusedElement);
      var bestElement = null;
      var bestScore = Infinity;
      this.focusableElements.forEach(function (el) {
        if (el === _this2.focusedElement) return;
        var candidate = _this2.getElementCenter(el);
        var candidateIsSidebar = _this2.isSidebarElement(el);
        if (currentIsSidebar !== candidateIsSidebar) return;
        var dy = 0;
        if (direction === 'UP') dy = current.y - candidate.y;
        if (direction === 'DOWN') dy = candidate.y - current.y;
        if (dy <= 10) return;
        var dx = Math.abs(current.x - candidate.x);
        var score = dy + dx * 0.5;
        if (score < bestScore) {
          bestScore = score;
          bestElement = el;
        }
      });
      return bestElement;
    },
    navigate: function navigate(direction) {
      var nextElement = this.findBestMatch(direction);
      if (!nextElement) {
        var fallback = this.findFallbackMatch(direction);
        if (fallback) {
          console.log('[TV Nav] Fallback', direction, 'to:', fallback.dataset.testid || fallback.tagName);
          nextElement = fallback;
        }
      }
      if (nextElement) {
        console.log('[TV Nav] Moving', direction, 'to:', nextElement.dataset.testid || nextElement.tagName);
        this.focus(nextElement);
      } else {
        console.log('[TV Nav] No element found in direction:', direction, '- keeping current focus');
        if (this.focusedElement) {
          this.focus(this.focusedElement);
        }
      }
    },
    select: function select() {
      if (this.focusedElement) {
        this.focusedElement.click();
      }
    },
    handleMouseOver: function handleMouseOver(e) {
      var target = e.target.closest('button, a, [data-tv-focusable="true"], [tabindex]:not([tabindex="-1"])');
      if (target && this.focusableElements.includes(target)) {
        this.focus(target);
      }
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      console.log('[TV Spatial Nav] DOM ready, waiting for React...');
    });
  } else {
    console.log('[TV Spatial Nav] DOM already ready, waiting for React...');
  }
})();