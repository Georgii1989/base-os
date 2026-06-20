"use client";

import { useEffect, type RefObject } from "react";

type Layer = {
  ref: RefObject<HTMLElement | null>;
  factor: number;
  /** Extra translateX for centered shells (e.g. -50% left). */
  centerX?: boolean;
};

/**
 * Scroll parallax without React re-renders — ref + single rAF per scroll (scroll-performance rule).
 */
export function useParallaxScroll(layers: Layer[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    let latest = window.scrollY;

    function apply() {
      for (const layer of layers) {
        const node = layer.ref.current;
        if (!node) continue;
        const shift = latest * layer.factor;
        if (layer.centerX) {
          node.style.transform = `translate3d(-50%, calc(-50% + ${shift}px), 0)`;
        } else {
          node.style.transform = `translate3d(0, ${-shift}px, 0)`;
        }
      }
    }

    function onScroll() {
      latest = window.scrollY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        apply();
        frame = 0;
      });
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, layers]);
}
