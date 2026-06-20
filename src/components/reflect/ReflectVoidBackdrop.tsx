"use client";

import { useEffect, useMemo, useRef } from "react";
import { ReflectParallaxStars } from "@/components/reflect/ReflectParallaxStars";
import { useLiteBackdrop } from "@/hooks/useLiteBackdrop";
import { useParallaxScroll } from "@/hooks/useParallaxScroll";

const VOID_VIDEO_SRC = "/media/grok-void.mp4";

type Props = {
  staticMode?: boolean;
};

export function ReflectVoidBackdrop({ staticMode = false }: Props) {
  const lite = useLiteBackdrop();
  const motionOff = staticMode || lite;

  const nebulaRef = useRef<HTMLDivElement>(null);
  const videoShellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const parallaxLayers = useMemo(
    () => [
      { ref: nebulaRef, factor: 0.04 },
      { ref: videoShellRef, factor: 0.07, centerX: true },
    ],
    []
  );

  useParallaxScroll(parallaxLayers, !motionOff);

  useEffect(() => {
    if (motionOff) return;
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      void video.play().catch(() => {
        /* autoplay blocked — keep first frame, avoid unhandled rejection */
      });
    };

    tryPlay();
    video.addEventListener("canplay", tryPlay);
    return () => video.removeEventListener("canplay", tryPlay);
  }, [motionOff]);

  return (
    <div
      className={`reflect-void-backdrop${motionOff ? " reflect-void-backdrop--lite" : ""}`}
      aria-hidden
    >
      <ReflectParallaxStars reducedMotion={motionOff} />

      <div ref={nebulaRef} className="reflect-void-backdrop__nebula" />

      {!motionOff ? (
        <div ref={videoShellRef} className="reflect-void-backdrop__video-shell">
          <video
            ref={videoRef}
            className="reflect-void-backdrop__video"
            src={VOID_VIDEO_SRC}
            loop
            muted
            playsInline
            preload="auto"
          />
        </div>
      ) : null}

      <div className="reflect-void-backdrop__glow" />
      <div className="reflect-void-backdrop__vignette" />
      <div className="reflect-void-backdrop__horizon" />
    </div>
  );
}
