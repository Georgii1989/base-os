"use client";

import { useEffect, useState } from "react";

function detectLiteBackdrop(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (window.matchMedia("(max-width: 1024px)").matches) return true;

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return true;

  const cores = navigator.hardwareConcurrency ?? 8;
  if (cores > 0 && cores <= 4) return true;

  return false;
}

/** Lite backdrop: static gradient, no video/canvas parallax (see scroll-performance rule). */
export function useLiteBackdrop(): boolean {
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const sync = () => setLite(detectLiteBackdrop());
    sync();

    const queries = [
      "(prefers-reduced-motion: reduce)",
      "(pointer: coarse)",
      "(max-width: 1024px)",
    ];
    const cleanups = queries.map((query) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return lite;
}
