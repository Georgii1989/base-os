"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  scrollY: number;
  reducedMotion?: boolean;
};

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  layer: number;
};

const LAYER_SPEED = [0.02, 0.05, 0.1, 0.16, 0.24] as const;
const LAYER_DRIFT = [0.008, 0.012, 0.018, 0.024, 0.032] as const;

function buildStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    const layer = i % LAYER_SPEED.length;
    stars.push({
      x: ((i * 53 + layer * 17) % 1000) / 1000,
      y: ((i * 97 + layer * 31) % 1000) / 1000,
      r: 0.6 + (i % 3) * 0.35 + layer * 0.08,
      a: 0.25 + (i % 7) * 0.1,
      layer,
    });
  }
  return stars;
}

export function ReflectParallaxStars({ scrollY, reducedMotion = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(scrollY);
  const motionRef = useRef(reducedMotion);
  const stars = useMemo(() => buildStars(220), []);

  scrollRef.current = scrollY;
  motionRef.current = reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (!ctx || !canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scroll = scrollRef.current;
      const reduced = motionRef.current;

      ctx.clearRect(0, 0, w, h);

      for (const star of stars) {
        const speed = LAYER_SPEED[star.layer];
        const drift = LAYER_DRIFT[star.layer];
        const yShift = reduced ? 0 : -scroll * speed;
        const xShift = reduced ? 0 : scroll * drift;
        const x = star.x * w + xShift;
        const y = ((star.y * h * 1.4 - h * 0.2 + yShift) % (h * 1.4)) - h * 0.2;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${star.a})`;
        ctx.arc(x, y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame() {
      draw();
      raf = window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, [stars]);

  return (
    <div className="reflect-starfield">
      <canvas ref={canvasRef} className="reflect-starfield__canvas" />
      <div className="reflect-starfield__dust" aria-hidden />
    </div>
  );
}
