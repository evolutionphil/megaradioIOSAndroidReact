import type { NavigationState } from '@/contexts/NavigationContext';
import { revealTvItem } from './tvLayout';

export function captureNavigationScroll() {
  const scroll: NonNullable<NavigationState['scroll']> = {};
  document.querySelectorAll<HTMLElement>('[data-testid]').forEach(el => {
    if (el.clientHeight && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
      scroll[el.dataset.testid!] = { top: el.scrollTop, left: el.scrollLeft };
    }
  });
  return scroll;
}

/** Run after page focus effects, without timers or a root-level scrollIntoView. */
export function restoreNavigationPosition(state: NavigationState) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (window.location.hash.replace(/^#/, '').split('?')[0] !== state.previousPage) return;
    document.querySelectorAll<HTMLElement>('[data-testid]').forEach(el => {
      const saved = state.scroll?.[el.dataset.testid!];
      if (saved) { el.scrollTop = saved.top; el.scrollLeft = saved.left; }
    });
    const entry = Array.from(document.querySelectorAll<HTMLElement>('[data-station-id]')).find(el =>
      el.dataset.stationId === state.returnStationId && (!state.returnSection || el.dataset.navSection === state.returnSection));
    const card = entry?.querySelector<HTMLElement>('[data-focus-idx]') || entry;
    if (!card) return;
    // The page's pink state indicator owns TV focus; avoid a second browser outline.
    card.classList.add('tv-restored-card');
    card.tabIndex = -1;
    card.focus({ preventScroll: true });
    // A newly visible mini-player can make the old scroll position too low.
    let parent = card.parentElement;
    while (parent && parent.id !== 'root') {
      if (parent.clientHeight && parent.scrollHeight > parent.clientHeight && /auto|scroll/.test(getComputedStyle(parent).overflowY)) revealTvItem(parent, card);
      parent = parent.parentElement;
    }
  }));
}

export function isTvBackKey(event: KeyboardEvent): boolean {
  return ['Escape', 'Backspace', 'BrowserBack', 'GoBack'].includes(event.key) ||
    [4, 8, 27, 461, 10009].includes(event.keyCode);
}