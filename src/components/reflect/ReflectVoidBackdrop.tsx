"use client";

import { useEffect, useRef, useState } from "react";
import { ReflectParallaxStars } from "@/components/reflect/ReflectParallaxStars";
import { useScrollOffset } from "@/hooks/useScrollOffset";

const VOID_VIDEO_SRC = "/media/grok-void.mp4";

type Props = {
  staticMode?: boolean;
};

export function ReflectVoidBackdrop({ staticMode = false }: Props) {
  const scrollY = useScrollOffset();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const motionOff = staticMode || reducedMotion;
  const videoParallax = motionOff ? 0 : scrollY * 0.07;
  const nebulaParallax = motionOff ? 0 : scrollY * 0.04;

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
    <div className="reflect-void-backdrop" aria-hidden>
      <ReflectParallaxStars scrollY={scrollY} reducedMotion={motionOff} />

      <div
        className="reflect-void-backdrop__nebula"
        style={{ transform: `translate3d(0, ${-nebulaParallax}px, 0)` }}
      />

      <div
        className="reflect-void-backdrop__video-shell"
        style={{ transform: `translate3d(-50%, calc(-50% + ${videoParallax}px), 0)` }}
      >
        <div className="reflect-void-backdrop__halo" aria-hidden />
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

      <div className="reflect-void-backdrop__glow" />
      <div className="reflect-void-backdrop__vignette" />
      <div className="reflect-void-backdrop__horizon" />
    </div>
  );
}
