"use client";

import { useId, type ReactNode } from "react";
import type { OsTabId } from "@/lib/osTabs";

export type OsIconName =
  | "score"
  | "chart"
  | "radar"
  | "wallet"
  | "swap"
  | "launch"
  | "game"
  | "shield"
  | "home"
  | "connect"
  | "bridge"
  | "tip"
  | "gas"
  | "trend-up"
  | "trend-down"
  | "watch"
  | "lens"
  | "battleship"
  | "verify"
  | "external"
  | "search";

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;

type Props = {
  name: OsIconName;
  size?: keyof typeof SIZE_PX;
  className?: string;
};

function IconPaths({ name, stroke }: { name: OsIconName; stroke: string }) {
  const sw = 1.65;
  const cap = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (name) {
    case "score":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth={sw} fill="none" opacity={0.45} />
          <path
            d="M12 3.5a8.5 8.5 0 0 1 7.4 4.3M12 20.5a8.5 8.5 0 0 1-6.8-3.4"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
          <circle cx="12" cy="12" r="2.25" fill={stroke} opacity={0.9} />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M4 19V5" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.35} />
          <rect x="6.5" y="11" width="3" height="8" rx="1" fill={stroke} opacity={0.55} />
          <rect x="10.5" y="7" width="3" height="12" rx="1" fill={stroke} opacity={0.75} />
          <rect x="14.5" y="9.5" width="3" height="9.5" rx="1" fill={stroke} />
          <path d="M5 19h15" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.4} />
        </>
      );
    case "radar":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth={sw} fill="none" opacity={0.4} />
          <circle cx="12" cy="12" r="4.5" stroke={stroke} strokeWidth={sw} fill="none" opacity={0.65} />
          <path d="M12 12 18.5 7.5" stroke={stroke} strokeWidth={sw} {...cap} />
          <circle cx="15.5" cy="9" r="1.35" fill={stroke} />
        </>
      );
    case "wallet":
      return (
        <>
          <rect x="4" y="7" width="16" height="11" rx="2.5" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M4 10.5h16" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.5} />
          <rect x="14.5" y="13" width="3.5" height="2.5" rx="1" fill={stroke} opacity={0.85} />
        </>
      );
    case "swap":
      return (
        <>
          <path
            d="M7 8h9.5M14.5 5.5 17 8l-2.5 2.5M17 16H7.5M9.5 18.5 7 16l2.5-2.5"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
        </>
      );
    case "launch":
      return (
        <>
          <path
            d="M12 4.5 8.5 14h7L12 4.5Z"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
          <path d="M10 17.5h4" stroke={stroke} strokeWidth={sw} {...cap} />
          <path d="M9.5 20h5" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.55} />
          <circle cx="12" cy="10" r="1" fill={stroke} />
        </>
      );
    case "game":
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="2.5" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M9.5 5v14M14.5 5v14M5 9.5h14M5 14.5h14" stroke={stroke} strokeWidth={1.1} opacity={0.35} />
          <circle cx="9.5" cy="9.5" r="1.35" fill={stroke} />
          <circle cx="14.5" cy="14.5" r="1.35" fill={stroke} />
          <circle cx="14.5" cy="9.5" r="1.35" fill={stroke} opacity={0.55} />
        </>
      );
    case "shield":
      return (
        <>
          <path
            d="M12 3.5 18 6v5.2c0 4.1-2.7 6.5-6 8.3-3.3-1.8-6-4.2-6-8.3V6l6-2.5Z"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
          <path d="M9.2 12.2 11 14l3.8-4.2" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
        </>
      );
    case "home":
      return (
        <>
          <path
            d="M5 11.5 12 5l7 6.5V19a1 1 0 0 1-1 1h-4.5v-5H10.5v5H6a1 1 0 0 1-1-1v-7.5Z"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
        </>
      );
    case "connect":
      return (
        <>
          <rect x="4" y="9" width="10" height="8" rx="2" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M14 12.5h3.5a2 2 0 0 1 0 4H14" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
          <circle cx="8" cy="13" r="1.25" fill={stroke} />
        </>
      );
    case "bridge":
      return (
        <>
          <path d="M5 16V8.5M19 16V8.5" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.45} />
          <path d="M5 12.5h14" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.35} />
          <path d="M13 7.5 17 12l-4 4.5" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
        </>
      );
    case "tip":
      return (
        <>
          <path
            d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3M6.8 6.8l2.1 2.1M15.1 15.1l2.1 2.1M17.2 6.8l-2.1 2.1M8.9 15.1l-2.1 2.1"
            stroke={stroke}
            strokeWidth={sw}
            {...cap}
            opacity={0.55}
          />
          <circle cx="12" cy="12" r="3.25" stroke={stroke} strokeWidth={sw} fill="none" />
        </>
      );
    case "gas":
      return (
        <path
          d="M13.2 3.5c0 2.2-1.6 3.4-1.6 5.6 0 1.2.8 2 1.8 2 .9 0 1.6-.7 1.6-1.7 0-2.3-2.8-3.2-2.8-5.9h2.4M10.8 20.5h4.4c2.2 0 3.8-1.4 3.8-3.5S17.4 13.5 15.2 13.5h-6.4c-2.2 0-3.8 1.4-3.8 3.5s1.6 3.5 3.8 3.5Z"
          stroke={stroke}
          strokeWidth={sw}
          fill="none"
          {...cap}
        />
      );
    case "trend-up":
      return (
        <>
          <path d="M5 18V6M5 18h14" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.35} />
          <path d="M8 14.5 11.5 11l2.5 2.5L18 9" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
          <path d="M15.5 9H18v2.5" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
        </>
      );
    case "trend-down":
      return (
        <>
          <path d="M5 18V6M5 18h14" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.35} />
          <path d="M8 10.5 11.5 14l2.5-2.5L18 15" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
          <path d="M15.5 15H18v-2.5" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
        </>
      );
    case "watch":
      return (
        <>
          <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw} fill="none" />
          <path
            d="M12 5c-3.8 0-7 2.2-8.5 5.5 1.5 3.3 4.7 5.5 8.5 5.5s7-2.2 8.5-5.5C19 7.2 15.8 5 12 5Z"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
        </>
      );
    case "lens":
      return (
        <>
          <rect x="6" y="7" width="12" height="10" rx="2" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M9 11h6M9 14h4" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.55} />
          <circle cx="16.5" cy="16.5" r="2.75" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M18.5 18.5 20.5 20.5" stroke={stroke} strokeWidth={sw} {...cap} />
        </>
      );
    case "battleship":
      return (
        <>
          <path d="M6 17h12" stroke={stroke} strokeWidth={sw} {...cap} opacity={0.45} />
          <path
            d="M8 17V9.5l4-2.5 4 2.5V17"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
          <path d="M10 11.5h4M10 14h4" stroke={stroke} strokeWidth={1.2} {...cap} opacity={0.55} />
        </>
      );
    case "verify":
      return (
        <>
          <circle cx="12" cy="9" r="3.25" stroke={stroke} strokeWidth={sw} fill="none" />
          <path
            d="M6.5 18.5c1.2-2.4 3.2-3.8 5.5-3.8s4.3 1.4 5.5 3.8"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            {...cap}
          />
          <path d="M15.5 8.5 16.8 9.8 18.5 7.8" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
        </>
      );
    case "external":
      return (
        <>
          <path d="M9.5 14.5 14.5 9.5M11 9.5h3.5V13" stroke={stroke} strokeWidth={sw} fill="none" {...cap} />
          <rect x="5" y="10" width="9" height="9" rx="2" stroke={stroke} strokeWidth={sw} fill="none" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="5.5" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M15.2 15.2 19 19" stroke={stroke} strokeWidth={sw} {...cap} />
        </>
      );
    default:
      return null;
  }
}

