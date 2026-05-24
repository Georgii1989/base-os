"use client";

import { BaseOsAppIcon } from "@/components/BaseOsAppIcon";

const ORBIT_MODULES = [
  { label: "Swap", symbol: "⇄", angle: 0, delay: "0s" },
  { label: "Bridge", symbol: "↗", angle: 60, delay: "0.4s" },
  { label: "Launch", symbol: "⬡", angle: 120, delay: "0.8s" },
  { label: "Score", symbol: "◇", angle: 180, delay: "1.2s" },
  { label: "Tip", symbol: "✦", angle: 240, delay: "1.6s" },
  { label: "Guard", symbol: "⎊", angle: 300, delay: "2s" },
] as const;

function orbitPosition(angleDeg: number, radiusX: number, radiusY: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 120 + Math.cos(rad) * radiusX,
    y: 72 + Math.sin(rad) * radiusY,
  };
}

export function BaseOsHeroVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto select-none os-animate-float ${className}`} aria-hidden>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-32 w-32 rounded-full bg-fuchsia-500/35 blur-3xl os-animate-glow" />
        <div className="absolute h-24 w-40 rounded-full bg-cyan-400/30 blur-2xl os-animate-glow [animation-delay:1.5s]" />
        <div className="absolute h-16 w-16 rounded-full bg-violet-500/40 blur-xl os-animate-glow [animation-delay:0.75s]" />
      </div>

      <svg
        viewBox="0 0 240 144"
        className="relative h-full w-full overflow-visible drop-shadow-[0_0_24px_rgba(168,85,247,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="os-orbit-a" x1="0" y1="0" x2="240" y2="144">
            <stop stopColor="#22D3EE" stopOpacity="0.75" />
            <stop offset="0.5" stopColor="#A855F7" stopOpacity="0.55" />
            <stop offset="1" stopColor="#EC4899" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="os-orbit-b" x1="240" y1="0" x2="0" y2="144">
            <stop stopColor="#EC4899" stopOpacity="0.45" />
            <stop offset="1" stopColor="#22D3EE" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id="os-core-glow" cx="50%" cy="50%" r="50%">
            <stop stopColor="#A855F7" stopOpacity="0.35" />
            <stop offset="1" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>
          <filter id="os-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="120" cy="72" r="54" fill="url(#os-core-glow)" className="os-animate-ring" />

        <ellipse
          cx="120"
          cy="72"
          rx="98"
          ry="42"
          stroke="url(#os-orbit-a)"
          strokeWidth="1.25"
          strokeDasharray="5 5"
          className="origin-center animate-[spin_40s_linear_infinite]"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
        <ellipse
          cx="120"
          cy="72"
          rx="72"
          ry="56"
          stroke="url(#os-orbit-b)"
          strokeWidth="1"
          strokeDasharray="4 7"
          className="origin-center animate-[spin_28s_linear_infinite_reverse]"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
        <ellipse
          cx="120"
          cy="72"
          rx="52"
          ry="28"
          stroke="rgba(34,211,238,0.25)"
          strokeWidth="0.75"
          strokeDasharray="2 10"
          className="origin-center animate-[spin_20s_linear_infinite]"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />

        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const p = orbitPosition(deg, 82, 38);
          return (
            <circle
              key={deg}
              cx={p.x}
              cy={p.y}
              r="2"
              fill="#67E8F9"
              opacity="0.7"
              className="animate-pulse"
            />
          );
        })}

        {ORBIT_MODULES.map((mod) => {
          const p = orbitPosition(mod.angle, 92, 38);
          return (
            <g key={mod.label} filter="url(#os-glow)">
              <circle
                cx={p.x}
                cy={p.y}
                r="16"
                fill="#0c0618"
                stroke="rgba(34,211,238,0.35)"
                strokeWidth="1.25"
                className="animate-pulse"
                style={{ animationDelay: mod.delay }}
              />
              <text
                x={p.x}
                y={p.y + 4.5}
                textAnchor="middle"
                fill="#F5D0FE"
                fontSize="11"
                fontFamily="system-ui, sans-serif"
                fontWeight="700"
              >
                {mod.symbol}
              </text>
            </g>
          );
        })}

        <line x1="120" y1="72" x2="28" y2="72" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
        <line x1="120" y1="72" x2="212" y2="72" stroke="rgba(236,72,153,0.2)" strokeWidth="1" />
        <line x1="120" y1="72" x2="120" y2="18" stroke="rgba(168,85,247,0.15)" strokeWidth="1" />
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute -inset-4 rounded-[1.6rem] bg-gradient-to-br from-cyan-400/50 via-violet-500/40 to-fuchsia-500/50 blur-md os-animate-glow" />
          <div className="absolute -inset-1 rounded-[1.35rem] border border-cyan-300/30 os-animate-ring" />
          <div className="relative overflow-hidden rounded-[1.15rem] border border-white/25 bg-[#070313] p-0.5 shadow-[0_0_48px_rgba(168,85,247,0.55),0_0_80px_rgba(34,211,238,0.2)]">
            <BaseOsAppIcon size={56} className="rounded-[1rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
