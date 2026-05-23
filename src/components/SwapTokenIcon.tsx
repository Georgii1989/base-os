"use client";

import { useState } from "react";
import { tokenAccent } from "@/lib/swapTokens";
import { swapTokenLogo } from "@/lib/swapTokenLogos";

const BASE_BADGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 111 111'%3E%3Crect width='111' height='111' rx='24' fill='%230052FF'/%3E%3Cpath fill='white' d='M54.9 18v25.2H29.7V18h25.2zm0 49.5v25.2H29.7V67.5h25.2zm25.2-25.2V67.5H54.9V42.3h25.2z'/%3E%3C/svg%3E";

function initials(symbol: string): string {
  return symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
}

export function SwapTokenIcon({
  address,
  symbol,
  size = 36,
  showBaseBadge = true,
  logoURI,
}: {
  address: string;
  symbol: string;
  size?: number;
  showBaseBadge?: boolean;
  logoURI?: string | null;
}) {
  const logo = logoURI ?? swapTokenLogo(address);
  const accent = tokenAccent(symbol);
  const badgeSize = Math.max(14, Math.round(size * 0.38));
  const [imgFailed, setImgFailed] = useState(false);
  const showLogo = Boolean(logo) && !imgFailed;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={size}
          height={size}
          className="rounded-full bg-white/10 object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className={`flex items-center justify-center rounded-full bg-gradient-to-br font-black ${accent}`}
          style={{ width: size, height: size, fontSize: size * 0.28 }}
        >
          {initials(symbol)}
        </span>
      )}
      {showBaseBadge ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BASE_BADGE}
          alt=""
          width={badgeSize}
          height={badgeSize}
          className="absolute -bottom-0.5 -right-0.5 rounded-md border-2 border-[#131313] bg-[#0052FF]"
        />
      ) : null}
    </span>
  );
}

export function shortenAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
