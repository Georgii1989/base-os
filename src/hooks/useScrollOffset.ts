"use client";

import { useEffect, useState } from "react";

/** Smooth scroll offset for parallax (rAF-throttled). */
export function useScrollOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame = 0;
    let latest = window.scrollY;

    function onScroll() {
      latest = window.scrollY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setOffset(latest);
        frame = 0;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return offset;
}
