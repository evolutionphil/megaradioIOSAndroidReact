import { useEffect, RefObject } from "react";

/**
 * Mouse drag-to-scroll for horizontal lists on Windows / Linux where there are
 * no visible scrollbars and trackpad-swipe is not available. Pointer-based so
 * it works identically on mouse, trackpad and touch. The lift-threshold keeps
 * single clicks on station cards intact so D-pad / keyboard navigation is not
 * affected.
 *
 * We deliberately avoid `setPointerCapture()` because on some browser-driver
 * combinations (notably synthetic drivers like Playwright) capturing the
 * pointer on the child card silently drops subsequent pointermove events on
 * the scroller. Instead we move/up listeners are registered on `window` once
 * a drag starts, which is the standard pattern used by Google Maps, Notion
 * etc. for horizontal carousels.
 */
export function useDragScroll<T extends HTMLElement>(ref: RefObject<T>, opts?: { threshold?: number }) {
  const threshold = opts?.threshold ?? 6;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > threshold) {
        moved = true;
        el.classList.add("is-dragging");
      }
      if (moved) {
        e.preventDefault();
        el.scrollLeft = startScroll - dx;
      }
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      if (moved) {
        // Swallow the click that follows a real drag so cards don't open.
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          el.removeEventListener("click", swallow, true);
        };
        el.addEventListener("click", swallow, true);
      }
      el.classList.remove("is-dragging");
      moved = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // native touch scroll handles itself
      if (e.button !== 0) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      // Window-level listeners so the drag keeps tracking even when the
      // pointer leaves the scroller or hovers a child card.
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    };

    el.addEventListener("pointerdown", onPointerDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [ref, threshold]);
}
