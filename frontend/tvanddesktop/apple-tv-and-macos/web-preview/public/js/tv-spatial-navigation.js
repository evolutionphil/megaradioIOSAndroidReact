// TV Spatial Navigation System - Smart directional focus
(function() {
    'use strict';
    
    console.log('[TV Spatial Nav] Script loaded and executing... v2.0 - Sidebar isolation enabled');

    window.tvSpatialNav = {
        focusedElement: null,
        focusableElements: [],
        scrollEnabled: true,
        
        init: function() {
            this.updateFocusableElements();
            // Focus first element on page load
            if (this.focusableElements.length > 0) {
                console.log('[TV Nav] Initialized with', this.focusableElements.length, 'focusable elements');
                
                // Try to find and focus the Discover button first (sidebar), otherwise first element
                const discoverBtn = this.focusableElements.find(el => 
                    el.dataset.testid === 'button-discover' || 
                    (el.textContent && el.textContent.includes('Discover'))
                );
                
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
        
        updateFocusableElements: function() {
            // Get all focusable elements with spatial data
            // Include both direct focusable elements AND their parent links
            const selector = 'button:not([disabled]), a[href], [data-tv-focusable="true"], [tabindex]:not([tabindex="-1"])';
            
            this.focusableElements = Array.from(document.querySelectorAll(selector))
                .filter(el => {
                    const rect = el.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    const hasParent = el.offsetParent !== null;
                    
                    // Also check if element is inside scrollable container
                    const isInScrollable = el.closest('[class*="overflow"]') !== null;
                    
                    return isVisible && (hasParent || isInScrollable);
                });
            
            console.log('[TV Nav] Found', this.focusableElements.length, 'focusable elements');
            
            // Debug: Log what types of elements we found
            if (this.focusableElements.length > 0) {
                const types = this.focusableElements.reduce((acc, el) => {
                    const type = el.dataset.testid || el.tagName.toLowerCase();
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {});
                console.log('[TV Nav] Element types:', types);
            }
        },
        
        focus: function(element) {
            if (!element) {
                console.warn('[TV Nav] Attempted to focus null element');
                return;
            }
            
            // Remove focus from previous element
            if (this.focusedElement && this.focusedElement !== element) {
                this.focusedElement.classList.remove('tv-focused');
            }
            
            // Add focus to new element
            element.classList.add('tv-focused');
            this.focusedElement = element;
            
            console.log('[TV Nav] Focused:', element.dataset.testid || (element.textContent && element.textContent.trim().substring(0, 20)) || element.tagName);
            
            if (this.scrollEnabled) {
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        },
        
        getElementCenter: function(el) {
            const rect = el.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                rect: rect
            };
        },
        
        isSidebarElement: function(el) {
            // Check if element is a sidebar button
            const testId = el.dataset.testid || '';
            return testId === 'button-discover' || 
                   testId === 'button-genres' || 
                   testId === 'button-search' || 
                   testId === 'button-favorites' || 
                   testId === 'button-records' || 
                   testId === 'button-settings';
        },
        
        findBestMatch: function(direction) {
            if (!this.focusedElement) {
                return this.focusableElements[0] || null;
            }
            
            const current = this.getElementCenter(this.focusedElement);
            const currentIsSidebar = this.isSidebarElement(this.focusedElement);
            let bestElement = null;
            let bestScore = Infinity;
            
            this.focusableElements.forEach(el => {
                if (el === this.focusedElement) return;
                
                const candidate = this.getElementCenter(el);
                const candidateIsSidebar = this.isSidebarElement(el);
                let score = Infinity;
                let isValidDirection = false;
                
                // CRITICAL RULE: UP/DOWN never cross between sidebar and content
                // Only LEFT/RIGHT can move between sidebar and content
                if ((direction === 'UP' || direction === 'DOWN') && 
                    (currentIsSidebar !== candidateIsSidebar)) {
                    // Skip this candidate - cannot navigate UP/DOWN between zones
                    console.log('[TV Nav] Blocking', direction, 'from', 
                        (currentIsSidebar ? 'sidebar' : 'content'), 'to', 
                        (candidateIsSidebar ? 'sidebar' : 'content'),
                        '- current:', this.focusedElement.dataset.testid,
                        '- candidate:', el.dataset.testid);
                    return;
                }
                
                switch(direction) {
                    case 'UP':
                        // Element must be above current AND have horizontal overlap
                        if (candidate.y < current.y - 10) {
                            // SPECIAL RULE: Check if navigating from station card to player control
                            const isPlayerControl = el.dataset.testid && 
                                (el.dataset.testid === 'button-play-pause' || 
                                 el.dataset.testid === 'button-previous' || 
                                 el.dataset.testid === 'button-next' ||
                                 el.dataset.testid === 'button-favorite');
                            const isFromStationCard = this.focusedElement.dataset.testid && 
                                (this.focusedElement.dataset.testid.startsWith('card-similar-') ||
                                 this.focusedElement.dataset.testid.startsWith('card-popular-'));
                            
                            // Use larger tolerance for player controls from station cards
                            const tolerance = (isFromStationCard && isPlayerControl) ? 1200 : 300;
                            
                            const hasHorizontalOverlap = 
                                candidate.rect.right >= current.rect.left - tolerance &&
                                candidate.rect.left <= current.rect.right + tolerance;
                            
                            if (hasHorizontalOverlap) {
                                isValidDirection = true;
                                const verticalDist = current.y - candidate.y;
                                const horizontalDist = Math.abs(current.x - candidate.x);
                                
                                if (isFromStationCard && isPlayerControl) {
                                    // Heavily prioritize player controls when coming from station cards
                                    score = verticalDist + (horizontalDist * 0.1);
                                } else {
                                    // Normal scoring
                                    score = verticalDist + (horizontalDist * 2);
                                }
                            }
                        }
                        break;
                        
                    case 'DOWN':
                        // Element must be below current AND have horizontal overlap
                        if (candidate.y > current.y + 10) {
                            // Check horizontal overlap with tolerance (300px for sidebar->content jumps)
                            const tolerance = 300;
                            const hasHorizontalOverlap = 
                                candidate.rect.right >= current.rect.left - tolerance &&
                                candidate.rect.left <= current.rect.right + tolerance;
                            
                            if (hasHorizontalOverlap) {
                                isValidDirection = true;
                                const verticalDist = candidate.y - current.y;
                                const horizontalDist = Math.abs(current.x - candidate.x);
                                // Prefer elements directly below
                                score = verticalDist + (horizontalDist * 2);
                            }
                        }
                        break;
                        
                    case 'LEFT':
                        // Element must be to the left
                        if (candidate.x < current.x - 10) {
                            isValidDirection = true;
                            const horizontalDist = current.x - candidate.x;
                            const verticalDist = Math.abs(current.y - candidate.y);
                            // Prefer elements directly to the left
                            score = horizontalDist + (verticalDist * 2);
                        }
                        break;
                        
                    case 'RIGHT':
                        // Element must be to the right
                        if (candidate.x > current.x + 10) {
                            isValidDirection = true;
                            const horizontalDist = candidate.x - current.x;
                            const verticalDist = Math.abs(current.y - candidate.y);
                            // Prefer elements directly to the right
                            score = horizontalDist + (verticalDist * 2);
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
        
        navigate: function(direction) {
            const nextElement = this.findBestMatch(direction);
            if (nextElement) {
                console.log('[TV Nav] Moving', direction, 'to:', nextElement.dataset.testid || nextElement.tagName);
                this.focus(nextElement);
            } else {
                console.log('[TV Nav] No element found in direction:', direction, '- keeping current focus');
                // Keep focus on current element when no valid target found
                if (this.focusedElement) {
                    // Re-apply focus styling to ensure it's visible
                    this.focus(this.focusedElement);
                }
            }
        },
        
        select: function() {
            if (this.focusedElement) {
                this.focusedElement.click();
            }
        },
        
        handleMouseOver: function(e) {
            const target = e.target.closest('button, a, [data-tv-focusable="true"], [tabindex]:not([tabindex="-1"])');
            if (target && this.focusableElements.includes(target)) {
                this.focus(target);
            }
        }
    };
    
    // Initialize when DOM is ready - but DON'T call init() yet!
    // Let the React hook (useTVNavigation) handle initialization after elements render
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[TV Spatial Nav] DOM ready, waiting for React...');
            // DON'T call init() here - React hook will call it
        });
    } else {
        console.log('[TV Spatial Nav] DOM already ready, waiting for React...');
        // DON'T call init() here - React hook will call it
    }
})();
