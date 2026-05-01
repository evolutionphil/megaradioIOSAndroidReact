import { useEffect, RefObject } from "react";

/**
 * Mouse drag-to-scroll for horizontal lists on Windows / Linux where there are
 * no visible scrollbars and trackpad-swipe is not available. Pointer-based so
 * it works identically on mouse, trackpad and touch. The lift-threshold keeps
 * single clicks on station cards intact so D-pad / keyboard navigation is not
 * affected.
 *
 * Attach the returned ref handler by passing an existing ref of the horizontal
 * container. Cards inside can still receive click events because we only
 * suppress clicks after the pointer has actually moved beyond the threshold.
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
    let pointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // native touch scroll handles itself
      if (e.button !== 0) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      pointerId = e.pointerId;
      // Do not setPointerCapture yet — we only want to "own" the pointer if the
      // user actually drags, so plain clicks still bubble to the card below.
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > threshold) {
        moved = true;
        el.classList.add("is-dragging");
        try { if (pointerId !== null) el.setPointerCapture(pointerId); } catch {}
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
        // Swallow the click that follows a real drag, so cards don't open.
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          el.removeEventListener("click", swallow, true);
        };
        el.addEventListener("click", swallow, true);
      }
      el.classList.remove("is-dragging");
      try { if (pointerId !== null) el.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      moved = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", endDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("pointerleave", endDrag);
    };
  }, [ref, threshold]);
}