export function OsIcon({ name, size = "md", className = "" }: Props) {
  const gradId = useId();
  const px = SIZE_PX[size];

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5e6b8" />
          <stop offset="52%" stopColor="#d4af55" />
          <stop offset="100%" stopColor="#b7a4fb" />
        </linearGradient>
      </defs>
      <IconPaths name={name} stroke={`url(#${gradId})`} />
    </svg>
  );
}

export function osTabIcon(tabId: OsTabId): OsIconName {
  switch (tabId) {
    case "home":
      return "home";
    case "radar":
      return "radar";
    case "watch":
      return "watch";
    case "lens":
      return "lens";
    case "guard":
      return "shield";
    case "score":
      return "score";
    case "portfolio":
      return "wallet";
    case "launch":
      return "launch";
    case "b20":
      return "launch";
    case "swap":
      return "swap";
    case "game":
      return "game";
    case "battleship":
      return "battleship";
    case "drop":
      return "verify";
    case "analytics":
      return "chart";
    case "tip":
    default:
      return "tip";
  }
}

type ShellProps = {
  children: ReactNode;
  variant?: "feature" | "briefing" | "palette";
  active?: boolean;
  className?: string;
};

export function OsIconShell({
  children,
  variant = "feature",
  active = false,
  className = "",
}: ShellProps) {
  const base =
    variant === "feature"
      ? "reflect-feature-card__icon"
      : variant === "briefing"
        ? "os-icon-shell os-icon-shell--briefing"
        : `os-icon-shell os-icon-shell--palette${active ? " os-icon-shell--palette-active" : ""}`;

  return <span className={`${base} ${className}`.trim()}>{children}</span>;
}
