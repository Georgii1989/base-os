"use client";

import { useState } from "react";
import type { BridgeChainId } from "@/lib/bridgeChains";
import { getBridgeChain } from "@/lib/bridgeChains";
import { BRIDGE_CHAIN_ACCENT, bridgeChainLogo } from "@/lib/bridgeChainLogos";

export function BridgeChainIcon({
  chainId,
  size = 36,
}: {
  chainId: BridgeChainId;
  size?: number;
}) {
  const chain = getBridgeChain(chainId);
  const logo = bridgeChainLogo(chainId);
  const accent = BRIDGE_CHAIN_ACCENT[chainId];
  const label = chain?.shortName ?? "?";
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
          style={{ width: size, height: size, fontSize: size * 0.32 }}
        >
          {label.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
