/** Coordinates on the existing 1920×1080 stage; main.tsx scales the whole stage. */
export const TV_LAYOUT = {
  width: 1920,
  height: 1080,
  sidebarLeft: 48,
  sidebarWidth: 120,
  contentLeft: 236,
  contentRight: 74,
  playerHeight: 155,
  bottomGap: 24,
} as const;

/** RadioPlaying's header name and favorite frame share this right-edge anchor. */
export const RADIO_PLAYER_CONTROLS = {
  left: 1372,
  favoriteOffset: 378.81,
  buttonSize: 90.192,
} as const;

export const RADIO_PLAYER_RIGHT = RADIO_PLAYER_CONTROLS.left +
  RADIO_PLAYER_CONTROLS.favoriteOffset + RADIO_PLAYER_CONTROLS.buttonSize;

export const contentBottomInset = (hasPlayer: boolean): number =>
  hasPlayer ? TV_LAYOUT.playerHeight + TV_LAYOUT.bottomGap : TV_LAYOUT.bottomGap;

/** DOM rectangles are scaled, scrollTop is not. Keep D-pad scroll correct at 720p/4K. */
export function revealTvItem(container: HTMLElement, item: HTMLElement, topGap = 20, bottomGap = 24, behavior: ScrollBehavior = 'auto') {
  const viewport = container.getBoundingClientRect();
  const bounds = item.getBoundingClientRect();
  const scale = viewport.height / container.offsetHeight || 1;
  const above = viewport.top + topGap * scale - bounds.top;
  const below = bounds.bottom - viewport.bottom + bottomGap * scale;
  const delta = above > 1 ? -above / scale : below > 1 ? below / scale : 0;
  if (!delta) return;
  if (behavior === 'auto') container.scrollTop += delta;
  else container.scrollTo({ top: container.scrollTop + delta, behavior });
}

/** Reveal only this carousel, using its real card bounds (including scale/gaps). */
export function revealTvItemHorizontally(container: HTMLElement, item: HTMLElement, gap = 12) {
  const viewport = container.getBoundingClientRect();
  const bounds = item.getBoundingClientRect();
  const scale = viewport.width / container.offsetWidth || 1;
  const before = viewport.left + gap * scale - bounds.left;
  const after = bounds.right - viewport.right + gap * scale;
  if (before > 1) container.scrollTo({ left: container.scrollLeft - before / scale, behavior: 'smooth' });
  else if (after > 1) container.scrollTo({ left: container.scrollLeft + after / scale, behavior: 'smooth' });
}
