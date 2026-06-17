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
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    const drawCtx: CanvasRenderingContext2D = context;

    let raf = 0;

    function resize() {
      const node = canvasRef.current;
      if (!node) return;
      const dpr = window.devicePixelRatio || 1;
      node.width = Math.floor(window.innerWidth * dpr);
      node.height = Math.floor(window.innerHeight * dpr);
      node.style.width = `${window.innerWidth}px`;
      node.style.height = `${window.innerHeight}px`;
      drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scroll = scrollRef.current;
      const reduced = motionRef.current;

      drawCtx.clearRect(0, 0, w, h);

      for (const star of stars) {
        const speed = LAYER_SPEED[star.layer];
        const drift = LAYER_DRIFT[star.layer];
        const yShift = reduced ? 0 : -scroll * speed;
        const xShift = reduced ? 0 : scroll * drift;
        const x = star.x * w + xShift;
        const y = ((star.y * h * 1.4 - h * 0.2 + yShift) % (h * 1.4)) - h * 0.2;

        drawCtx.beginPath();
        drawCtx.fillStyle = `rgba(255,255,255,${star.a})`;
        drawCtx.arc(x, y, star.r, 0, Math.PI * 2);
        drawCtx.fill();
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
